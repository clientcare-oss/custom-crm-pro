import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createClient } from "@libsql/client";
import fs from "fs";
import crypto from "crypto";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import {
  resetGmailHubInMemoryStateForTesting,
  simulateGmailHubServerRestartForTesting,
  setCustomGmailApiAdapter,
  syncGmailMessages,
  type RawGmailMessageInput,
} from "./services/gmailCommunicationHub";
import {
  resetEmailTemplateCategoriesOverlayForTesting,
  simulateTemplateCategoriesServerRestartForTesting,
} from "./services/emailTemplateCategories";
import { inMemoryContacts } from "./db/contacts";

function createTestContext(userOverrides: Partial<NonNullable<TrpcContext["user"]>>): TrpcContext {
  const defaultUser: NonNullable<TrpcContext["user"]> = {
    id: 9060114,
    openId: "user_3HamsO4oLoKLKOnDi9BR16e6RZW",
    name: "Byron Honea",
    email: "byron@waypointadvocates.com",
    loginMethod: "clerk",
    role: "admin",
    staffAccessRole: "Owner / Co-Founder",
    isActiveEmployee: true,
    hasAdminAccess: true,
    permissions: "[]",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...userOverrides,
  };

  return {
    user: defaultUser,
    req: {
      protocol: "http",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("WAP 1B.1: Gmail-Connected Client Communication Hub Verification Suite", () => {
  let parentSingleStudentId: number;
  let singleStudentId: number;
  let parentMultiStudentId: number;
  let siblingAlphaId: number;
  let siblingBetaId: number;
  let otherFamilyParentId: number;
  let otherFamilyStudentId: number;

  const ownerCaller = appRouter.createCaller(
    createTestContext({
      id: 9060114,
      openId: "user_3HamsO4oLoKLKOnDi9BR16e6RZW",
      name: "Byron Honea",
      email: "byron@waypointadvocates.com",
      role: "admin",
      staffAccessRole: "Owner / Co-Founder",
      hasAdminAccess: true,
    })
  );

  const advocateCaller = appRouter.createCaller(
    createTestContext({
      id: 2,
      openId: "user_test_emily",
      loginMethod: "test",
      name: "Emily Advocate",
      email: "emily@waypointadvocates.com",
      role: "user",
      staffAccessRole: "Lead Advocate",
      hasAdminAccess: false,
      permissions: JSON.stringify([
        "view_assigned_cases",
        "edit_student_records",
        "manage_portal_access",
        "manage_communications",
      ]),
    })
  );

  const callCenterCaller = appRouter.createCaller(
    createTestContext({
      id: 9060250,
      openId: "user_3KPhcRBro_wyatt",
      name: "Wyatt Smith",
      email: "wyatt.smith@waypointadvocates.com",
      role: "user",
      staffAccessRole: "Intake Specialist",
      hasAdminAccess: false,
      permissions: JSON.stringify([
        "view_contacts",
        "edit_contacts",
        "manage_leads",
        "schedule_appointments",
        "log_communications",
      ]),
    })
  );

  beforeEach(async () => {
    resetGmailHubInMemoryStateForTesting();
    resetEmailTemplateCategoriesOverlayForTesting();
    setCustomGmailApiAdapter(null);
    inMemoryContacts.clear();

    // Seed single-student family in inMemoryContacts (100% isolated from local.sqlite)
    parentSingleStudentId = 501;
    inMemoryContacts.set(parentSingleStudentId, {
      id: parentSingleStudentId,
      firstName: "Elena",
      lastName: "Rostova",
      email: "elena.rostova@example.com",
      secondParentEmail: "dmitri.rostova@example.com",
      contactCategory: "client",
      jobTitle: "Parent",
      status: "lead",
    });

    singleStudentId = 502;
    inMemoryContacts.set(singleStudentId, {
      id: singleStudentId,
      firstName: "Lucas",
      lastName: "Rostova",
      contactCategory: "student",
      jobTitle: "Student",
      parentContactId: parentSingleStudentId,
      caseId: "CASE-LUCAS-101",
      assignedAdvocate: "Emily Advocate",
      status: "lead",
    });

    // Seed multi-student family (2 siblings)
    parentMultiStudentId = 503;
    inMemoryContacts.set(parentMultiStudentId, {
      id: parentMultiStudentId,
      firstName: "Marcus",
      lastName: "Vance",
      email: "marcus.vance@example.com",
      contactCategory: "client",
      jobTitle: "Parent",
      status: "lead",
    });

    siblingAlphaId = 504;
    inMemoryContacts.set(siblingAlphaId, {
      id: siblingAlphaId,
      firstName: "Sophia",
      lastName: "Vance",
      contactCategory: "student",
      jobTitle: "Student",
      parentContactId: parentMultiStudentId,
      caseId: "CASE-SOPHIA-201",
      assignedAdvocate: "Emily Advocate",
      status: "lead",
    });

    siblingBetaId = 505;
    inMemoryContacts.set(siblingBetaId, {
      id: siblingBetaId,
      firstName: "Ethan",
      lastName: "Vance",
      contactCategory: "student",
      jobTitle: "Student",
      parentContactId: parentMultiStudentId,
      caseId: "CASE-ETHAN-202",
      assignedAdvocate: "Emily Advocate",
      status: "lead",
    });

    // Seed second family for cross-family portal isolation verification
    otherFamilyParentId = 506;
    inMemoryContacts.set(otherFamilyParentId, {
      id: otherFamilyParentId,
      firstName: "Claire",
      lastName: "Bennings",
      email: "claire.bennings@example.com",
      contactCategory: "client",
      jobTitle: "Parent",
      status: "lead",
    });

    otherFamilyStudentId = 507;
    inMemoryContacts.set(otherFamilyStudentId, {
      id: otherFamilyStudentId,
      firstName: "Noah",
      lastName: "Bennings",
      contactCategory: "student",
      jobTitle: "Student",
      parentContactId: otherFamilyParentId,
      caseId: "CASE-NOAH-301",
      status: "lead",
    });
  });

  it("1. Gmail connection status and configuration handling (Configuration Required, Connected, Disconnected, Attention Required, Error)", async () => {
    const initialStatus = await ownerCaller.messages.gmailStatus();
    expect(["disconnected", "configuration_required"]).toContain(initialStatus.overallStatus);
    expect(initialStatus.primaryMailbox).toBeNull();

    // Initiate OAuth without Google Cloud Client ID/Secret returns Configuration Required state cleanly
    const oauthInit = await ownerCaller.messages.initiateGmailOAuth({});
    if (!initialStatus.oauthConfigured) {
      expect(oauthInit.status).toBe("configuration_required");
      expect(oauthInit.authUrl).toBeNull();
    }

    // Connect company Gmail mailbox
    const connectedMailbox = await ownerCaller.messages.connectGmailMailbox({
      email: "clientcare@waypointadvocates.com",
      displayName: "Waypoint Advocates Client Care",
      authType: "oauth2",
      accessToken: "mock_oauth_token_123",
      syncRangeDays: 90,
    });
    expect(connectedMailbox.status).toBe("connected");
    expect(connectedMailbox.email).toBe("clientcare@waypointadvocates.com");
    expect(connectedMailbox.scopes).toEqual([
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.modify",
    ]);

    const statusAfterConnect = await ownerCaller.messages.gmailStatus();
    expect(statusAfterConnect.overallStatus).toBe("connected");
    expect(statusAfterConnect.primaryMailbox?.email).toBe("clientcare@waypointadvocates.com");

    // Simulate expired token (401) -> transitions mailbox to attention_required
    setCustomGmailApiAdapter({
      async fetchMessagesSince() {
        throw new Error("401 Invalid Credentials: Token expired");
      },
      async sendMessage() {
        return { accepted: false, error: "401 Token expired" };
      },
    });

    const syncErrorResult = await ownerCaller.messages.syncGmail({});
    expect(syncErrorResult.status).toBe("attention_required");

    const attentionStatus = await ownerCaller.messages.gmailStatus();
    expect(attentionStatus.overallStatus).toBe("attention_required");

    // Reconnect mailbox restores Connected status
    const reconnected = await ownerCaller.messages.reconnectGmailMailbox({
      mailboxId: connectedMailbox.id,
      accessToken: "fresh_oauth_token_456",
    });
    expect(reconnected.status).toBe("connected");

    // Disconnect mailbox transitions to Disconnected
    const disconnected = await ownerCaller.messages.disconnectGmailMailbox({
      mailboxId: connectedMailbox.id,
    });
    expect(disconnected.disconnected).toBe(true);
    expect(disconnected.mailbox?.status).toBe("disconnected");
  });

  it("2. Permission enforcement for connecting/disconnecting company Gmail (Management allowed; Call Center & Advocate blocked)", async () => {
    // Non-admin Advocate cannot connect company Gmail
    await expect(
      advocateCaller.messages.connectGmailMailbox({
        email: "clientcare@waypointadvocates.com",
      })
    ).rejects.toThrow(/Only authorized management/i);

    // Call Center specialist cannot connect company Gmail
    await expect(
      callCenterCaller.messages.connectGmailMailbox({
        email: "clientcare@waypointadvocates.com",
      })
    ).rejects.toThrow(/Only authorized management/i);

    // Management connects Gmail
    const mb = await ownerCaller.messages.connectGmailMailbox({
      email: "clientcare@waypointadvocates.com",
    });

    // Call Center & Advocate cannot disconnect company Gmail
    await expect(
      callCenterCaller.messages.disconnectGmailMailbox({ mailboxId: mb.id })
    ).rejects.toThrow(/Only authorized management/i);

    await expect(
      advocateCaller.messages.disconnectGmailMailbox({ mailboxId: mb.id })
    ).rejects.toThrow(/Only authorized management/i);

    // Both Advocate and Call Center CAN view status and use communication features
    const advStatus = await advocateCaller.messages.gmailStatus();
    expect(advStatus.overallStatus).toBe("connected");
    const ccStatus = await callCenterCaller.messages.gmailStatus();
    expect(ccStatus.overallStatus).toBe("connected");
  });

  it("3. Incoming Gmail message sync and automatic matching to a verified parent and single student", async () => {
    await ownerCaller.messages.connectGmailMailbox({
      email: "clientcare@waypointadvocates.com",
    });

    const rawMessages: RawGmailMessageInput[] = [
      {
        gmailMessageId: "gmsg_incoming_single_1",
        gmailThreadId: "gthread_single_1",
        rfcMessageId: "<msg1@example.com>",
        fromEmail: "elena.rostova@example.com",
        fromName: "Elena Rostova",
        toEmails: ["clientcare@waypointadvocates.com"],
        subject: "Upcoming IEP Meeting for our family",
        bodyText: "Hello team, we just received the draft IEP from the school district.",
        bodyHtml: "<p>Hello team, we just received the draft IEP from the school district.</p>",
        timestamp: new Date().toISOString(),
      },
    ];

    const syncRes = await syncGmailMessages({ rawMessages });
    expect(syncRes.syncedCount).toBe(1);
    expect(syncRes.matchedCount).toBe(1);
    expect(syncRes.needsReviewCount).toBe(0);

    const thread = await advocateCaller.messages.getGmailThread({
      gmailThreadId: "gthread_single_1",
    });
    expect(thread).not.toBeNull();
    expect(thread!.parentContactId).toBe(parentSingleStudentId);
    expect(thread!.studentContactId).toBe(singleStudentId);
    expect(thread!.matchStatus).toBe("matched");
    expect(thread!.messages[0].direction).toBe("inbound");
  });

  it("4. Outgoing email sent directly from Gmail syncing back into the correct client/student activity feed", async () => {
    await ownerCaller.messages.connectGmailMailbox({
      email: "clientcare@waypointadvocates.com",
    });

    const rawMessages: RawGmailMessageInput[] = [
      {
        gmailMessageId: "gmsg_sent_from_gmail_1",
        gmailThreadId: "gthread_sent_direct_1",
        rfcMessageId: "<sent1@waypointadvocates.com>",
        fromEmail: "clientcare@waypointadvocates.com",
        fromName: "Waypoint Advocates",
        toEmails: ["dmitri.rostova@example.com"], // Matches secondParentEmail on Elena's family
        subject: "Follow-up on Lucas Evaluation Consent",
        bodyText: "Hi Dmitri and Elena, attached are our notes before you sign the evaluation consent.",
        timestamp: new Date().toISOString(),
      },
    ];

    const syncRes = await syncGmailMessages({ rawMessages });
    expect(syncRes.syncedCount).toBe(1);
    expect(syncRes.matchedCount).toBe(1);

    // Verify it appears in the student's Unified Activity Feed
    const feed = await advocateCaller.caseActivity.unifiedFeed({
      studentContactId: singleStudentId,
      categoryFilter: "emails",
    });
    expect(feed.items.some((i) => i.emailData?.gmailMessageId === "gmsg_sent_from_gmail_1")).toBe(true);
    const syncedItem = feed.items.find((i) => i.emailData?.gmailMessageId === "gmsg_sent_from_gmail_1");
    expect(syncedItem?.emailData?.direction).toBe("outbound");
  });

  it("5. Outgoing email sent from Waypoint appearing in the activity feed and Gmail thread", async () => {
    await ownerCaller.messages.connectGmailMailbox({
      email: "clientcare@waypointadvocates.com",
    });

    const sendRes = await advocateCaller.messages.composeAndSendEmail({
      toEmails: ["elena.rostova@example.com"],
      subject: "Preparation Checklist for Lucas's IEP Meeting",
      bodyHtml: "<p>Dear Elena, please review the parent input statement draft before Thursday.</p>",
      bodyText: "Dear Elena, please review the parent input statement draft before Thursday.",
      parentContactId: parentSingleStudentId,
      studentContactId: singleStudentId,
    });

    expect(sendRes.accepted).toBe(true);
    expect(sendRes.deliveryStatus).toBe("accepted");
    expect(sendRes.email).not.toBeNull();
    expect(sendRes.email!.direction).toBe("outbound");
    expect(sendRes.email!.studentContactId).toBe(singleStudentId);

    const thread = await advocateCaller.messages.getGmailThread({
      gmailThreadId: sendRes.email!.gmailThreadId,
    });
    expect(thread).not.toBeNull();
    expect(thread!.messages.length).toBe(1);
    expect(thread!.messages[0].subject).toBe("Preparation Checklist for Lucas's IEP Meeting");

    const feed = await advocateCaller.caseActivity.unifiedFeed({
      studentContactId: singleStudentId,
      categoryFilter: "all",
    });
    expect(feed.items.some((i) => i.emailData?.gmailMessageId === sendRes.email!.gmailMessageId)).toBe(true);
  });

  it("6. Reply from Gmail attaching to the existing conversation thread", async () => {
    await ownerCaller.messages.connectGmailMailbox({
      email: "clientcare@waypointadvocates.com",
    });

    // Step 1: Send initial email from Waypoint
    const initialRes = await advocateCaller.messages.composeAndSendEmail({
      toEmails: ["elena.rostova@example.com"],
      subject: "Prior Written Notice Review",
      bodyHtml: "<p>Hello Elena, here is our analysis of the district's PWN.</p>",
      parentContactId: parentSingleStudentId,
      studentContactId: singleStudentId,
    });
    const initialMsg = initialRes.email!;

    // Step 2: Parent replies from their phone/Gmail client in the same thread
    await syncGmailMessages({
      rawMessages: [
        {
          gmailMessageId: "gmsg_parent_reply_2",
          gmailThreadId: initialMsg.gmailThreadId,
          rfcMessageId: "<reply2@example.com>",
          inReplyTo: initialMsg.rfcMessageId || undefined,
          references: [initialMsg.rfcMessageId || ""],
          fromEmail: "elena.rostova@example.com",
          fromName: "Elena Rostova",
          toEmails: ["clientcare@waypointadvocates.com"],
          subject: "Re: Prior Written Notice Review",
          bodyText: "Thank you Sarah! That makes complete sense.",
          timestamp: new Date(Date.now() + 5000).toISOString(),
        },
      ],
    });

    const thread = await advocateCaller.messages.getGmailThread({
      gmailThreadId: initialMsg.gmailThreadId,
    });
    expect(thread).not.toBeNull();
    expect(thread!.messageCount).toBe(2);
    expect(thread!.messages[0].gmailMessageId).toBe(initialMsg.gmailMessageId);
    expect(thread!.messages[1].gmailMessageId).toBe("gmsg_parent_reply_2");
    expect(thread!.messages[1].studentContactId).toBe(singleStudentId);
  });

  it("7. Duplicate webhook or sync event not creating duplicate email or timeline records", async () => {
    await ownerCaller.messages.connectGmailMailbox({
      email: "clientcare@waypointadvocates.com",
    });

    const rawMsg: RawGmailMessageInput = {
      gmailMessageId: "gmsg_dedup_check_999",
      gmailThreadId: "gthread_dedup_999",
      fromEmail: "elena.rostova@example.com",
      toEmails: ["clientcare@waypointadvocates.com"],
      subject: "Deduplication Verification Email",
      bodyText: "Testing idempotent sync.",
      timestamp: new Date().toISOString(),
    };

    const firstSync = await syncGmailMessages({ rawMessages: [rawMsg] });
    expect(firstSync.syncedCount).toBe(1);
    expect(firstSync.deduplicatedCount).toBe(0);

    // Sync the exact same message a second time
    const secondSync = await syncGmailMessages({ rawMessages: [rawMsg] });
    expect(secondSync.syncedCount).toBe(0);
    expect(secondSync.deduplicatedCount).toBe(1);

    const thread = await advocateCaller.messages.getGmailThread({
      gmailThreadId: "gthread_dedup_999",
    });
    expect(thread!.messageCount).toBe(1);
  });

  it("8. Parent with multiple students where one student is clearly identified", async () => {
    await ownerCaller.messages.connectGmailMailbox({
      email: "clientcare@waypointadvocates.com",
    });

    // Marcus Vance has 2 children: Sophia and Ethan. Email explicitly mentions Sophia.
    const syncRes = await syncGmailMessages({
      rawMessages: [
        {
          gmailMessageId: "gmsg_multi_clear_sophia",
          gmailThreadId: "gthread_multi_sophia",
          fromEmail: "marcus.vance@example.com",
          fromName: "Marcus Vance",
          toEmails: ["clientcare@waypointadvocates.com"],
          subject: "Speech therapy update for Sophia",
          bodyText: "Hi team, Sophia's speech therapist sent over the progress report today.",
          timestamp: new Date().toISOString(),
        },
      ],
    });

    expect(syncRes.matchedCount).toBe(1);
    expect(syncRes.needsReviewCount).toBe(0);

    const thread = await advocateCaller.messages.getGmailThread({
      gmailThreadId: "gthread_multi_sophia",
    });
    expect(thread!.parentContactId).toBe(parentMultiStudentId);
    expect(thread!.studentContactId).toBe(siblingAlphaId);
    expect(thread!.matchStatus).toBe("matched");
  });

  it("9. Parent with multiple students where the student is ambiguous (associated at family level + Needs Review, never assigned to all siblings)", async () => {
    await ownerCaller.messages.connectGmailMailbox({
      email: "clientcare@waypointadvocates.com",
    });

    // Marcus Vance sends an email that does NOT identify whether it is for Sophia or Ethan
    const syncRes = await syncGmailMessages({
      rawMessages: [
        {
          gmailMessageId: "gmsg_multi_ambiguous_1",
          gmailThreadId: "gthread_multi_ambiguous_1",
          fromEmail: "marcus.vance@example.com",
          fromName: "Marcus Vance",
          toEmails: ["clientcare@waypointadvocates.com"],
          subject: "Question about scheduling next week",
          bodyText: "Hi team, do you have availability next Tuesday afternoon for a quick call?",
          timestamp: new Date().toISOString(),
        },
      ],
    });

    expect(syncRes.needsReviewCount).toBe(1);
    expect(syncRes.matchedCount).toBe(0);

    const thread = await advocateCaller.messages.getGmailThread({
      gmailThreadId: "gthread_multi_ambiguous_1",
    });
    expect(thread!.parentContactId).toBe(parentMultiStudentId);
    expect(thread!.studentContactId).toBeNull();
    expect(thread!.matchStatus).toBe("needs_review");
    expect(thread!.reviewReason).toBe("multiple_students_ambiguous");

    // Verify neither Sophia nor Ethan had the ambiguous email dumped into their student timeline
    const sophiaFeed = await advocateCaller.caseActivity.unifiedFeed({
      studentContactId: siblingAlphaId,
      categoryFilter: "emails",
    });
    const ethanFeed = await advocateCaller.caseActivity.unifiedFeed({
      studentContactId: siblingBetaId,
      categoryFilter: "emails",
    });
    expect(sophiaFeed.items.some((i) => i.emailData?.gmailMessageId === "gmsg_multi_ambiguous_1")).toBe(false);
    expect(ethanFeed.items.some((i) => i.emailData?.gmailMessageId === "gmsg_multi_ambiguous_1")).toBe(false);
  });

  it("10. Unknown sender routed to Needs Review without creating a client/contact record", async () => {
    await ownerCaller.messages.connectGmailMailbox({
      email: "clientcare@waypointadvocates.com",
    });

    const contactsBefore = await db.getContactsByOwner();

    const syncRes = await syncGmailMessages({
      rawMessages: [
        {
          gmailMessageId: "gmsg_unknown_sender_1",
          gmailThreadId: "gthread_unknown_sender_1",
          fromEmail: "unrecognized.parent@externaldomain.org",
          fromName: "Unrecognized Sender",
          toEmails: ["clientcare@waypointadvocates.com"],
          subject: "Inquiry from personal email",
          bodyText: "Hello, I am emailing from my secondary work address regarding our file.",
          timestamp: new Date().toISOString(),
        },
      ],
    });

    expect(syncRes.needsReviewCount).toBe(1);

    // Confirm no new contact record was automatically created
    const contactsAfter = await db.getContactsByOwner();
    expect(contactsAfter.length).toBe(contactsBefore.length);

    const needsReviewQueue = await advocateCaller.messages.listGmailThreads({
      folder: "needs_review",
    });
    expect(needsReviewQueue.threads.some((t) => t.gmailThreadId === "gthread_unknown_sender_1")).toBe(true);
    const unknownThread = needsReviewQueue.threads.find((t) => t.gmailThreadId === "gthread_unknown_sender_1")!;
    expect(unknownThread.reviewReason).toBe("unmatched_sender");
    expect(unknownThread.parentContactId).toBeNull();
    expect(unknownThread.studentContactId).toBeNull();
  });

  it("11. Manual assignment and reassignment from Needs Review with full association history", async () => {
    await ownerCaller.messages.connectGmailMailbox({
      email: "clientcare@waypointadvocates.com",
    });

    await syncGmailMessages({
      rawMessages: [
        {
          gmailMessageId: "gmsg_reassign_1",
          gmailThreadId: "gthread_reassign_1",
          fromEmail: "marcus.vance@example.com",
          toEmails: ["clientcare@waypointadvocates.com"],
          subject: "Evaluation documents attached",
          bodyText: "Here is the PDF we discussed.",
          timestamp: new Date().toISOString(),
        },
      ],
    });

    // Initially in Needs Review (ambiguous between Sophia and Ethan)
    const beforeThread = await advocateCaller.messages.getGmailThread({
      gmailThreadId: "gthread_reassign_1",
    });
    expect(beforeThread!.matchStatus).toBe("needs_review");

    // Step 1: Assign to Sophia (siblingAlphaId)
    await advocateCaller.messages.assignEmailAssociation({
      emailIdOrMessageId: "gmsg_reassign_1",
      parentContactId: parentMultiStudentId,
      studentContactId: siblingAlphaId,
      applyToThread: true,
      reason: "Confirmed PDF belongs to Sophia",
    });

    const assignedThread = await advocateCaller.messages.getGmailThread({
      gmailThreadId: "gthread_reassign_1",
    });
    expect(assignedThread!.matchStatus).toBe("matched");
    expect(assignedThread!.studentContactId).toBe(siblingAlphaId);

    // Step 2: Reassign to Ethan (siblingBetaId) and verify associationHistory audit trail
    await advocateCaller.messages.assignEmailAssociation({
      emailIdOrMessageId: "gmsg_reassign_1",
      parentContactId: parentMultiStudentId,
      studentContactId: siblingBetaId,
      applyToThread: true,
      reason: "Corrected filing to Ethan Vance",
    });

    const reassignedThread = await advocateCaller.messages.getGmailThread({
      gmailThreadId: "gthread_reassign_1",
    });
    expect(reassignedThread!.studentContactId).toBe(siblingBetaId);
    // Initial auto-match entry + manual assign + reassignment = 3 history entries
    const history = reassignedThread!.messages[0].associationHistory;
    expect(history.length).toBeGreaterThanOrEqual(2);
    const lastEntry = history[history.length - 1];
    expect(lastEntry.action).toBe("reassigned");
    expect(lastEntry.previousStudentContactId).toBe(siblingAlphaId);
    expect(lastEntry.newStudentContactId).toBe(siblingBetaId);
  });

  it("12. Continuous scrollable activity feed pagination loading older emails beyond 20 items", async () => {
    await ownerCaller.messages.connectGmailMailbox({
      email: "clientcare@waypointadvocates.com",
    });

    // Generate 28 historical emails for Lucas (singleStudentId)
    const rawBatch: RawGmailMessageInput[] = Array.from({ length: 28 }, (_, i) => ({
      gmailMessageId: `gmsg_paginated_${i + 1}`,
      gmailThreadId: `gthread_paginated_${i + 1}`,
      fromEmail: "elena.rostova@example.com",
      fromName: "Elena Rostova",
      toEmails: ["clientcare@waypointadvocates.com"],
      subject: `Historical Case Email #${i + 1}`,
      bodyText: `Message content for historical email #${i + 1}`,
      timestamp: new Date(Date.now() - (30 - i) * 3600_000).toISOString(),
    }));

    await syncGmailMessages({ rawMessages: rawBatch });

    // Page 1: limit 15, offset 0
    const page1 = await advocateCaller.caseActivity.unifiedFeed({
      studentContactId: singleStudentId,
      categoryFilter: "emails",
      limit: 15,
      offset: 0,
    });
    expect(page1.items.length).toBe(15);
    expect(page1.totalCount).toBeGreaterThanOrEqual(28);
    expect(page1.hasMore).toBe(true);
    expect(page1.nextOffset).toBe(15);

    // Page 2: limit 15, offset 15 (loads items 16..28 beyond the old 20-item limit!)
    const page2 = await advocateCaller.caseActivity.unifiedFeed({
      studentContactId: singleStudentId,
      categoryFilter: "emails",
      limit: 15,
      offset: 15,
    });
    expect(page2.items.length).toBeGreaterThanOrEqual(13);
    expect(page1.items[0].id).not.toBe(page2.items[0].id);
  });

  it("13. Full thread expansion and inline email body expansion with HTML sanitization", async () => {
    await ownerCaller.messages.connectGmailMailbox({
      email: "clientcare@waypointadvocates.com",
    });

    const unsafeHtml = `
      <div>
        <p>Safe paragraph content for the parent.</p>
        <script>window.evilPayload = true;</script>
        <iframe src="https://malicious.example.com"></iframe>
        <img src="x" onerror="alert('xss')" />
        <a href="javascript:alert('xss')">Click me</a>
      </div>
    `;

    await syncGmailMessages({
      rawMessages: [
        {
          gmailMessageId: "gmsg_sanitize_1",
          gmailThreadId: "gthread_sanitize_1",
          fromEmail: "elena.rostova@example.com",
          toEmails: ["clientcare@waypointadvocates.com"],
          subject: "HTML Sanitization Check",
          bodyText: "Safe paragraph content for the parent.",
          bodyHtml: unsafeHtml,
          timestamp: new Date().toISOString(),
        },
      ],
    });

    const thread = await advocateCaller.messages.getGmailThread({
      gmailThreadId: "gthread_sanitize_1",
    });
    const sanitized = thread!.messages[0].bodyHtml;
    expect(sanitized).toContain("Safe paragraph content for the parent.");
    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("<iframe");
    expect(sanitized).not.toContain("onerror=");
    expect(sanitized).not.toContain("javascript:");
  });

  it("14. Attachment metadata display and access protection", async () => {
    await ownerCaller.messages.connectGmailMailbox({
      email: "clientcare@waypointadvocates.com",
    });

    await syncGmailMessages({
      rawMessages: [
        {
          gmailMessageId: "gmsg_with_attachment_1",
          gmailThreadId: "gthread_with_attachment_1",
          fromEmail: "elena.rostova@example.com",
          toEmails: ["clientcare@waypointadvocates.com"],
          subject: "Signed Psychoeducational Evaluation PDF",
          bodyText: "Please see attached evaluation report.",
          timestamp: new Date().toISOString(),
          attachments: [
            {
              id: "att_eval_pdf_1",
              fileName: "Lucas_Psychoeducational_Eval_2026.pdf",
              mimeType: "application/pdf",
              sizeBytes: 245760,
            },
          ],
        },
      ],
    });

    const thread = await advocateCaller.messages.getGmailThread({
      gmailThreadId: "gthread_with_attachment_1",
    });
    expect(thread!.hasAttachments).toBe(true);
    expect(thread!.messages[0].attachments.length).toBe(1);
    expect(thread!.messages[0].attachments[0].fileName).toBe("Lucas_Psychoeducational_Eval_2026.pdf");

    // Verify unauthorized parent from another family cannot access Lucas's unified feed or attachments
    const otherParentCaller = appRouter.createCaller(
      createTestContext({
        id: 901,
        openId: "clerk_parent_claire",
        name: "Claire Bennings",
        email: "claire.bennings@example.com",
        role: "client",
        isActiveEmployee: false,
        hasAdminAccess: false,
      })
    );

    await expect(
      otherParentCaller.caseActivity.unifiedFeed({
        studentContactId: singleStudentId,
      })
    ).rejects.toThrow(/You do not have permission to access another family/i);
  });

  it("15. Internal-only email visibility by default vs explicit Parent Portal visibility and cross-family protection", async () => {
    await ownerCaller.messages.connectGmailMailbox({
      email: "clientcare@waypointadvocates.com",
    });

    // Sync an incoming Gmail message for Elena/Lucas
    await syncGmailMessages({
      rawMessages: [
        {
          gmailMessageId: "gmsg_portal_vis_test_1",
          gmailThreadId: "gthread_portal_vis_1",
          fromEmail: "elena.rostova@example.com",
          toEmails: ["clientcare@waypointadvocates.com"],
          subject: "Confidential Case Discussion",
          bodyText: "Checking whether this is visible in the portal by default.",
          timestamp: new Date().toISOString(),
        },
      ],
    });

    const thread = await advocateCaller.messages.getGmailThread({
      gmailThreadId: "gthread_portal_vis_1",
    });
    const syncedMsg = thread!.messages[0];
    // Must default to internal-only (portalVisible: false)
    expect(syncedMsg.portalVisible).toBe(false);

    // Elena (parent of Lucas) queries her portal communication feed -> should NOT see internal-only email yet
    const elenaPortalCaller = appRouter.createCaller(
      createTestContext({
        id: 801,
        openId: "clerk_parent_elena",
        name: "Elena Rostova",
        email: "elena.rostova@example.com",
        role: "client",
        isActiveEmployee: false,
        hasAdminAccess: false,
      })
    );

    const feedBeforePublish = await elenaPortalCaller.portal.getCommunicationFeed({
      parentContactId: parentSingleStudentId,
      studentContactId: singleStudentId,
    });
    expect(feedBeforePublish.timeline.some((m) => m.subject === "Confidential Case Discussion")).toBe(false);

    // Authorized Advocate publishes the email to the Parent Portal
    await advocateCaller.messages.setEmailPortalVisibility({
      emailIdOrMessageId: syncedMsg.gmailMessageId,
      portalVisible: true,
    });

    // Now Elena sees the published email in her Parent Portal feed!
    const feedAfterPublish = await elenaPortalCaller.portal.getCommunicationFeed({
      parentContactId: parentSingleStudentId,
      studentContactId: singleStudentId,
    });
    expect(feedAfterPublish.timeline.some((m) => m.subject === "Confidential Case Discussion")).toBe(true);

    // Another parent (Claire Bennings) is strictly blocked from querying Elena's student in portal communication feed
    const clairePortalCaller = appRouter.createCaller(
      createTestContext({
        id: 802,
        openId: "clerk_parent_claire",
        name: "Claire Bennings",
        email: "claire.bennings@example.com",
        role: "client",
        isActiveEmployee: false,
        hasAdminAccess: false,
      })
    );

    await expect(
      clairePortalCaller.portal.getCommunicationFeed({
        studentContactId: singleStudentId,
      })
    ).rejects.toThrow(/Access denied|FORBIDDEN/i);
  });

  it("16. Strict separation between Client Communication Hub / Activity Timeline and internal Crew Messages (PG-038-MSG)", async () => {
    await ownerCaller.messages.connectGmailMailbox({
      email: "clientcare@waypointadvocates.com",
    });

    // 1. Send an internal Crew Message between staff members (PG-038-MSG)
    const conv = await ownerCaller.crewMessages.getOrCreateDirect({
      targetUserId: 9060249, // Kyle Atkins
    });
    await ownerCaller.crewMessages.sendMessage({
      conversationId: conv.conversationId,
      body: "Private internal staff discussion about workload.",
    });

    // 2. Also simulate an internal staff-to-staff email in Gmail
    const syncRes = await syncGmailMessages({
      rawMessages: [
        {
          gmailMessageId: "gmsg_internal_staff_only",
          gmailThreadId: "gthread_internal_staff_only",
          fromEmail: "byron@waypointadvocates.com",
          toEmails: ["kyle@waypointadvocates.com"],
          subject: "Internal Payroll & PTO Schedule",
          bodyText: "Internal staff-only email that should never appear in client feeds.",
          timestamp: new Date().toISOString(),
        },
      ],
    });
    expect(syncRes.ignoredInternalCount).toBe(1);
    expect(syncRes.syncedCount).toBe(0);

    // 3. Verify neither the Crew Message nor the internal staff email appears in Client Communication Hub or Student Activity Feed
    const allClientThreads = await advocateCaller.messages.listGmailThreads({
      folder: "all",
    });
    expect(
      allClientThreads.threads.some(
        (t) =>
          t.subject.includes("Internal Payroll") ||
          t.snippet.includes("Private internal staff discussion")
      )
    ).toBe(false);

    const studentFeed = await advocateCaller.caseActivity.unifiedFeed({
      studentContactId: singleStudentId,
      categoryFilter: "all",
    });
    expect(
      studentFeed.items.some(
        (i) =>
          i.title.includes("Internal Payroll") ||
          i.description.includes("Private internal staff discussion")
      )
    ).toBe(false);
  });

  it("17. Email Template Dropdown Uplift: Existing templates preserved and automatically migrated into 8 structured categories", async () => {
    const categories = await advocateCaller.emailTemplates.categories.list();
    const categoryNames = categories.map((c) => c.name);
    expect(categoryNames).toEqual([
      "Onboarding",
      "Client Updates",
      "Resources",
      "Meetings & Scheduling",
      "Documents & Records",
      "Billing & Plans",
      "Follow-Ups & Reviews",
      "General",
    ]);

    const allTemplates = await advocateCaller.emailTemplates.list();
    expect(allTemplates.length).toBeGreaterThanOrEqual(14);

    // Identifiable resource templates must be categorized under "Resources"
    const marcus = allTemplates.find((t) => t.name.includes("Marcus Autism Center"));
    const cobb = allTemplates.find((t) => t.name.includes("Cobb Speech and Language"));
    const beaming = allTemplates.find((t) => t.name.includes("BEAMING HEALTH"));
    expect(marcus?.category).toBe("Resources");
    expect(cobb?.category).toBe("Resources");
    expect(beaming?.category).toBe("Resources");

    // Uncertain templates must remain in "General" without deletion
    const formalNotif = allTemplates.find((t) => t.name === "Formal Notification and Documentation");
    const justForYou = allTemplates.find((t) => t.name === "just for you!");
    expect(formalNotif?.category).toBe("General");
    expect(justForYou?.category).toBe("General");
  });

  it("18. Email Template Dropdown Uplift: Cross-category search, Recently Used tracking, and Save Email as Template", async () => {
    // Search across all categories by keyword / name
    const speechMatches = await advocateCaller.emailTemplates.list({
      search: "cobb speech",
    });
    expect(speechMatches.length).toBeGreaterThanOrEqual(1);
    expect(speechMatches[0].category).toBe("Resources");

    // Mark template used -> appears in recentlyUsed list
    await advocateCaller.emailTemplates.markUsed({ id: speechMatches[0].id });
    const recent = await advocateCaller.emailTemplates.recentlyUsed();
    expect(recent.length).toBeGreaterThanOrEqual(1);
    expect(recent[0].id).toBe(speechMatches[0].id);

    // Save current email draft as a new template with Category and Description
    const saved = await advocateCaller.emailTemplates.create({
      name: "IEP Draft Review Checklist Follow-Up",
      category: "Documents & Records",
      description: "Checklist sent to parents 5 days prior to annual IEP review.",
      subject: "Draft IEP Review Checklist for {{student_name}}",
      body: "Hi {{parent_name}},\n\nPlease review the attached draft IEP checklist ahead of our meeting.",
    });
    expect(saved.id).toBeDefined();
    expect(saved.category).toBe("Documents & Records");

    // Newly saved template is immediately searchable and selectable
    const searchSaved = await advocateCaller.emailTemplates.list({
      search: "Draft Review Checklist",
    });
    expect(searchSaved.some((t) => t.id === saved.id)).toBe(true);
  });

  it("19. Email Template Category Management: Create, rename, reorder, and delete category with safe template reassignment", async () => {
    // 1. Create a new category
    const createdCat = await ownerCaller.emailTemplates.categories.create({
      name: "State Dispute & Mediation",
      description: "State complaint and mediation preparation templates.",
    });
    expect(createdCat.name).toBe("State Dispute & Mediation");

    // Assign a template into this new category
    const tpl = await ownerCaller.emailTemplates.create({
      name: "Mediation Confidentiality Overview",
      category: "State Dispute & Mediation",
      subject: "Mediation Preparation — {{student_name}}",
      body: "Overview of Georgia DOE mediation procedures.",
    });
    expect(tpl.category).toBe("State Dispute & Mediation");

    // 2. Rename the category -> automatically updates assigned templates
    await ownerCaller.emailTemplates.categories.rename({
      oldName: "State Dispute & Mediation",
      newName: "Dispute Resolution",
    });
    const afterRename = await ownerCaller.emailTemplates.list({
      category: "Dispute Resolution",
    });
    expect(afterRename.some((t) => t.id === tpl.id)).toBe(true);

    // 3. Reorder categories
    const reordered = await ownerCaller.emailTemplates.categories.reorder({
      orderedNames: [
        "Dispute Resolution",
        "Onboarding",
        "Client Updates",
        "Resources",
        "Meetings & Scheduling",
        "Documents & Records",
        "Billing & Plans",
        "Follow-Ups & Reviews",
        "General",
      ],
    });
    expect(reordered[0].name).toBe("Dispute Resolution");

    // 4. Delete category -> must reassign templates to target category ("Documents & Records") without deleting templates
    const deleteRes = await ownerCaller.emailTemplates.categories.delete({
      name: "Dispute Resolution",
      reassignToCategory: "Documents & Records",
    });
    expect(deleteRes.reassignedCount).toBe(1);
    expect(deleteRes.reassignedTo).toBe("Documents & Records");

    const allAfterDelete = await ownerCaller.emailTemplates.list();
    const reassignedTpl = allAfterDelete.find((t) => t.id === tpl.id);
    expect(reassignedTpl).toBeDefined();
    expect(reassignedTpl?.category).toBe("Documents & Records");
  });

  // ============================================================================
  // WAP 1B.1-P: PERMANENT GMAIL & TEMPLATE DATA PERSISTENCE ACROSS SERVER RESTARTS
  // ============================================================================

  async function mountIsolatedSqliteDatabaseForPersistenceTest() {
    const memClient = createClient({ url: ":memory:" });

    await memClient.execute(`
      CREATE TABLE developer_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tabKey TEXT NOT NULL UNIQUE,
        content TEXT NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);

    await memClient.execute(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        openId TEXT NOT NULL,
        name TEXT,
        email TEXT,
        loginMethod TEXT,
        role TEXT DEFAULT 'user' NOT NULL,
        staffAccessRole TEXT,
        isActiveEmployee INTEGER DEFAULT 1,
        hasAdminAccess INTEGER DEFAULT 0,
        permissions TEXT,
        phone TEXT,
        quoWebhookSecret TEXT,
        gmailUser TEXT,
        gmailAppPassword TEXT,
        portalDomain TEXT,
        logoUrl TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        lastSignedIn TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);

    await memClient.execute(`
      CREATE TABLE callLogs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ownerId INTEGER NOT NULL,
        studentId INTEGER,
        quoCallId TEXT,
        fromNumber TEXT,
        toNumber TEXT,
        durationSeconds INTEGER DEFAULT 0,
        direction TEXT DEFAULT 'inbound' NOT NULL,
        transcript TEXT,
        summary TEXT,
        participants TEXT,
        status TEXT DEFAULT 'unassigned' NOT NULL,
        matchedPhone TEXT,
        contactId INTEGER,
        eventType TEXT DEFAULT 'call.completed',
        isVoicemail INTEGER DEFAULT 0,
        voicemailTranscript TEXT,
        recordingUrl TEXT,
        smsBody TEXT,
        rawPayload TEXT,
        isMissed INTEGER DEFAULT 0,
        callbackStatus TEXT DEFAULT 'none',
        callbackTaskId INTEGER,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        assignedAt TIMESTAMP
      )
    `);

    await memClient.execute(`
      CREATE TABLE emailTemplateFolders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ownerId INTEGER NOT NULL,
        name TEXT NOT NULL,
        color TEXT DEFAULT 'blue' NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);

    await memClient.execute(`
      CREATE TABLE emailTemplates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ownerId INTEGER NOT NULL,
        folderId INTEGER,
        name TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        category TEXT DEFAULT 'General' NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);

    const { contacts: contactsSchema } = await import("../drizzle/schema");
    const contactCols = Object.values(contactsSchema)
      .filter((col: any) => col && typeof col === "object" && "name" in col && col.name !== "id")
      .map((col: any) => `"${col.name}" ${col.dataType === "number" ? "INTEGER" : "TEXT"}`)
      .concat(['"contactCategory" TEXT', '"assignedAdvocate" TEXT', '"status" TEXT']);

    await memClient.execute(`
      CREATE TABLE contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ${Array.from(new Set(contactCols)).join(",\n        ")}
      )
    `);

    // Seed test family contacts into isolated SQLite DB so they survive inMemoryContacts.clear()
    for (const c of Array.from(inMemoryContacts.values())) {
      await memClient.execute({
        sql: `INSERT INTO contacts (id, firstName, lastName, email, secondParentEmail, contactCategory, jobTitle, parentContactId, caseId, assignedAdvocate, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          c.id,
          c.firstName,
          c.lastName,
          c.email ?? null,
          c.secondParentEmail ?? null,
          c.contactCategory ?? "client",
          c.jobTitle ?? null,
          c.parentContactId ?? null,
          c.caseId ?? null,
          c.assignedAdvocate ?? null,
          c.status ?? "lead",
        ],
      });
    }

    // Read-only seed of existing 46 emailTemplates and 6 folders from local.sqlite if present
    let seededTemplateCount = 0;
    if (fs.existsSync("local.sqlite")) {
      const roClient = createClient({ url: "file:local.sqlite" });
      const folderRows = await roClient.execute("SELECT * FROM emailTemplateFolders");
      for (const f of folderRows.rows) {
        await memClient.execute({
          sql: `INSERT INTO emailTemplateFolders (id, ownerId, name, color, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`,
          args: [f.id, f.ownerId, f.name, f.color, f.createdAt, f.updatedAt],
        });
      }
      const tplRows = await roClient.execute("SELECT * FROM emailTemplates");
      for (const t of tplRows.rows) {
        await memClient.execute({
          sql: `INSERT INTO emailTemplates (id, ownerId, folderId, name, subject, body, category, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [t.id, t.ownerId, t.folderId, t.name, t.subject, t.body, t.category, t.createdAt, t.updatedAt],
        });
        seededTemplateCount++;
      }
      roClient.close();
    }

    // Mount D1-compatible interface onto globalThis.__CF_ENV_DB__
    const normalizeArg = (v: any) => {
      if (v === undefined) return null;
      if (v instanceof Date) return v.toISOString();
      if (v !== null && typeof v === "object") return JSON.stringify(v);
      return v;
    };

    (globalThis as any).__CF_ENV_DB__ = {
      prepare(sqlStr: string) {
        let boundArgs: any[] = [];
        return {
          bind(...params: any[]) {
            boundArgs = params.map(normalizeArg);
            return this;
          },
          async raw() {
            const res = await memClient.execute({ sql: sqlStr, args: boundArgs });
            return res.rows.map((r) => res.columns.map((c) => (r as any)[c]));
          },
          async all() {
            const res = await memClient.execute({ sql: sqlStr, args: boundArgs });
            return { results: res.rows };
          },
          async first() {
            const res = await memClient.execute({ sql: sqlStr, args: boundArgs });
            return res.rows[0] ?? null;
          },
          async run() {
            const res = await memClient.execute({ sql: sqlStr, args: boundArgs });
            return {
              meta: {
                last_row_id: Number(res.lastInsertRowid || 0),
                changes: res.rowsAffected,
              },
            };
          },
        };
      },
    };

    return { memClient, seededTemplateCount };
  }

  afterEach(() => {
    delete (globalThis as any).__CF_ENV_DB__;
  });

  it("20. WAP 1B.1-P: Gmail correspondence, threads, client/student matching, Needs Review resolution, and Portal visibility persist across a simulated server restart", async () => {
    const { memClient } = await mountIsolatedSqliteDatabaseForPersistenceTest();

    // 1. Connect company Gmail mailbox & sync incoming correspondence (1 auto-matched to Lucas, 1 ambiguous Needs Review for Marcus Vance)
    await ownerCaller.messages.connectGmailMailbox({
      email: "clientcare@waypointadvocates.com",
      displayName: "Waypoint Advocates Primary Mailbox",
      authType: "oauth2",
      accessToken: "persistent_oauth_token_1",
      syncRangeDays: 90,
    });

    await syncGmailMessages({
      rawMessages: [
        {
          gmailMessageId: "gmsg_persist_lucas_1",
          gmailThreadId: "gthread_persist_lucas_1",
          rfcMessageId: "<persist_lucas_1@example.com>",
          fromEmail: "elena.rostova@example.com",
          fromName: "Elena Rostova",
          toEmails: ["clientcare@waypointadvocates.com"],
          subject: "Persistent IEP Draft Review Request",
          bodyText: "Hello team, please review Lucas's IEP goals before Friday.",
          bodyHtml: "<p>Hello team, please review Lucas's IEP goals before Friday.</p>",
          timestamp: "2026-10-29T14:00:00.000Z",
        },
        {
          gmailMessageId: "gmsg_persist_ambiguous_1",
          gmailThreadId: "gthread_persist_ambiguous_1",
          rfcMessageId: "<persist_ambig_1@example.com>",
          fromEmail: "marcus.vance@example.com",
          fromName: "Marcus Vance",
          toEmails: ["clientcare@waypointadvocates.com"],
          subject: "Persistent Multi-Sibling Question",
          bodyText: "Can we review the evaluation timeline this week?",
          timestamp: "2026-10-29T14:05:00.000Z",
        },
      ],
    });

    // 2. Send a reply in Lucas's thread from Waypoint CRM
    const replyRes = await advocateCaller.messages.composeAndSendEmail({
      toEmails: ["elena.rostova@example.com"],
      subject: "Re: Persistent IEP Draft Review Request",
      bodyHtml: "<p>Hi Elena, we reviewed the draft and added our comments.</p>",
      parentContactId: parentSingleStudentId,
      studentContactId: singleStudentId,
      gmailThreadId: "gthread_persist_lucas_1",
      replyToMessageId: "gmsg_persist_lucas_1",
    });
    expect(replyRes.accepted).toBe(true);

    // 3. Resolve Marcus Vance's Needs Review email to Sophia Vance (siblingAlphaId)
    await advocateCaller.messages.assignEmailAssociation({
      emailIdOrMessageId: "gmsg_persist_ambiguous_1",
      parentContactId: parentMultiStudentId,
      studentContactId: siblingAlphaId,
      applyToThread: true,
      reason: "Confirmed in call that this question is for Sophia Vance",
    });

    // 4. Publish Lucas's incoming email to the Parent Portal (leaving the reply internal-only)
    await advocateCaller.messages.setEmailPortalVisibility({
      emailIdOrMessageId: "gmsg_persist_lucas_1",
      portalVisible: true,
      applyToThread: false,
    });

    // ── SIMULATE FULL SERVER RESTART (Wipe all in-memory Gmail Hub Maps & caches) ──
    simulateGmailHubServerRestartForTesting();

    // 5. Verify mailbox connection state persisted across restart
    const statusAfterRestart = await ownerCaller.messages.gmailStatus();
    expect(statusAfterRestart.overallStatus).toBe("connected");
    expect(statusAfterRestart.primaryMailbox?.email).toBe("clientcare@waypointadvocates.com");
    expect(statusAfterRestart.stats.totalSyncedEmails).toBe(3);

    // 6. Verify Lucas's 2-message Gmail thread, RFC headers, and client/student matching persisted across restart
    const lucasThreadAfterRestart = await advocateCaller.messages.getGmailThread({
      gmailThreadId: "gthread_persist_lucas_1",
    });
    expect(lucasThreadAfterRestart).not.toBeNull();
    expect(lucasThreadAfterRestart!.messageCount).toBe(2);
    expect(lucasThreadAfterRestart!.parentContactId).toBe(parentSingleStudentId);
    expect(lucasThreadAfterRestart!.studentContactId).toBe(singleStudentId);
    expect(lucasThreadAfterRestart!.messages[0].gmailMessageId).toBe("gmsg_persist_lucas_1");
    expect(lucasThreadAfterRestart!.messages[1].inReplyTo).toBe("<persist_lucas_1@example.com>");

    // 7. Verify Needs Review decision and associationHistory audit log persisted across restart
    const sophiaThreadAfterRestart = await advocateCaller.messages.getGmailThread({
      gmailThreadId: "gthread_persist_ambiguous_1",
    });
    expect(sophiaThreadAfterRestart).not.toBeNull();
    expect(sophiaThreadAfterRestart!.matchStatus).toBe("matched");
    expect(sophiaThreadAfterRestart!.parentContactId).toBe(parentMultiStudentId);
    expect(sophiaThreadAfterRestart!.studentContactId).toBe(siblingAlphaId);
    expect(sophiaThreadAfterRestart!.messages[0].associationHistory.length).toBe(2);
    expect(sophiaThreadAfterRestart!.messages[0].associationHistory[1].action).toBe("reassigned");

    // 8. Verify Parent Portal visibility and cross-family isolation persisted across restart
    const elenaPortalCaller = appRouter.createCaller(
      createTestContext({
        id: 801,
        openId: "clerk_parent_elena",
        name: "Elena Rostova",
        email: "elena.rostova@example.com",
        role: "client",
        isActiveEmployee: false,
        hasAdminAccess: false,
      })
    );
    const portalFeedAfterRestart = await elenaPortalCaller.portal.getCommunicationFeed({
      parentContactId: parentSingleStudentId,
      studentContactId: singleStudentId,
    });
    expect(
      portalFeedAfterRestart.timeline.some((m) => m.subject === "Persistent IEP Draft Review Request")
    ).toBe(true);
    // The un-published reply must remain hidden from the Parent Portal
    expect(
      portalFeedAfterRestart.timeline.some((m) => m.subject === "Re: Persistent IEP Draft Review Request")
    ).toBe(false);

    // Cross-family access remains strictly prohibited after server restart
    const clairePortalCaller = appRouter.createCaller(
      createTestContext({
        id: 802,
        openId: "clerk_parent_claire",
        name: "Claire Bennings",
        email: "claire.bennings@example.com",
        role: "client",
        isActiveEmployee: false,
        hasAdminAccess: false,
      })
    );
    await expect(
      clairePortalCaller.portal.getCommunicationFeed({
        studentContactId: singleStudentId,
      })
    ).rejects.toThrow(/Access denied|FORBIDDEN/i);

    memClient.close();
  });

  it("21. WAP 1B.1-P: Email template categories, template creations/edits, renames, reorders, and 46 existing templates persist across server restarts without loss or duplication", async () => {
    const { memClient, seededTemplateCount } = await mountIsolatedSqliteDatabaseForPersistenceTest();

    // Baseline template count before mutations (46 from DB + 5 built-in advocate templates = 51)
    const initialTemplates = await ownerCaller.emailTemplates.list();
    const initialCount = initialTemplates.length;
    if (seededTemplateCount === 46) {
      expect(initialCount).toBe(51);
    }

    // 1. Create a custom category
    await ownerCaller.emailTemplates.categories.create({
      name: "IEP Compliance & PWN",
      description: "Statutory compliance and Prior Written Notice templates.",
    });

    // 2. Save a new email template into that category
    const createdTpl = await ownerCaller.emailTemplates.create({
      name: "Statutory 10-Day Parent Response Notice",
      category: "IEP Compliance & PWN",
      description: "10-business-day parent notice before unilateral placement or IEE.",
      subject: "10-Day Parent Notice — {{student_name}}",
      body: "Dear Special Education Director, please accept this formal notice.",
    });

    // 3. Reassign an existing template (ID 60001 "Formal Notification and Documentation") from General to "Documents & Records"
    await ownerCaller.emailTemplates.update({
      id: 60001,
      category: "Documents & Records",
      description: "Updated category assignment persisted to SQLite.",
    });

    // 4. Rename "IEP Compliance & PWN" -> "Statutory Notices"
    await ownerCaller.emailTemplates.categories.rename({
      oldName: "IEP Compliance & PWN",
      newName: "Statutory Notices",
    });

    // 5. Reorder categories so "Statutory Notices" is #1
    await ownerCaller.emailTemplates.categories.reorder({
      orderedNames: [
        "Statutory Notices",
        "Onboarding",
        "Client Updates",
        "Resources",
        "Meetings & Scheduling",
        "Documents & Records",
        "Billing & Plans",
        "Follow-Ups & Reviews",
        "General",
      ],
    });

    // 6. Mark template 60001 as recently used
    await ownerCaller.emailTemplates.markUsed({ id: 60001 });

    // ── SIMULATE FULL SERVER RESTART (Wipe all in-memory template/category overlays) ──
    simulateTemplateCategoriesServerRestartForTesting();

    // 7. Verify category order & renamed category persisted across restart
    const categoriesAfterRestart = await ownerCaller.emailTemplates.categories.list();
    expect(categoriesAfterRestart[0].name).toBe("Statutory Notices");
    expect(categoriesAfterRestart.some((c) => c.name === "IEP Compliance & PWN")).toBe(false);

    // 8. Verify all existing templates + newly created template persisted with ZERO loss and ZERO duplication
    const templatesAfterRestart = await ownerCaller.emailTemplates.list();
    expect(templatesAfterRestart.length).toBe(initialCount + 1);
    const uniqueIds = new Set(templatesAfterRestart.map((t) => t.id));
    expect(uniqueIds.size).toBe(templatesAfterRestart.length);

    // Verify newly created template persisted with its renamed category and description
    const persistedNewTpl = templatesAfterRestart.find((t) => t.id === createdTpl.id);
    expect(persistedNewTpl).toBeDefined();
    expect(persistedNewTpl?.name).toBe("Statutory 10-Day Parent Response Notice");
    expect(persistedNewTpl?.category).toBe("Statutory Notices");
    expect(persistedNewTpl?.description).toBe(
      "10-business-day parent notice before unilateral placement or IEE."
    );

    // Verify existing template 60001 retained its updated category & description
    const persistedExistingTpl = templatesAfterRestart.find((t) => t.id === 60001);
    expect(persistedExistingTpl?.category).toBe("Documents & Records");
    expect(persistedExistingTpl?.description).toBe("Updated category assignment persisted to SQLite.");

    // Verify recently used template list persisted across restart
    const recentAfterRestart = await ownerCaller.emailTemplates.recentlyUsed();
    expect(recentAfterRestart[0]?.id).toBe(60001);

    // 9. Delete "Statutory Notices" and reassign its templates to "Documents & Records", then restart again
    await ownerCaller.emailTemplates.categories.delete({
      name: "Statutory Notices",
      reassignToCategory: "Documents & Records",
    });

    simulateTemplateCategoriesServerRestartForTesting();

    const categoriesAfterSecondRestart = await ownerCaller.emailTemplates.categories.list();
    expect(categoriesAfterSecondRestart.some((c) => c.name === "Statutory Notices")).toBe(false);

    const templatesAfterSecondRestart = await ownerCaller.emailTemplates.list();
    expect(templatesAfterSecondRestart.length).toBe(initialCount + 1);
    const reassignedAfterSecondRestart = templatesAfterSecondRestart.find(
      (t) => t.id === createdTpl.id
    );
    expect(reassignedAfterSecondRestart?.category).toBe("Documents & Records");

    memClient.close();
  });

  it("22. WAP 1B.1-P: Database Architecture Preservation Directive — local.sqlite, backup, and drizzle/schema.ts remain 100% untouched", () => {
    const hashFile = (filePath: string) =>
      crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex").toUpperCase();

    if (fs.existsSync("local.sqlite")) {
      expect(hashFile("local.sqlite")).toBe(
        "E9613D3EA6BC63D784B4658AD921C4C9700159039D98076481ED3A276E3A3247"
      );
    }
    if (fs.existsSync("local.sqlite.bak-wap1a2a")) {
      expect(hashFile("local.sqlite.bak-wap1a2a")).toBe(
        "BCCE8AC6D4EA6BD4A571BC382E3689505E4AF4A921791458E7441C2FC8060921"
      );
    }
    expect(hashFile("drizzle/schema.ts")).toBe(
      "6A3553C8233CD22835037AA5C2B0A81BEAA8A680BCD05B18161D6B215D287866"
    );
  });
});

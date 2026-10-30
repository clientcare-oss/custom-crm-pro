import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("PG-038 Crew Messages — Native Employee Messaging & Collaboration Suite", () => {
  const mockAdminUser = {
    id: 1,
    openId: "user_test_byron",
    name: "Byron Honea",
    email: "byron@waypointadvocates.com",
    role: "admin" as const,
    loginMethod: "manually_created",
    organizationId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    phone: null,
    quoWebhookSecret: null,
    gmailUser: null,
    gmailAppPassword: null,
    portalDomain: null,
    logoUrl: null,
  };

  const mockEmployeeUser = {
    id: 2,
    openId: "user_test_emily",
    name: "Emily Advocate",
    email: "emily@waypointadvocates.com",
    role: "advocate" as const,
    loginMethod: "manually_created",
    organizationId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    phone: null,
    quoWebhookSecret: null,
    gmailUser: null,
    gmailAppPassword: null,
    portalDomain: null,
    logoUrl: null,
  };

  const mockClientUser = {
    id: 99,
    openId: "user_test_parent",
    name: "Parent User",
    email: "parent@example.com",
    role: "client" as const,
    loginMethod: "manually_created",
    organizationId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    phone: null,
    quoWebhookSecret: null,
    gmailUser: null,
    gmailAppPassword: null,
    portalDomain: null,
    logoUrl: null,
  };

  const adminCaller = appRouter.createCaller({ user: mockAdminUser });
  const employeeCaller = appRouter.createCaller({ user: mockEmployeeUser });
  const clientCaller = appRouter.createCaller({ user: mockClientUser });

  it("1. Lists seeded channels and conversations for authenticated employee", async () => {
    const convData = await adminCaller.crewMessages.listConversations();
    expect(convData).toBeDefined();
    expect(convData.channels).toBeDefined();
    expect(Array.isArray(convData.channels)).toBe(true);

    // Verify channels include standard seeded channels (#All Crew, #Operations, #Advocacy)
    const channelNames = convData.channels.map((c: any) => c.name);
    expect(channelNames.some((n: string) => n.includes("All Crew") || n.includes("Crew"))).toBe(true);
  });

  it("2. Returns active employee directory for starting conversations", async () => {
    const employees = await adminCaller.crewMessages.listEmployees();
    expect(Array.isArray(employees)).toBe(true);
    expect(employees.length).toBeGreaterThan(0);
    expect(employees.every((e: any) => e.role !== "client")).toBe(true);
  });

  it("3. Creates or retrieves a 1-on-1 Direct Message workspace", async () => {
    const directResult = await adminCaller.crewMessages.getOrCreateDirect({
      targetUserId: mockEmployeeUser.id,
    });
    expect(directResult).toBeDefined();
    expect(directResult.conversationId).toBeGreaterThan(0);

    // Calling it again returns the same conversation without duplicate records
    const secondCall = await adminCaller.crewMessages.getOrCreateDirect({
      targetUserId: mockEmployeeUser.id,
    });
    expect(secondCall.conversationId).toBe(directResult.conversationId);
  });

  it("4. Sends a message with text and retrieves conversation history", async () => {
    const { conversationId } = await adminCaller.crewMessages.getOrCreateDirect({
      targetUserId: mockEmployeeUser.id,
    });

    const sendRes = await adminCaller.crewMessages.sendMessage({
      conversationId,
      body: "Hello Emily, please review the IEP draft for Jackson R.",
    });
    expect(sendRes.success).toBe(true);
    expect(sendRes.messageId).toBeGreaterThan(0);

    const messages = await adminCaller.crewMessages.getMessages({ conversationId });
    expect(Array.isArray(messages)).toBe(true);
    const sentMsg = messages.find((m: any) => m.id === sendRes.messageId);
    expect(sentMsg).toBeDefined();
    expect(sentMsg.body).toContain("Hello Emily");
    expect(sentMsg.isSender).toBe(true);
  });

  it("5. Supports message reactions toggling", async () => {
    const { conversationId } = await adminCaller.crewMessages.getOrCreateDirect({
      targetUserId: mockEmployeeUser.id,
    });

    const sendRes = await adminCaller.crewMessages.sendMessage({
      conversationId,
      body: "Checking in on status 👍",
    });

    const reactionRes = await employeeCaller.crewMessages.toggleReaction({
      messageId: sendRes.messageId,
      emoji: "👍",
    });
    expect(reactionRes.action).toBe("added");

    // Toggling again removes the reaction
    const removeReactionRes = await employeeCaller.crewMessages.toggleReaction({
      messageId: sendRes.messageId,
      emoji: "👍",
    });
    expect(removeReactionRes.action).toBe("removed");
  });

  it("6. Creates an Action Request and allows assigned approver to decide", async () => {
    const { conversationId } = await adminCaller.crewMessages.getOrCreateDirect({
      targetUserId: mockEmployeeUser.id,
    });

    const actionReqRes = await employeeCaller.crewMessages.createActionRequest({
      conversationId,
      requestType: "Review Document",
      title: "Review signed service agreement",
      assignedApproverId: mockAdminUser.id,
      explanation: "Parent signed and uploaded the 2026 advocacy retainer agreement.",
    });

    expect(actionReqRes.success).toBe(true);
    expect(actionReqRes.actionRequestId).toBeGreaterThan(0);

    // Admin approves the request
    const decisionRes = await adminCaller.crewMessages.decideActionRequest({
      actionRequestId: actionReqRes.actionRequestId,
      decision: "approved",
      note: "All signatures verified. Good to proceed.",
    });

    expect(decisionRes.success).toBe(true);
    expect(decisionRes.status).toBe("approved");

    // Second decision attempt on settled request throws error (single-use validation)
    await expect(
      adminCaller.crewMessages.decideActionRequest({
        actionRequestId: actionReqRes.actionRequestId,
        decision: "declined",
      })
    ).rejects.toThrow();
  });

  it("7. Converts a message into an internal CRM task queue item", async () => {
    const { conversationId } = await adminCaller.crewMessages.getOrCreateDirect({
      targetUserId: mockEmployeeUser.id,
    });

    const sendRes = await adminCaller.crewMessages.sendMessage({
      conversationId,
      body: "Please remember to submit the Prior Written Notice request by Friday.",
    });

    const taskRes = await employeeCaller.crewMessages.convertMessageToTask({
      messageId: sendRes.messageId,
      taskTitle: "Submit PWN request for student",
      priority: "high",
    });

    expect(taskRes.success).toBe(true);
    expect(taskRes.taskId).toBeGreaterThan(0);
  });

  it("8. Marks conversation as read and updates overview metrics", async () => {
    const { conversationId } = await adminCaller.crewMessages.getOrCreateDirect({
      targetUserId: mockEmployeeUser.id,
    });

    const markRes = await adminCaller.crewMessages.markRead({ conversationId });
    expect(markRes.success).toBe(true);

    const stats = await adminCaller.crewMessages.getOverviewStats();
    expect(stats).toBeDefined();
    expect(typeof stats.unreadTotal).toBe("number");
  });

  it("9. FERPA Guardrail: strictly forbids client role from accessing Crew Messages", async () => {
    await expect(clientCaller.crewMessages.listConversations()).rejects.toThrow();
    await expect(clientCaller.crewMessages.getOverviewStats()).rejects.toThrow();
    await expect(
      clientCaller.crewMessages.sendMessage({
        conversationId: 1,
        body: "Attempting client access",
      })
    ).rejects.toThrow();
  });

  describe("WAP 1A.4 End-to-End Internal Messaging & Security Verification", () => {
    const byronOwnerUser = {
      id: 9060114,
      openId: "user_3HamsO4oLoKLKOnDi9BR16e6RZW",
      name: "Byron Honea",
      email: "byron@waypointadvocates.com",
      role: "admin" as const,
      loginMethod: "clerk",
      organizationId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      phone: null,
      quoWebhookSecret: null,
      gmailUser: null,
      gmailAppPassword: null,
      portalDomain: null,
      logoUrl: null,
    };

    const wyattStaffUser = {
      id: 9060250,
      openId: "user_3KPhcRBro000000000000000000",
      name: "Wyatt Smith",
      email: "wyatt@waypointadvocates.com",
      role: "user" as const,
      loginMethod: "clerk",
      organizationId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      phone: null,
      quoWebhookSecret: null,
      gmailUser: null,
      gmailAppPassword: null,
      portalDomain: null,
      logoUrl: null,
    };

    const kyleStaffUser = {
      id: 9060249,
      openId: "user_3HELy6EVi000000000000000000",
      name: "Kyle Atkins",
      email: "kyle@waypointadvocates.com",
      role: "admin" as const,
      loginMethod: "clerk",
      organizationId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      phone: null,
      quoWebhookSecret: null,
      gmailUser: null,
      gmailAppPassword: null,
      portalDomain: null,
      logoUrl: null,
    };

    const deactivatedStaffUser = {
      id: 9060031,
      openId: "katkins-admin-openid",
      name: "Deactivated Dev Account",
      email: "dev@waypointadvocates.com",
      role: "user" as const,
      loginMethod: "manually_created",
      organizationId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      phone: null,
      quoWebhookSecret: null,
      gmailUser: null,
      gmailAppPassword: null,
      portalDomain: null,
      logoUrl: null,
    };

    const byronCaller = appRouter.createCaller({ user: byronOwnerUser });
    const wyattCaller = appRouter.createCaller({ user: wyattStaffUser });
    const kyleCaller = appRouter.createCaller({ user: kyleStaffUser });
    const deactivatedCaller = appRouter.createCaller({ user: deactivatedStaffUser });

    it("WAP 1A.4 (1-4): Employee A sends a DM to Employee B, B sees unread indicator & reads it, both see history on refresh without duplicate threads", async () => {
      // Directory check: Byron finds Wyatt in real staff directory
      const directory = await byronCaller.crewMessages.listEmployees();
      const wyattEntry = directory.find((e: any) => e.id === wyattStaffUser.id);
      expect(wyattEntry).toBeDefined();
      expect(wyattEntry?.name).toContain("Wyatt");

      // Self-DM prevention check
      await expect(
        byronCaller.crewMessages.getOrCreateDirect({ targetUserId: byronOwnerUser.id })
      ).rejects.toThrow();

      // Employee A (Byron) starts DM with Employee B (Wyatt)
      const dmInit = await byronCaller.crewMessages.getOrCreateDirect({
        targetUserId: wyattStaffUser.id,
      });
      expect(dmInit.conversationId).toBeGreaterThan(0);
      expect(dmInit.displayName).toContain("Wyatt");

      // Employee A sends a message to Employee B
      const uniqueBody = `WAP 1A.4 Direct Message Check ${Date.now()}`;
      const sendResult = await byronCaller.crewMessages.sendMessage({
        conversationId: dmInit.conversationId,
        body: uniqueBody,
      });
      expect(sendResult.success).toBe(true);

      // Employee B checks unread indicators BEFORE marking read
      const wyattConvsBefore = await wyattCaller.crewMessages.listConversations();
      const wyattDmBefore = wyattConvsBefore.directMessages.find(
        (d: any) => d.id === dmInit.conversationId
      );
      expect(wyattDmBefore).toBeDefined();
      expect(wyattDmBefore.displayName).toContain("Byron");
      expect(wyattDmBefore.unreadCount).toBeGreaterThan(0);

      const wyattStatsBefore = await wyattCaller.crewMessages.getOverviewStats();
      expect(wyattStatsBefore.unreadTotal).toBeGreaterThan(0);

      // Employee B receives message with accurate timestamp and sender identity
      const wyattMessages = await wyattCaller.crewMessages.getMessages({
        conversationId: dmInit.conversationId,
      });
      const receivedMsg = wyattMessages.find((m: any) => m.id === sendResult.messageId);
      expect(receivedMsg).toBeDefined();
      expect(receivedMsg.body).toBe(uniqueBody);
      expect(receivedMsg.senderName).toContain("Byron");
      expect(receivedMsg.isSender).toBe(false);
      expect(new Date(receivedMsg.createdAt).getTime()).toBeGreaterThan(0);

      // Employee B marks the conversation as read
      await wyattCaller.crewMessages.markRead({
        conversationId: dmInit.conversationId,
        messageId: sendResult.messageId,
      });

      // Unread indicators update to 0 for Employee B
      const wyattConvsAfter = await wyattCaller.crewMessages.listConversations();
      const wyattDmAfter = wyattConvsAfter.directMessages.find(
        (d: any) => d.id === dmInit.conversationId
      );
      expect(wyattDmAfter.unreadCount).toBe(0);

      // Both employees see conversation history after refresh, and read receipt updates for Employee A
      const byronMessagesAfterRefresh = await byronCaller.crewMessages.getMessages({
        conversationId: dmInit.conversationId,
      });
      const sentMsgAfterRead = byronMessagesAfterRefresh.find(
        (m: any) => m.id === sendResult.messageId
      );
      expect(sentMsgAfterRead).toBeDefined();
      expect(sentMsgAfterRead.isReadByRecipient).toBe(true);

      // Continuing existing conversation from either side does NOT create duplicate threads
      const wyattReopen = await wyattCaller.crewMessages.getOrCreateDirect({
        targetUserId: byronOwnerUser.id,
      });
      expect(wyattReopen.conversationId).toBe(dmInit.conversationId);
    });

    it("WAP 1A.4 (5): A third employee cannot access or post in a private conversation between Employee A and Employee B, and cannot impersonate or edit another employee's message", async () => {
      const dm = await byronCaller.crewMessages.getOrCreateDirect({
        targetUserId: wyattStaffUser.id,
      });
      const msg = await byronCaller.crewMessages.sendMessage({
        conversationId: dm.conversationId,
        body: "Confidential discussion between Byron and Wyatt.",
      });

      // Third employee (Kyle, even with management role) is NOT a participant in this private 1-on-1 DM
      await expect(
        kyleCaller.crewMessages.getMessages({ conversationId: dm.conversationId })
      ).rejects.toThrow();
      await expect(
        kyleCaller.crewMessages.sendMessage({
          conversationId: dm.conversationId,
          body: "Intruding into private DM",
        })
      ).rejects.toThrow();
      await expect(
        kyleCaller.crewMessages.getLinkedContext({ conversationId: dm.conversationId })
      ).rejects.toThrow();
      await expect(
        kyleCaller.crewMessages.markRead({ conversationId: dm.conversationId })
      ).rejects.toThrow();

      // Employee B (Wyatt) cannot edit or delete Employee A's (Byron's) message
      await expect(
        wyattCaller.crewMessages.editMessage({
          messageId: msg.messageId,
          body: "Tampered message body",
        })
      ).rejects.toThrow();
      await expect(
        wyattCaller.crewMessages.deleteMessage({
          messageId: msg.messageId,
        })
      ).rejects.toThrow();

      // Original author (Byron) CAN edit his own message
      const editRes = await byronCaller.crewMessages.editMessage({
        messageId: msg.messageId,
        body: "Confidential discussion between Byron and Wyatt (updated).",
      });
      expect(editRes.success).toBe(true);
    });

    it("WAP 1A.4 (6-8): Clients and deactivated staff are blocked, Crew Messages stays separated from client activity timeline, and existing staff permissions remain intact", async () => {
      // Deactivated staff cannot access Crew Messages or be messaged
      await expect(deactivatedCaller.crewMessages.listConversations()).rejects.toThrow();
      await expect(deactivatedCaller.crewMessages.listEmployees()).rejects.toThrow();
      await expect(
        byronCaller.crewMessages.getOrCreateDirect({ targetUserId: deactivatedStaffUser.id })
      ).rejects.toThrow();

      // Client cannot be targeted for an internal Direct Message
      await expect(
        byronCaller.crewMessages.getOrCreateDirect({ targetUserId: mockClientUser.id })
      ).rejects.toThrow();

      // Crew Messages cannot be pushed to the client activity timeline
      await expect(
        byronCaller.crewMessages.addToActivityTimeline({
          messageId: 1,
          studentContactId: 1,
          title: "Should be blocked",
        })
      ).rejects.toThrow();

      // Existing staff permissions remain intact for Protected Owner, Kyle, and Wyatt
      const byronAccess = await byronCaller.team.getMyStaffAccess();
      expect(byronAccess.isProtectedOwner).toBe(true);
      expect(byronAccess.hasAdminAccess).toBe(true);

      const kyleAccess = await kyleCaller.team.getMyStaffAccess();
      expect(kyleAccess.primaryRole).toBe("technology");
      expect(kyleAccess.hasAdminAccess).toBe(true);
      expect(kyleAccess.accountStatus).toBe("active");

      const wyattAccess = await wyattCaller.team.getMyStaffAccess();
      expect(wyattAccess.primaryRole).toBe("call_center");
      expect(wyattAccess.accountStatus).toBe("active");
    });
  });
});

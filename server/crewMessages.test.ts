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
});

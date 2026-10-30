import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { appRouter } from "./routers";
import {
  resolveStaffAccess,
  checkBackendModuleAccess,
  checkBackendActionPermission,
  checkBackendCaseAccess,
  resetStaffAccessMemoryToDefaults,
  upsertStaffAccessProfile,
} from "./_core/staffAccess";
import { authenticateClerkOrSession } from "./_core/context";

describe("WAP 1A.1 & WAP 1A.2A — Secure Staff Access, Trusted Team Management & Permissions", () => {
  beforeEach(async () => {
    await resetStaffAccessMemoryToDefaults();
  });

  afterAll(async () => {
    await resetStaffAccessMemoryToDefaults();
  });

  // Confirmed Account Fixtures
  const byronOwner1 = {
    id: 9060114,
    openId: "user_3HamsO4oLoKLKOnDi9BR16e6RZW",
    name: "Byron Honea",
    email: "byron@waypointadvocates.com",
    role: "admin" as const,
    loginMethod: "clerk",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    phone: null,
    quoWebhookSecret: null,
    gmailUser: null,
    gmailAppPassword: null,
    portalDomain: null,
  };

  const byronOwner2 = {
    id: 9060115,
    openId: "user_3HEhAHIdXNwvbiK5NSR6RPkTInD",
    name: "Byron Honea",
    email: "clientcare@waypointadvocates.com",
    role: "admin" as const,
    loginMethod: "clerk",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    phone: null,
    quoWebhookSecret: null,
    gmailUser: null,
    gmailAppPassword: null,
    portalDomain: null,
  };

  const kyleClerkDev = {
    id: 9060249,
    openId: "user_3HELy6EVi_kyle_atkins",
    name: "Kyle Atkins",
    email: "kyle@waypointadvocates.com",
    role: "admin" as const,
    loginMethod: "clerk",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    phone: null,
    quoWebhookSecret: null,
    gmailUser: null,
    gmailAppPassword: null,
    portalDomain: null,
  };

  const kyleDisabledDevLogin = {
    id: 9060031,
    openId: "katkins-admin-openid",
    name: "Kyle Atkins (Dev Login)",
    email: "katkins@dev.local",
    // Even if client/session claims admin, backend must reject 9060031
    role: "admin" as const,
    loginMethod: "local",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    phone: null,
    quoWebhookSecret: null,
    gmailUser: null,
    gmailAppPassword: null,
    portalDomain: null,
  };

  const wyattCallCenter = {
    id: 9060250,
    openId: "user_3KPhcRBro_wyatt",
    name: "Wyatt Smith",
    email: "wyatt.smith@waypointadvocates.com",
    // Even if client/token claims admin, backend must restrict 9060250 to Call Center
    role: "admin" as const,
    loginMethod: "clerk",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    phone: null,
    quoWebhookSecret: null,
    gmailUser: null,
    gmailAppPassword: null,
    portalDomain: null,
  };

  const unknownClerkUser = {
    id: 999888,
    openId: "user_3UnknownStrangerClerkAccount999",
    name: "Random Clerk Signup",
    email: "stranger@example.com",
    // Spoofed admin role from client/metadata must never grant admin or staff access
    role: "admin" as const,
    loginMethod: "clerk",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    phone: null,
    quoWebhookSecret: null,
    gmailUser: null,
    gmailAppPassword: null,
    portalDomain: null,
  };

  const parentAccount1 = {
    id: 9060099,
    openId: "parent_account_9060099",
    name: "Parent One",
    email: "parent1@example.com",
    role: "client" as const,
    loginMethod: "portal",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    phone: null,
    quoWebhookSecret: null,
    gmailUser: null,
    gmailAppPassword: null,
    portalDomain: null,
  };

  const parentAccount2 = {
    id: 9060100,
    openId: "parent_account_9060100",
    name: "Parent Two",
    email: "parent2@example.com",
    // Even if parent tries to pass role: "admin"
    role: "admin" as const,
    loginMethod: "portal",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    phone: null,
    quoWebhookSecret: null,
    gmailUser: null,
    gmailAppPassword: null,
    portalDomain: null,
  };

  const emilyStaff = {
    id: 99901,
    openId: "staff_emily_davis",
    name: "Emily Davis",
    email: "emily@waypointadvocates.com",
    role: "user" as const,
    loginMethod: "clerk",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    phone: null,
    quoWebhookSecret: null,
    gmailUser: null,
    gmailAppPassword: null,
    portalDomain: null,
  };

  const sarahAdvocate = {
    id: 99902,
    openId: "staff_sarah_jenkins",
    name: "Sarah Jenkins",
    email: "sarah.jenkins@waypointadvocates.com",
    role: "user" as const,
    loginMethod: "clerk",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    phone: null,
    quoWebhookSecret: null,
    gmailUser: null,
    gmailAppPassword: null,
    portalDomain: null,
  };

  // ============================================================================
  // TEST GROUP A — AUTHENTICATION & ACCOUNT ASSIGNMENTS
  // ============================================================================
  describe("Test Group A — Authentication & Confirmed Account Assignments", () => {
    it("A1. Both Byron owner accounts (9060114 and 9060115) retain full Protected Owner administrative access", async () => {
      const access1 = await resolveStaffAccess(byronOwner1);
      const access2 = await resolveStaffAccess(byronOwner2);

      expect(access1.isProtectedOwner).toBe(true);
      expect(access1.hasAdminAccess).toBe(true);
      expect(access1.isStaff).toBe(true);
      expect(access1.primaryRole).toBe("management");
      expect(access1.accountStatus).toBe("active");

      expect(access2.isProtectedOwner).toBe(true);
      expect(access2.hasAdminAccess).toBe(true);
      expect(access2.isStaff).toBe(true);
      expect(access2.primaryRole).toBe("management");
      expect(access2.accountStatus).toBe("active");

      const caller1 = appRouter.createCaller({ req: {} as any, res: {} as any, user: byronOwner1 });
      const caller2 = appRouter.createCaller({ req: {} as any, res: {} as any, user: byronOwner2 });

      const staffList1 = await caller1.team.getStaffAccessList();
      const staffList2 = await caller2.team.getStaffAccessList();
      expect(staffList1.length).toBe(4);
      expect(staffList2.length).toBe(4);
    });

    it("A2. Kyle's Clerk account (9060249) receives Technology display role and full developer admin access, but is NOT a Protected Owner", async () => {
      const access = await resolveStaffAccess(kyleClerkDev);
      expect(access.primaryRole).toBe("technology");
      expect(access.hasAdminAccess).toBe(true);
      expect(access.isStaff).toBe(true);
      expect(access.isProtectedOwner).toBe(false);
      expect(access.accountStatus).toBe("active");

      const kyleCaller = appRouter.createCaller({ req: {} as any, res: {} as any, user: kyleClerkDev });
      const staffList = await kyleCaller.team.getStaffAccessList();
      expect(staffList.some((p) => p.userId === 9060249)).toBe(true);
    });

    it("A3. Kyle's development login (9060031 / katkins-admin-openid) has NO staff or admin access and is rejected", async () => {
      const access = await resolveStaffAccess(kyleDisabledDevLogin);
      expect(access.isStaff).toBe(false);
      expect(access.hasAdminAccess).toBe(false);
      expect(access.primaryRole).toBe("none");
      expect(access.accountStatus).toBe("inactive");

      const devLoginCaller = appRouter.createCaller({
        req: {} as any,
        res: {} as any,
        user: kyleDisabledDevLogin,
      });

      await expect(devLoginCaller.team.getMyStaffAccess()).rejects.toThrow(/deactivated|not authorized/i);
      await expect(devLoginCaller.crewMessages.listConversations()).rejects.toThrow();
    });

    it("A4. Wyatt's Clerk account (9060250) receives Call Center permissions only and no admin access", async () => {
      const access = await resolveStaffAccess(wyattCallCenter);
      expect(access.primaryRole).toBe("call_center");
      expect(access.additionalRoles).toEqual([]);
      expect(access.hasAdminAccess).toBe(false);
      expect(access.isProtectedOwner).toBe(false);
      expect(access.isStaff).toBe(true);
      expect(access.accountStatus).toBe("active");

      // Call Center modules allowed
      expect(checkBackendModuleAccess(access, "call_center")).toBe("edit");
      expect(checkBackendModuleAccess(access, "leads")).toBe("edit");
      expect(checkBackendModuleAccess(access, "calendar")).toBe("edit");
      expect(checkBackendModuleAccess(access, "crew_quarters")).toBe("edit");

      // Admin/sensitive modules forbidden
      expect(checkBackendModuleAccess(access, "settings")).toBe("none");
      expect(checkBackendModuleAccess(access, "team")).toBe("none");
      expect(checkBackendModuleAccess(access, "invoices")).toBe("none");
      expect(checkBackendModuleAccess(access, "automations")).toBe("none");
    });

    it("A5. Unknown Clerk users never automatically become administrators or staff", async () => {
      const access = await resolveStaffAccess(unknownClerkUser);
      expect(access.isStaff).toBe(false);
      expect(access.hasAdminAccess).toBe(false);
      expect(access.isProtectedOwner).toBe(false);
      expect(access.primaryRole).toBe("none");

      const unknownCaller = appRouter.createCaller({
        req: {} as any,
        res: {} as any,
        user: unknownClerkUser,
      });

      await expect(unknownCaller.crewMessages.listConversations()).rejects.toThrow(/Staff access is required/i);
      await expect(unknownCaller.team.getStaffAccessList()).rejects.toThrow(/Staff access is required/i);
      await expect(
        unknownCaller.team.invite({ email: "new@example.com", role: "member" })
      ).rejects.toThrow();
    });

    it("A6. Invalid or failed Clerk token verification fails closed and never falls back to id: 1 admin", async () => {
      const fakeReq = {
        headers: {
          authorization: "Bearer invalid.jwt.token.that.must.fail.closed",
        },
      };
      const result = await authenticateClerkOrSession(fakeReq);
      expect(result).toBeNull();
    });

    it("A7. Client-supplied role changes cannot escalate privileges for non-admin staff or parents", async () => {
      // Wyatt (9060250) and Parent (9060100) both have role: "admin" in their fixture objects above
      const wyattCaller = appRouter.createCaller({
        req: {} as any,
        res: {} as any,
        user: wyattCallCenter,
      });
      const parentCaller = appRouter.createCaller({
        req: {} as any,
        res: {} as any,
        user: parentAccount2,
      });

      // Both must be rejected by adminProcedure despite ctx.user.role === "admin"
      await expect(
        wyattCaller.team.invite({ email: "attempt@example.com", role: "admin" })
      ).rejects.toThrow();
      await expect(
        parentCaller.team.invite({ email: "attempt@example.com", role: "admin" })
      ).rejects.toThrow();
    });

    it("A8. Parent accounts (9060099, 9060100) are isolated from staff-only APIs", async () => {
      const parent1Caller = appRouter.createCaller({
        req: {} as any,
        res: {} as any,
        user: parentAccount1,
      });
      const parent2Caller = appRouter.createCaller({
        req: {} as any,
        res: {} as any,
        user: parentAccount2,
      });

      await expect(parent1Caller.crewMessages.listConversations()).rejects.toThrow();
      await expect(parent1Caller.crewMessages.listEmployees()).rejects.toThrow();
      await expect(parent2Caller.crewMessages.listConversations()).rejects.toThrow();
      await expect(parent2Caller.team.getStaffAccessList()).rejects.toThrow();
    });
  });

  // ============================================================================
  // TEST GROUP B — PERMISSIONS & PROTECTED OWNER SAFEGUARDS
  // ============================================================================
  describe("Test Group B — Server-Side Role Permissions & Protected Owner Safeguards", () => {
    it("B1. Management and Developer Admin accounts have full backend permissions", async () => {
      const byronAccess = await resolveStaffAccess(byronOwner1);
      const kyleAccess = await resolveStaffAccess(kyleClerkDev);

      expect(checkBackendActionPermission(byronAccess, "manage_employees")).toBe(true);
      expect(checkBackendActionPermission(byronAccess, "manage_roles")).toBe(true);
      expect(checkBackendActionPermission(byronAccess, "access_admin_settings")).toBe(true);

      expect(checkBackendActionPermission(kyleAccess, "manage_employees")).toBe(true);
      expect(checkBackendActionPermission(kyleAccess, "manage_integrations")).toBe(true);
      expect(checkBackendActionPermission(kyleAccess, "access_admin_settings")).toBe(true);
    });

    it("B2. Non-management staff (Wyatt 9060250 Call Center) cannot perform restricted management actions", async () => {
      const wyattAccess = await resolveStaffAccess(wyattCallCenter);
      expect(checkBackendActionPermission(wyattAccess, "manage_employees")).toBe(false);
      expect(checkBackendActionPermission(wyattAccess, "manage_roles")).toBe(false);
      expect(checkBackendActionPermission(wyattAccess, "modify_billing")).toBe(false);
      expect(checkBackendCaseAccess(wyattAccess, "files")).toBe("none");

      const wyattCaller = appRouter.createCaller({
        req: {} as any,
        res: {} as any,
        user: wyattCallCenter,
      });

      await expect(
        wyattCaller.team.deactivateEmployee({ targetEmployeeId: "emp-sarah-jenkins" })
      ).rejects.toThrow();
      await expect(
        wyattCaller.team.updateStaffAccess({
          targetEmployeeId: "emp-wyatt-smith",
          primaryRole: "management",
          hasAdminAccess: true,
        })
      ).rejects.toThrow();
    });

    it("B3. Kyle (9060249) cannot deactivate, demote, or strip Protected Owner status from either Byron account (9060114, 9060115)", async () => {
      const kyleCaller = appRouter.createCaller({
        req: {} as any,
        res: {} as any,
        user: kyleClerkDev,
      });

      // Attempt to deactivate Byron account 1 (9060114)
      await expect(
        kyleCaller.team.deactivateEmployee({ targetUserId: 9060114 })
      ).rejects.toThrow(/Protected Owner/i);

      // Attempt to deactivate Byron account 2 (9060115)
      await expect(
        kyleCaller.team.deactivateEmployee({ targetUserId: 9060115 })
      ).rejects.toThrow(/Protected Owner/i);

      // Attempt to deactivate by employeeId emp-byron-honea
      await expect(
        kyleCaller.team.deactivateEmployee({ targetEmployeeId: "emp-byron-honea" })
      ).rejects.toThrow(/Protected Owner/i);

      // Attempt to demote Byron's role or strip admin access
      await expect(
        kyleCaller.team.updateStaffAccess({
          targetUserId: 9060114,
          primaryRole: "advocate",
          hasAdminAccess: false,
        })
      ).rejects.toThrow(/Protected Owner/i);

      // Attempt to strip isProtectedOwner flag
      await expect(
        kyleCaller.team.updateStaffAccess({
          targetUserId: 9060115,
          isProtectedOwner: false,
        })
      ).rejects.toThrow(/Protected Owner/i);
    });
  });

  // ============================================================================
  // TEST GROUP C — PRIVATE CREW MESSAGES SECURITY
  // ============================================================================
  describe("Test Group C — Private Crew Messages Membership & Authorization", () => {
    beforeEach(async () => {
      await upsertStaffAccessProfile({
        userId: emilyStaff.id,
        openId: emilyStaff.openId,
        employeeId: "emp-test-emily",
        name: emilyStaff.name,
        email: emilyStaff.email,
        primaryRole: "documentation",
        additionalRoles: [],
        isProtectedOwner: false,
        hasAdminAccess: false,
        isStaff: true,
        accountStatus: "active",
        modulePermissions: {},
        caseWorkspaceAccess: {},
        permissionOverrides: {},
      });
      await upsertStaffAccessProfile({
        userId: sarahAdvocate.id,
        openId: sarahAdvocate.openId,
        employeeId: "emp-test-sarah",
        name: sarahAdvocate.name,
        email: sarahAdvocate.email,
        primaryRole: "advocate",
        additionalRoles: ["documentation"],
        isProtectedOwner: false,
        hasAdminAccess: false,
        isStaff: true,
        accountStatus: "active",
        modulePermissions: {},
        caseWorkspaceAccess: {},
        permissionOverrides: {},
      });
    });

    it("C1. Employee A (Emily) and Employee B (Sarah) can read/send in their private DM, while Employee C (even an admin) is strictly forbidden", async () => {
      const emilyCaller = appRouter.createCaller({ req: {} as any, res: {} as any, user: emilyStaff });
      const sarahCaller = appRouter.createCaller({ req: {} as any, res: {} as any, user: sarahAdvocate });
      const wyattCaller = appRouter.createCaller({ req: {} as any, res: {} as any, user: wyattCallCenter });
      const kyleAdminCaller = appRouter.createCaller({ req: {} as any, res: {} as any, user: kyleClerkDev });

      // Emily starts a private DM with Sarah
      const dm = await emilyCaller.crewMessages.getOrCreateDirect({
        targetUserId: sarahAdvocate.id,
      });
      expect(dm.conversationId).toBeGreaterThan(0);

      // Emily sends a private message to Sarah
      const sent = await emilyCaller.crewMessages.sendMessage({
        conversationId: dm.conversationId,
        body: "Confidential peer review note between Emily and Sarah.",
      });
      expect(sent.success).toBe(true);

      // Sarah (participant) can read the messages and reply
      const sarahMsgs = await sarahCaller.crewMessages.getMessages({
        conversationId: dm.conversationId,
      });
      expect(sarahMsgs.some((m: any) => m.id === sent.messageId)).toBe(true);

      // Employee C (Wyatt, non-participant) CANNOT read A & B's private conversation
      await expect(
        wyattCaller.crewMessages.getMessages({ conversationId: dm.conversationId })
      ).rejects.toThrow(/not a participant/i);

      // Even Kyle (Full CRM Admin, non-participant) CANNOT bypass private DM membership checks!
      await expect(
        kyleAdminCaller.crewMessages.getMessages({ conversationId: dm.conversationId })
      ).rejects.toThrow(/not a participant/i);

      // Employee C cannot send messages to A & B's private conversation
      await expect(
        wyattCaller.crewMessages.sendMessage({
          conversationId: dm.conversationId,
          body: "Intruding message",
        })
      ).rejects.toThrow(/not a participant/i);

      // Employee C cannot mark A & B's private conversation as read
      await expect(
        wyattCaller.crewMessages.markRead({ conversationId: dm.conversationId })
      ).rejects.toThrow(/not a participant/i);

      // Employee C cannot react to messages in A & B's private conversation
      await expect(
        wyattCaller.crewMessages.toggleReaction({
          messageId: sent.messageId,
          emoji: "👀",
        })
      ).rejects.toThrow(/not a participant/i);

      // Employee C cannot convert a message in A & B's private conversation to a task
      await expect(
        wyattCaller.crewMessages.convertMessageToTask({
          messageId: sent.messageId,
          taskTitle: "Unauthorized task conversion",
        })
      ).rejects.toThrow(/not a participant/i);

      // Employee C cannot create an Action Request in A & B's private conversation
      await expect(
        wyattCaller.crewMessages.createActionRequest({
          conversationId: dm.conversationId,
          assignedApproverId: byronOwner1.id,
          requestType: "Approval",
          title: "Unauthorized action request",
        })
      ).rejects.toThrow(/not a participant/i);

      // Employee C cannot fetch linked context for A & B's private conversation
      await expect(
        wyattCaller.crewMessages.getLinkedContext({ conversationId: dm.conversationId })
      ).rejects.toThrow(/not a participant/i);
    });

    it("C2. Non-approver cannot decide another user's Action Request even within a shared conversation", async () => {
      const byronCaller = appRouter.createCaller({ req: {} as any, res: {} as any, user: byronOwner1 });
      const emilyCaller = appRouter.createCaller({ req: {} as any, res: {} as any, user: emilyStaff });
      const sarahCaller = appRouter.createCaller({ req: {} as any, res: {} as any, user: sarahAdvocate });

      // Create a 3-person group chat with Byron, Emily, and Sarah
      const group = await emilyCaller.crewMessages.createGroup({
        name: "IEP Prep Trio",
        memberUserIds: [byronOwner1.id, emilyStaff.id, sarahAdvocate.id],
      });

      // Emily creates an Action Request specifically assigned to Byron (9060114)
      const ar = await emilyCaller.crewMessages.createActionRequest({
        conversationId: group.conversationId,
        assignedApproverId: byronOwner1.id,
        requestType: "Contract Approval",
        title: "Approve custom fee waiver",
      });

      // Sarah (a member of the group, but NOT the assigned approver) cannot decide the request
      await expect(
        sarahCaller.crewMessages.decideActionRequest({
          actionRequestId: ar.actionRequestId,
          decision: "approved",
        })
      ).rejects.toThrow(/Only the assigned approver/i);

      // Byron (the assigned approver) CAN decide the request
      const decision = await byronCaller.crewMessages.decideActionRequest({
        actionRequestId: ar.actionRequestId,
        decision: "approved",
        note: "Approved by owner.",
      });
      expect(decision.success).toBe(true);
    });

    it("C3. Channels and group chats continue working normally for authorized members", async () => {
      const emilyCaller = appRouter.createCaller({ req: {} as any, res: {} as any, user: emilyStaff });
      const sarahCaller = appRouter.createCaller({ req: {} as any, res: {} as any, user: sarahAdvocate });
      const wyattCaller = appRouter.createCaller({ req: {} as any, res: {} as any, user: wyattCallCenter });

      const group = await emilyCaller.crewMessages.createGroup({
        name: "Records Sync Group",
        memberUserIds: [emilyStaff.id, sarahAdvocate.id],
      });

      const msg = await sarahCaller.crewMessages.sendMessage({
        conversationId: group.conversationId,
        body: "Uploaded the psychological evaluation packet.",
      });
      expect(msg.success).toBe(true);

      const emilyRead = await emilyCaller.crewMessages.getMessages({
        conversationId: group.conversationId,
      });
      expect(emilyRead.some((m: any) => m.id === msg.messageId)).toBe(true);

      // Wyatt is not in "Records Sync Group" so he cannot read it
      await expect(
        wyattCaller.crewMessages.getMessages({ conversationId: group.conversationId })
      ).rejects.toThrow(/not a participant/i);
    });
  });

  // ============================================================================
  // TEST GROUP D — EMPLOYEE DEACTIVATION & ACCESS REVOCATION
  // ============================================================================
  describe("Test Group D — Employee Deactivation & Immediate Access Revocation", () => {
    beforeEach(async () => {
      await upsertStaffAccessProfile({
        userId: sarahAdvocate.id,
        openId: sarahAdvocate.openId,
        employeeId: "emp-test-sarah",
        name: sarahAdvocate.name,
        email: sarahAdvocate.email,
        primaryRole: "advocate",
        additionalRoles: ["documentation"],
        isProtectedOwner: false,
        hasAdminAccess: false,
        isStaff: true,
        accountStatus: "active",
        modulePermissions: {},
        caseWorkspaceAccess: {},
        permissionOverrides: {},
      });
    });

    it("D1. Deactivating an active employee immediately blocks subsequent API/messaging calls while preserving historical messages", async () => {
      const byronCaller = appRouter.createCaller({ req: {} as any, res: {} as any, user: byronOwner1 });
      const sarahCaller = appRouter.createCaller({ req: {} as any, res: {} as any, user: sarahAdvocate });

      // 1. Before deactivation, Sarah can start a DM with Byron and send a message
      const dm = await sarahCaller.crewMessages.getOrCreateDirect({
        targetUserId: byronOwner1.id,
      });
      const historicalMsg = await sarahCaller.crewMessages.sendMessage({
        conversationId: dm.conversationId,
        body: "Historical case update from Sarah before offboarding.",
      });
      expect(historicalMsg.success).toBe(true);

      // 2. Byron deactivates Sarah's account via Team Management
      const deactRes = await byronCaller.team.deactivateEmployee({
        targetUserId: sarahAdvocate.id,
        notes: "Completed offboarding checklist.",
      });
      expect(deactRes.success).toBe(true);
      expect(deactRes.profile.accountStatus).toBe("inactive");

      // 3. Sarah's existing caller/session is immediately rejected on subsequent requests
      await expect(sarahCaller.crewMessages.listConversations()).rejects.toThrow(/deactivated/i);
      await expect(
        sarahCaller.crewMessages.getMessages({ conversationId: dm.conversationId })
      ).rejects.toThrow(/deactivated/i);
      await expect(
        sarahCaller.crewMessages.sendMessage({
          conversationId: dm.conversationId,
          body: "Should be blocked after deactivation",
        })
      ).rejects.toThrow(/deactivated/i);

      // 4. Historical messages sent by Sarah remain intact and visible to Byron
      const byronMsgs = await byronCaller.crewMessages.getMessages({
        conversationId: dm.conversationId,
      });
      expect(byronMsgs.some((m: any) => m.id === historicalMsg.messageId)).toBe(true);

      // 5. Byron can reactivate Sarah and her access is restored
      const reactRes = await byronCaller.team.reactivateEmployee({
        targetUserId: sarahAdvocate.id,
      });
      expect(reactRes.success).toBe(true);
      expect(reactRes.profile.accountStatus).toBe("active");

      const restoredMsgs = await sarahCaller.crewMessages.getMessages({
        conversationId: dm.conversationId,
      });
      expect(restoredMsgs.length).toBeGreaterThan(0);
    });

    it("D2. Protected Owners (9060114 and 9060115) can never be deactivated even by themselves", async () => {
      const byronCaller1 = appRouter.createCaller({ req: {} as any, res: {} as any, user: byronOwner1 });

      await expect(
        byronCaller1.team.deactivateEmployee({ targetUserId: 9060114 })
      ).rejects.toThrow(/Protected Owner/i);

      await expect(
        byronCaller1.team.deactivateEmployee({ targetUserId: 9060115 })
      ).rejects.toThrow(/Protected Owner/i);

      await expect(
        byronCaller1.team.deactivateEmployee({ targetEmployeeId: "emp-byron-honea-2" })
      ).rejects.toThrow(/Protected Owner/i);
    });
  });

  // ============================================================================
  // TEST GROUP E — WAP 1A.2A TRUSTED TEAM MANAGEMENT & ROLES/ACCESS PERSISTENCE
  // ============================================================================
  describe("Test Group E — WAP 1A.2A Trusted Team Management Directory & Persistence", () => {
    it("E1. getStaffAccessList returns ONLY the 4 real staff accounts (9060114, 9060115, 9060249, 9060250) and excludes fictional employees and 9060031", async () => {
      const byronCaller = appRouter.createCaller({ req: {} as any, res: {} as any, user: byronOwner1 });
      const staffList = await byronCaller.team.getStaffAccessList();

      const userIds = staffList.map((s) => s.userId).sort((a, b) => a - b);
      expect(userIds).toEqual([9060114, 9060115, 9060249, 9060250]);

      // Verify no fictional staff appear
      const names = staffList.map((s) => s.name);
      expect(names).not.toContain("Sarah Jenkins");
      expect(names).not.toContain("Marcus Vance");
      expect(names).not.toContain("Elena Rostova");
      expect(names).not.toContain("Abby Miller");
      expect(names).not.toContain("Emily Davis");

      // Verify both Byron owner accounts have distinct employeeIds so directory never collides
      const b1 = staffList.find((s) => s.userId === 9060114)!;
      const b2 = staffList.find((s) => s.userId === 9060115)!;
      const kyle = staffList.find((s) => s.userId === 9060249)!;
      const wyatt = staffList.find((s) => s.userId === 9060250)!;

      expect(b1.employeeId).toBe("emp-byron-honea");
      expect(b1.isProtectedOwner).toBe(true);
      expect(b1.hasAdminAccess).toBe(true);

      expect(b2.employeeId).toBe("emp-byron-honea-2");
      expect(b2.isProtectedOwner).toBe(true);
      expect(b2.hasAdminAccess).toBe(true);

      expect(kyle.employeeId).toBe("emp-kyle-atkins");
      expect(kyle.primaryRole).toBe("technology");
      expect(kyle.additionalRoles).toContain("management");
      expect(kyle.hasAdminAccess).toBe(true);
      expect(kyle.isProtectedOwner).toBe(false);

      expect(wyatt.employeeId).toBe("emp-wyatt-smith");
      expect(wyatt.primaryRole).toBe("call_center");
      expect(wyatt.hasAdminAccess).toBe(false);
    });

    it("E2. Unauthorized accounts (Wyatt Call Center by default, 9060031, and parents) are blocked from getStaffAccessList", async () => {
      const wyattCaller = appRouter.createCaller({ req: {} as any, res: {} as any, user: wyattCallCenter });
      const disabledCaller = appRouter.createCaller({ req: {} as any, res: {} as any, user: kyleDisabledDevLogin });
      const parentCaller = appRouter.createCaller({ req: {} as any, res: {} as any, user: parentAccount1 });

      await expect(wyattCaller.team.getStaffAccessList()).rejects.toThrow(/permission/i);
      await expect(disabledCaller.team.getStaffAccessList()).rejects.toThrow();
      await expect(parentCaller.team.getStaffAccessList()).rejects.toThrow();
    });

    it("E3. Role and permission edits persist in backend staff_access_profiles and reload accurately across queries", async () => {
      const byronCaller = appRouter.createCaller({ req: {} as any, res: {} as any, user: byronOwner1 });
      const wyattCaller = appRouter.createCaller({ req: {} as any, res: {} as any, user: wyattCallCenter });

      // Byron updates Wyatt's additionalRoles, modulePermissions, caseWorkspaceAccess, and permissionOverrides
      const updated = await byronCaller.team.updateStaffAccess({
        targetUserId: 9060250,
        targetEmployeeId: "emp-wyatt-smith",
        primaryRole: "call_center",
        additionalRoles: ["documentation"],
        modulePermissions: { templates: "edit", team: "view" },
        caseWorkspaceAccess: { files: "view", notes: "edit" },
        permissionOverrides: { export_records: true },
      });

      expect(updated.success).toBe(true);
      expect(updated.profile.additionalRoles).toEqual(["documentation"]);
      expect(updated.profile.modulePermissions).toEqual({ templates: "edit", team: "view" });
      expect(updated.profile.caseWorkspaceAccess).toEqual({ files: "view", notes: "edit" });
      expect(updated.profile.permissionOverrides).toEqual({ export_records: true });

      // Reload directory via getStaffAccessList (simulating Team Management page reload)
      const reloadedList = await byronCaller.team.getStaffAccessList();
      const wyattFromList = reloadedList.find((s) => s.userId === 9060250)!;
      expect(wyattFromList.additionalRoles).toEqual(["documentation"]);
      expect(wyattFromList.modulePermissions).toEqual({ templates: "edit", team: "view" });
      expect(wyattFromList.caseWorkspaceAccess).toEqual({ files: "view", notes: "edit" });
      expect(wyattFromList.permissionOverrides).toEqual({ export_records: true });

      // Reload from Wyatt's own session via getMyStaffAccess (simulating another browser / relogin)
      const wyattMyAccess = await wyattCaller.team.getMyStaffAccess();
      expect(wyattMyAccess.additionalRoles).toEqual(["documentation"]);
      expect(wyattMyAccess.modulePermissions).toEqual({ templates: "edit", team: "view" });
      expect(wyattMyAccess.caseWorkspaceAccess).toEqual({ files: "view", notes: "edit" });
      expect(wyattMyAccess.permissionOverrides).toEqual({ export_records: true });

      // Because Wyatt was granted team: "view", he can now view getStaffAccessList
      const wyattList = await wyattCaller.team.getStaffAccessList();
      expect(wyattList.length).toBe(4);
    });

    it("E4. Deactivated real staff remain visible in getStaffAccessList with accountStatus='inactive' so admins can reactivate them", async () => {
      const byronCaller = appRouter.createCaller({ req: {} as any, res: {} as any, user: byronOwner1 });

      await byronCaller.team.deactivateEmployee({
        targetUserId: 9060250,
        targetEmployeeId: "emp-wyatt-smith",
        notes: "Temporary suspension test",
      });

      const listAfterDeactivate = await byronCaller.team.getStaffAccessList();
      const wyattInactive = listAfterDeactivate.find((s) => s.userId === 9060250)!;
      expect(wyattInactive).toBeDefined();
      expect(wyattInactive.accountStatus).toBe("inactive");

      await byronCaller.team.reactivateEmployee({
        targetUserId: 9060250,
        targetEmployeeId: "emp-wyatt-smith",
      });

      const listAfterReactivate = await byronCaller.team.getStaffAccessList();
      const wyattActive = listAfterReactivate.find((s) => s.userId === 9060250)!;
      expect(wyattActive.accountStatus).toBe("active");
    });
  });
});


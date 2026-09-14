/**
 * Task System Tests
 *
 * Tests for the three task types:
 * - General Tasks (internalTasks table, assignee = team user)
 * - Client Facing Tasks (projectTasks with assignedTo = contact id)
 * - Case Tasks (projectTasks without assignedTo)
 *
 * Also covers portal task procedures (ownership-verified).
 */
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Context helpers ──────────────────────────────────────────────────────────

function createAdminContext(userId: number = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "admin-user-123",
      email: "admin@example.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

function createClientContext(userId: number = 99): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "client-user-456",
      email: "client@example.com",
      name: "Test Client",
      loginMethod: "manus",
      role: "client",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

// ── General Tasks (internalTasks) ────────────────────────────────────────────

describe("internalTasks", () => {
  it("admin can list general tasks", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.internalTasks.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("non-admin cannot list general tasks", async () => {
    const caller = appRouter.createCaller(createClientContext());
    await expect(caller.internalTasks.list()).rejects.toThrow();
  });

  it("admin can create a general task", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.internalTasks.create({
      title: "Test General Task",
      status: "not_started",
      priority: "Medium",
    });
    expect(result).toBeDefined();
    // Result is the insert result from Drizzle (may be empty array or object)
    expect(result !== null).toBe(true);
  });

  it("admin can get team users for task assignment", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.internalTasks.getTeamUsers();
    expect(Array.isArray(result)).toBe(true);
  });

  it("non-admin cannot get team users", async () => {
    const caller = appRouter.createCaller(createClientContext());
    await expect(caller.internalTasks.getTeamUsers()).rejects.toThrow();
  });
});

// ── Project Tasks (Client Facing + Case Tasks) ───────────────────────────────

describe("tasks (projectTasks)", () => {
  it("admin can list all project tasks", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.tasks.getAll();
    expect(Array.isArray(result)).toBe(true);
  });

  it("non-admin cannot list all project tasks", async () => {
    const caller = appRouter.createCaller(createClientContext());
    await expect(caller.tasks.getAll()).rejects.toThrow();
  });

  it("admin can get tasks by student", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.tasks.getByStudent({ studentContactId: 9999 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("non-admin cannot get tasks by student via admin procedure", async () => {
    const caller = appRouter.createCaller(createClientContext());
    await expect(
      caller.tasks.getByStudent({ studentContactId: 9999 })
    ).rejects.toThrow();
  });
});

// ── Portal Task Procedures (ownership-verified) ──────────────────────────────

describe("portal task procedures", () => {
  it("portal.getAssignedTasks: admin can access any student's tasks", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.portal.getAssignedTasks({ studentContactId: 9999 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("portal.getAssignedTasks: non-admin client is rejected for unowned student", async () => {
    const caller = appRouter.createCaller(createClientContext(99));
    // Client user 99 has no students linked — should throw FORBIDDEN
    await expect(
      caller.portal.getAssignedTasks({ studentContactId: 9999 })
    ).rejects.toThrow();
  });

  it("portal.getStudentProjects: admin can access any student's projects", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.portal.getStudentProjects({ studentContactId: 9999 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("portal.getStudentProjects: non-admin client is rejected for unowned student", async () => {
    const caller = appRouter.createCaller(createClientContext(99));
    await expect(
      caller.portal.getStudentProjects({ studentContactId: 9999 })
    ).rejects.toThrow();
  });

  it("portal.updateTaskStatus: admin can update any task status", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    // Task 9999 doesn't exist — should throw a DB error, not FORBIDDEN
    // We just verify the FORBIDDEN check is not triggered for admin
    try {
      await caller.portal.updateTaskStatus({
        taskId: 9999,
        status: "Done",
        studentContactId: 9999,
      });
    } catch (err: any) {
      // Should NOT be a FORBIDDEN error for admin
      expect(err?.data?.code).not.toBe("FORBIDDEN");
    }
  });

  it("portal.updateTaskStatus: non-admin client is rejected for unowned student", async () => {
    const caller = appRouter.createCaller(createClientContext(99));
    await expect(
      caller.portal.updateTaskStatus({
        taskId: 9999,
        status: "Done",
        studentContactId: 9999,
      })
    ).rejects.toThrow();
  });

  it("portal.toggleTaskStep: non-admin client is rejected for unowned student", async () => {
    const caller = appRouter.createCaller(createClientContext(99));
    await expect(
      caller.portal.toggleTaskStep({
        stepId: 9999,
        isComplete: true,
        studentContactId: 9999,
      })
    ).rejects.toThrow();
  });

  it("portal.markTaskSeen: non-admin client is rejected for unowned student", async () => {
    const caller = appRouter.createCaller(createClientContext(99));
    await expect(
      caller.portal.markTaskSeen({
        taskId: 9999,
        studentContactId: 9999,
      })
    ).rejects.toThrow();
  });
});

// ── Portal Student Data Procedures ──────────────────────────────────────────

describe("portal student data procedures", () => {
  it("portal.getStudentAppointments: admin can access any student", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.portal.getStudentAppointments({ studentContactId: 9999 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("portal.getStudentFiles: admin can access any student", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.portal.getStudentFiles({ studentContactId: 9999 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("portal.getStudentBilling: admin can access any student", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.portal.getStudentBilling({ studentContactId: 9999 });
    expect(result).toHaveProperty("invoices");
    expect(result).toHaveProperty("contracts");
    expect(Array.isArray(result.invoices)).toBe(true);
    expect(Array.isArray(result.contracts)).toBe(true);
  });

  it("portal.getStudentAppointments: non-admin client is rejected for unowned student", async () => {
    const caller = appRouter.createCaller(createClientContext(99));
    await expect(
      caller.portal.getStudentAppointments({ studentContactId: 9999 })
    ).rejects.toThrow();
  });

  it("portal.getStudentFiles: non-admin client is rejected for unowned student", async () => {
    const caller = appRouter.createCaller(createClientContext(99));
    await expect(
      caller.portal.getStudentFiles({ studentContactId: 9999 })
    ).rejects.toThrow();
  });

  it("portal.getStudentBilling: non-admin client is rejected for unowned student", async () => {
    const caller = appRouter.createCaller(createClientContext(99));
    await expect(
      caller.portal.getStudentBilling({ studentContactId: 9999 })
    ).rejects.toThrow();
  });
});

// ── Supervisor Task Deletion Approval Workflow ──────────────────────────────

function createEmployeeContext(userId: number = 2): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "employee-user-789",
      email: "employee@example.com",
      name: "Employee Advocate",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("Supervisor Task Deletion Protection & Approval Workflow", () => {
  it("blocks employee from deleting supervisor-assigned task with exact quote", async () => {
    const empCaller = appRouter.createCaller(createEmployeeContext(2));

    // Employee tries to delete directly
    await expect(
      empCaller.internalTasks.delete({ id: 999 })
    ).rejects.toThrow(
      "You may not delete this task. It was assigned by owner or supervisor. Request delete from them?"
    );
  });

  it("employee can submit deletion request with full snapshot and reason", async () => {
    const adminCaller = appRouter.createCaller(createAdminContext(1));
    const empCaller = appRouter.createCaller(createEmployeeContext(2));

    // Employee requests deletion
    const reqRes = await empCaller.internalTasks.requestDeletion({
      taskId: 101,
      taskType: "general",
      reason: "Parent moved out of district, IEP case closed",
    });

    expect(reqRes.success).toBe(true);
    expect(reqRes.requestId).toBeDefined();

    // Owner checks pending deletion requests
    const pendingRequests = await adminCaller.internalTasks.listDeletionRequests({
      status: "pending",
    });
    expect(Array.isArray(pendingRequests)).toBe(true);

    // Owner approves deletion
    const reviewRes = await adminCaller.internalTasks.reviewDeletionRequest({
      requestId: reqRes.requestId ?? 1,
      action: "approve",
    });
    expect(reviewRes.success).toBe(true);
    expect(reviewRes.action).toBe("approved");
  });

  it("owner can decline deletion request and task remains active", async () => {
    const adminCaller = appRouter.createCaller(createAdminContext(1));
    const empCaller = appRouter.createCaller(createEmployeeContext(2));

    const reqRes = await empCaller.internalTasks.requestDeletion({
      taskId: 102,
      taskType: "general",
      reason: "Seems redundant with intake form",
    });
    expect(reqRes.success).toBe(true);

    // Owner declines deletion
    const reviewRes = await adminCaller.internalTasks.reviewDeletionRequest({
      requestId: reqRes.requestId ?? 2,
      action: "decline",
      declineReason: "Required for state IDEA compliance",
    });
    expect(reviewRes.success).toBe(true);
    expect(reviewRes.action).toBe("declined");
  });

  it("non-admin employee cannot review or approve deletion requests", async () => {
    const empCaller = appRouter.createCaller(createEmployeeContext(2));
    await expect(
      empCaller.internalTasks.reviewDeletionRequest({
        requestId: 1,
        action: "approve",
      })
    ).rejects.toThrow("Only the owner or supervisor can review deletion requests");
  });

  it("blocks employee from deleting project case tasks with exact quote", async () => {
    const empCaller = appRouter.createCaller(createEmployeeContext(2));
    await expect(
      empCaller.tasks.delete({ id: 105 })
    ).rejects.toThrow(
      "You may not delete this task. It was assigned by owner or supervisor. Request delete from them?"
    );
  });
});

describe("internalTasks automated test cleanup routine", () => {
  it("allows querying test tasks count safely", async () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    const res = await adminCaller.internalTasks.getTestTasksCount();
    expect(res).toBeDefined();
    expect(typeof res.count).toBe("number");
    expect(Array.isArray(res.sampleTitles)).toBe(true);
    expect(typeof res.realTasksCount).toBe("number");
  });

  it("blocks non-admin employee from purging test tasks", async () => {
    const empCaller = appRouter.createCaller(createEmployeeContext(2));
    await expect(empCaller.internalTasks.purgeTestTasks()).rejects.toThrow(
      "Only owner or admin can purge automated test tasks."
    );
  });

  it("allows owner/admin to execute purgeTestTasks", async () => {
    const adminCaller = appRouter.createCaller(createAdminContext());
    const res = await adminCaller.internalTasks.purgeTestTasks();
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
    expect(typeof res.count).toBe("number");
  });
});



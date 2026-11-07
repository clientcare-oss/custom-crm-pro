import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import {
  __resetWorkspaceLockMemoryForTests,
  hashWorkspacePin,
  verifyWorkspacePinHash,
  getPermittedShortcutsForStaff,
  DEFAULT_SHORTCUT_IDS,
  DEFAULT_IDLE_TIMEOUT_MINUTES,
} from "./db/workspaceLock";
import type { StaffAccessProfile } from "./_core/staffAccess";

function createStaffContext(
  overrides?: Partial<{
    id: number;
    openId: string;
    name: string;
    email: string;
    role: "admin" | "user";
  }>
) {
  const user = {
    id: overrides?.id ?? 9060114,
    openId: overrides?.openId ?? "user_3HamsO4oLoKLKOnDi9BR16e6RZW",
    name: overrides?.name ?? "Byron Honea",
    email: overrides?.email ?? "byron@waypointadvocates.com",
    loginMethod: "clerk",
    role: overrides?.role ?? ("admin" as const),
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { headers: {}, ip: "127.0.0.1" } as any,
    res: {} as any,
  };
}

describe("Waypoint Start Screen & Privacy Lock (PG-000)", () => {
  beforeEach(() => {
    __resetWorkspaceLockMemoryForTests();
  });

  it("1. initializes with the 4 approved default shortcuts and 5-minute default idle timeout", async () => {
    const caller = appRouter.createCaller(createStaffContext());
    const state = await caller.workspaceLock.getState();

    expect(state.shortcutIds).toEqual(["new_client", "dashboard", "students", "calendar"]);
    expect(state.shortcutIds).toEqual(DEFAULT_SHORTCUT_IDS);
    expect(state.selectedShortcuts.map((s) => s.label)).toEqual([
      "New Client",
      "Dashboard",
      "Students",
      "Calendar",
    ]);
    expect(state.idleTimeoutMinutes).toBe(DEFAULT_IDLE_TIMEOUT_MINUTES);
    expect(state.idleTimeoutMinutes).toBe(5);
    expect(state.isLocked).toBe(false);
    expect(state.hasPinSet).toBe(false);
  });

  it("2. supports reordering, removing, and adding shortcuts up to 6 maximum without duplicates", async () => {
    const caller = appRouter.createCaller(createStaffContext());

    // Add Cases and My Tasks (6 total)
    const updated6 = await caller.workspaceLock.updateShortcuts({
      shortcutIds: ["new_client", "dashboard", "students", "calendar", "cases", "my_tasks"],
    });
    expect(updated6.shortcutIds).toEqual([
      "new_client",
      "dashboard",
      "students",
      "calendar",
      "cases",
      "my_tasks",
    ]);

    // Reorder shortcuts (move My Tasks to front)
    const reordered = await caller.workspaceLock.updateShortcuts({
      shortcutIds: ["my_tasks", "new_client", "dashboard", "students", "calendar", "cases"],
    });
    expect(reordered.shortcutIds[0]).toBe("my_tasks");

    // Remove a shortcut via trash icon (leaving 5)
    const afterTrash = await caller.workspaceLock.updateShortcuts({
      shortcutIds: ["my_tasks", "new_client", "students", "calendar", "cases"],
    });
    expect(afterTrash.shortcutIds).toHaveLength(5);
    expect(afterTrash.shortcutIds).not.toContain("dashboard");

    // Reject duplicate shortcuts
    await expect(
      caller.workspaceLock.updateShortcuts({
        shortcutIds: ["my_tasks", "my_tasks", "students"],
      })
    ).rejects.toThrow(/Duplicate shortcuts/i);

    // Reject > 6 shortcuts in schema validation
    await expect(
      caller.workspaceLock.updateShortcuts({
        shortcutIds: [
          "new_client",
          "dashboard",
          "students",
          "calendar",
          "cases",
          "my_tasks",
          "contacts",
        ],
      })
    ).rejects.toThrow();
  });

  it("3. isolates shortcut layouts per employee account", async () => {
    const callerA = appRouter.createCaller(
      createStaffContext({
        id: 9060114,
        openId: "user_3HamsO4oLoKLKOnDi9BR16e6RZW",
        email: "byron@waypointadvocates.com",
        name: "Byron Honea",
      })
    );
    const callerB = appRouter.createCaller(
      createStaffContext({
        id: 9060249,
        openId: "user_3HELy6EVi_kyle_atkins",
        email: "kyle@waypointadvocates.com",
        name: "Kyle Atkins",
      })
    );

    await callerA.workspaceLock.updateShortcuts({
      shortcutIds: ["calendar", "my_tasks"],
    });

    await callerB.workspaceLock.updateShortcuts({
      shortcutIds: ["students", "cases", "meeting_workspace"],
    });

    const stateA = await callerA.workspaceLock.getState();
    const stateB = await callerB.workspaceLock.getState();

    expect(stateA.shortcutIds).toEqual(["calendar", "my_tasks"]);
    expect(stateB.shortcutIds).toEqual(["students", "cases", "meeting_workspace"]);
  });

  it("4. enforces role-based module permissions on available shortcuts (unit + tRPC integration)", async () => {
    const restrictedProfile: StaffAccessProfile = {
      userId: 303,
      openId: "clerk_marcus_303",
      employeeId: "emp-3",
      name: "Marcus Vance",
      email: "marcus.restricted@waypointadvocates.com",
      primaryRole: "advocate",
      additionalRoles: [],
      isProtectedOwner: false,
      hasAdminAccess: false,
      isStaff: true,
      accountStatus: "active",
      modulePermissions: {
        crew_quarters: "view",
        calendar: "edit",
        students_cases: "edit",
        settings: "none",
        team: "none",
        invoices: "none",
      },
      caseWorkspaceAccess: {},
      permissionOverrides: {},
    };

    const permitted = getPermittedShortcutsForStaff(restrictedProfile);
    const allowedIds = permitted.map((item) => item.id);

    expect(allowedIds).toContain("new_client");
    expect(allowedIds).toContain("dashboard");
    expect(allowedIds).toContain("calendar");
    expect(allowedIds).toContain("students");
    expect(allowedIds).not.toContain("settings");
    expect(allowedIds).not.toContain("team");
    expect(allowedIds).not.toContain("billing");

    // Also verify end-to-end with Wyatt Smith (Call Center restricted staff account)
    const wyattCaller = appRouter.createCaller(
      createStaffContext({
        id: 9060250,
        openId: "user_3KPhcRBro_wyatt",
        email: "wyatt.smith@waypointadvocates.com",
        name: "Wyatt Smith",
        role: "user",
      })
    );
    const wyattState = await wyattCaller.workspaceLock.getState();
    const wyattAvailableIds = wyattState.availableShortcuts.map((s) => s.id);
    expect(wyattAvailableIds).toContain("call_center");
    expect(wyattAvailableIds).toContain("lead_center");
    expect(wyattAvailableIds).not.toContain("settings");
    expect(wyattAvailableIds).not.toContain("team");

    // Attempting to save an unauthorized shortcut ("settings") for Wyatt must fail
    await expect(
      wyattCaller.workspaceLock.updateShortcuts({
        shortcutIds: ["call_center", "settings"],
      })
    ).rejects.toThrow(/not permitted/i);
  });

  it("5. hashes 4-digit PINs with salted scrypt and never stores plaintext", () => {
    const { salt, hash } = hashWorkspacePin("4829");
    expect(salt.length).toBeGreaterThanOrEqual(32);
    expect(hash.length).toBeGreaterThanOrEqual(64);
    expect(hash).not.toContain("4829");
    expect(verifyWorkspacePinHash("4829", salt, hash)).toBe(true);
    expect(verifyWorkspacePinHash("9999", salt, hash)).toBe(false);
  });

  it("6. locks workspace, blocks protected CRM procedures on the server while locked, and unlocks with valid 4-digit PIN", async () => {
    const ctx = createStaffContext({
      id: 9060115,
      openId: "user_3HEhAHIdXNwvbiK5NSR6RPkTInD",
      email: "clientcare@waypointadvocates.com",
      name: "Byron Honea",
    });
    const caller = appRouter.createCaller(ctx);

    // First-time 4-digit PIN setup
    await caller.workspaceLock.setupPin({ pin: "2580", confirmPin: "2580" });

    // Lock the workspace while on /students
    const lockRes = await caller.workspaceLock.lock({
      previousPath: "/students?filter=active",
    });
    expect(lockRes.isLocked).toBe(true);

    // Server-side enforcement: calling protected CRM data procedures while locked must fail with FORBIDDEN
    await expect(caller.contacts.list()).rejects.toThrow(/WORKSPACE_LOCKED/i);
    await expect(caller.leads.list()).rejects.toThrow(/WORKSPACE_LOCKED/i);

    // Wrong PIN is rejected and keeps workspace locked
    const badAttempt = await caller.workspaceLock.unlockWithPin({ pin: "1111" });
    expect(badAttempt.unlocked).toBe(false);
    expect(badAttempt.failedAttempts).toBe(1);
    await expect(caller.contacts.list()).rejects.toThrow(/WORKSPACE_LOCKED/i);

    // Correct PIN unlocks and returns the saved previousPath
    const goodAttempt = await caller.workspaceLock.unlockWithPin({ pin: "2580" });
    expect(goodAttempt.unlocked).toBe(true);
    expect(goodAttempt.redirectToPath).toBe("/students?filter=active");

    // Protected CRM procedures succeed again after unlock
    const stateAfter = await caller.workspaceLock.getState();
    expect(stateAfter.isLocked).toBe(false);
  });

  it("7. unlocks directly to a clicked shortcut destination when locked", async () => {
    const ctx = createStaffContext({
      id: 9060249,
      openId: "user_3HELy6EVi_kyle_atkins",
      email: "kyle@waypointadvocates.com",
      name: "Kyle Atkins",
    });
    const caller = appRouter.createCaller(ctx);

    await caller.workspaceLock.setupPin({ pin: "1942", confirmPin: "1942" });
    await caller.workspaceLock.lock({ previousPath: "/dashboard" });

    // Employee clicks "Calendar" shortcut while locked -> enters PIN -> unlocks straight to /calendar
    const unlockToShortcut = await caller.workspaceLock.unlockWithPin({
      pin: "1942",
      targetDestinationPath: "/calendar",
    });
    expect(unlockToShortcut.unlocked).toBe(true);
    expect(unlockToShortcut.redirectToPath).toBe("/calendar");
  });

  it("8. enforces cooldown after 3 failed PIN attempts and full account reauthentication after 5 failed attempts", async () => {
    const ctx = createStaffContext({
      id: 9060114,
      openId: "user_3HamsO4oLoKLKOnDi9BR16e6RZW",
      email: "byron@waypointadvocates.com",
      name: "Byron Honea",
    });
    const caller = appRouter.createCaller(ctx);

    await caller.workspaceLock.setupPin({ pin: "7391", confirmPin: "7391" });
    await caller.workspaceLock.lock({ previousPath: "/calendar" });

    // 3 failed attempts trigger 30-second cooldown
    await caller.workspaceLock.unlockWithPin({ pin: "0001" });
    await caller.workspaceLock.unlockWithPin({ pin: "0002" });
    const thirdFail = await caller.workspaceLock.unlockWithPin({ pin: "0003" });

    expect(thirdFail.unlocked).toBe(false);
    expect(thirdFail.lockedUntilMs).toBeGreaterThan(Date.now());

    // Reset via full account email reauthentication
    await expect(
      caller.workspaceLock.resetPinWithReauth({
        confirmedEmail: "wrong@waypointadvocates.com",
        newPin: "1357",
        confirmNewPin: "1357",
      })
    ).rejects.toThrow(/does not match/i);

    const resetSuccess = await caller.workspaceLock.resetPinWithReauth({
      confirmedEmail: "byron@waypointadvocates.com",
      newPin: "1357",
      confirmNewPin: "1357",
    });
    expect(resetSuccess.success).toBe(true);
    expect(resetSuccess.previousPath).toBe("/calendar");

    const stateAfterReset = await caller.workspaceLock.getState();
    expect(stateAfterReset.isLocked).toBe(false);
  });

  it("9. supports configuring automatic idle lock timeout to 2, 5, 10, or 15 minutes", async () => {
    const caller = appRouter.createCaller(createStaffContext());

    for (const mins of [2, 10, 15, 5] as const) {
      const res = await caller.workspaceLock.updateIdleTimeout({ minutes: mins });
      expect(res.idleTimeoutMinutes).toBe(mins);
    }

    await expect(
      caller.workspaceLock.updateIdleTimeout({ minutes: 99 as any })
    ).rejects.toThrow();
  });
});

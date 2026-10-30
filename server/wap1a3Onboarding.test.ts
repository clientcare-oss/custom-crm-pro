import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { resetStaffAccessMemoryToDefaults } from "./_core/staffAccess";
import { clearOnboardingTestState } from "./_core/staffOnboarding";
import { hydrateEmployeesFromBackend } from "../client/src/components/team/teamStore";
import type { TrpcContext, AuthenticatedUser } from "./_core/trpc";

function makeStaffCtx(params: {
  id: number;
  openId: string;
  name: string;
  email: string;
  role?: "admin" | "user" | "advocate";
  loginMethod?: string;
}): TrpcContext {
  const user: AuthenticatedUser = {
    id: params.id,
    openId: params.openId,
    email: params.email,
    name: params.name,
    loginMethod: params.loginMethod ?? "clerk",
    role: (params.role ?? "user") as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function makePublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("WAP 1A.3: Employee Onboarding, Invitation Lifecycle & Account Activation", () => {
  const byronCaller = appRouter.createCaller(
    makeStaffCtx({
      id: 9060114,
      openId: "user_3HamsO4oLoKLKOnDi9BR16e6RZW",
      name: "Byron Honea",
      email: "byron@waypointadvocates.com",
      role: "admin",
    })
  );

  const kyleCaller = appRouter.createCaller(
    makeStaffCtx({
      id: 9060249,
      openId: "user_3HELy6EVi_kyle_atkins",
      name: "Kyle Atkins",
      email: "kyle@waypointadvocates.com",
      role: "admin",
    })
  );

  const wyattCaller = appRouter.createCaller(
    makeStaffCtx({
      id: 9060250,
      openId: "user_3KPhcRBro_wyatt",
      name: "Wyatt Smith",
      email: "wyatt.smith@waypointadvocates.com",
      role: "user",
    })
  );

  const publicCaller = appRouter.createCaller(makePublicCtx());

  beforeEach(async () => {
    await resetStaffAccessMemoryToDefaults();
    clearOnboardingTestState();
  });

  it("1. Completes the full employee journey: Add Employee → Assign Role → Send Invitation → Accept Invitation → Activate Account → Appear in Directory & Crew Quarters → Access Authorized Features", async () => {
    // Step 1-3: Management adds employee via wizard payload and sends invitation
    const onboarded = await byronCaller.team.onboardEmployee({
      name: "Rachel Adams",
      preferredName: "Rachel",
      email: "rachel.adams@waypointadvocates.com",
      phone: "(404) 555-0155",
      jobTitle: "Special Education Advocate",
      employmentType: "Full-Time",
      department: "Advocacy Casework",
      normalScheduleSummary: "Mon–Fri 9:00 AM – 4:00 PM",
      primaryRole: "advocate",
      additionalRoles: ["documentation"],
      sendInvite: true,
      originUrl: "http://localhost:3000",
    });

    expect(onboarded.success).toBe(true);
    expect(onboarded.invitation.status).toBe("pending");
    expect(onboarded.invitation.emailSent).toBe(true);
    expect(onboarded.invitation.token).toBeTruthy();
    expect(onboarded.profile.accountStatus).toBe("inactive");
    expect(onboarded.profile.invitationStatus).toBe("pending");
    expect(onboarded.profile.primaryRole).toBe("advocate");
    expect(onboarded.profile.isProtectedOwner).toBe(false);

    // Step 4: Verify Pending status in Team Management directory & getEmployeeInvitation
    const inviteDetails = await publicCaller.team.getEmployeeInvitation({
      token: onboarded.invitation.token,
    });
    expect(inviteDetails?.status).toBe("pending");
    expect(inviteDetails?.email).toBe("rachel.adams@waypointadvocates.com");

    // Before accepting invitation, Rachel's account is inactive and cannot access internal CRM endpoints
    const preAcceptCaller = appRouter.createCaller(
      makeStaffCtx({
        id: onboarded.profile.userId,
        openId: onboarded.profile.openId,
        name: "Rachel Adams",
        email: "rachel.adams@waypointadvocates.com",
      })
    );
    await expect(preAcceptCaller.contacts.list()).rejects.toThrow(/deactivated|not authorized/i);

    // Step 6: Rachel accepts the invitation -> account activates and binds Clerk identity
    const accepted = await publicCaller.team.acceptEmployeeInvitation({
      token: onboarded.invitation.token,
      acceptingOpenId: "user_clerk_rachel_adams",
      acceptingEmail: "rachel.adams@waypointadvocates.com",
    });

    expect(accepted.success).toBe(true);
    expect(accepted.profile.accountStatus).toBe("active");
    expect(accepted.profile.invitationStatus).toBe("accepted");
    expect(accepted.profile.openId).toBe("user_clerk_rachel_adams");
    expect(accepted.profile.acceptedAt).toBeTruthy();

    // Step 7: Verify activated employee appears in Team Management directory AND Crew Quarters
    const backendList = await byronCaller.team.getStaffAccessList();
    const rachelBackend = backendList.find(
      (p) => p.email === "rachel.adams@waypointadvocates.com"
    );
    expect(rachelBackend).toBeDefined();
    expect(rachelBackend?.accountStatus).toBe("active");
    expect(rachelBackend?.invitationStatus).toBe("accepted");

    const hydratedDirectory = hydrateEmployeesFromBackend(backendList as any, []);
    const rachelInDirectory = hydratedDirectory.find(
      (e) => e.email === "rachel.adams@waypointadvocates.com"
    );
    expect(rachelInDirectory).toBeDefined();
    expect(rachelInDirectory?.status).toBe("active");
    expect(rachelInDirectory?.invitationStatus).toBe("accepted");
    expect(rachelInDirectory?.jobTitle).toBe("Special Education Advocate");

    const crewEmployees = await byronCaller.crewMessages.listEmployees();
    const rachelInCrewQuarters = crewEmployees.find(
      (e) => e.email === "rachel.adams@waypointadvocates.com"
    );
    expect(rachelInCrewQuarters).toBeDefined();
    expect(rachelInCrewQuarters?.name).toBe("Rachel Adams");

    // Step 8: Activated employee can access authorized Advocate features, but cannot access admin-only employee management
    const activeRachelCaller = appRouter.createCaller(
      makeStaffCtx({
        id: accepted.profile.userId,
        openId: "user_clerk_rachel_adams",
        name: "Rachel Adams",
        email: "rachel.adams@waypointadvocates.com",
      })
    );

    const rachelAccess = await activeRachelCaller.team.getMyStaffAccess();
    expect(rachelAccess.isStaff).toBe(true);
    expect(rachelAccess.accountStatus).toBe("active");
    expect(rachelAccess.primaryRole).toBe("advocate");

    const contacts = await activeRachelCaller.contacts.list();
    expect(Array.isArray(contacts)).toBe(true);

    // Advocate cannot onboard or deactivate other employees
    await expect(
      activeRachelCaller.team.onboardEmployee({
        name: "Unauthorized Hire",
        email: "unauth@waypointadvocates.com",
        jobTitle: "Advocate",
        primaryRole: "advocate",
      })
    ).rejects.toThrow(/FORBIDDEN|Only authorized management/i);
  });

  it("2. Enforces invitation expiration, resend, and revocation accurately", async () => {
    const onboarded = await byronCaller.team.onboardEmployee({
      name: "Devon Brooks",
      email: "devon.brooks@waypointadvocates.com",
      jobTitle: "Operations Coordinator",
      primaryRole: "operations",
      sendInvite: true,
    });
    const firstToken = onboarded.invitation.token;

    // Expire the invitation
    const expiredRes = await byronCaller.team.expireEmployeeInvitation({
      targetUserId: onboarded.profile.userId,
    });
    expect(expiredRes.profile.invitationStatus).toBe("expired");

    // Attempting to accept an expired invitation fails
    await expect(
      publicCaller.team.acceptEmployeeInvitation({
        token: firstToken,
        acceptingEmail: "devon.brooks@waypointadvocates.com",
      })
    ).rejects.toThrow(/expired/i);

    // Resend the invitation -> generates a new token and resets status to pending
    const resentRes = await byronCaller.team.resendEmployeeInvitation({
      targetUserId: onboarded.profile.userId,
    });
    expect(resentRes.invitation.status).toBe("pending");
    const secondToken = resentRes.invitation.token;
    expect(secondToken).not.toBe(firstToken);

    // Old token remains invalid after resend
    await expect(
      publicCaller.team.acceptEmployeeInvitation({
        token: firstToken,
        acceptingEmail: "devon.brooks@waypointadvocates.com",
      })
    ).rejects.toThrow(/revoked|superseded/i);

    // Revoke the second invitation
    const revokedRes = await byronCaller.team.revokeEmployeeInvitation({
      targetUserId: onboarded.profile.userId,
    });
    expect(revokedRes.profile.invitationStatus).toBe("revoked");

    // Attempting to accept a revoked invitation fails
    await expect(
      publicCaller.team.acceptEmployeeInvitation({
        token: secondToken,
        acceptingEmail: "devon.brooks@waypointadvocates.com",
      })
    ).rejects.toThrow(/revoked/i);

    // Resend a third time and accept -> activates account
    const thirdInvite = await byronCaller.team.resendEmployeeInvitation({
      targetUserId: onboarded.profile.userId,
    });
    const accepted = await publicCaller.team.acceptEmployeeInvitation({
      token: thirdInvite.invitation.token,
      acceptingEmail: "devon.brooks@waypointadvocates.com",
      acceptingOpenId: "user_clerk_devon_brooks",
    });
    expect(accepted.profile.accountStatus).toBe("active");
    expect(accepted.profile.invitationStatus).toBe("accepted");
  });

  it("3. Prevents duplicate employee accounts, protects baseline staff/owners, and blocks privilege escalation", async () => {
    await byronCaller.team.onboardEmployee({
      name: "Morgan Lee",
      email: "morgan.lee@waypointadvocates.com",
      jobTitle: "Records Specialist",
      primaryRole: "documentation",
    });

    // Duplicate email is rejected with CONFLICT
    await expect(
      byronCaller.team.onboardEmployee({
        name: "Morgan Lee Duplicate",
        email: "MORGAN.LEE@waypointadvocates.com",
        jobTitle: "Advocate",
        primaryRole: "advocate",
      })
    ).rejects.toThrow(/already exists/i);

    // Protected Owners, Kyle, and Wyatt cannot be overwritten via onboarding
    await expect(
      byronCaller.team.onboardEmployee({
        name: "Byron Clone",
        email: "byron@waypointadvocates.com",
        jobTitle: "Owner",
        primaryRole: "management",
      })
    ).rejects.toThrow(/Protected Owner|cannot be overwritten/i);

    await expect(
      byronCaller.team.onboardEmployee({
        name: "Wyatt Clone",
        email: "wyatt.smith@waypointadvocates.com",
        jobTitle: "Call Center",
        primaryRole: "call_center",
      })
    ).rejects.toThrow(/cannot be overwritten/i);

    // Call Center (Wyatt) is strictly blocked from all employee onboarding/invitation mutations
    await expect(
      wyattCaller.team.onboardEmployee({
        name: "Call Center Hire Attempt",
        email: "unauthorized.hire@waypointadvocates.com",
        jobTitle: "Advocate",
        primaryRole: "advocate",
      })
    ).rejects.toThrow(/FORBIDDEN|Only authorized management/i);

    await expect(
      wyattCaller.team.resendEmployeeInvitation({
        targetEmployeeId: "emp-wyatt-smith",
      })
    ).rejects.toThrow(/FORBIDDEN|Only authorized management/i);

    await expect(
      wyattCaller.team.revokeEmployeeInvitation({
        targetEmployeeId: "emp-kyle-atkins",
      })
    ).rejects.toThrow(/FORBIDDEN|Only authorized management/i);
  });

  it("4. Immediately revokes CRM and Crew Quarters access when an onboarded employee is deactivated", async () => {
    const onboarded = await kyleCaller.team.onboardEmployee({
      name: "Taylor Vance",
      email: "taylor.vance@waypointadvocates.com",
      jobTitle: "Special Education Advocate",
      primaryRole: "advocate",
    });

    const accepted = await publicCaller.team.acceptEmployeeInvitation({
      token: onboarded.invitation.token,
      acceptingOpenId: "user_clerk_taylor_vance",
      acceptingEmail: "taylor.vance@waypointadvocates.com",
    });

    const taylorCaller = appRouter.createCaller(
      makeStaffCtx({
        id: accepted.profile.userId,
        openId: "user_clerk_taylor_vance",
        name: "Taylor Vance",
        email: "taylor.vance@waypointadvocates.com",
      })
    );

    // Active Taylor can access CRM
    const beforeDeactivation = await taylorCaller.contacts.list();
    expect(Array.isArray(beforeDeactivation)).toBe(true);

    // Management deactivates Taylor
    const deactivated = await byronCaller.team.deactivateEmployee({
      targetUserId: accepted.profile.userId,
      notes: "Completed contract term",
    });
    expect(deactivated.profile.accountStatus).toBe("inactive");

    // Deactivated Taylor is immediately blocked from CRM & Crew Quarters endpoints
    await expect(taylorCaller.contacts.list()).rejects.toThrow(/deactivated|not authorized/i);
    await expect(taylorCaller.crewMessages.listConversations()).rejects.toThrow(
      /deactivated|not authorized/i
    );

    // Deactivated Taylor no longer appears in active Crew Quarters employee list
    const activeCrew = await byronCaller.crewMessages.listEmployees();
    expect(activeCrew.some((e) => e.email === "taylor.vance@waypointadvocates.com")).toBe(false);
  });
});


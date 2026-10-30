import crypto from "crypto";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { createClerkClient } from "@clerk/backend";
import { getDb } from "../db/connection";
import { teamInvites, users } from "../../drizzle/schema";
import {
  resolveStaffAccess,
  listStaffAccessProfiles,
  findTargetStaffProfile,
  upsertStaffAccessProfile,
  checkBackendActionPermission,
  computeEffectiveInvitationStatus,
  PROTECTED_OWNER_USER_IDS,
  PROTECTED_OWNER_OPEN_IDS,
  PROTECTED_OWNER_EMPLOYEE_IDS,
  type StaffAccessProfile,
  type StaffRoleId,
  type ModuleAccessLevel,
  type CaseAccessLevel,
  type StaffInvitationStatus,
} from "./staffAccess";

const IMMUTABLE_BASELINE_USER_IDS = new Set<number>([9060114, 9060115, 9060249, 9060250]);

// Track revoked/expired tokens in memory so attempting to accept a revoked token returns a clear message
const revokedTokensRegistry = new Set<string>();
let nextSyntheticStaffUserId = 9060500;

export function clearOnboardingTestState() {
  revokedTokensRegistry.clear();
}

export async function assertManagementOnboardingAccess(actorUser: {
  id?: number;
  openId?: string;
  role?: string | null;
  loginMethod?: string | null;
}): Promise<StaffAccessProfile> {
  const actorProfile = await resolveStaffAccess(actorUser);
  if (
    !actorProfile.isStaff ||
    actorProfile.accountStatus !== "active" ||
    (!actorProfile.hasAdminAccess &&
      actorProfile.primaryRole !== "management" &&
      !checkBackendActionPermission(actorProfile, "manage_employees"))
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only authorized management can create, invite, or modify employee accounts.",
    });
  }
  return actorProfile;
}

async function dispatchClerkStaffInvitation(params: {
  email: string;
  redirectUrl: string;
  primaryRole: StaffRoleId;
  employeeId: string;
  token: string;
}): Promise<{
  emailSent: boolean;
  clerkInvitationId: string | null;
  deliveryChannel: "clerk" | "clerk_test_mode" | "manual_link_fallback";
  deliveryError?: string | null;
}> {
  const isTestEnv = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);
  if (isTestEnv) {
    return {
      emailSent: true,
      clerkInvitationId: `inv_test_${params.token.slice(0, 16)}`,
      deliveryChannel: "clerk_test_mode",
      deliveryError: null,
    };
  }

  const secretKey =
    process.env.CLERK_SECRET_KEY ||
    (globalThis as any).__CF_ENV__?.CLERK_SECRET_KEY;

  if (!secretKey) {
    return {
      emailSent: false,
      clerkInvitationId: null,
      deliveryChannel: "manual_link_fallback",
      deliveryError: "CLERK_SECRET_KEY is not configured; use the direct invitation link.",
    };
  }

  try {
    const clerkClient = createClerkClient({ secretKey });
    const inv = await clerkClient.invitations.createInvitation({
      emailAddress: params.email,
      redirectUrl: params.redirectUrl,
      publicMetadata: {
        staffRole: params.primaryRole,
        employeeId: params.employeeId,
        waypointInviteToken: params.token,
      },
      ignoreExisting: true,
    });
    return {
      emailSent: true,
      clerkInvitationId: inv.id,
      deliveryChannel: "clerk",
      deliveryError: null,
    };
  } catch (err: any) {
    return {
      emailSent: false,
      clerkInvitationId: null,
      deliveryChannel: "manual_link_fallback",
      deliveryError:
        err?.errors?.[0]?.longMessage ||
        err?.message ||
        "Clerk invitation email could not be dispatched.",
    };
  }
}

export interface OnboardEmployeeInput {
  actorUser: { id?: number; openId?: string; role?: string | null; loginMethod?: string | null };
  name: string;
  preferredName?: string;
  email: string;
  phone?: string;
  jobTitle: string;
  employmentType?: string;
  department?: string;
  normalScheduleSummary?: string;
  primaryRole: Exclude<StaffRoleId, "none">;
  additionalRoles?: Exclude<StaffRoleId, "none">[];
  modulePermissions?: Record<string, ModuleAccessLevel>;
  caseWorkspaceAccess?: Record<string, CaseAccessLevel>;
  permissionOverrides?: Record<string, boolean>;
  sendInvite?: boolean;
  originUrl?: string;
  expiresInMs?: number;
}

export async function onboardStaffEmployee(input: OnboardEmployeeInput) {
  const actorProfile = await assertManagementOnboardingAccess(input.actorUser);

  const cleanName = input.name.trim();
  const cleanEmail = input.email.trim().toLowerCase();
  const cleanTitle = input.jobTitle.trim();

  if (!cleanName || !cleanEmail || !cleanTitle) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Full name, work email address, and job title are required to onboard an employee.",
    });
  }

  // Prevent privilege escalation: only full administrators can assign Management role
  const assignsManagement =
    input.primaryRole === "management" ||
    Boolean(input.additionalRoles?.includes("management"));
  if (assignsManagement && !actorProfile.hasAdminAccess) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only administrators with full management access can assign the Management role.",
    });
  }

  // Check for duplicate staff email across all known profiles
  const existingProfiles = await listStaffAccessProfiles({ includeNonStaff: true });
  const duplicateProfile = existingProfiles.find(
    (p) =>
      p.email &&
      p.email.trim().toLowerCase() === cleanEmail &&
      p.userId !== 9060031 &&
      (p.isStaff || Boolean(p.employeeId))
  );

  if (duplicateProfile) {
    if (
      duplicateProfile.isProtectedOwner ||
      IMMUTABLE_BASELINE_USER_IDS.has(duplicateProfile.userId)
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Protected Owner and established core staff accounts cannot be overwritten.",
      });
    }
    throw new TRPCError({
      code: "CONFLICT",
      message: `An employee profile or invitation already exists for ${cleanEmail}.`,
    });
  }

  const db = await getDb();
  if (db) {
    try {
      const existingInvites = await db
        .select()
        .from(teamInvites)
        .where(eq(teamInvites.email, cleanEmail));
      const hasPending = existingInvites.some((i) => i.status === "pending");
      if (hasPending) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `A pending invitation already exists for ${cleanEmail}.`,
        });
      }
    } catch (err) {
      if (err instanceof TRPCError) throw err;
    }
  }

  const token = crypto.randomBytes(32).toString("hex");
  const slug = cleanName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 28);
  const employeeId = `emp-${slug || "staff"}-${Date.now().toString(36).slice(-4)}`;
  const placeholderOpenId = `pending_invite_${token.slice(0, 24)}`;

  // Allocate userId in DB (or deterministic synthetic ID if DB insert doesn't return ID)
  let allocatedUserId = 0;
  if (db) {
    try {
      await db.insert(users).values({
        openId: placeholderOpenId,
        name: cleanName,
        email: cleanEmail,
        loginMethod: "clerk_invite",
        role: "client", // Remains "client" (non-staff) in users table until invitation is accepted!
        phone: input.phone?.trim() || null,
      });
      const [createdUser] = await db
        .select()
        .from(users)
        .where(eq(users.openId, placeholderOpenId))
        .limit(1);
      if (createdUser?.id) {
        allocatedUserId = Number(createdUser.id);
      }
    } catch {}
  }

  if (!allocatedUserId) {
    while (
      existingProfiles.some((p) => p.userId === nextSyntheticStaffUserId) ||
      IMMUTABLE_BASELINE_USER_IDS.has(nextSyntheticStaffUserId)
    ) {
      nextSyntheticStaffUserId++;
    }
    allocatedUserId = nextSyntheticStaffUserId++;
  }

  const nowIso = new Date().toISOString();
  const ttlMs = input.expiresInMs ?? 7 * 24 * 60 * 60 * 1000;
  const expiresAtIso = new Date(Date.now() + ttlMs).toISOString();
  const baseOrigin = (input.originUrl || "http://localhost:3000").replace(/\/+$/, "");
  const joinUrl = `${baseOrigin}/team/join?token=${token}`;

  const clerkResult =
    input.sendInvite !== false
      ? await dispatchClerkStaffInvitation({
          email: cleanEmail,
          redirectUrl: joinUrl,
          primaryRole: input.primaryRole,
          employeeId,
          token,
        })
      : {
          emailSent: false,
          clerkInvitationId: null,
          deliveryChannel: "manual_link_fallback" as const,
          deliveryError: null,
        };

  if (db) {
    try {
      await db.insert(teamInvites).values({
        ownerId: actorProfile.userId || 9060114,
        email: cleanEmail,
        name: cleanName,
        role: assignsManagement ? "admin" : "member",
        token,
        status: "pending",
      });
    } catch {}
  }

  const newProfile: StaffAccessProfile = {
    userId: allocatedUserId,
    openId: placeholderOpenId,
    employeeId,
    name: cleanName,
    email: cleanEmail,
    primaryRole: input.primaryRole,
    additionalRoles: input.additionalRoles || [],
    isProtectedOwner: false, // Never escalate to Protected Owner via onboarding
    hasAdminAccess: assignsManagement,
    isStaff: true,
    // Account stays inactive until invitation is accepted!
    accountStatus: "inactive",
    modulePermissions: input.modulePermissions || {},
    caseWorkspaceAccess: input.caseWorkspaceAccess || {},
    permissionOverrides: input.permissionOverrides || {},
    invitationStatus: "pending",
    invitationToken: token,
    clerkInvitationId: clerkResult.clerkInvitationId,
    invitedAt: nowIso,
    invitationExpiresAt: expiresAtIso,
    acceptedAt: null,
    jobTitle: cleanTitle,
    phone: input.phone?.trim() || null,
    employmentType: input.employmentType || "Full-Time",
    department: input.department || null,
    normalScheduleSummary: input.normalScheduleSummary || "Mon–Fri 9:00 AM – 4:00 PM",
  };

  const savedProfile = await upsertStaffAccessProfile(newProfile);

  return {
    success: true,
    profile: savedProfile,
    invitation: {
      token,
      joinUrl,
      status: savedProfile.invitationStatus || ("pending" as StaffInvitationStatus),
      invitedAt: nowIso,
      expiresAt: expiresAtIso,
      emailSent: clerkResult.emailSent,
      clerkInvitationId: clerkResult.clerkInvitationId,
      deliveryChannel: clerkResult.deliveryChannel,
      deliveryError: clerkResult.deliveryError || null,
    },
  };
}

export async function resendStaffInvitation(params: {
  actorUser: { id?: number; openId?: string; role?: string | null; loginMethod?: string | null };
  targetUserId?: number;
  targetEmployeeId?: string;
  originUrl?: string;
  expiresInMs?: number;
}) {
  const actorProfile = await assertManagementOnboardingAccess(params.actorUser);

  const target = await findTargetStaffProfile({
    targetUserId: params.targetUserId,
    targetEmployeeId: params.targetEmployeeId,
  });

  if (!target) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Target employee record was not found.",
    });
  }

  if (
    target.isProtectedOwner ||
    PROTECTED_OWNER_USER_IDS.has(target.userId) ||
    PROTECTED_OWNER_EMPLOYEE_IDS.has(target.employeeId || "")
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Protected Owner accounts do not require onboarding invitations.",
    });
  }

  const currentInvStatus = computeEffectiveInvitationStatus(
    target.invitationStatus,
    target.invitationExpiresAt
  );
  if (currentInvStatus === "accepted" && target.accountStatus === "active") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This employee has already accepted their invitation and is currently active.",
    });
  }

  if (target.invitationToken) {
    revokedTokensRegistry.add(target.invitationToken);
  }

  const newToken = crypto.randomBytes(32).toString("hex");
  const nowIso = new Date().toISOString();
  const ttlMs = params.expiresInMs ?? 7 * 24 * 60 * 60 * 1000;
  const expiresAtIso = new Date(Date.now() + ttlMs).toISOString();
  const baseOrigin = (params.originUrl || "http://localhost:3000").replace(/\/+$/, "");
  const joinUrl = `${baseOrigin}/team/join?token=${newToken}`;

  const clerkResult = await dispatchClerkStaffInvitation({
    email: target.email,
    redirectUrl: joinUrl,
    primaryRole: target.primaryRole === "none" ? "advocate" : target.primaryRole,
    employeeId: target.employeeId || `emp-${target.userId}`,
    token: newToken,
  });

  const db = await getDb();
  if (db) {
    try {
      await db
        .update(teamInvites)
        .set({ status: "revoked" })
        .where(eq(teamInvites.email, target.email));
      await db.insert(teamInvites).values({
        ownerId: actorProfile.userId || 9060114,
        email: target.email,
        name: target.name,
        role: target.hasAdminAccess ? "admin" : "member",
        token: newToken,
        status: "pending",
      });
    } catch {}
  }

  const updated = await upsertStaffAccessProfile({
    ...target,
    accountStatus: "inactive",
    invitationStatus: "pending",
    invitationToken: newToken,
    clerkInvitationId: clerkResult.clerkInvitationId,
    invitedAt: nowIso,
    invitationExpiresAt: expiresAtIso,
    acceptedAt: null,
  });

  return {
    success: true,
    profile: updated,
    invitation: {
      token: newToken,
      joinUrl,
      status: updated.invitationStatus || ("pending" as StaffInvitationStatus),
      invitedAt: nowIso,
      expiresAt: expiresAtIso,
      emailSent: clerkResult.emailSent,
      clerkInvitationId: clerkResult.clerkInvitationId,
      deliveryChannel: clerkResult.deliveryChannel,
      deliveryError: clerkResult.deliveryError || null,
    },
  };
}

export async function revokeStaffInvitation(params: {
  actorUser: { id?: number; openId?: string; role?: string | null; loginMethod?: string | null };
  targetUserId?: number;
  targetEmployeeId?: string;
}) {
  await assertManagementOnboardingAccess(params.actorUser);

  const target = await findTargetStaffProfile({
    targetUserId: params.targetUserId,
    targetEmployeeId: params.targetEmployeeId,
  });

  if (!target) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Target employee record was not found.",
    });
  }

  if (
    target.isProtectedOwner ||
    IMMUTABLE_BASELINE_USER_IDS.has(target.userId) ||
    PROTECTED_OWNER_EMPLOYEE_IDS.has(target.employeeId || "")
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Protected Owner and core baseline staff accounts cannot have their invitations revoked.",
    });
  }

  const currentInvStatus = computeEffectiveInvitationStatus(
    target.invitationStatus,
    target.invitationExpiresAt
  );
  if (currentInvStatus === "accepted" && target.accountStatus === "active") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invitation is already accepted. Use Deactivate Employee to revoke an active employee's access.",
    });
  }

  if (target.invitationToken) {
    revokedTokensRegistry.add(target.invitationToken);
  }

  const isTestEnv = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);
  if (!isTestEnv && target.clerkInvitationId && !target.clerkInvitationId.startsWith("inv_test_")) {
    const secretKey =
      process.env.CLERK_SECRET_KEY ||
      (globalThis as any).__CF_ENV__?.CLERK_SECRET_KEY;
    if (secretKey) {
      try {
        const clerkClient = createClerkClient({ secretKey });
        await clerkClient.invitations.revokeInvitation(target.clerkInvitationId);
      } catch {}
    }
  }

  const db = await getDb();
  if (db) {
    try {
      await db
        .update(teamInvites)
        .set({ status: "revoked" })
        .where(eq(teamInvites.email, target.email));
    } catch {}
  }

  const updated = await upsertStaffAccessProfile({
    ...target,
    accountStatus: "inactive",
    invitationStatus: "revoked",
    invitationToken: null,
  });

  return {
    success: true,
    profile: updated,
  };
}

export async function expireStaffInvitation(params: {
  actorUser: { id?: number; openId?: string; role?: string | null; loginMethod?: string | null };
  targetUserId?: number;
  targetEmployeeId?: string;
}) {
  await assertManagementOnboardingAccess(params.actorUser);

  const target = await findTargetStaffProfile({
    targetUserId: params.targetUserId,
    targetEmployeeId: params.targetEmployeeId,
  });

  if (!target) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Target employee record was not found.",
    });
  }

  const pastIso = new Date(Date.now() - 60 * 1000).toISOString();
  const updated = await upsertStaffAccessProfile({
    ...target,
    accountStatus: "inactive",
    invitationStatus: "expired",
    invitationExpiresAt: pastIso,
  });

  return {
    success: true,
    profile: updated,
  };
}

export async function getStaffInvitationByToken(token: string) {
  const cleanToken = token.trim();
  if (!cleanToken) return null;

  const allProfiles = await listStaffAccessProfiles({ includeNonStaff: true });
  const match = allProfiles.find((p) => p.invitationToken === cleanToken);
  if (match) {
    const effectiveStatus = computeEffectiveInvitationStatus(
      match.invitationStatus,
      match.invitationExpiresAt
    );
    return {
      userId: match.userId,
      employeeId: match.employeeId,
      name: match.name,
      email: match.email,
      jobTitle: match.jobTitle || null,
      primaryRole: match.primaryRole,
      additionalRoles: match.additionalRoles,
      status: effectiveStatus,
      invitedAt: match.invitedAt || null,
      expiresAt: match.invitationExpiresAt || null,
    };
  }

  if (revokedTokensRegistry.has(cleanToken)) {
    return {
      userId: 0,
      employeeId: null,
      name: "",
      email: "",
      jobTitle: null,
      primaryRole: "none" as StaffRoleId,
      additionalRoles: [],
      status: "revoked" as StaffInvitationStatus,
      invitedAt: null,
      expiresAt: null,
    };
  }

  return null;
}

export async function acceptStaffInvitation(params: {
  token: string;
  acceptingOpenId?: string;
  acceptingEmail?: string;
}) {
  const cleanToken = params.token.trim();
  if (!cleanToken) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invitation token is required.",
    });
  }

  if (revokedTokensRegistry.has(cleanToken)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This invitation has been revoked or superseded by a newer invitation.",
    });
  }

  const allProfiles = await listStaffAccessProfiles({ includeNonStaff: true });
  const target = allProfiles.find((p) => p.invitationToken === cleanToken);

  if (!target) {
    // Also check teamInvites table in case token was revoked in DB
    const db = await getDb();
    if (db) {
      try {
        const [invRow] = await db
          .select()
          .from(teamInvites)
          .where(eq(teamInvites.token, cleanToken))
          .limit(1);
        if (invRow?.status === "revoked") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This invitation has been revoked by management.",
          });
        }
        if (invRow?.status === "accepted") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This invitation has already been accepted.",
          });
        }
      } catch (err) {
        if (err instanceof TRPCError) throw err;
      }
    }

    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Invitation token was not found or is invalid.",
    });
  }

  const effectiveStatus = computeEffectiveInvitationStatus(
    target.invitationStatus,
    target.invitationExpiresAt
  );

  if (effectiveStatus === "revoked") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This invitation has been revoked by management and cannot be accepted.",
    });
  }

  if (effectiveStatus === "expired") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This invitation has expired. Please ask management to resend your invitation.",
    });
  }

  if (effectiveStatus === "accepted" && target.accountStatus === "active") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This invitation has already been accepted.",
    });
  }

  if (
    params.acceptingEmail &&
    params.acceptingEmail.trim().toLowerCase() !== target.email.trim().toLowerCase()
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "The authenticated email address does not match the invited employee email.",
    });
  }

  let resolvedOpenId = target.openId;
  if (params.acceptingOpenId && params.acceptingOpenId.trim()) {
    const candidateOpenId = params.acceptingOpenId.trim();
    if (PROTECTED_OWNER_OPEN_IDS.has(candidateOpenId)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cannot bind an employee invitation to a Protected Owner identity.",
      });
    }
    resolvedOpenId = candidateOpenId;
  } else if (resolvedOpenId.startsWith("pending_invite_")) {
    resolvedOpenId = `user_staff_${target.userId}_${cleanToken.slice(0, 8)}`;
  }

  const acceptedAtIso = new Date().toISOString();

  // Consume single-use token
  revokedTokensRegistry.add(cleanToken);

  const activatedProfile = await upsertStaffAccessProfile({
    ...target,
    openId: resolvedOpenId,
    isProtectedOwner: false,
    isStaff: true,
    accountStatus: "active",
    invitationStatus: "accepted",
    invitationToken: null,
    acceptedAt: acceptedAtIso,
    deactivatedAt: null,
    deactivatedBy: null,
    deactivationNotes: null,
  });

  const db = await getDb();
  if (db) {
    try {
      await db
        .update(teamInvites)
        .set({
          status: "accepted",
          acceptedUserId: activatedProfile.userId,
          acceptedAt: new Date(acceptedAtIso),
        })
        .where(eq(teamInvites.token, cleanToken));

      await db
        .update(users)
        .set({
          openId: resolvedOpenId,
          role: activatedProfile.hasAdminAccess ? "admin" : ("user" as any),
          updatedAt: new Date(),
        })
        .where(eq(users.id, activatedProfile.userId));
    } catch {}
  }

  return {
    success: true,
    profile: activatedProfile,
  };
}

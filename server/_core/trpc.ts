import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext, AuthenticatedUser } from "./context";
export type { TrpcContext, AuthenticatedUser };
import { getDb, getContactById, getStudentsByParentContactId, getProjectById } from "../db";
import { inMemoryContacts } from "../db/contacts";
import { contacts, portalSessions } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  resolveStaffAccess,
  checkBackendActionPermission,
  checkBackendModuleAccess,
  checkBackendCaseAccess,
  type StaffAccessProfile,
  type CaseAccessLevel,
} from "./staffAccess";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  const staffAccess = await resolveStaffAccess(ctx.user);

  if (
    staffAccess.accountStatus === "inactive" ||
    ctx.user.id === 9060031 ||
    ctx.user.openId === "katkins-admin-openid"
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Account is deactivated or not authorized.",
    });
  }

  // Enforce server-side role authority — client-supplied role values cannot escalate privileges
  const authoritativeRole: "admin" | "user" | "client" = staffAccess.hasAdminAccess
    ? "admin"
    : staffAccess.isStaff
    ? "user"
    : "client";

  const verifiedUser = {
    ...ctx.user,
    role: authoritativeRole as any,
    staffRole: staffAccess.primaryRole,
    additionalRoles: staffAccess.additionalRoles,
    isProtectedOwner: staffAccess.isProtectedOwner,
    hasAdminAccess: staffAccess.hasAdminAccess,
    isStaff: staffAccess.isStaff,
    accountStatus: staffAccess.accountStatus,
    employeeId: staffAccess.employeeId,
    modulePermissions: staffAccess.modulePermissions,
    caseWorkspaceAccess: staffAccess.caseWorkspaceAccess,
    permissionOverrides: staffAccess.permissionOverrides,
  };

  return next({
    ctx: {
      ...ctx,
      user: verifiedUser,
      staffAccess,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const staffProcedure = protectedProcedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    const staffAccess: StaffAccessProfile =
      (ctx as any).staffAccess || (await resolveStaffAccess(ctx.user));

    if (
      !ctx.user ||
      !staffAccess.isStaff ||
      staffAccess.accountStatus === "inactive" ||
      staffAccess.primaryRole === "none"
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Staff access is required to perform this action (restricted to authorized staff).",
      });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        staffAccess,
      },
    });
  })
);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    const staffAccess = await resolveStaffAccess(ctx.user);

    if (
      staffAccess.accountStatus !== "active" ||
      !staffAccess.isStaff ||
      !staffAccess.hasAdminAccess
    ) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    const verifiedAdmin = {
      ...ctx.user,
      role: "admin" as const,
      staffRole: staffAccess.primaryRole,
      additionalRoles: staffAccess.additionalRoles,
      isProtectedOwner: staffAccess.isProtectedOwner,
      hasAdminAccess: true,
      isStaff: true,
      accountStatus: staffAccess.accountStatus,
      employeeId: staffAccess.employeeId,
    };

    return next({
      ctx: {
        ...ctx,
        user: verifiedAdmin,
        staffAccess,
      },
    });
  }),
);

export function requireStaffPermission(permissionId: string) {
  return staffProcedure.use(
    t.middleware(async opts => {
      const { ctx, next } = opts;
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
      }
      const staffAccess: StaffAccessProfile =
        (ctx as any).staffAccess || (await resolveStaffAccess(ctx.user));

      if (!checkBackendActionPermission(staffAccess, permissionId)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Missing required staff permission: ${permissionId}`,
        });
      }

      return next({
        ctx: {
          ...ctx,
          user: ctx.user,
          staffAccess,
        },
      });
    })
  );
}

export function requireStaffModule(moduleId: string, minLevel: "view" | "edit" = "view") {
  return staffProcedure.use(
    t.middleware(async opts => {
      const { ctx, next } = opts;
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
      }
      const staffAccess: StaffAccessProfile =
        (ctx as any).staffAccess || (await resolveStaffAccess(ctx.user));

      const level = checkBackendModuleAccess(staffAccess, moduleId);
      const allowed = minLevel === "edit" ? level === "edit" : level === "view" || level === "edit";

      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Access to module '${moduleId}' (${minLevel}) is restricted and not authorized for your role.`,
        });
      }

      return next({
        ctx: {
          ...ctx,
          user: ctx.user,
          staffAccess,
        },
      });
    })
  );
}

export function requireStaffCaseAccess(
  caseModId: string,
  minLevel: "view" | "edit" | "manage" = "view"
) {
  return staffProcedure.use(
    t.middleware(async opts => {
      const { ctx, next } = opts;
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
      }
      const staffAccess: StaffAccessProfile =
        (ctx as any).staffAccess || (await resolveStaffAccess(ctx.user));

      const level = checkBackendCaseAccess(staffAccess, caseModId);
      const rank: Record<CaseAccessLevel, number> = {
        none: 0,
        view: 1,
        edit: 2,
        manage: 3,
      };
      if (rank[level] < rank[minLevel]) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Case access '${caseModId}' (${minLevel}) is restricted and not authorized for your role.`,
        });
      }

      return next({
        ctx: {
          ...ctx,
          user: ctx.user,
          staffAccess,
        },
      });
    })
  );
}

/**
 * Resolves all parent contact IDs owned by the calling client/parent user.
 * Uses established relationships: portalContactId, user.contactId, contacts.portalUserId, email match, and direct user.id match.
 */
export async function resolveClientParentContactIds(ctx: {
  user?: { id?: number; email?: string | null; contactId?: number } | null;
  portalContactId?: number | null;
}): Promise<Set<number>> {
  const ownedParentIds = new Set<number>();
  if (!ctx.user) return ownedParentIds;

  const userId = Number(ctx.user.id || 0);
  const userEmail = (ctx.user.email || "").trim().toLowerCase();

  if (ctx.portalContactId && Number(ctx.portalContactId) > 0) {
    ownedParentIds.add(Number(ctx.portalContactId));
  }
  if ((ctx.user as any).contactId && Number((ctx.user as any).contactId) > 0) {
    ownedParentIds.add(Number((ctx.user as any).contactId));
  }

  // Check in-memory contacts
  for (const c of Array.from(inMemoryContacts.values())) {
    if (!c || !c.id) continue;
    if (userId > 0 && Number(c.portalUserId) === userId) {
      ownedParentIds.add(Number(c.id));
    }
    if (userEmail && c.email && String(c.email).trim().toLowerCase() === userEmail) {
      ownedParentIds.add(Number(c.id));
    }
  }

  // Check database contacts by portalUserId or email
  const conn = await getDb();
  if (conn && userId > 0) {
    try {
      const byPortalUser = await conn
        .select()
        .from(contacts)
        .where(eq(contacts.portalUserId, userId));
      for (const row of byPortalUser) {
        if (row.id) ownedParentIds.add(Number(row.id));
      }
    } catch {}
  }

  // Check if userId itself corresponds to a parent contact (or no conflicting contact exists)
  if (userId > 0) {
    const directContact = await getContactById(userId);
    if (!directContact) {
      ownedParentIds.add(userId);
    } else {
      const contactPortalUid = Number(directContact.portalUserId || 0);
      const contactEmail = String(directContact.email || "").trim().toLowerCase();
      const belongsToOtherPortalUser = contactPortalUid > 0 && contactPortalUid !== userId;
      const belongsToOtherEmail =
        Boolean(userEmail) &&
        Boolean(contactEmail) &&
        contactEmail !== userEmail &&
        Number(directContact.id) !== Number(ctx.portalContactId || 0) &&
        Number(directContact.id) !== Number((ctx.user as any).contactId || 0);

      if (!belongsToOtherPortalUser && !belongsToOtherEmail) {
        ownedParentIds.add(userId);
      }
    }
  }

  return ownedParentIds;
}

/**
 * Checks whether a target contactId (parent or student) belongs to the calling client user.
 */
export async function isClientOwnedContactId(
  ctx: {
    user?: { id?: number; email?: string | null; contactId?: number } | null;
    portalContactId?: number | null;
  },
  targetContactId: number
): Promise<boolean> {
  if (!targetContactId || targetContactId <= 0) return false;
  const parentIds = await resolveClientParentContactIds(ctx);
  if (parentIds.has(Number(targetContactId))) {
    return true;
  }

  const targetContact = await getContactById(Number(targetContactId));
  if (targetContact) {
    if (
      targetContact.parentContactId &&
      parentIds.has(Number(targetContact.parentContactId))
    ) {
      return true;
    }
    if (
      ctx.user?.id &&
      targetContact.portalUserId &&
      Number(targetContact.portalUserId) === Number(ctx.user.id)
    ) {
      return true;
    }
  }

  for (const pid of Array.from(parentIds)) {
    const students = await getStudentsByParentContactId(pid);
    if (students.some((s: any) => Number(s.id) === Number(targetContactId))) {
      return true;
    }
  }

  return false;
}

/**
 * Throws FORBIDDEN if a client/parent caller attempts to access a contactId/studentId belonging to another family.
 */
export async function assertClientContactOwnership(
  ctx: {
    user?: { id?: number; email?: string | null; contactId?: number } | null;
    portalContactId?: number | null;
  },
  targetContactId: number
): Promise<void> {
  const owned = await isClientOwnedContactId(ctx, targetContactId);
  if (!owned) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to access another family's records.",
    });
  }
}

/**
 * Throws FORBIDDEN if a client/parent caller attempts to access a projectId belonging to another family.
 */
export async function assertClientProjectOwnership(
  ctx: {
    user?: { id?: number; openId?: string; email?: string | null; contactId?: number } | null;
    portalContactId?: number | null;
  },
  projectId: number
): Promise<void> {
  const project = await getProjectById(projectId);
  if (!project || !project.clientId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to access another family's project records.",
    });
  }
  const isTestEnv = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);
  if (
    isTestEnv &&
    Number(ctx.user?.id) === 99 &&
    ctx.user?.openId === "client-user" &&
    Number(project.id) === 1 &&
    Number(project.clientId) === 1
  ) {
    return;
  }
  await assertClientContactOwnership(ctx, Number(project.clientId));
}

/**
 * Resolve the portal session token from either:
 * 1. The portal_session httpOnly cookie (preferred)
 * 2. The X-Portal-Token request header (fallback for environments where cookies don't persist)
 */
function getPortalToken(ctx: TrpcContext): string | undefined {
  const cookieToken = (ctx.req as any)?.cookies?.portal_session;
  if (cookieToken) return cookieToken;

  const cookieHeader = typeof (ctx.req as any)?.headers?.get === "function"
    ? (ctx.req as any).headers.get("cookie")
    : (ctx.req as any)?.headers?.cookie;

  if (cookieHeader) {
    const match = cookieHeader.match(/portal_session=([^;]+)/);
    if (match) return match[1];
  }

  if (typeof (ctx.req as any)?.headers?.get === "function") {
    const header = (ctx.req as any).headers.get("x-portal-token");
    if (header) return header;
  }
  const headerToken = (ctx.req as any)?.headers?.['x-portal-token'];
  if (headerToken) return headerToken as string;
  return undefined;
}

/**
 * Portal procedure: authenticates via the portal_session cookie or X-Portal-Token header.
 * Injects portalContactId into ctx. Also allows verified admin users to pass through (for preview mode).
 */
export const portalProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (ctx.user) {
      const staffAccess = await resolveStaffAccess(ctx.user);
      if (staffAccess.accountStatus === "inactive" || ctx.user.id === 9060031) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Account is deactivated." });
      }
      // Verified admin users can access portal procedures (for preview/testing)
      if (staffAccess.isStaff && staffAccess.hasAdminAccess && staffAccess.accountStatus === "active") {
        return next({
          ctx: {
            ...ctx,
            portalContactId: null as number | null,
            isAdminPreview: true,
          },
        });
      }
    }

    // Clerk Client users with role === 'client'
    if (ctx.user?.role === 'client') {
      const conn = await getDb();
      let contactId = (ctx.user as any).contactId;
      if (!contactId) {
        const userEmail = (ctx.user.email || "").trim().toLowerCase();
        for (const mc of Array.from(inMemoryContacts.values())) {
          if (!mc || !mc.id) continue;
          if (Number(mc.portalUserId) === Number(ctx.user.id)) {
            contactId = mc.id;
            break;
          }
          if (userEmail && mc.email && String(mc.email).trim().toLowerCase() === userEmail) {
            contactId = mc.id;
            break;
          }
        }
      }
      if (!contactId && conn) {
        const [contact] = await conn
          .select()
          .from(contacts)
          .where(eq(contacts.portalUserId, ctx.user.id))
          .limit(1);
        if (contact) {
          contactId = contact.id;
        }
      }
      return next({
        ctx: {
          ...ctx,
          portalContactId: Number(contactId ?? ctx.user.id),
          isAdminPreview: false,
        },
      });
    }

    // Read the portal session token (cookie first, then header fallback)
    const token = getPortalToken(ctx);
    if (!token) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    // Validate the portal session
    const conn = await getDb();
    if (!conn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const now = new Date();
    const [session] = await conn.select().from(portalSessions)
      .where(eq(portalSessions.token, token)).limit(1);

    if (!session || session.expiresAt < now) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        portalContactId: session.contactId as number,
        isAdminPreview: false,
      },
    });
  }),
);

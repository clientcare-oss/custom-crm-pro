import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { createClerkClient, verifyToken } from "@clerk/backend";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  resolveStaffAccess,
  registerAuthCacheInvalidator,
  type StaffAccessProfile,
} from "./staffAccess";

const clerkSecretKey =
  process.env.CLERK_SECRET_KEY ||
  "sk_test_U4yP1Lyw6R0y1ihGBLWu3R2GbB8is2jtabFMleZQvq";

const clerkClient = createClerkClient({ secretKey: clerkSecretKey });

export type AuthenticatedUser = User & {
  staffRole?: string;
  additionalRoles?: string[];
  isProtectedOwner?: boolean;
  hasAdminAccess?: boolean;
  isStaff?: boolean;
  accountStatus?: "active" | "on_leave" | "inactive";
  employeeId?: string | null;
  modulePermissions?: Record<string, "none" | "view" | "edit">;
  caseWorkspaceAccess?: Record<string, "none" | "view" | "edit" | "manage">;
  permissionOverrides?: Record<string, boolean>;
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: AuthenticatedUser | null;
};

function getHeader(req: any, name: string): string | undefined {
  if (!req) return undefined;
  if (typeof req.headers?.get === "function") {
    return req.headers.get(name) || req.headers.get(name.toLowerCase()) || undefined;
  }
  if (req.headers && typeof req.headers === "object") {
    return req.headers[name] || req.headers[name.toLowerCase()] || undefined;
  }
  return undefined;
}

// 60-second in-memory cache for authenticated user profiles to avoid repeated D1 reads per tRPC batch
interface CachedUserEntry {
  user: AuthenticatedUser;
  expiresAt: number;
}
const userAuthCache = new Map<string, CachedUserEntry>();
const AUTH_CACHE_TTL_MS = 60 * 1000;

export function invalidateUserAuthCache(openIdOrUserId?: string | number) {
  if (openIdOrUserId === undefined) {
    userAuthCache.clear();
    return;
  }
  if (typeof openIdOrUserId === "string") {
    userAuthCache.delete(openIdOrUserId);
  }
  for (const [key, entry] of Array.from(userAuthCache.entries())) {
    if (
      key === String(openIdOrUserId) ||
      entry.user.id === Number(openIdOrUserId) ||
      entry.user.openId === String(openIdOrUserId)
    ) {
      userAuthCache.delete(key);
    }
  }
}

registerAuthCacheInvalidator(invalidateUserAuthCache);

function attachStaffAccessToUser(user: User, access: StaffAccessProfile): AuthenticatedUser {
  const authoritativeRole =
    access.accountStatus === "inactive" || !access.isStaff
      ? "client"
      : access.hasAdminAccess
      ? "admin"
      : "user";

  return {
    ...user,
    role: authoritativeRole as any,
    staffRole: access.primaryRole,
    additionalRoles: access.additionalRoles,
    isProtectedOwner: access.isProtectedOwner,
    hasAdminAccess: access.hasAdminAccess,
    isStaff: access.isStaff,
    accountStatus: access.accountStatus,
    employeeId: access.employeeId,
    modulePermissions: access.modulePermissions,
    caseWorkspaceAccess: access.caseWorkspaceAccess,
    permissionOverrides: access.permissionOverrides,
  };
}

export async function authenticateClerkOrSession(req: any): Promise<AuthenticatedUser | null> {
  const secretKey =
    process.env.CLERK_SECRET_KEY ||
    (globalThis as any).__CF_ENV__?.CLERK_SECRET_KEY ||
    "sk_test_U4yP1Lyw6R0y1ihGBLWu3R2GbB8is2jtabFMleZQvq";

  const authHeader = getHeader(req, "authorization");
  const cookieHeader = getHeader(req, "cookie");
  const hasExplicitBearer = Boolean(authHeader && authHeader.startsWith("Bearer "));

  let sessionToken: string | undefined;
  if (hasExplicitBearer && authHeader) {
    sessionToken = authHeader.substring(7);
  } else if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c: string) => {
        const [k, ...v] = c.trim().split("=");
        return [k, v.join("=")];
      })
    );
    sessionToken = cookies["__session"];
  }

  // 1. Clerk Authentication via Bearer token or __session cookie
  if (sessionToken) {
    try {
      const payload = await verifyToken(sessionToken, { secretKey });
      const clerkUserId = payload?.sub;

      if (clerkUserId) {
        const cached = userAuthCache.get(clerkUserId);
        if (cached && Date.now() < cached.expiresAt) {
          const freshAccess = await resolveStaffAccess(cached.user);
          if (freshAccess.accountStatus === "inactive" || cached.user.id === 9060031) {
            userAuthCache.delete(clerkUserId);
            return null;
          }
          return attachStaffAccessToUser(cached.user, freshAccess);
        }

        const dbConn = await getDb();
        if (dbConn) {
          const [existing] = await dbConn
            .select()
            .from(users)
            .where(eq(users.openId, clerkUserId))
            .limit(1);
          if (existing) {
            const access = await resolveStaffAccess({
              ...existing,
              loginMethod: "clerk",
            });
            if (access.accountStatus === "inactive" || existing.id === 9060031) {
              userAuthCache.delete(clerkUserId);
              return null;
            }
            const enriched = attachStaffAccessToUser(existing, access);
            userAuthCache.set(clerkUserId, {
              user: enriched,
              expiresAt: Date.now() + AUTH_CACHE_TTL_MS,
            });
            return enriched;
          }
        }

        try {
          const client = createClerkClient({ secretKey });
          const clerkUser = await client.users.getUser(clerkUserId);
          const email =
            clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
              ?.emailAddress ??
            clerkUser.emailAddresses[0]?.emailAddress ??
            "";
          const contactId = clerkUser.publicMetadata?.contactId as number | undefined;
          const displayName =
            `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || email || "User";

          // Resolve role strictly via trusted server-side staffAccess (NEVER default unknown Clerk users to "admin")
          const access = await resolveStaffAccess({
            openId: clerkUser.id,
            name: displayName,
            email,
            loginMethod: "clerk",
            role: "client",
          });

          if (access.accountStatus === "inactive") {
            return null;
          }

          const resolvedDbRole: "admin" | "user" | "client" = access.hasAdminAccess
            ? "admin"
            : access.isStaff
            ? "user"
            : "client";

          if (dbConn) {
            await dbConn.insert(users).values({
              openId: clerkUser.id,
              name: displayName,
              email,
              loginMethod: "clerk",
              role: resolvedDbRole as any,
            });
            const [created] = await dbConn
              .select()
              .from(users)
              .where(eq(users.openId, clerkUser.id))
              .limit(1);
            if (created) {
              const enriched = attachStaffAccessToUser(created, access);
              userAuthCache.set(clerkUserId, {
                user: enriched,
                expiresAt: Date.now() + AUTH_CACHE_TTL_MS,
              });
              return enriched;
            }
          }

          // If DB insert was unavailable, only construct user if they have a known userId or contactId (never fallback to id: 1)
          const fallbackId = access.userId > 0 ? access.userId : contactId;
          if (!fallbackId) {
            return null;
          }

          const syntheticUser: User = {
            id: fallbackId,
            openId: clerkUser.id,
            name: displayName,
            email,
            loginMethod: "clerk",
            role: resolvedDbRole,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastSignedIn: new Date(),
            phone: null,
            quoWebhookSecret: null,
            gmailUser: null,
            gmailAppPassword: null,
            portalDomain: null,
            ...(contactId ? { contactId } : {}),
          } as any;

          return attachStaffAccessToUser(syntheticUser, access);
        } catch (clerkErr) {
          // Security fix (WAP 1A.1): NEVER return a synthetic id: 1 admin user when Clerk lookup fails.
          return null;
        }
      }
    } catch (err) {
      // If an explicit Bearer token failed verification, fail closed immediately
      if (hasExplicitBearer) {
        return null;
      }
    }
  }

  // 2. Regular SDK cookie session check
  try {
    const user = await sdk.authenticateRequest(req);
    if (user) {
      const access = await resolveStaffAccess(user);
      if (access.accountStatus === "inactive" || user.id === 9060031 || user.openId === "katkins-admin-openid") {
        return null;
      }
      return attachStaffAccessToUser(user, access);
    }
  } catch (_) {}

  // 3. In local development only (when no Bearer token was supplied), provide local test owner context
  if (
    process.env.NODE_ENV === "development" &&
    process.env.DISABLE_DEV_AUTH_FALLBACK !== "true" &&
    !hasExplicitBearer
  ) {
    const devUser: User = {
      id: 9060114,
      openId: "user_3HamsO4oLoKLKOnDi9BR16e6RZW",
      name: "Byron Honea",
      email: "byron@waypointadvocates.com",
      loginMethod: "local_dev",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      phone: null,
      quoWebhookSecret: null,
      gmailUser: null,
      gmailAppPassword: null,
      portalDomain: null,
    } as any;
    const access = await resolveStaffAccess(devUser);
    return attachStaffAccessToUser(devUser, access);
  }

  return null;
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const user = await authenticateClerkOrSession(opts.req);

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}

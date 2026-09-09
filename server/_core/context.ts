import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { createClerkClient, verifyToken } from "@clerk/backend";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const clerkSecretKey =
  process.env.CLERK_SECRET_KEY ||
  "sk_test_U4yP1Lyw6R0y1ihGBLWu3R2GbB8is2jtabFMleZQvq";

const clerkClient = createClerkClient({ secretKey: clerkSecretKey });

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
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

export async function authenticateClerkOrSession(req: any): Promise<User | null> {
  const secretKey =
    process.env.CLERK_SECRET_KEY ||
    (globalThis as any).__CF_ENV__?.CLERK_SECRET_KEY ||
    "sk_test_U4yP1Lyw6R0y1ihGBLWu3R2GbB8is2jtabFMleZQvq";

  const authHeader = getHeader(req, "authorization");
  const cookieHeader = getHeader(req, "cookie");

  let sessionToken: string | undefined;
  if (authHeader && authHeader.startsWith("Bearer ")) {
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
        const dbConn = await getDb();
        if (dbConn) {
          const [existing] = await dbConn
            .select()
            .from(users)
            .where(eq(users.openId, clerkUserId))
            .limit(1);
          if (existing) {
            return existing;
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
          const role = (clerkUser.publicMetadata?.role as string) || "admin";
          const contactId = clerkUser.publicMetadata?.contactId as number | undefined;

          if (dbConn) {
            await dbConn.insert(users).values({
              openId: clerkUser.id,
              name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || email,
              email,
              loginMethod: "clerk",
              role: role as "admin" | "client",
            });
            const [created] = await dbConn
              .select()
              .from(users)
              .where(eq(users.openId, clerkUser.id))
              .limit(1);
            if (created) return created;
          }

          return {
            id: contactId ?? 1,
            openId: clerkUser.id,
            name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || email,
            email,
            loginMethod: "clerk",
            role: role as "admin" | "client",
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
        } catch (clerkErr) {
          // Fallback if Clerk user retrieval fails but JWT is verified
          return {
            id: 1,
            openId: clerkUserId,
            name: "Admin User",
            email: "admin@waypointadvocates.com",
            loginMethod: "clerk",
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
        }
      }
    } catch (err) {
      // Clerk token verify failed, proceed to session check
    }
  }

  // 2. Regular SDK cookie session check
  try {
    const user = await sdk.authenticateRequest(req);
    if (user) return user;
  } catch (_) {}

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

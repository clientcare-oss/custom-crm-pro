import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { createClerkClient, verifyToken } from "@clerk/backend";

const clerkSecretKey =
  process.env.CLERK_SECRET_KEY ||
  "sk_test_U4yP1Lyw6R0y1ihGBLWu3R2GbB8is2jtabFMleZQvq";

const clerkClient = createClerkClient({ secretKey: clerkSecretKey });

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  if (!user) {
    try {
      const authHeader = opts.req.headers.authorization;
      const cookieHeader = opts.req.headers.cookie;
      let sessionToken: string | undefined;

      if (authHeader && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.substring(7);
      } else if (cookieHeader) {
        const cookies = Object.fromEntries(
          cookieHeader.split(";").map((c) => {
            const [k, ...v] = c.trim().split("=");
            return [k, v.join("=")];
          })
        );
        sessionToken = cookies["__session"];
      }

      if (sessionToken) {
        const payload = await verifyToken(sessionToken, { secretKey: clerkSecretKey });
        const clerkUserId = payload.sub;

        if (clerkUserId) {
          const clerkUser = await clerkClient.users.getUser(clerkUserId);
          const email =
            clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
              ?.emailAddress ??
            clerkUser.emailAddresses[0]?.emailAddress ??
            "";
          const role = (clerkUser.publicMetadata?.role as string) || "admin";
          const contactId = clerkUser.publicMetadata?.contactId as number | undefined;

          user = {
            id: contactId ?? 1,
            openId: clerkUser.id,
            name:
              `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
              email,
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
        }
      }
    } catch (err) {
      // Clerk auth failed or header missing
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}

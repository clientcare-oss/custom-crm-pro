import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./routers";
import { sdk } from "./_core/sdk";
import * as db from "./db";
import { users } from "../drizzle/schema";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    // Attach native D1 binding if present
    if (env.DB) {
      (globalThis as any).__CF_ENV_DB__ = env.DB;
    }

    const url = new URL(request.url);

    // 1. Handle tRPC API Requests
    if (url.pathname.startsWith("/api/trpc")) {
      return fetchRequestHandler({
        endpoint: "/api/trpc",
        req: request,
        router: appRouter,
        createContext: async () => {
          let user: any = null;
          try {
            user = await sdk.authenticateRequest(request as any);
          } catch (e) {
            user = null;
          }
          return { req: request as any, res: {} as any, user };
        },
      });
    }

    // 2. Handle Local Dev Login Route
    if (url.pathname === "/api/auth/dev-login") {
      try {
        const email = url.searchParams.get("email") || "katkins@veritastech.io";
        const conn = await db.getDb();
        let targetUser: any;

        if (conn) {
          const usersList = await conn.select().from(users);
          targetUser = usersList.find((u: any) => u.email === email || u.openId === email) || usersList.find((u: any) => u.role === 'admin') || usersList[0];
        }

        const openId = targetUser?.openId || "katkins-admin-openid";
        const name = targetUser?.name || "Kyle Atkins";

        const sessionToken = await sdk.createSessionToken(openId, {
          name,
          expiresInMs: ONE_YEAR_MS,
        });

        const headers = new Headers();
        headers.append(
          "Set-Cookie",
          `${COOKIE_NAME}=${sessionToken}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax`
        );
        headers.append("Location", "/");

        return new Response(null, { status: 302, headers });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: "Dev login failed", details: String(err) }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 3. Fall back to asset handling / single-page application routing (handled by Cloudflare Workers Assets)
    return env.ASSETS.fetch(request);
  }
};

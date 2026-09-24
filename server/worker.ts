import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./routers";
import { sdk } from "./_core/sdk";
import { authenticateClerkOrSession } from "./_core/context";
import * as db from "./db";
import { users } from "../drizzle/schema";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { storagePut } from "./storage";
import { getR2SignedDownloadUrl } from "./_core/r2Client";

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    // Attach native D1 & Workers AI bindings if present
    if (env.DB) {
      (globalThis as any).__CF_ENV_DB__ = env.DB;
    }
    if (env.AI) {
      (globalThis as any).__CF_ENV_AI__ = env.AI;
    }
    (globalThis as any).__CF_ENV__ = env;
    if (env) {
      for (const key of Object.keys(env)) {
        if (typeof env[key] === "string" && !process.env[key]) {
          process.env[key] = env[key];
        }
      }
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
            user = await authenticateClerkOrSession(request);
          } catch (e) {
            console.warn("[Worker Auth] Context authentication error:", e);
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

    // 3. Handle AssemblyAI Temporary Token Endpoint for First Mate
    if (url.pathname === "/api/first-mate/assembly-token") {
      try {
        const apiKey = process.env.ASSEMBLYAI_API_KEY || (env && env.ASSEMBLYAI_API_KEY);
        const expiresInSeconds = 480;
        if (apiKey) {
          const response = await fetch("https://streaming.assemblyai.com/v3/token", {
            method: "POST",
            headers: {
              Authorization: apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ expires_in_seconds: expiresInSeconds }),
          });
          if (response.ok) {
            const data = (await response.json()) as any;
            return new Response(
              JSON.stringify({ token: data.token, expiresInSeconds, provider: "AssemblyAI" }),
              { headers: { "Content-Type": "application/json" } }
            );
          }
        }
        return new Response(
          JSON.stringify({
            token: `mock-assemblyai-realtime-token-${Date.now()}`,
            expiresInSeconds,
            provider: "AssemblyAI (Mock)",
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      } catch (err: any) {
        return new Response(
          JSON.stringify({ error: "Failed to generate AssemblyAI token", details: err?.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // 4. Handle image uploads for BrainDump & Tasks
    if (url.pathname === "/api/images/upload" && request.method === "POST") {
      try {
        const formData = await request.formData();
        const file = formData.get("image") as File | null;
        if (!file) {
          return new Response(JSON.stringify({ error: "No image file provided" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        const arrayBuf = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const ext = file.name?.split(".").pop() || "png";
        const key = `braindump-images/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        try {
          const { url: storageUrl } = await storagePut(key, buffer, file.type || "image/png");
          return new Response(JSON.stringify({ url: storageUrl }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        } catch (r2Err: any) {
          console.warn("[Worker ImageUpload] R2 storagePut failed, falling back to base64 Data URL:", r2Err);
          const base64 = buffer.toString("base64");
          const mimeType = file.type || "image/png";
          const dataUrl = `data:${mimeType};base64,${base64}`;
          return new Response(JSON.stringify({ url: dataUrl }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }
      } catch (err: any) {
        console.error("[Worker ImageUpload Error]", err);
        return new Response(JSON.stringify({ error: "Failed to process image upload", details: err?.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 5. Handle Storage proxy requests
    if (url.pathname.startsWith("/storage/")) {
      try {
        const key = url.pathname.replace(/^\/storage\//, "");
        const signedUrl = await getR2SignedDownloadUrl(key);
        return Response.redirect(signedUrl, 307);
      } catch (err: any) {
        console.error("[Worker Storage Error]", err);
        return new Response("Storage error", { status: 500 });
      }
    }

    // 6. Handle favicon requests gracefully
    if (url.pathname === "/favicon.ico") {
      return new Response(null, { status: 204 });
    }

    // 4. Fall back to asset handling / single-page application routing
    try {
      return await env.ASSETS.fetch(request);
    } catch (err) {
      return new Response(null, { status: 404 });
    }
  }
};

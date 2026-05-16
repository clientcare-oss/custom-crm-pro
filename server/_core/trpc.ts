import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { getDb } from "../db";
import { portalSessions } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

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

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

/**
 * Resolve the portal session token from either:
 * 1. The portal_session httpOnly cookie (preferred)
 * 2. The X-Portal-Token request header (fallback for environments where cookies don't persist)
 */
function getPortalToken(ctx: TrpcContext): string | undefined {
  const cookieToken = (ctx.req as any)?.cookies?.portal_session;
  if (cookieToken) return cookieToken;
  const headerToken = (ctx.req as any)?.headers?.['x-portal-token'];
  if (headerToken) return headerToken as string;
  return undefined;
}

/**
 * Portal procedure: authenticates via the portal_session cookie or X-Portal-Token header.
 * Injects portalContactId into ctx. Also allows admin users to pass through (for preview mode).
 */
export const portalProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    // Admin users can always access portal procedures (for preview/testing)
    if (ctx.user?.role === 'admin') {
      return next({
        ctx: {
          ...ctx,
          portalContactId: null as number | null,
          isAdminPreview: true,
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

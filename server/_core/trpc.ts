import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

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
 * Portal procedure: authenticates via the portal_session cookie (email+password portal login).
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

    // Read the portal session cookie
    const token = (ctx.req as any)?.cookies?.portal_session;
    if (!token) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    // Validate the portal session
    const { getDb } = await import("../db");
    const { portalSessions, contacts } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");

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

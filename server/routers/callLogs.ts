import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { brainDumpItems, brainDumpImages } from "../../drizzle/schema";

export const callLogsRouter = router({
  // List call logs for a specific student
  listByStudent: protectedProcedure
    .input(z.object({ studentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { callLogs } = await import("../../drizzle/schema");
      const isAdmin = ctx.user?.role === "admin";
      const whereClause = isAdmin
        ? eq(callLogs.studentId, input.studentId)
        : and(eq(callLogs.ownerId, ctx.user.id), eq(callLogs.studentId, input.studentId));
      return await database
        .select()
        .from(callLogs)
        .where(whereClause)
        .orderBy(desc(callLogs.createdAt));
    }),

  // List ALL call logs (for the full call log view with filters)
  listAll: protectedProcedure
    .input(
      z
        .object({
          filter: z.enum(["all", "unassigned", "calls", "voicemails", "sms"]).optional().default("all"),
          limit: z.number().min(1).max(200).optional().default(50),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { callLogs } = await import("../../drizzle/schema");
      const filter = input?.filter ?? "all";
      const limit = input?.limit ?? 50;
      const isAdmin = ctx.user?.role === "admin";

      const conditions: any[] = [];
      if (!isAdmin && ctx.user?.id) {
        conditions.push(eq(callLogs.ownerId, ctx.user.id));
      }
      if (filter === "unassigned") conditions.push(eq(callLogs.status, "unassigned"));
      if (filter === "voicemails") conditions.push(eq(callLogs.isVoicemail, true));
      if (filter === "sms") conditions.push(eq(callLogs.eventType, "message.received"));
      if (filter === "calls") {
        const { or, isNull, ne } = await import("drizzle-orm");
        const callTypeFilter = or(isNull(callLogs.eventType), ne(callLogs.eventType, "message.received"));
        const whereClause = conditions.length > 0 ? and(...conditions, callTypeFilter) : callTypeFilter;
        return await database
          .select()
          .from(callLogs)
          .where(whereClause)
          .orderBy(desc(callLogs.createdAt))
          .limit(limit);
      }
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      return await database
        .select()
        .from(callLogs)
        .where(whereClause)
        .orderBy(desc(callLogs.createdAt))
        .limit(limit);
    }),

  // List unassigned call logs (no student matched)
  listUnassigned: protectedProcedure.query(async ({ ctx }) => {
    const database = await db.getDb();
    if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const { callLogs } = await import("../../drizzle/schema");
    const isAdmin = ctx.user?.role === "admin";
    const whereClause = isAdmin
      ? eq(callLogs.status, "unassigned")
      : and(eq(callLogs.ownerId, ctx.user.id), eq(callLogs.status, "unassigned"));
    return await database
      .select()
      .from(callLogs)
      .where(whereClause)
      .orderBy(desc(callLogs.createdAt));
  }),

  // Assign an unassigned call log to a student
  assign: protectedProcedure
    .input(z.object({ callLogId: z.number(), studentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { callLogs } = await import("../../drizzle/schema");
      const isAdmin = ctx.user?.role === "admin";
      const whereClause = isAdmin
        ? eq(callLogs.id, input.callLogId)
        : and(eq(callLogs.id, input.callLogId), eq(callLogs.ownerId, ctx.user.id));
      await database
        .update(callLogs)
        .set({ studentId: input.studentId, status: "assigned", assignedAt: new Date() })
        .where(whereClause);
      return { success: true };
    }),

  // Delete a call log
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { callLogs } = await import("../../drizzle/schema");
      const isAdmin = ctx.user?.role === "admin";
      const whereClause = isAdmin
        ? eq(callLogs.id, input.id)
        : and(eq(callLogs.id, input.id), eq(callLogs.ownerId, ctx.user.id));
      await database
        .delete(callLogs)
        .where(whereClause);
      return { success: true };
    }),

  // Get unassigned count (for sidebar badge)
  unassignedCount: protectedProcedure.query(async ({ ctx }) => {
    const database = await db.getDb();
    if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const { callLogs } = await import("../../drizzle/schema");
    const isAdmin = ctx.user?.role === "admin";
    const whereClause = isAdmin
      ? eq(callLogs.status, "unassigned")
      : and(eq(callLogs.ownerId, ctx.user.id), eq(callLogs.status, "unassigned"));
    const rows = await database
      .select({ id: callLogs.id })
      .from(callLogs)
      .where(whereClause);
    return { count: rows.length };
  }),
});

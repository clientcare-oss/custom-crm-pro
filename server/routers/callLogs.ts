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
        return await database
          .select()
          .from(callLogs)
          .where(and(eq(callLogs.ownerId, ctx.user.id), eq(callLogs.studentId, input.studentId)))
          .orderBy(desc(callLogs.createdAt));
      }),

    // List ALL call logs (for the full call log view with filters)
    listAll: protectedProcedure
      .input(z.object({
        filter: z.enum(["all", "unassigned", "calls", "voicemails", "sms"]).optional().default("all"),
        limit: z.number().min(1).max(200).optional().default(50),
      }).optional())
      .query(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { callLogs } = await import("../../drizzle/schema");
        const filter = input?.filter ?? "all";
        const limit = input?.limit ?? 50;
        const conditions = [eq(callLogs.ownerId, ctx.user.id)];
        if (filter === "unassigned") conditions.push(eq(callLogs.status, "unassigned"));
        if (filter === "voicemails") conditions.push(eq(callLogs.isVoicemail, true));
        if (filter === "sms") conditions.push(eq(callLogs.eventType, "message.received"));
        if (filter === "calls") {
          const { or, isNull, ne } = await import("drizzle-orm");
          return await database.select().from(callLogs)
            .where(and(eq(callLogs.ownerId, ctx.user.id), or(isNull(callLogs.eventType), ne(callLogs.eventType, "message.received"))))
            .orderBy(desc(callLogs.createdAt)).limit(limit);
        }
        return await database.select().from(callLogs)
          .where(and(...conditions))
          .orderBy(desc(callLogs.createdAt)).limit(limit);
      }),
    // List unassigned call logs (no student matched)
    listUnassigned: protectedProcedure.query(async ({ ctx }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { callLogs } = await import("../../drizzle/schema");
      return await database
        .select()
        .from(callLogs)
        .where(and(eq(callLogs.ownerId, ctx.user.id), eq(callLogs.status, "unassigned")))
        .orderBy(desc(callLogs.createdAt));
    }),

    // Assign an unassigned call log to a student
    assign: protectedProcedure
      .input(z.object({ callLogId: z.number(), studentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { callLogs } = await import("../../drizzle/schema");
        await database
          .update(callLogs)
          .set({ studentId: input.studentId, status: "assigned", assignedAt: new Date() })
          .where(and(eq(callLogs.id, input.callLogId), eq(callLogs.ownerId, ctx.user.id)));
        return { success: true };
      }),

    // Delete a call log
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { callLogs } = await import("../../drizzle/schema");
        await database
          .delete(callLogs)
          .where(and(eq(callLogs.id, input.id), eq(callLogs.ownerId, ctx.user.id)));
        return { success: true };
      }),

    // Get unassigned count (for sidebar badge)
    unassignedCount: protectedProcedure.query(async ({ ctx }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { callLogs } = await import("../../drizzle/schema");
      const rows = await database
        .select({ id: callLogs.id })
        .from(callLogs)
        .where(and(eq(callLogs.ownerId, ctx.user.id), eq(callLogs.status, "unassigned")));
      return { count: rows.length };
    }),
  
});

import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";

export const voyageLogRouter = router({
  // Expose query listing recordings for a student (admin view) or portal user (parent view)
  list: protectedProcedure
    .input(z.object({ contactId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      // Admin requests a student's logs
      if (ctx.user.role === 'admin') {
        const studentId = input?.contactId;
        if (!studentId) {
          // If no student specified, return all voyage logs
          const { voyageLogs } = await import("../../drizzle/schema");
          const { desc } = await import("drizzle-orm");
          return await dbConn.select().from(voyageLogs).orderBy(desc(voyageLogs.recordingDate));
        }
        return await db.getVoyageLogsForStudent(studentId);
      }

      // Non-admin (parent portal client): resolve student contact from context
      const { contacts } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const parentContact = await dbConn
        .select()
        .from(contacts)
        .where(eq(contacts.portalUserId, ctx.user.id))
        .limit(1);

      if (parentContact.length === 0) {
        return [];
      }

      // Return logs linked to this parent's portal user ID
      return await db.getVoyageLogsForParent(ctx.user.id);
    }),

  // Get details for a specific voyage log record
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const record = await db.getVoyageLogById(input.id);
      if (!record) throw new TRPCError({ code: 'NOT_FOUND', message: 'Voyage Log not found' });

      // Non-admin: verify access permissions
      if (ctx.user.role !== 'admin') {
        if (record.portalUserId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have access to this log' });
        }
      }
      return record;
    }),
});

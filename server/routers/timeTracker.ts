import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { brainDumpItems, brainDumpImages } from "../../drizzle/schema";

export const timeTrackerRouter = router({

    // Get the currently running (open) entry for a student
    getActive: adminProcedure
      .input(z.object({ studentId: z.number() }))
      .query(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { timeEntries } = await import("../../drizzle/schema");
        const { eq: dbEq, and: dbAnd, isNull } = await import("drizzle-orm");
        const [active] = await database
          .select()
          .from(timeEntries)
          .where(dbAnd(
            dbEq(timeEntries.studentId, input.studentId),
            dbEq(timeEntries.ownerId, ctx.user.id),
            isNull(timeEntries.endedAt)
          ))
          .limit(1);
        return active ?? null;
      }),

    // Start a new timer
    start: adminProcedure
      .input(z.object({ studentId: z.number(), hourlyRate: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { timeEntries, contacts } = await import("../../drizzle/schema");
        const { eq: dbEq, and: dbAnd, isNull } = await import("drizzle-orm");
        // Stop any existing open entry first
        const now = Date.now();
        const [existing] = await database
          .select()
          .from(timeEntries)
          .where(dbAnd(
            dbEq(timeEntries.studentId, input.studentId),
            dbEq(timeEntries.ownerId, ctx.user.id),
            isNull(timeEntries.endedAt)
          ))
          .limit(1);
        if (existing) {
          const dur = Math.round((now - existing.startedAt) / 1000);
          await database.update(timeEntries)
            .set({ endedAt: now, durationSeconds: dur })
            .where(dbEq(timeEntries.id, existing.id));
        }
        // Get student's hourly rate if not provided
        let rate = input.hourlyRate;
        if (!rate) {
          const [student] = await database.select({ hourlyRate: contacts.hourlyRate }).from(contacts).where(dbEq(contacts.id, input.studentId));
          rate = student?.hourlyRate != null ? student.hourlyRate.toString() : undefined;
        }
        const result = await database.insert(timeEntries).values({
          studentId: input.studentId,
          ownerId: ctx.user.id,
          startedAt: now,
          hourlyRate: rate,
          billable: true,
          invoiced: false,
        });
        return { success: true, id: Number((result as any).lastInsertRowid), startedAt: now };
      }),

    // Stop the running timer
    stop: adminProcedure
      .input(z.object({ entryId: z.number(), notes: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { timeEntries } = await import("../../drizzle/schema");
        const { eq: dbEq } = await import("drizzle-orm");
        const [entry] = await database.select().from(timeEntries).where(dbEq(timeEntries.id, input.entryId));
        if (!entry || entry.ownerId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        if (entry.endedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Timer already stopped" });
        const now = Date.now();
        const dur = Math.round((now - entry.startedAt) / 1000);
        await database.update(timeEntries)
          .set({ endedAt: now, durationSeconds: dur, notes: input.notes ?? entry.notes })
          .where(dbEq(timeEntries.id, input.entryId));
        return { success: true, durationSeconds: dur };
      }),

    // List all entries for a student
    list: adminProcedure
      .input(z.object({ studentId: z.number() }))
      .query(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { timeEntries } = await import("../../drizzle/schema");
        const { eq: dbEq, and: dbAnd, isNotNull } = await import("drizzle-orm");
        return await database
          .select()
          .from(timeEntries)
          .where(dbAnd(
            dbEq(timeEntries.studentId, input.studentId),
            dbEq(timeEntries.ownerId, ctx.user.id),
            isNotNull(timeEntries.endedAt)
          ))
          .orderBy(desc(timeEntries.startedAt));
      }),

    // Update notes on an entry
    updateNotes: adminProcedure
      .input(z.object({ entryId: z.number(), notes: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { timeEntries } = await import("../../drizzle/schema");
        const { eq: dbEq } = await import("drizzle-orm");
        const [entry] = await database.select().from(timeEntries).where(dbEq(timeEntries.id, input.entryId));
        if (!entry || entry.ownerId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        await database.update(timeEntries).set({ notes: input.notes }).where(dbEq(timeEntries.id, input.entryId));
        return { success: true };
      }),

    // Toggle billable / invoiced flags
    toggleFlag: adminProcedure
      .input(z.object({ entryId: z.number(), field: z.enum(["billable", "invoiced"]), value: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { timeEntries } = await import("../../drizzle/schema");
        const { eq: dbEq } = await import("drizzle-orm");
        const [entry] = await database.select().from(timeEntries).where(dbEq(timeEntries.id, input.entryId));
        if (!entry || entry.ownerId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        await database.update(timeEntries)
          .set(input.field === "billable" ? { billable: input.value } : { invoiced: input.value })
          .where(dbEq(timeEntries.id, input.entryId));
        return { success: true };
      }),

    // Delete an entry
    delete: adminProcedure
      .input(z.object({ entryId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { timeEntries } = await import("../../drizzle/schema");
        const { eq: dbEq } = await import("drizzle-orm");
        const [entry] = await database.select().from(timeEntries).where(dbEq(timeEntries.id, input.entryId));
        if (!entry || entry.ownerId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        await database.delete(timeEntries).where(dbEq(timeEntries.id, input.entryId));
        return { success: true };
      }),

    // Set hourly rate on a student contact
    setHourlyRate: adminProcedure
      .input(z.object({ studentId: z.number(), hourlyRate: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { contacts } = await import("../../drizzle/schema");
        const { eq: dbEq } = await import("drizzle-orm");
        await database.update(contacts)
          .set({ hourlyRate: input.hourlyRate })
          .where(dbEq(contacts.id, input.studentId));
        return { success: true };
      }),
  
});

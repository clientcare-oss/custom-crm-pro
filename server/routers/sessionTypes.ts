import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { brainDumpItems, brainDumpImages } from "../../drizzle/schema";

export const sessionTypesRouter = router({

    // List all session types for the owner
    list: adminProcedure.query(async ({ ctx }) => {
      const { sessionTypes } = await import("../../drizzle/schema");
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("DB unavailable");
      const rows = await dbConn
        .select()
        .from(sessionTypes)
        .where(eq(sessionTypes.ownerId, ctx.user.id))
        .orderBy(asc(sessionTypes.createdAt));
      return rows;
    }),

    // Get a single session type
    get: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const { sessionTypes } = await import("../../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("DB unavailable");
        const [row] = await dbConn
          .select()
          .from(sessionTypes)
          .where(and(eq(sessionTypes.id, input.id), eq(sessionTypes.ownerId, ctx.user.id)))
          .limit(1);
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });
        return row;
      }),

    // Create a new session type with standard defaults pre-filled
    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          description: z.string().optional(),
          sessionFormat: z.enum(["phone", "video"]).default("phone"),
          videoType: z.string().optional(),
          videoLink: z.string().optional(),
          timezone: z.string().default("America/New_York"),
          duration: z.number().default(60),
          durationUnit: z.enum(["minutes", "hours"]).default("minutes"),
          dateRange: z.enum(["rolling", "indefinitely", "fixed"]).default("indefinitely"),
          dateRangeDays: z.number().optional(),
          color: z.string().default("#e11d48"),
          instructions: z.string().optional(),
          confirmationMessage: z.string().optional(),
          bufferBefore: z.number().default(30),
          bufferBeforeUnit: z.enum(["minutes", "hours"]).default("minutes"),
          bufferAfter: z.number().default(6),
          bufferAfterUnit: z.enum(["minutes", "hours"]).default("hours"),
          minNotice: z.number().default(3),
          minNoticeUnit: z.enum(["minutes", "hours", "days"]).default("days"),
          customIncrements: z.number().default(15),
          teamMemberIds: z.string().optional(), // JSON array string
          weeklyHours: z.string().optional(),   // JSON object string
          reminderSettings: z.string().optional(), // JSON array string
          canReschedule: z.boolean().default(true),
          canCancel: z.boolean().default(false),
          sendConfirmationEmail: z.boolean().default(true),
          isActive: z.boolean().default(true),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { sessionTypes } = await import("../../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("DB unavailable");

        // Standard default weekly hours: Mon/Tue/Thu/Fri 8am-5pm
        const defaultWeeklyHours = JSON.stringify({
          mon: [{ start: "08:00", end: "17:00" }],
          tue: [{ start: "08:00", end: "17:00" }],
          wed: [],
          thu: [{ start: "08:00", end: "17:00" }],
          fri: [{ start: "08:00", end: "17:00" }],
          sat: [],
          sun: [],
        });

        // Standard default reminders: 1hr before + 15min before
        const defaultReminders = JSON.stringify([
          { method: "both", amount: 1, unit: "hours", notifyOwner: true },
          { method: "both", amount: 15, unit: "minutes", notifyOwner: true },
        ]);

        const result = await dbConn.insert(sessionTypes).values({
          ownerId: ctx.user.id,
          ...input,
          weeklyHours: input.weeklyHours ?? defaultWeeklyHours,
          reminderSettings: input.reminderSettings ?? defaultReminders,
        });
        return { id: Number((result as any).lastInsertRowid) };
      }),

    // Update a session type
    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).max(255).optional(),
          description: z.string().optional(),
          sessionFormat: z.enum(["phone", "video"]).optional(),
          videoType: z.string().optional(),
          videoLink: z.string().optional(),
          timezone: z.string().optional(),
          duration: z.number().optional(),
          durationUnit: z.enum(["minutes", "hours"]).optional(),
          dateRange: z.enum(["rolling", "indefinitely", "fixed"]).optional(),
          dateRangeDays: z.number().optional(),
          color: z.string().optional(),
          instructions: z.string().optional(),
          confirmationMessage: z.string().optional(),
          bufferBefore: z.number().optional(),
          bufferBeforeUnit: z.enum(["minutes", "hours"]).optional(),
          bufferAfter: z.number().optional(),
          bufferAfterUnit: z.enum(["minutes", "hours"]).optional(),
          minNotice: z.number().optional(),
          minNoticeUnit: z.enum(["minutes", "hours", "days"]).optional(),
          customIncrements: z.number().optional(),
          teamMemberIds: z.string().optional(),
          weeklyHours: z.string().optional(),
          reminderSettings: z.string().optional(),
          canReschedule: z.boolean().optional(),
          canCancel: z.boolean().optional(),
          sendConfirmationEmail: z.boolean().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { sessionTypes } = await import("../../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("DB unavailable");
        const { id, ...data } = input;
        await dbConn
          .update(sessionTypes)
          .set({ ...data, updatedAt: new Date() })
          .where(and(eq(sessionTypes.id, id), eq(sessionTypes.ownerId, ctx.user.id)));
        return { success: true };
      }),

    // Delete a session type
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { sessionTypes } = await import("../../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("DB unavailable");
        await dbConn
          .delete(sessionTypes)
          .where(and(eq(sessionTypes.id, input.id), eq(sessionTypes.ownerId, ctx.user.id)));
        return { success: true };
      }),

    // Toggle active/inactive
    toggleActive: adminProcedure
      .input(z.object({ id: z.number(), isActive: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const { sessionTypes } = await import("../../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("DB unavailable");
        await dbConn
          .update(sessionTypes)
          .set({ isActive: input.isActive, updatedAt: new Date() })
          .where(and(eq(sessionTypes.id, input.id), eq(sessionTypes.ownerId, ctx.user.id)));
        return { success: true };
      }),

    // Public: list active session types for a booking page (by ownerId)
    // Returns all active session types for the owner (no ownerId required — uses ENV owner)
    listAll: publicProcedure.query(async () => {
      const { sessionTypes, users } = await import("../../drizzle/schema");
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("DB unavailable");
      let owner = await db.getUserByOpenId(ENV.ownerOpenId);
      // Fallback: if OWNER_OPEN_ID doesn't match, use the first admin user
      if (!owner) {
        const [firstAdmin] = await dbConn.select().from(users).where(eq(users.role, 'admin')).limit(1);
        owner = firstAdmin ?? null;
      }
      if (!owner) return [];
      const rows = await dbConn
        .select()
        .from(sessionTypes)
        .where(and(eq(sessionTypes.ownerId, owner.id), eq(sessionTypes.isActive, true)))
        .orderBy(asc(sessionTypes.createdAt));
      return rows;
    }),

    // Public: get a single session type by ID (for inline scheduler)
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const { sessionTypes } = await import("../../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("DB unavailable");
        const [row] = await dbConn
          .select()
          .from(sessionTypes)
          .where(eq(sessionTypes.id, input.id))
          .limit(1);
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });
        return row;
      }),

    listPublic: publicProcedure
      .input(z.object({ ownerId: z.number() }))
      .query(async ({ input }) => {
        const { sessionTypes } = await import("../../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("DB unavailable");
        const rows = await dbConn
          .select()
          .from(sessionTypes)
          .where(and(eq(sessionTypes.ownerId, input.ownerId), eq(sessionTypes.isActive, true)))
          .orderBy(asc(sessionTypes.createdAt));
        return rows;
      }),
  
});

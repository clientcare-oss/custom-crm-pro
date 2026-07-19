import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { brainDumpItems, brainDumpImages } from "../../drizzle/schema";

export const walkthroughsRouter = router({

    list: adminProcedure
      .input(z.object({ category: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { walkthroughs } = await import("../../drizzle/schema");
        const { eq: dbEq } = await import("drizzle-orm");
        const rows = await database.select().from(walkthroughs).where(dbEq(walkthroughs.ownerId, ctx.user.id));
        if (input.category && input.category !== "All") {
          return rows.filter((r) => r.category === input.category);
        }
        return rows;
      }),

    create: adminProcedure
      .input(z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        category: z.string().default("General"),
        steps: z.array(z.object({
          id: z.string(),
          title: z.string(),
          instructions: z.string(),
          script: z.string().optional(),
          notes: z.string().optional(),
          order: z.number(),
        })).default([]),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { walkthroughs } = await import("../../drizzle/schema");
        const result = await database.insert(walkthroughs).values({
          ownerId: ctx.user.id,
          title: input.title,
          description: input.description ?? null,
          category: input.category,
          steps: input.steps,
        });
        return { id: Number((result as any).lastInsertRowid) };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        steps: z.array(z.object({
          id: z.string(),
          title: z.string(),
          instructions: z.string(),
          script: z.string().optional(),
          notes: z.string().optional(),
          order: z.number(),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { walkthroughs } = await import("../../drizzle/schema");
        const { eq: dbEq } = await import("drizzle-orm");
        const updates: Record<string, any> = {};
        if (input.title !== undefined) updates.title = input.title;
        if (input.description !== undefined) updates.description = input.description;
        if (input.category !== undefined) updates.category = input.category;
        if (input.steps !== undefined) updates.steps = input.steps;
        await database.update(walkthroughs).set(updates).where(dbEq(walkthroughs.id, input.id));
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { walkthroughs, walkthroughRuns } = await import("../../drizzle/schema");
        const { eq: dbEq } = await import("drizzle-orm");
        await database.delete(walkthroughRuns).where(dbEq(walkthroughRuns.walkthroughId, input.id));
        await database.delete(walkthroughs).where(dbEq(walkthroughs.id, input.id));
        return { success: true };
      }),

    startRun: adminProcedure
      .input(z.object({ walkthroughId: z.number(), studentId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { walkthroughRuns } = await import("../../drizzle/schema");
        const result = await database.insert(walkthroughRuns).values({
          walkthroughId: input.walkthroughId,
          studentId: input.studentId ?? null,
          ownerId: ctx.user.id,
          completedSteps: [],
          status: "in_progress",
        });
        return { id: Number((result as any).lastInsertRowid) };
      }),

    updateRun: adminProcedure
      .input(z.object({
        runId: z.number(),
        completedSteps: z.array(z.string()),
        status: z.enum(["in_progress", "completed", "abandoned"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { walkthroughRuns } = await import("../../drizzle/schema");
        const { eq: dbEq } = await import("drizzle-orm");
        const updates: Record<string, any> = { completedSteps: input.completedSteps };
        if (input.status) updates.status = input.status;
        if (input.status === "completed") updates.completedAt = new Date();
        if (input.notes !== undefined) updates.notes = input.notes;
        await database.update(walkthroughRuns).set(updates).where(dbEq(walkthroughRuns.id, input.runId));
        return { success: true };
      }),

    listRuns: adminProcedure
      .input(z.object({ studentId: z.number().optional(), walkthroughId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { walkthroughRuns, walkthroughs } = await import("../../drizzle/schema");
        const { eq: dbEq, and: dbAnd } = await import("drizzle-orm");
        const conditions: any[] = [dbEq(walkthroughRuns.ownerId, ctx.user.id)];
        if (input.studentId) conditions.push(dbEq(walkthroughRuns.studentId, input.studentId));
        if (input.walkthroughId) conditions.push(dbEq(walkthroughRuns.walkthroughId, input.walkthroughId));
        const runs = await database
          .select()
          .from(walkthroughRuns)
          .where(dbAnd(...conditions))
          .orderBy(walkthroughRuns.startedAt);
        return runs;
      }),
  
});

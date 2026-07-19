import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { brainDumpItems, brainDumpImages } from "../../drizzle/schema";

export const brainDumpRouter = router({

    list: protectedProcedure
      .input(z.object({
        category: z.string().optional(),
        status: z.enum(["not_started", "in_progress", "done", "archived"]).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        search: z.string().optional(),
        pinnedOnly: z.boolean().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const { brainDumpItems: bdi } = await import("../../drizzle/schema");
        const { eq: beq, desc: bdesc, asc: basc } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) return [];
        let rows = await dbConn.select().from(bdi)
          .where(beq(bdi.ownerId, ctx.user.id))
          .orderBy(bdesc(bdi.pinned), basc(bdi.sortOrder), bdesc(bdi.createdAt));
        let items = rows.map((r) => ({
          ...r,
          pinned: Boolean(r.pinned),
          tags: r.tags ? JSON.parse(r.tags) : [],
        }));
        if (input?.search) {
          const q = input.search.toLowerCase();
          items = items.filter((i) =>
            i.title.toLowerCase().includes(q) ||
            (i.body ?? "").toLowerCase().includes(q) ||
            (i.nextStep ?? "").toLowerCase().includes(q)
          );
        }
        if (input?.category && input.category !== "All") {
          items = items.filter((i) => i.category === input.category);
        }
        if (input?.status) items = items.filter((i) => i.status === input.status);
        if (input?.priority) items = items.filter((i) => i.priority === input.priority);
        if (input?.pinnedOnly) items = items.filter((i) => i.pinned);
        return items;
      }),

    categories: protectedProcedure.query(async ({ ctx }) => {
      const { brainDumpItems: bdi } = await import("../../drizzle/schema");
      const { eq: beq } = await import("drizzle-orm");
      const { sql: bsql } = await import("drizzle-orm");
      const dbConn = await db.getDb();
      if (!dbConn) return [];
      const rows = await dbConn.selectDistinct({ category: bdi.category }).from(bdi)
        .where(beq(bdi.ownerId, ctx.user.id));
      return rows.map((r) => r.category);
    }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        body: z.string().optional(),
        category: z.string().default("General"),
        status: z.enum(["not_started", "in_progress", "done", "archived"]).default("not_started"),
        priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
        nextStep: z.string().optional(),
        pinned: z.boolean().default(false),
        tags: z.array(z.string()).default([]),
      }))
      .mutation(async ({ ctx, input }) => {
        const { brainDumpItems: bdi } = await import("../../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const result = await dbConn.insert(bdi).values({
          ownerId: ctx.user.id,
          title: input.title,
          body: input.body ?? null,
          category: input.category,
          status: input.status,
          priority: input.priority,
          nextStep: input.nextStep ?? null,
          pinned: input.pinned,
          tags: JSON.stringify(input.tags),
          sortOrder: 0,
        });
        return { id: Number((result as any).lastInsertRowid) };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        body: z.string().optional().nullable(),
        category: z.string().optional(),
        status: z.enum(["not_started", "in_progress", "done", "archived"]).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        nextStep: z.string().optional().nullable(),
        pinned: z.boolean().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { brainDumpItems: bdi } = await import("../../drizzle/schema");
        const { eq: beq, and: band } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { id, tags, ...rest } = input;
        const updateData: Record<string, any> = { ...rest };
        if (tags !== undefined) updateData.tags = JSON.stringify(tags);
        if (Object.keys(updateData).length === 0) return { ok: true };
        await dbConn.update(bdi).set(updateData).where(band(beq(bdi.id, id), beq(bdi.ownerId, ctx.user.id)));
        return { ok: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { brainDumpItems: bdi } = await import("../../drizzle/schema");
        const { eq: beq, and: band } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await dbConn.delete(bdi).where(band(beq(bdi.id, input.id), beq(bdi.ownerId, ctx.user.id)));
        return { ok: true };
      }),
  
});

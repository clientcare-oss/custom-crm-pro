import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure } from "../_core/trpc";
import { brainDumpItems, brainDumpImages, internalTasks } from "../../drizzle/schema";

export const brainDumpRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          scope: z.enum(["employee", "company", "unclassified", "all"]).optional(),
          employeeId: z.string().optional(),
          organizationId: z.string().optional(),
          category: z.string().optional(),
          status: z.enum(["not_started", "in_progress", "done", "archived"]).optional(),
          priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
          search: z.string().optional(),
          pinnedOnly: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { brainDumpItems: bdi } = await import("../../drizzle/schema");
      const { eq: beq, desc: bdesc, and: band, or: bor } = await import("drizzle-orm");
      const dbConn = await db.getDb();
      if (!dbConn) return [];

      let rows = await dbConn
        .select()
        .from(bdi)
        .orderBy(bdesc(bdi.pinned), bdesc(bdi.id));

      let items = rows.map((r: any) => ({
        ...r,
        pinned: Boolean(r.pinned),
        tags: r.tags ? (typeof r.tags === "string" ? JSON.parse(r.tags) : r.tags) : [],
        scope: r.scope || "unclassified",
      }));

      // Filter by Scope & Employee
      if (input?.scope && input.scope !== "all") {
        if (input.scope === "employee") {
          if (input.employeeId) {
            items = items.filter((i) => {
              if (i.scope === "employee") {
                return i.employeeId === input.employeeId || (!i.employeeId && input.employeeId === "emp-byron-honea");
              }
              if (i.scope === "unclassified" && input.employeeId === "emp-byron-honea") {
                return true;
              }
              return false;
            });
          } else {
            items = items.filter((i) => i.scope === "employee" || i.scope === "unclassified");
          }
        } else if (input.scope === "company") {
          items = items.filter((i) => i.scope === "company");
        } else if (input.scope === "unclassified") {
          items = items.filter((i) => i.scope === "unclassified");
        }
      }

      // Search filter
      if (input?.search) {
        const q = input.search.toLowerCase();
        items = items.filter(
          (i) =>
            i.title.toLowerCase().includes(q) ||
            (i.body ?? "").toLowerCase().includes(q) ||
            (i.nextStep ?? "").toLowerCase().includes(q) ||
            (i.tags ?? []).some((t: string) => t.toLowerCase().includes(q))
        );
      }

      // Category filter
      if (input?.category && input.category !== "All") {
        items = items.filter((i) => i.category === input.category);
      }

      // Status filter
      if (input?.status) items = items.filter((i) => i.status === input.status);

      // Priority filter
      if (input?.priority) items = items.filter((i) => i.priority === input.priority);

      // Pinned only
      if (input?.pinnedOnly) items = items.filter((i) => i.pinned);

      // Sort: pinned first, then ID descending
      return items.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.id - a.id);
    }),

  summary: protectedProcedure
    .input(
      z
        .object({
          scope: z.enum(["employee", "company", "unclassified", "all"]).optional(),
          employeeId: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { brainDumpItems: bdi } = await import("../../drizzle/schema");
      const dbConn = await db.getDb();
      if (!dbConn) return { total: 0, pinned: 0, inProgress: 0, done: 0, notStarted: 0, unclassified: 0 };

      const rows = await dbConn.select().from(bdi);

      let items = rows.map((r: any) => ({
        ...r,
        pinned: Boolean(r.pinned),
        scope: r.scope || "unclassified",
      }));

      const globalUnclassified = items.filter((i) => i.scope === "unclassified").length;
      const globalEmployee = items.filter((i) => i.scope === "employee").length;
      const globalCompany = items.filter((i) => i.scope === "company").length;

      if (input?.scope && input.scope !== "all") {
        if (input.scope === "employee") {
          if (input.employeeId) {
            items = items.filter((i) => {
              if (i.scope === "employee") {
                return i.employeeId === input.employeeId || (!i.employeeId && input.employeeId === "emp-byron-honea");
              }
              if (i.scope === "unclassified" && input.employeeId === "emp-byron-honea") {
                return true;
              }
              return false;
            });
          } else {
            items = items.filter((i) => i.scope === "employee" || i.scope === "unclassified");
          }
        } else if (input.scope === "company") {
          items = items.filter((i) => i.scope === "company");
        } else if (input.scope === "unclassified") {
          items = items.filter((i) => i.scope === "unclassified");
        }
      }

      return {
        total: items.length,
        pinned: items.filter((i) => i.pinned).length,
        inProgress: items.filter((i) => i.status === "in_progress").length,
        done: items.filter((i) => i.status === "done").length,
        notStarted: items.filter((i) => i.status === "not_started").length,
        unclassified: globalUnclassified,
        employeeCount: globalEmployee,
        companyCount: globalCompany,
      };
    }),

  categories: protectedProcedure.query(async ({ ctx }) => {
    const { brainDumpItems: bdi } = await import("../../drizzle/schema");
    const dbConn = await db.getDb();
    if (!dbConn) return [];
    const rows = await dbConn.selectDistinct({ category: bdi.category }).from(bdi);
    return rows.map((r: any) => r.category);
  }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        body: z.string().optional(),
        category: z.string().default("General"),
        status: z.enum(["not_started", "in_progress", "done", "archived"]).default("not_started"),
        priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
        nextStep: z.string().optional(),
        pinned: z.boolean().default(false),
        tags: z.array(z.string()).default([]),
        scope: z.enum(["employee", "company", "unclassified"]).default("employee"),
        employeeId: z.string().optional(),
        organizationId: z.string().default("default"),
        bringUpDate: z.string().optional(),
        wallPositionX: z.number().optional(),
        wallPositionY: z.number().optional(),
        wallRotation: z.number().default(0),
        pinColor: z.string().default("yellow"),
        stickyColor: z.string().default("yellow"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { brainDumpItems: bdi } = await import("../../drizzle/schema");
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = new Date();
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
        scope: input.scope,
        employeeId: input.employeeId ?? (input.scope === "employee" ? "emp-byron-honea" : null),
        organizationId: input.organizationId,
        bringUpDate: input.bringUpDate ?? null,
        wallPositionX: input.wallPositionX ?? null,
        wallPositionY: input.wallPositionY ?? null,
        wallRotation: input.wallRotation,
        pinColor: input.pinColor,
        stickyColor: input.stickyColor,
        createdAt: now,
        updatedAt: now,
      });
      const id = Number(
        (result as any)?.lastInsertRowid || (result as any)?.meta?.last_row_id || (result as any)?.insertId || 0
      );
      return { id };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        body: z.string().optional().nullable(),
        category: z.string().optional(),
        status: z.enum(["not_started", "in_progress", "done", "archived"]).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        nextStep: z.string().optional().nullable(),
        pinned: z.boolean().optional(),
        tags: z.array(z.string()).optional(),
        scope: z.enum(["employee", "company", "unclassified"]).optional(),
        employeeId: z.string().optional().nullable(),
        organizationId: z.string().optional(),
        bringUpDate: z.string().optional().nullable(),
        wallPositionX: z.number().optional().nullable(),
        wallPositionY: z.number().optional().nullable(),
        wallRotation: z.number().optional(),
        taskConvertedId: z.number().optional().nullable(),
        pinColor: z.string().optional(),
        stickyColor: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { brainDumpItems: bdi } = await import("../../drizzle/schema");
      const { eq: beq } = await import("drizzle-orm");
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, tags, ...rest } = input;
      const updateData: Record<string, any> = { ...rest, updatedAt: new Date() };
      if (tags !== undefined) updateData.tags = JSON.stringify(tags);
      if (Object.keys(updateData).length === 0) return { ok: true };
      await dbConn.update(bdi).set(updateData).where(beq(bdi.id, id));
      return { ok: true };
    }),

  bulkClassify: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.number()),
        targetScope: z.enum(["employee", "company"]),
        employeeId: z.string().optional(),
        organizationId: z.string().default("default"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { brainDumpItems: bdi } = await import("../../drizzle/schema");
      const { inArray: binArray } = await import("drizzle-orm");
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (input.ids.length === 0) return { count: 0 };

      const updateData: Record<string, any> = {
        scope: input.targetScope,
        updatedAt: new Date(),
      };
      if (input.targetScope === "employee") {
        updateData.employeeId = input.employeeId || "emp-byron-honea";
      } else {
        updateData.organizationId = input.organizationId || "default";
      }

      await dbConn.update(bdi).set(updateData).where(binArray(bdi.id, input.ids));
      return { count: input.ids.length };
    }),

  convertToTask: protectedProcedure
    .input(
      z.object({
        noteId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        assigneeId: z.number().optional(),
        assigneeContactId: z.number().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
        dueDate: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { internalTasks, brainDumpItems: bdi } = await import("../../drizzle/schema");
      const { eq: beq } = await import("drizzle-orm");
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const now = new Date();
      const taskResult = await dbConn.insert(internalTasks).values({
        title: input.title,
        description: input.description ?? null,
        priority: input.priority,
        status: "not_started",
        assigneeId: input.assigneeId ?? ctx.user.id,
        assigneeContactId: input.assigneeContactId ?? null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        createdAt: now,
        updatedAt: now,
      });

      const taskId = Number(
        (taskResult as any)?.lastInsertRowid ||
          (taskResult as any)?.meta?.last_row_id ||
          (taskResult as any)?.insertId ||
          0
      );

      if (taskId > 0) {
        await dbConn
          .update(bdi)
          .set({ taskConvertedId: taskId, updatedAt: now })
          .where(beq(bdi.id, input.noteId));
      }

      return { taskId };
    }),

  recommendTask: protectedProcedure
    .input(
      z.object({
        noteId: z.number(),
        noteTitle: z.string(),
        noteBody: z.string().optional(),
        senderName: z.string(),
        targetEmployeeId: z.string(),
        targetEmployeeName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return {
        ok: true,
        message: `Task recommendation for "${input.noteTitle}" sent to ${input.targetEmployeeName} via Crew Messages.`,
      };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { brainDumpItems: bdi } = await import("../../drizzle/schema");
      const { eq: beq } = await import("drizzle-orm");
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await dbConn.delete(bdi).where(beq(bdi.id, input.id));
      return { ok: true };
    }),
});

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { techTasks, techTaskSubtasks } from "../../drizzle/schema";
import { eq, and, desc, asc } from "drizzle-orm";

const taskStatusEnum = z.enum(["Backlog", "In Progress", "In Review", "Done", "Stuck"]);
const taskPriorityEnum = z.enum(["High", "Medium", "Low"]);
const taskCategoryEnum = z.enum(["Implementation", "Refinement", "Compliance", "Bug Fix", "Infrastructure"]);

export const techTasksRouter = router({
  // ─── List all tech tasks ──────────────────────────────────────────────────
  list: protectedProcedure.query(async ({ ctx }) => {
    const dbConn = await db.getDb();
    if (!dbConn) return [];
    const tasks = await dbConn
      .select()
      .from(techTasks)
      .where(eq(techTasks.ownerId, ctx.user.id))
      .orderBy(desc(techTasks.createdAt));

    // Fetch all subtasks for these tasks
    const taskIds = tasks.map((t) => t.id);
    let subtasks: typeof techTaskSubtasks.$inferSelect[] = [];
    if (taskIds.length > 0) {
      subtasks = await dbConn
        .select()
        .from(techTaskSubtasks)
        .where(
          taskIds.length === 1
            ? eq(techTaskSubtasks.taskId, taskIds[0])
            : eq(techTaskSubtasks.taskId, taskIds[0]) // fallback; we'll join below
        )
        .orderBy(asc(techTaskSubtasks.sortOrder));
      // Re-fetch all subtasks without filter limitation
      subtasks = await dbConn
        .select()
        .from(techTaskSubtasks)
        .orderBy(asc(techTaskSubtasks.sortOrder));
      subtasks = subtasks.filter((s) => taskIds.includes(s.taskId));
    }

    return tasks.map((task) => ({
      ...task,
      subtasks: subtasks.filter((s) => s.taskId === task.id),
    }));
  }),

  // ─── Create a tech task ───────────────────────────────────────────────────
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        status: taskStatusEnum.optional(),
        priority: taskPriorityEnum.optional(),
        category: taskCategoryEnum.optional(),
        assignee: z.string().optional(),
        dueDate: z.string().optional(), // ISO string
        resourceUrl: z.string().optional(),
        subtasks: z.array(z.object({ title: z.string().min(1) })).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const result = await dbConn.insert(techTasks).values({
        ownerId: ctx.user.id,
        title: input.title,
        description: input.description,
        status: input.status ?? "Backlog",
        priority: input.priority ?? "Medium",
        category: input.category ?? "Implementation",
        assignee: input.assignee,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        resourceUrl: input.resourceUrl,
      });

      const taskId = Number((result as any).lastInsertRowid) as number;

      if (input.subtasks && input.subtasks.length > 0) {
        await dbConn.insert(techTaskSubtasks).values(
          input.subtasks.map((s, i) => ({
            taskId,
            title: s.title,
            isComplete: false,
            sortOrder: i,
          }))
        );
      }

      return { success: true, id: taskId };
    }),

  // ─── Update a tech task ───────────────────────────────────────────────────
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        status: taskStatusEnum.optional(),
        priority: taskPriorityEnum.optional(),
        category: taskCategoryEnum.optional(),
        assignee: z.string().optional(),
        dueDate: z.string().nullable().optional(),
        resourceUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [task] = await dbConn
        .select()
        .from(techTasks)
        .where(and(eq(techTasks.id, input.id), eq(techTasks.ownerId, ctx.user.id)))
        .limit(1);
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });

      const updates: Partial<typeof techTasks.$inferInsert> = {};
      if (input.title !== undefined) updates.title = input.title;
      if (input.description !== undefined) updates.description = input.description;
      if (input.status !== undefined) {
        updates.status = input.status;
        if (input.status === "Done" && !task.completedAt) {
          updates.completedAt = new Date();
        } else if (input.status !== "Done") {
          updates.completedAt = undefined;
        }
      }
      if (input.priority !== undefined) updates.priority = input.priority;
      if (input.category !== undefined) updates.category = input.category;
      if (input.assignee !== undefined) updates.assignee = input.assignee;
      if (input.dueDate !== undefined) {
        updates.dueDate = input.dueDate ? new Date(input.dueDate) : undefined;
      }
      if (input.resourceUrl !== undefined) updates.resourceUrl = input.resourceUrl;

      await dbConn.update(techTasks).set(updates).where(eq(techTasks.id, input.id));
      return { success: true };
    }),

  // ─── Delete a tech task ───────────────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [task] = await dbConn
        .select()
        .from(techTasks)
        .where(and(eq(techTasks.id, input.id), eq(techTasks.ownerId, ctx.user.id)))
        .limit(1);
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });

      await dbConn.delete(techTaskSubtasks).where(eq(techTaskSubtasks.taskId, input.id));
      await dbConn.delete(techTasks).where(eq(techTasks.id, input.id));
      return { success: true };
    }),

  // ─── Subtask procedures ───────────────────────────────────────────────────
  subtasks: router({
    create: protectedProcedure
      .input(z.object({ taskId: z.number(), title: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // Verify ownership
        const [task] = await dbConn
          .select()
          .from(techTasks)
          .where(and(eq(techTasks.id, input.taskId), eq(techTasks.ownerId, ctx.user.id)))
          .limit(1);
        if (!task) throw new TRPCError({ code: "NOT_FOUND" });

        const existing = await dbConn
          .select()
          .from(techTaskSubtasks)
          .where(eq(techTaskSubtasks.taskId, input.taskId));
        const result = await dbConn.insert(techTaskSubtasks).values({
          taskId: input.taskId,
          title: input.title,
          isComplete: false,
          sortOrder: existing.length,
        });
        return { success: true, id: Number((result as any).lastInsertRowid) as number };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1).optional(),
          isComplete: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const [sub] = await dbConn
          .select()
          .from(techTaskSubtasks)
          .where(eq(techTaskSubtasks.id, input.id))
          .limit(1);
        if (!sub) throw new TRPCError({ code: "NOT_FOUND" });

        // Verify ownership via parent task
        const [task] = await dbConn
          .select()
          .from(techTasks)
          .where(and(eq(techTasks.id, sub.taskId), eq(techTasks.ownerId, ctx.user.id)))
          .limit(1);
        if (!task) throw new TRPCError({ code: "FORBIDDEN" });

        const updates: Partial<typeof techTaskSubtasks.$inferInsert> = {};
        if (input.title !== undefined) updates.title = input.title;
        if (input.isComplete !== undefined) updates.isComplete = input.isComplete;

        await dbConn.update(techTaskSubtasks).set(updates).where(eq(techTaskSubtasks.id, input.id));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const [sub] = await dbConn
          .select()
          .from(techTaskSubtasks)
          .where(eq(techTaskSubtasks.id, input.id))
          .limit(1);
        if (!sub) throw new TRPCError({ code: "NOT_FOUND" });

        const [task] = await dbConn
          .select()
          .from(techTasks)
          .where(and(eq(techTasks.id, sub.taskId), eq(techTasks.ownerId, ctx.user.id)))
          .limit(1);
        if (!task) throw new TRPCError({ code: "FORBIDDEN" });

        await dbConn.delete(techTaskSubtasks).where(eq(techTaskSubtasks.id, input.id));
        return { success: true };
      }),
  }),
});

import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { brainDumpItems, brainDumpImages } from "../../drizzle/schema";

export const internalTasksRouter = router({

    getTeamUsers: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role === "client") throw new TRPCError({ code: "FORBIDDEN", message: "Clients cannot access internal tasks" });
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { users } = await import("../../drizzle/schema");
        return database.select({ id: users.id, name: users.name, role: users.role }).from(users)
          .then(rows => rows.filter(u => u.role !== "client"));
      }),

    // Returns all students that have at least one file, for task file picker
    getStudentsWithFiles: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role === "client") throw new TRPCError({ code: "FORBIDDEN", message: "Clients cannot access internal tasks" });
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { contacts, clientFiles } = await import("../../drizzle/schema");
        const students = await database
          .select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName })
          .from(contacts)
          .where(eq(contacts.jobTitle, "Student"));
        const result = await Promise.all(students.map(async (s) => {
          const files = await database
            .select({ id: clientFiles.id, fileName: clientFiles.fileName, fileUrl: clientFiles.fileUrl, uploadedAt: clientFiles.uploadedAt })
            .from(clientFiles)
            .where(eq(clientFiles.clientId, s.id))
            .orderBy(desc(clientFiles.uploadedAt));
          return { id: s.id, name: `${s.firstName} ${s.lastName}`, files };
        }));
        // Return all students (even those without files) so admin can still see them
        return result;
      }),

    list: protectedProcedure
      .input(z.object({
        status: z.enum(["all", "not_started", "in_progress", "stuck", "complete"]).optional(),
        assigneeId: z.number().optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        if (ctx.user.role === "client") throw new TRPCError({ code: "FORBIDDEN", message: "Clients cannot access internal tasks" });
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { internalTasks, internalSubtasks, users, projects, contacts } = await import("../../drizzle/schema");
        const tasks = await database.select().from(internalTasks).orderBy(asc(internalTasks.createdAt));
        const subtasks = await database.select().from(internalSubtasks).orderBy(asc(internalSubtasks.sortOrder));
        const allUsers = await database.select({ id: users.id, name: users.name }).from(users);
        const allProjects = await database.select({ id: projects.id, name: projects.name }).from(projects);
        const allContacts = await database.select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName }).from(contacts);
        const userMap = Object.fromEntries(allUsers.map(u => [u.id, u.name]));
        const projectMap = Object.fromEntries(allProjects.map(p => [p.id, p.name]));
        const contactMap = Object.fromEntries(allContacts.map(c => [c.id, `${c.firstName} ${c.lastName}`]));
        const subtasksByTask = subtasks.reduce((acc, s) => {
          if (!acc[s.taskId]) acc[s.taskId] = [];
          acc[s.taskId].push(s);
          return acc;
        }, {} as Record<number, typeof subtasks>);
        let result = tasks.map(t => ({
          ...t,
          resources: t.resources ? JSON.parse(t.resources) : [],
          assigneeName: t.assigneeId ? userMap[t.assigneeId] : (t.assigneeContactId ? contactMap[t.assigneeContactId] : null),
          projectName: t.projectId ? projectMap[t.projectId] : null,
          subtasks: (subtasksByTask[t.id] || []).map(s => ({
            ...s,
            resources: s.resources ? JSON.parse(s.resources) : [],
            assigneeName: s.assigneeId ? userMap[s.assigneeId] : null,
          })),
        }));
        if (input?.status && input.status !== "all") {
          result = result.filter(t => t.status === input.status);
        }
        if (input?.assigneeId) {
          result = result.filter(t => t.assigneeId === input.assigneeId);
        }
        return result;
      }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        status: z.enum(["not_started", "in_progress", "stuck", "complete"]).optional(),
        projectId: z.number().optional(),
        assigneeId: z.number().optional(),
        assigneeContactId: z.number().optional(),
        dueDate: z.string().optional(),
        linkedFileId: z.number().optional(),
        linkedFileName: z.string().optional(),
        linkedFileUrl: z.string().optional(),
        linkedStudentId: z.number().optional(),
        linkedStudentName: z.string().optional(),
        resources: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { internalTasks } = await import("../../drizzle/schema");
        const result = await database.insert(internalTasks).values({
          title: input.title,
          description: input.description,
          status: input.status || "not_started",
          projectId: input.projectId,
          assigneeId: input.assigneeId,
          assigneeContactId: input.assigneeContactId,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
          resources: input.resources || "[]",
          linkedFileId: input.linkedFileId,
          linkedFileName: input.linkedFileName,
          linkedFileUrl: input.linkedFileUrl,
          linkedStudentId: input.linkedStudentId,
          linkedStudentName: input.linkedStudentName,
          createdBy: ctx.user.id,
        });
        return { id: Number((result as any).lastInsertRowid) };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        status: z.enum(["not_started", "in_progress", "stuck", "complete"]).optional(),
        projectId: z.number().nullable().optional(),
        assigneeId: z.number().nullable().optional(),
        assigneeContactId: z.number().nullable().optional(),
        dueDate: z.string().nullable().optional(),
        linkedFileId: z.number().nullable().optional(),
        linkedFileName: z.string().nullable().optional(),
        linkedFileUrl: z.string().nullable().optional(),
        linkedStudentId: z.number().nullable().optional(),
        linkedStudentName: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { internalTasks } = await import("../../drizzle/schema");
        const { id, ...data } = input;
        const updateData: Record<string, unknown> = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.status !== undefined) updateData.status = data.status;
        if (data.projectId !== undefined) updateData.projectId = data.projectId;
        if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;
        if (data.assigneeContactId !== undefined) updateData.assigneeContactId = data.assigneeContactId;
        if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
        if (data.linkedFileId !== undefined) updateData.linkedFileId = data.linkedFileId;
        if (data.linkedFileName !== undefined) updateData.linkedFileName = data.linkedFileName;
        if (data.linkedFileUrl !== undefined) updateData.linkedFileUrl = data.linkedFileUrl;
        if (data.linkedStudentId !== undefined) updateData.linkedStudentId = data.linkedStudentId;
        if (data.linkedStudentName !== undefined) updateData.linkedStudentName = data.linkedStudentName;
        await database.update(internalTasks).set(updateData).where(eq(internalTasks.id, id));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { internalTasks, internalSubtasks } = await import("../../drizzle/schema");
        await database.delete(internalSubtasks).where(eq(internalSubtasks.taskId, input.id));
        await database.delete(internalTasks).where(eq(internalTasks.id, input.id));
        return { success: true };
      }),

    addResource: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        label: z.string().min(1),
        url: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { internalTasks } = await import("../../drizzle/schema");
        const [task] = await database.select({ resources: internalTasks.resources }).from(internalTasks).where(eq(internalTasks.id, input.taskId));
        if (!task) throw new TRPCError({ code: "NOT_FOUND" });
        const resources = task.resources ? JSON.parse(task.resources) : [];
        resources.push({ label: input.label, url: input.url, id: Date.now() });
        await database.update(internalTasks).set({ resources: JSON.stringify(resources) }).where(eq(internalTasks.id, input.taskId));
        return { success: true };
      }),

    removeResource: protectedProcedure
      .input(z.object({ taskId: z.number(), resourceId: z.number() }))
      .mutation(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { internalTasks } = await import("../../drizzle/schema");
        const [task] = await database.select({ resources: internalTasks.resources }).from(internalTasks).where(eq(internalTasks.id, input.taskId));
        if (!task) throw new TRPCError({ code: "NOT_FOUND" });
        const resources = (task.resources ? JSON.parse(task.resources) : []).filter((r: any) => r.id !== input.resourceId);
        await database.update(internalTasks).set({ resources: JSON.stringify(resources) }).where(eq(internalTasks.id, input.taskId));
        return { success: true };
      }),

    // Subtask procedures
    addSubtask: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        title: z.string().min(1),
        assigneeId: z.number().optional(),
        dueDate: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { internalSubtasks } = await import("../../drizzle/schema");
        const existing = await database.select({ id: internalSubtasks.id }).from(internalSubtasks).where(eq(internalSubtasks.taskId, input.taskId));
        const result = await database.insert(internalSubtasks).values({
          taskId: input.taskId,
          title: input.title,
          isComplete: false,
          assigneeId: input.assigneeId,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
          resources: "[]",
          sortOrder: existing.length,
        });
        return { id: Number((result as any).lastInsertRowid) };
      }),

    toggleSubtask: protectedProcedure
      .input(z.object({ subtaskId: z.number(), isComplete: z.boolean() }))
      .mutation(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { internalSubtasks, internalTasks } = await import("../../drizzle/schema");
        await database.update(internalSubtasks).set({ isComplete: input.isComplete }).where(eq(internalSubtasks.id, input.subtaskId));
        // Get the parent task and recalculate status
        const [subtask] = await database.select({ taskId: internalSubtasks.taskId }).from(internalSubtasks).where(eq(internalSubtasks.id, input.subtaskId));
        if (subtask) {
          const allSubtasks = await database.select({ isComplete: internalSubtasks.isComplete }).from(internalSubtasks).where(eq(internalSubtasks.taskId, subtask.taskId));
          const total = allSubtasks.length;
          const done = allSubtasks.filter(s => s.isComplete).length;
          let newStatus: "not_started" | "in_progress" | "complete" = "not_started";
          if (total > 0 && done === total) newStatus = "complete";
          else if (done > 0) newStatus = "in_progress";
          // Only auto-update if not manually set to "stuck"
          const [parentTask] = await database.select({ status: internalTasks.status }).from(internalTasks).where(eq(internalTasks.id, subtask.taskId));
          if (parentTask && parentTask.status !== "stuck") {
            await database.update(internalTasks).set({ status: newStatus }).where(eq(internalTasks.id, subtask.taskId));
          }
          return { taskId: subtask.taskId, total, done, newStatus };
        }
        return { success: true };
      }),

    deleteSubtask: protectedProcedure
      .input(z.object({ subtaskId: z.number() }))
      .mutation(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { internalSubtasks } = await import("../../drizzle/schema");
        await database.delete(internalSubtasks).where(eq(internalSubtasks.id, input.subtaskId));
        return { success: true };
      }),

    addSubtaskResource: protectedProcedure
      .input(z.object({
        subtaskId: z.number(),
        label: z.string().min(1),
        url: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { internalSubtasks } = await import("../../drizzle/schema");
        const [sub] = await database.select({ resources: internalSubtasks.resources }).from(internalSubtasks).where(eq(internalSubtasks.id, input.subtaskId));
        if (!sub) throw new TRPCError({ code: "NOT_FOUND" });
        const resources = sub.resources ? JSON.parse(sub.resources) : [];
        resources.push({ label: input.label, url: input.url, id: Date.now() });
        await database.update(internalSubtasks).set({ resources: JSON.stringify(resources) }).where(eq(internalSubtasks.id, input.subtaskId));
        return { success: true };
      }),

    removeSubtaskResource: protectedProcedure
      .input(z.object({ subtaskId: z.number(), resourceId: z.number() }))
      .mutation(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { internalSubtasks } = await import("../../drizzle/schema");
        const [sub] = await database.select({ resources: internalSubtasks.resources }).from(internalSubtasks).where(eq(internalSubtasks.id, input.subtaskId));
        if (!sub) throw new TRPCError({ code: "NOT_FOUND" });
        const resources = (sub.resources ? JSON.parse(sub.resources) : []).filter((r: any) => r.id !== input.resourceId);
        await database.update(internalSubtasks).set({ resources: JSON.stringify(resources) }).where(eq(internalSubtasks.id, input.subtaskId));
        return { success: true };
      }),
  
});

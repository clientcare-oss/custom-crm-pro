import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray, ne } from "drizzle-orm";
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
        status: z.enum(["all", "not_started", "in_progress", "paused", "stuck", "complete"]).optional(),
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
        status: z.enum(["not_started", "in_progress", "paused", "stuck", "complete"]).optional(),
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
        let id: number | undefined;
        if ((result as any)?.lastInsertRowid !== undefined) {
          id = Number((result as any).lastInsertRowid);
        }
        if (!id || isNaN(id)) {
          const [latest] = await database.select({ id: internalTasks.id }).from(internalTasks).orderBy(desc(internalTasks.id)).limit(1);
          id = latest?.id ? Number(latest.id) : 1;
        }
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        status: z.enum(["not_started", "in_progress", "paused", "stuck", "complete"]).optional(),
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
        
        // Set startedAt when status changes to "in_progress"
        if (data.status === "in_progress") {
          const existingTask = await database.select().from(internalTasks).where(eq(internalTasks.id, id)).limit(1);
          if (existingTask.length > 0 && !existingTask[0].startedAt) {
            const startedAtTime = new Date();
            updateData.startedAt = startedAtTime;
            console.log(`[Task Log] Internal task ${id} started at ${startedAtTime.toISOString()}`);
          }
        }
        
        // Set pausedAt when status changes to "paused"
        if (data.status === "paused") {
          const existingTask = await database.select().from(internalTasks).where(eq(internalTasks.id, id)).limit(1);
          if (existingTask.length > 0 && !existingTask[0].pausedAt) {
            const pausedAtTime = new Date();
            updateData.pausedAt = pausedAtTime;
            console.log(`[Task Log] Internal task ${id} paused at ${pausedAtTime.toISOString()}`);
          }
        }
        
        // Set stuckAt when status changes to "stuck"
        if (data.status === "stuck") {
          const existingTask = await database.select().from(internalTasks).where(eq(internalTasks.id, id)).limit(1);
          if (existingTask.length > 0 && !existingTask[0].stuckAt) {
            const stuckAtTime = new Date();
            updateData.stuckAt = stuckAtTime;
            console.log(`[Task Log] Internal task ${id} stuck at ${stuckAtTime.toISOString()}`);
          }
        }
        
        // Set completedAt when status changes to "complete"
        if (data.status === "complete") {
          const existingTask = await database.select().from(internalTasks).where(eq(internalTasks.id, id)).limit(1);
          if (existingTask.length > 0 && !existingTask[0].completedAt) {
            const completedAtTime = new Date();
            updateData.completedAt = completedAtTime;
            console.log(`[Task Log] Internal task ${id} completed at ${completedAtTime.toISOString()}`);
          }
        }
        
        await database.update(internalTasks).set(updateData).where(eq(internalTasks.id, id));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { internalTasks, internalSubtasks } = await import("../../drizzle/schema");

        const isOwnerOrAdmin = ctx.user.role === "admin" || ctx.user.id === 1;
        // If employee (non-owner/admin), enforce supervisor task deletion protection
        if (!isOwnerOrAdmin) {
          const [task] = await database.select().from(internalTasks).where(eq(internalTasks.id, input.id));
          if (!task || task.createdBy !== ctx.user.id || task.createdBy === 1) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You may not delete this task. It was assigned by owner or supervisor. Request delete from them?",
            });
          }
        }

        await database.delete(internalSubtasks).where(eq(internalSubtasks.taskId, input.id));
        await database.delete(internalTasks).where(eq(internalTasks.id, input.id));
        return { success: true };
      }),

    // Bulk delete internal tasks (Owner/admin only or creator only)
    bulkDelete: protectedProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ input, ctx }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { internalTasks, internalSubtasks } = await import("../../drizzle/schema");
        const { inArray } = await import("drizzle-orm");
        if (input.ids.length === 0) return { success: true, count: 0 };

        const isOwnerOrAdmin = ctx.user.role === "admin" || ctx.user.id === 1;
        if (!isOwnerOrAdmin) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You may not delete tasks assigned by owner or supervisor. Please submit a deletion request.",
          });
        }
        
        // Chunk to avoid SQLite variable limit (e.g. max 100 per statement)
        const chunkSize = 100;
        for (let i = 0; i < input.ids.length; i += chunkSize) {
          const chunk = input.ids.slice(i, i + chunkSize);
          await database.delete(internalSubtasks).where(inArray(internalSubtasks.taskId, chunk));
          await database.delete(internalTasks).where(inArray(internalTasks.id, chunk));
        }
        return { success: true, count: input.ids.length };
      }),

    // Submit a request to the owner/supervisor to delete a task
    requestDeletion: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        taskType: z.enum(["general", "project"]),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const {
          internalTasks,
          internalSubtasks,
          projectTasks,
          projectTaskSteps,
          projects,
          contacts,
          taskDeletionRequests,
          messages,
        } = await import("../../drizzle/schema");

        let taskTitle = "";
        let taskDescription = "";
        let taskDetailsObj: any = {};
        let relatedLabel = "";

        if (input.taskType === "general") {
          const [task] = await database.select().from(internalTasks).where(eq(internalTasks.id, input.taskId));
          taskTitle = task?.title || `Task #${input.taskId}`;
          taskDescription = task?.description || "";
          const subtasks = await database.select().from(internalSubtasks).where(eq(internalSubtasks.taskId, input.taskId));
          relatedLabel = task?.linkedStudentName ? `Student: ${task.linkedStudentName}` : (task?.projectName ? `Project: ${task.projectName}` : "General Task");
          taskDetailsObj = {
            id: input.taskId,
            title: taskTitle,
            description: taskDescription,
            status: task?.status || "not_started",
            dueDate: task?.dueDate ? new Date(task.dueDate).toISOString() : null,
            linkedStudentName: task?.linkedStudentName || null,
            projectName: task?.projectName || null,
            subtasks: subtasks.map(s => ({ title: s.title, isComplete: s.isComplete })),
          };
        } else {
          const [pTask] = await database.select().from(projectTasks).where(eq(projectTasks.id, input.taskId));
          taskTitle = pTask?.title || `Case Task #${input.taskId}`;
          taskDescription = pTask?.description || "";
          const steps = await database.select().from(projectTaskSteps).where(eq(projectTaskSteps.taskId, input.taskId));
          let projectName = "";
          let studentName = "";
          if (pTask?.projectId) {
            const [proj] = await database.select().from(projects).where(eq(projects.id, pTask.projectId));
            if (proj) {
              projectName = proj.name;
              if (proj.clientId) {
                const [contact] = await database.select().from(contacts).where(eq(contacts.id, proj.clientId));
                if (contact) {
                  studentName = `${contact.firstName} ${contact.lastName}${contact.caseId ? ` (${contact.caseId})` : ""}`;
                }
              }
            }
          }
          relatedLabel = studentName ? `Student: ${studentName}` : (projectName ? `Project: ${projectName}` : "Case Task");
          taskDetailsObj = {
            id: input.taskId,
            title: taskTitle,
            description: taskDescription,
            status: pTask?.status || "Todo",
            dueDate: pTask?.dueDate ? new Date(pTask.dueDate).toISOString() : null,
            priority: pTask?.priority || "Medium",
            projectName,
            linkedStudentName: studentName,
            subtasks: steps.map(s => ({ title: s.title, isComplete: s.isComplete })),
          };
        }

        // Insert into taskDeletionRequests
        let insertedRequestId: number | undefined;
        try {
          const res = await database.insert(taskDeletionRequests).values({
            taskType: input.taskType,
            taskId: input.taskId,
            taskTitle,
            taskDescription,
            taskDetails: JSON.stringify(taskDetailsObj),
            requestedByUserId: ctx.user.id,
            requestedByUserName: ctx.user.name || "Employee",
            reason: input.reason || null,
            status: "pending",
          });
          if ((res as any)?.lastInsertRowid !== undefined) {
            insertedRequestId = Number((res as any).lastInsertRowid);
          }
        } catch (insErr) {
          console.error("[taskDeletionRequests] Insert error:", insErr);
        }

        // Send internal message to owner (id 1)
        const msgContent = `[Task Deletion Request] ${ctx.user.name || "An employee"} requested to delete task: "${taskTitle}".\n\n` +
          `• Related: ${relatedLabel}\n` +
          `• Reason: ${input.reason || "No reason specified"}\n\n` +
          `Review and approve or decline this request on the Tasks page (PG-009).`;

        try {
          await database.insert(messages).values({
            senderId: ctx.user.id,
            recipientId: 1,
            content: msgContent,
            isRead: false,
          });
        } catch (mErr) {}

        try {
          await notifyOwner({
            title: `Task Deletion Request: ${taskTitle}`,
            content: `${ctx.user.name || "An employee"} requested deletion for task "${taskTitle}" (${relatedLabel}). Reason: ${input.reason || "None"}.`,
          });
        } catch (nErr) {}

        if (!insertedRequestId || isNaN(insertedRequestId)) {
          const [latest] = await database.select({ id: taskDeletionRequests.id }).from(taskDeletionRequests).orderBy(desc(taskDeletionRequests.id)).limit(1);
          insertedRequestId = latest?.id ? Number(latest.id) : 1;
        }

        return { success: true, requestId: insertedRequestId };
      }),

    // List deletion requests (owner sees all; employees see their own)
    listDeletionRequests: protectedProcedure
      .input(z.object({
        status: z.enum(["all", "pending", "approved", "declined"]).optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { taskDeletionRequests } = await import("../../drizzle/schema");

        let rows = await database
          .select()
          .from(taskDeletionRequests)
          .orderBy(desc(taskDeletionRequests.createdAt));

        const isOwnerOrAdmin = ctx.user.role === "admin" || ctx.user.id === 1;
        if (!isOwnerOrAdmin) {
          rows = rows.filter(r => r.requestedByUserId === ctx.user.id);
        }

        if (input?.status && input.status !== "all") {
          rows = rows.filter(r => r.status === input.status);
        }

        return rows.map(r => ({
          ...r,
          details: r.taskDetails ? JSON.parse(r.taskDetails) : null,
        }));
      }),

    // Review a deletion request (owner / supervisor only)
    reviewDeletionRequest: protectedProcedure
      .input(z.object({
        requestId: z.number(),
        action: z.enum(["approve", "decline"]),
        declineReason: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const isOwnerOrAdmin = ctx.user.role === "admin" || ctx.user.id === 1;
        if (!isOwnerOrAdmin) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only the owner or supervisor can review deletion requests" });
        }

        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const {
          taskDeletionRequests,
          internalTasks,
          internalSubtasks,
          projectTasks,
          projectTaskSteps,
          messages,
        } = await import("../../drizzle/schema");

        const [request] = await database.select().from(taskDeletionRequests).where(eq(taskDeletionRequests.id, input.requestId));
        const taskType = request?.taskType || "general";
        const taskId = request?.taskId || input.requestId;
        const taskTitle = request?.taskTitle || `Task #${taskId}`;
        const requestedByUserId = request?.requestedByUserId || 2;

        if (input.action === "approve") {
          // Permanently delete task and its subtasks/steps
          if (taskType === "general") {
            await database.delete(internalSubtasks).where(eq(internalSubtasks.taskId, taskId));
            await database.delete(internalTasks).where(eq(internalTasks.id, taskId));
          } else {
            await database.delete(projectTaskSteps).where(eq(projectTaskSteps.taskId, taskId));
            await database.delete(projectTasks).where(eq(projectTasks.id, taskId));
          }

          await database
            .update(taskDeletionRequests)
            .set({
              status: "approved",
              reviewedByUserId: ctx.user.id,
              reviewedAt: new Date(),
            })
            .where(eq(taskDeletionRequests.id, input.requestId));

          // Send message to requesting employee
          try {
            await database.insert(messages).values({
              senderId: ctx.user.id,
              recipientId: requestedByUserId,
              content: `[Deletion Approved] Your deletion request for task "${taskTitle}" has been approved by the supervisor and the task was removed.`,
              isRead: false,
            });
          } catch (e) {}

          return { success: true, action: "approved" };
        } else {
          await database
            .update(taskDeletionRequests)
            .set({
              status: "declined",
              reviewedByUserId: ctx.user.id,
              reviewedAt: new Date(),
              declineReason: input.declineReason || null,
            })
            .where(eq(taskDeletionRequests.id, input.requestId));

          // Send message to requesting employee
          try {
            await database.insert(messages).values({
              senderId: ctx.user.id,
              recipientId: requestedByUserId,
              content: `[Deletion Declined] Your deletion request for task "${taskTitle}" was declined by the supervisor.${input.declineReason ? ` Note: ${input.declineReason}` : " Task must remain active."}`,
              isRead: false,
            });
          } catch (e) {}

          return { success: true, action: "declined" };
        }
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
        let subtaskId: number | undefined;
        if ((result as any)?.lastInsertRowid !== undefined) {
          subtaskId = Number((result as any).lastInsertRowid);
        }
        if (!subtaskId || isNaN(subtaskId)) {
          const [latest] = await database.select({ id: internalSubtasks.id }).from(internalSubtasks).orderBy(desc(internalSubtasks.id)).limit(1);
          subtaskId = latest?.id ? Number(latest.id) : 1;
        }
        return { id: subtaskId };
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

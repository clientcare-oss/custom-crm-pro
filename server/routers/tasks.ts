import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { brainDumpItems, brainDumpImages } from "../../drizzle/schema";

export const tasksRouter = router({

    // Get all tasks for a specific student contact (across all their projects)
    getByStudent: protectedProcedure
      .input(z.object({ studentContactId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role === "client") throw new TRPCError({ code: "FORBIDDEN", message: "Clients cannot access internal tasks" });
        return await db.getTasksByStudent(input.studentContactId);
      }),
    // Get all tasks across all students for the Tasks main page
    getAll: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === "client") throw new TRPCError({ code: "FORBIDDEN", message: "Clients cannot access internal tasks" });
      return await db.getAllTasksForOwner(ctx.user.id);
    }),
    create: protectedProcedure
      .input(
        z.object({
          projectId: z.number(),
          title: z.string().min(1),
          description: z.string().optional(),
          status: z.enum(["Todo", "In Progress", "Done"]).optional(),
          dueDate: z.date().optional(),
          assignedTo: z.number().optional(),
          assignedToUserId: z.number().optional(),
          assignmentSource: z.enum(["manager", "system_automation", "self", "employee"]).optional(),
          assignedByName: z.string().optional(),
          priority: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role === "client") throw new TRPCError({ code: "FORBIDDEN", message: "Clients cannot access internal tasks" });
        const isCreatorAdmin = ctx.user.role === "admin" || ctx.user.id === 1;
        const defaultSource = input.assignmentSource || (isCreatorAdmin ? "manager" : "employee");
        const defaultAssignedByName = input.assignedByName || (defaultSource === "manager" ? (ctx.user.name || "Byron Honea") : (ctx.user.name || "Team Member"));

        return await db.createTask({
          ...input,
          assignmentSource: defaultSource,
          assignedByUserId: ctx.user.id,
          assignedByName: defaultAssignedByName,
        });
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          description: z.string().optional(),
          status: z.enum(["Todo", "In Progress", "Done"]).optional(),
          dueDate: z.date().optional().nullable(),
          assignedTo: z.number().optional().nullable(),
          assignedToUserId: z.number().optional().nullable(),
          assignmentSource: z.enum(["manager", "system_automation", "self", "employee"]).optional(),
          assignedByName: z.string().optional(),
          priority: z.string().optional().nullable(),
          seenByClient: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role === "client") throw new TRPCError({ code: "FORBIDDEN", message: "Clients cannot access internal tasks" });
        const { id, ...data } = input;
        const updatePayload: any = { ...data };
        if (data.assignedToUserId !== undefined || data.assignedTo !== undefined) {
          if (ctx.user.role === "admin" || ctx.user.id === 1) {
            updatePayload.assignmentSource = data.assignmentSource || "manager";
            updatePayload.assignedByUserId = ctx.user.id;
            updatePayload.assignedByName = ctx.user.name || "Byron Honea";
          }
        }
        if (data.assignmentSource !== undefined) {
          updatePayload.assignmentSource = data.assignmentSource;
          if (data.assignmentSource === "manager") {
            updatePayload.assignedByName = data.assignedByName || (ctx.user.name || "Byron Honea");
            updatePayload.assignedByUserId = ctx.user.id;
          } else if (data.assignmentSource === "system_automation") {
            updatePayload.assignedByName = data.assignedByName || "System Automation";
            updatePayload.assignedByUserId = null;
          } else {
            updatePayload.assignedByName = data.assignedByName || (ctx.user.name || "Team Member");
          }
        }
        return await db.updateTask(id, updatePayload);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const isOwnerOrAdmin = ctx.user.role === "admin" || ctx.user.id === 1;
        if (!isOwnerOrAdmin) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You may not delete this task. It was assigned by owner or supervisor. Request delete from them?",
          });
        }
        return await db.deleteTask(input.id);
      }),
    bulkDelete: protectedProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ input, ctx }) => {
        const isOwnerOrAdmin = ctx.user.role === "admin" || ctx.user.id === 1;
        if (!isOwnerOrAdmin) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You may not delete tasks assigned by owner or supervisor. Please submit a deletion request.",
          });
        }
        if (input.ids.length === 0) return { success: true, count: 0 };
        for (const id of input.ids) {
          await db.deleteTask(id);
        }
        return { success: true, count: input.ids.length };
      }),
    // Add a step to a task
    addStep: protectedProcedure
      .input(z.object({ taskId: z.number(), title: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role === "client") throw new TRPCError({ code: "FORBIDDEN", message: "Clients cannot access internal tasks" });
        return await db.addTaskStep(input.taskId, input.title);
      }),
    // Toggle a task step completion
    toggleStep: protectedProcedure
      .input(
        z.object({
          stepId: z.number(),
          isComplete: z.boolean(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role === "client") throw new TRPCError({ code: "FORBIDDEN", message: "Clients cannot access internal tasks" });
        return await db.toggleTaskStep(input.stepId, input.isComplete);
      }),
    // Delete a step (supervisor/admin protected)
    deleteStep: protectedProcedure
      .input(z.object({ stepId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const isOwnerOrAdmin = ctx.user.role === "admin" || ctx.user.id === 1;
        if (!isOwnerOrAdmin) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You may not delete this task step. It was assigned by owner or supervisor.",
          });
        }
        return await db.deleteTaskStep(input.stepId);
      }),
    // Create a task for a student — auto-creates a default project if the student has none
    createForStudent: adminProcedure
      .input(
        z.object({
          studentContactId: z.number(),
          title: z.string().min(1),
          description: z.string().optional(),
          status: z.enum(["Todo", "In Progress", "Done"]).optional(),
          dueDate: z.date().optional(),
          assignedTo: z.number().optional(),
          assignedToUserId: z.number().optional(),
          assignmentSource: z.enum(["manager", "system_automation", "self", "employee"]).optional(),
          assignedByName: z.string().optional(),
          priority: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { projects: projectsTable, contacts: contactsTable } = await import("../../drizzle/schema");
        // Find existing project for this student
        let projectId: number | undefined;
        const existing = await database
          .select({ id: projectsTable.id })
          .from(projectsTable)
          .where(eq(projectsTable.clientId, input.studentContactId))
          .limit(1);
        if (existing.length > 0) {
          projectId = existing[0].id;
        } else {
          // Auto-create a default project named after the student
          const studentRows = await database
            .select({ firstName: contactsTable.firstName, lastName: contactsTable.lastName, caseId: contactsTable.caseId })
            .from(contactsTable)
            .where(eq(contactsTable.id, input.studentContactId))
            .limit(1);
          const student = studentRows[0];
          const projectName = student
            ? `${student.firstName} ${student.lastName}${student.caseId ? ` (${student.caseId})` : ""}`
            : `Student #${input.studentContactId}`;
          await database.insert(projectsTable).values({
            clientId: input.studentContactId,
            ownerId: ctx.user.id,
            name: projectName,
            status: "In Progress",
          });
          // Fetch the just-inserted project
          const inserted = await database
            .select({ id: projectsTable.id })
            .from(projectsTable)
            .where(eq(projectsTable.clientId, input.studentContactId))
            .orderBy(desc(projectsTable.createdAt))
            .limit(1);
          projectId = inserted[0]?.id;
        }
        if (!projectId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not resolve project for student" });
        const { studentContactId, ...taskData } = input;
        const isCreatorAdmin = ctx.user.role === "admin" || ctx.user.id === 1;
        const defaultSource = input.assignmentSource || (isCreatorAdmin ? "manager" : "employee");
        const defaultAssignedByName = input.assignedByName || (defaultSource === "manager" ? (ctx.user.name || "Byron Honea") : defaultSource === "system_automation" ? "System Automation" : (ctx.user.name || "Team Member"));

        return await db.createTask({
          projectId,
          title: input.title,
          description: input.description,
          status: input.status || "Todo",
          dueDate: input.dueDate,
          assignedTo: input.assignedTo,
          assignedToUserId: input.assignedToUserId,
          assignmentSource: defaultSource,
          assignedByUserId: ctx.user.id,
          assignedByName: defaultAssignedByName,
          priority: (input.priority || "Medium") as "High" | "Medium" | "Low",
          seenByClient: false,
        });
      }),
    // Convert a task between types: General ↔ Client-Facing ↔ Case
    convertType: adminProcedure
      .input(
        z.object({
          id: z.number(),
          fromKind: z.enum(["internal", "project"]),
          toType: z.enum(["general", "client_facing", "case"]),
          // Required when converting to client_facing or case
          studentContactId: z.number().optional(),
          // Carry over fields
          title: z.string(),
          description: z.string().optional(),
          status: z.string().optional(),
          dueDate: z.string().optional().nullable(),
          assignedToUserId: z.number().optional().nullable(),
          assignedTo: z.number().optional().nullable(),
          priority: z.string().optional().nullable(),
          assignmentSource: z.enum(["manager", "system_automation", "self", "employee"]).optional(),
          assignedByName: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { internalTasks, internalSubtasks, projectTasks, projects: projectsTable, contacts: contactsTable } = await import("../../drizzle/schema");

        const isCreatorAdmin = ctx.user.role === "admin" || ctx.user.id === 1;
        const resolvedSource = input.assignmentSource || (isCreatorAdmin ? "manager" : "employee");
        const resolvedAssignedByName = input.assignedByName || (resolvedSource === "manager" ? (ctx.user.name || "Byron Honea") : resolvedSource === "system_automation" ? "System Automation" : (ctx.user.name || "Team Member"));

        if (input.fromKind === "internal" && (input.toType === "client_facing" || input.toType === "case")) {
          // General → Client-Facing or Case: delete from internalTasks, insert into projectTasks
          if (!input.studentContactId) throw new TRPCError({ code: "BAD_REQUEST", message: "Student is required for client-facing or case tasks" });

          // Find or create project for the student
          let projectId: number | undefined;
          const existing = await database
            .select({ id: projectsTable.id })
            .from(projectsTable)
            .where(eq(projectsTable.clientId, input.studentContactId))
            .limit(1);
          if (existing.length > 0) {
            projectId = existing[0].id;
          } else {
            const studentRows = await database
              .select({ firstName: contactsTable.firstName, lastName: contactsTable.lastName, caseId: contactsTable.caseId })
              .from(contactsTable)
              .where(eq(contactsTable.id, input.studentContactId))
              .limit(1);
            const student = studentRows[0];
            const projectName = student
              ? `${student.firstName} ${student.lastName}${student.caseId ? ` (${student.caseId})` : ""}`
              : `Student #${input.studentContactId}`;
            await database.insert(projectsTable).values({
              clientId: input.studentContactId,
              ownerId: ctx.user.id,
              name: projectName,
              status: "In Progress",
            });
            const inserted = await database
              .select({ id: projectsTable.id })
              .from(projectsTable)
              .where(eq(projectsTable.clientId, input.studentContactId))
              .orderBy(desc(projectsTable.createdAt))
              .limit(1);
            projectId = inserted[0]?.id;
          }
          if (!projectId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not resolve project" });

          // Delete from internalTasks
          await database.delete(internalSubtasks).where(eq(internalSubtasks.taskId, input.id));
          await database.delete(internalTasks).where(eq(internalTasks.id, input.id));

          // Insert into projectTasks
          const statusMap: Record<string, string> = { not_started: "Todo", in_progress: "In Progress", stuck: "In Progress", complete: "Done" };
          const mappedStatus = (statusMap[input.status || ""] || "Todo") as "Todo" | "In Progress" | "Done";
          await database.insert(projectTasks).values({
            projectId,
            title: input.title,
            description: input.description || null,
            status: mappedStatus,
            dueDate: input.dueDate ? new Date(input.dueDate) : null,
            assignedTo: input.assignedTo || null,
            assignedToUserId: input.assignedToUserId || null,
            assignmentSource: resolvedSource,
            assignedByName: resolvedAssignedByName,
            assignedByUserId: ctx.user.id,
            priority: (input.priority || "Medium") as "High" | "Medium" | "Low",
            seenByClient: input.toType === "client_facing",
          });
          return { success: true, converted: "to_project" };

        } else if (input.fromKind === "project" && input.toType === "general") {
          // Client-Facing/Case → General: delete from projectTasks, insert into internalTasks
          await database.delete(projectTasks).where(eq(projectTasks.id, input.id));

          // Map status
          const statusMap: Record<string, string> = { "Todo": "not_started", "In Progress": "in_progress", "Done": "complete" };
          const mappedStatus = (statusMap[input.status || ""] || "not_started") as "not_started" | "in_progress" | "stuck" | "complete";
          await database.insert(internalTasks).values({
            title: input.title,
            description: input.description || null,
            status: mappedStatus,
            dueDate: input.dueDate ? new Date(input.dueDate) : null,
            assigneeId: input.assignedToUserId || null,
            assigneeContactId: input.assignedTo || null,
            assignmentSource: resolvedSource,
            assignedByName: resolvedAssignedByName,
            assignedByUserId: ctx.user.id,
            createdBy: ctx.user.id,
          });
          return { success: true, converted: "to_internal" };

        } else if (input.fromKind === "project" && (input.toType === "client_facing" || input.toType === "case")) {
          // Client-Facing ↔ Case: toggle seenByClient, and update assignment origin if passed
          await database.update(projectTasks).set({
            seenByClient: input.toType === "client_facing",
            ...(input.assignmentSource ? { assignmentSource: input.assignmentSource, assignedByName: resolvedAssignedByName } : {}),
          }).where(eq(projectTasks.id, input.id));
          return { success: true, converted: "toggled_visibility" };
        }

        return { success: false };
      }),
  
});

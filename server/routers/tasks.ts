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
    getByStudent: adminProcedure
      .input(z.object({ studentContactId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTasksByStudent(input.studentContactId);
      }),
    // Get all tasks across all students for the Tasks main page
    getAll: adminProcedure.query(async ({ ctx }) => {
      return await db.getAllTasksForOwner(ctx.user.id);
    }),
    create: adminProcedure
      .input(
        z.object({
          projectId: z.number(),
          title: z.string().min(1),
          description: z.string().optional(),
          status: z.enum(["Todo", "In Progress", "Done"]).optional(),
          dueDate: z.date().optional(),
          assignedTo: z.number().optional(),
          assignedToUserId: z.number().optional(),
          priority: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createTask(input);
      }),
    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          description: z.string().optional(),
          status: z.enum(["Todo", "In Progress", "Done"]).optional(),
          dueDate: z.date().optional().nullable(),
          assignedTo: z.number().optional().nullable(),
          assignedToUserId: z.number().optional().nullable(),
          priority: z.string().optional().nullable(),
          seenByClient: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateTask(id, data);
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteTask(input.id);
      }),
    // Add a step to a task
    addStep: adminProcedure
      .input(z.object({ taskId: z.number(), title: z.string().min(1) }))
      .mutation(async ({ input }) => {
        return await db.addTaskStep(input.taskId, input.title);
      }),
    // Toggle a step complete/incomplete
    toggleStep: adminProcedure
      .input(z.object({ stepId: z.number(), isComplete: z.boolean() }))
      .mutation(async ({ input }) => {
        return await db.toggleTaskStep(input.stepId, input.isComplete);
      }),
    // Delete a step
    deleteStep: adminProcedure
      .input(z.object({ stepId: z.number() }))
      .mutation(async ({ input }) => {
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
        return await db.createTask({ ...taskData, projectId });
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
        })
      )
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { internalTasks, internalSubtasks, projectTasks, projects: projectsTable, contacts: contactsTable } = await import("../../drizzle/schema");

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
            createdBy: ctx.user.id,
          });
          return { success: true, converted: "to_internal" };

        } else if (input.fromKind === "project" && (input.toType === "client_facing" || input.toType === "case")) {
          // Client-Facing ↔ Case: just toggle seenByClient
          await database.update(projectTasks).set({
            seenByClient: input.toType === "client_facing",
          }).where(eq(projectTasks.id, input.id));
          return { success: true, converted: "toggled_visibility" };
        }

        return { success: false };
      }),
  
});

import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { brainDumpItems, brainDumpImages } from "../../drizzle/schema";

export const portalRouter = router({

    // Parent portal: returns all students linked to the logged-in portal parent
    getMyStudents: portalProcedure.query(async ({ ctx }) => {
      // Admin preview: no portal contact, return empty (preview uses getStudentsForParent)
      if ((ctx as any).isAdminPreview) return [];
      return await db.getStudentsByParentContactId((ctx as any).portalContactId);
    }),

    // Parent portal: get compass for a specific student caseId (must belong to parent, or admin)
    getStudentCompass: portalProcedure
      .input(z.object({ caseId: z.string() }))
      .query(async ({ ctx, input }) => {
        if (!(ctx as any).isAdminPreview) {
          const students = await db.getStudentsByParentContactId((ctx as any).portalContactId);
          const isOwned = students.some((s) => s.caseId === input.caseId);
          if (!isOwned) throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.getCaseCompass(input.caseId) ?? null;
      }),

    // Parent portal: get history for a specific student caseId (must belong to parent, or admin)
    getStudentHistory: portalProcedure
      .input(z.object({ caseId: z.string() }))
      .query(async ({ ctx, input }) => {
        if (!(ctx as any).isAdminPreview) {
          const students = await db.getStudentsByParentContactId((ctx as any).portalContactId);
          const isOwned = students.some((s) => s.caseId === input.caseId);
          if (!isOwned) throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.getCaseCompassHistory(input.caseId);
      }),

    // Admin: get students for a specific parent contact (for preview mode)
    getStudentsForParent: adminProcedure
      .input(z.object({ parentContactId: z.number() }))
      .query(async ({ input }) => {
        return await db.getStudentsByParentContactId(input.parentContactId);
      }),

    // Portal: get appointments for a specific student (by their contact id)
    getStudentAppointments: portalProcedure
      .input(z.object({ studentContactId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!(ctx as any).isAdminPreview) {
          const students = await db.getStudentsByParentContactId((ctx as any).portalContactId);
          const isOwned = students.some((s) => s.id === input.studentContactId);
          if (!isOwned) throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.getAppointmentsByClient(input.studentContactId);
      }),

    // Portal: get files for a specific student (by their contact id)
    getStudentFiles: portalProcedure
      .input(z.object({ studentContactId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!(ctx as any).isAdminPreview) {
          const students = await db.getStudentsByParentContactId((ctx as any).portalContactId);
          const isOwned = students.some((s) => s.id === input.studentContactId);
          if (!isOwned) throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.getClientFilesByClient(input.studentContactId);
      }),

    // Portal: get billing (invoices + contracts) for a specific student
    getStudentBilling: portalProcedure
      .input(z.object({ studentContactId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!(ctx as any).isAdminPreview) {
          const students = await db.getStudentsByParentContactId((ctx as any).portalContactId);
          const isOwned = students.some((s) => s.id === input.studentContactId);
          if (!isOwned) throw new TRPCError({ code: "FORBIDDEN" });
        }
        const invoicesList = await db.getInvoicesByClient(input.studentContactId);
        const contractsList = await db.getContractsByClient(input.studentContactId);
        return { invoices: invoicesList, contracts: contractsList };
      }),

    // Portal: get tasks explicitly assigned to a student (client-facing — not all project tasks)
    getAssignedTasks: portalProcedure
      .input(z.object({ studentContactId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!(ctx as any).isAdminPreview) {
          const students = await db.getStudentsByParentContactId((ctx as any).portalContactId);
          const isOwned = students.some((s) => s.id === input.studentContactId);
          if (!isOwned) throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.getTasksAssignedToStudent(input.studentContactId);
      }),

    // Portal: toggle a task step complete/incomplete (owned student only)
    toggleTaskStep: portalProcedure
      .input(z.object({ stepId: z.number(), isComplete: z.boolean(), studentContactId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!(ctx as any).isAdminPreview) {
          const students = await db.getStudentsByParentContactId((ctx as any).portalContactId);
          const isOwned = students.some((s) => s.id === input.studentContactId);
          if (!isOwned) throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.toggleTaskStep(input.stepId, input.isComplete);
      }),

    // Portal: update task status (owned student only)
    updateTaskStatus: portalProcedure
      .input(z.object({ taskId: z.number(), status: z.enum(["Todo", "In Progress", "Done"]), studentContactId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!(ctx as any).isAdminPreview) {
          const students = await db.getStudentsByParentContactId((ctx as any).portalContactId);
          const isOwned = students.some((s) => s.id === input.studentContactId);
          if (!isOwned) throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.updateTask(input.taskId, { status: input.status });
      }),

    markTaskSeen: portalProcedure
      .input(z.object({ taskId: z.number(), studentContactId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!(ctx as any).isAdminPreview) {
          const students = await db.getStudentsByParentContactId((ctx as any).portalContactId);
          const isOwned = students.some((s) => s.id === input.studentContactId);
          if (!isOwned) throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.updateTask(input.taskId, { seenByClient: true });
      }),

    // Portal: get projects/cases linked to a student (by their contact id)
    getStudentProjects: portalProcedure
      .input(z.object({ studentContactId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!(ctx as any).isAdminPreview) {
          const students = await db.getStudentsByParentContactId((ctx as any).portalContactId);
          const isOwned = students.some((s) => s.id === input.studentContactId);
          if (!isOwned) throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.getProjectsByClient(input.studentContactId);
      }),
    // Portal: client submits their IEP meeting link to attach to an appointment
    submitMeetingLink: portalProcedure
      .input(z.object({
        appointmentId: z.number(),
        studentContactId: z.number(),
        meetingLink: z.string().url("Please enter a valid URL"),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!(ctx as any).isAdminPreview) {
          const students = await db.getStudentsByParentContactId((ctx as any).portalContactId);
          const isOwned = students.some((s) => s.id === input.studentContactId);
          if (!isOwned) throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { appointments: apptTable } = await import("../../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await dbConn.update(apptTable)
          .set({ clientMeetingLink: input.meetingLink })
          .where(eq(apptTable.id, input.appointmentId));
        return { success: true };
      }),

    // Portal: get all upcoming appointments for ALL of the parent's students (for selector cards)
    getAllMyAppointments: portalProcedure.query(async ({ ctx }) => {
      let studentIds: number[] = [];
      // Note: In preview mode, we still return appointments so admins can see and refine the display
      const students = await db.getStudentsByParentContactId((ctx as any).portalContactId);
      console.log('[getAllMyAppointments] portalContactId:', (ctx as any).portalContactId, 'students found:', students.length);
      studentIds = students.map((s: any) => s.id);
      if (studentIds.length === 0) {
        console.log('[getAllMyAppointments] no students found, returning empty');
        return [];
      }
      const { appointments: apptTable } = await import("../../drizzle/schema");
      const dbConn = await db.getDb();
      if (!dbConn) return [];
      const now = new Date();
      const rows = await dbConn
        .select()
        .from(apptTable)
        .where(inArray(apptTable.clientId, studentIds))
        .orderBy(asc(apptTable.startTime));
      console.log('[getAllMyAppointments] found', rows.length, 'appointments for studentIds:', studentIds);
      const filtered = rows.filter((r: any) => new Date(r.startTime) >= now && r.status !== 'Cancelled');
      console.log('[getAllMyAppointments] after filtering future/non-cancelled:', filtered.length);
      return filtered;
    }),

    // Portal: get list of smart files bookable/assigned for a student
    getSmartFilesForStudent: portalProcedure
      .input(z.object({ studentContactId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!(ctx as any).isAdminPreview) {
          const students = await db.getStudentsByParentContactId((ctx as any).portalContactId);
          const isOwned = students.some((s) => s.id === input.studentContactId);
          if (!isOwned) throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { smartFileAssignments: sfTable, smartFileTemplates: templateTable } = await import("../../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) return [];
        return await dbConn
          .select({
            id: sfTable.id,
            templateId: sfTable.templateId,
            status: sfTable.status,
            createdAt: sfTable.createdAt,
            name: templateTable.name,
          })
          .from(sfTable)
          .leftJoin(templateTable, eq(sfTable.templateId, templateTable.id))
          .where(eq(sfTable.studentContactId, input.studentContactId));
      }),

    // Portal: create a task for a student contact (Advocate View)
    createPortalTask: adminProcedure
      .input(z.object({
        projectId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        dueDate: z.string().optional(),
        assignedTo: z.number(), // student contact ID
        priority: z.enum(["High", "Medium", "Low"]).default("Medium"),
        smartFileAssignmentId: z.number().optional().nullable(),
      }))
      .mutation(async ({ input }) => {
        const { projectTasks: taskTable } = await import("../../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await dbConn.insert(taskTable).values({
          projectId: input.projectId,
          title: input.title,
          description: input.description,
          status: "Todo",
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          assignedTo: input.assignedTo,
          priority: input.priority,
          smartFileAssignmentId: input.smartFileAssignmentId,
        });
        return { success: true };
      }),

    // Portal: update a task for a student contact (Advocate View)
    updatePortalTask: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        dueDate: z.string().optional(),
        priority: z.enum(["High", "Medium", "Low"]),
        status: z.enum(["Todo", "In Progress", "Done"]),
        smartFileAssignmentId: z.number().optional().nullable(),
      }))
      .mutation(async ({ input }) => {
        const { projectTasks: taskTable } = await import("../../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await dbConn.update(taskTable)
          .set({
            title: input.title,
            description: input.description,
            dueDate: input.dueDate ? new Date(input.dueDate) : null,
            priority: input.priority,
            status: input.status,
            smartFileAssignmentId: input.smartFileAssignmentId,
            completedAt: input.status === "Done" ? new Date() : null,
          })
          .where(eq(taskTable.id, input.id));
        return { success: true };
      }),

    // Portal: delete a task for a student contact (Advocate View)
    deletePortalTask: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { projectTasks: taskTable } = await import("../../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await dbConn.delete(taskTable).where(eq(taskTable.id, input.id));
        return { success: true };
      }),

    // Portal: complete a task for a student contact (Client View)
    completePortalTask: portalProcedure
      .input(z.object({
        taskId: z.number(),
        studentContactId: z.number()
      }))
      .mutation(async ({ ctx, input }) => {
        if (!(ctx as any).isAdminPreview) {
          const students = await db.getStudentsByParentContactId((ctx as any).portalContactId);
          const isOwned = students.some((s) => s.id === input.studentContactId);
          if (!isOwned) throw new TRPCError({ code: "FORBIDDEN" });
        }

        const { projectTasks: taskTable, smartFileAssignments: sfTable } = await import("../../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

        const [task] = await dbConn.select().from(taskTable).where(eq(taskTable.id, input.taskId));
        if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });

        if (task.smartFileAssignmentId) {
          const [sf] = await dbConn.select().from(sfTable).where(eq(sfTable.id, task.smartFileAssignmentId));
          if (sf && sf.status !== "completed") {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Must complete attached smart file first" });
          }
        }

        await dbConn.update(taskTable)
          .set({ status: "Done", completedAt: new Date() })
          .where(eq(taskTable.id, input.taskId));

        return { success: true };
      }),

    // Portal: get developer rules/guidelines for all tabs
    getDevRules: portalProcedure.query(async () => {
      const { developerRules: rulesTable } = await import("../../drizzle/schema");
      const dbConn = await db.getDb();
      if (!dbConn) return [];
      return await dbConn.select().from(rulesTable);
    }),

    // Portal: save developer guidelines for a specific tab (Advocate View only)
    saveDevRules: adminProcedure
      .input(z.object({
        tabKey: z.string(),
        content: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { developerRules: rulesTable } = await import("../../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await dbConn.insert(rulesTable)
          .values({ tabKey: input.tabKey, content: input.content })
          .onConflictDoUpdate({
            target: rulesTable.tabKey,
            set: { content: input.content }
          });
        return { success: true };
      }),

});

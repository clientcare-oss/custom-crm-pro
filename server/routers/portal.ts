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

});

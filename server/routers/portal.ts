import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray, or } from "drizzle-orm";
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

    // ── Parking Lot (PG-023-PRK) Procedures ─────────────────────────────────
    getParkingLotItems: publicProcedure
      .input(z.object({
        studentContactId: z.number().nullable().optional(),
      }).optional())
      .query(async ({ input }) => {
        try {
          return await db.getParkingLotItems(input?.studentContactId);
        } catch (e) {
          console.error("Failed to query parking lot items from DB", e);
          return [];
        }
      }),

    parkItem: publicProcedure
      .input(z.object({
        studentContactId: z.number().nullable().optional(),
        title: z.string().min(1),
        notes: z.string().optional(),
        category: z.string().optional(),
        priority: z.string().optional(),
        spotNumber: z.number().min(1).max(18).optional(),
        carColor: z.string().optional(),
        addedBy: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const res = await db.createParkingLotItem({
            studentContactId: input.studentContactId,
            title: input.title,
            notes: input.notes,
            category: input.category || "Other",
            priority: input.priority || "Normal",
            status: "Parked",
            spotNumber: input.spotNumber || 1,
            carColor: input.carColor || "blue",
            addedBy: input.addedBy || "Parent",
          });
          return { success: true, res };
        } catch (e: any) {
          console.error("Failed to save parking lot item to DB", e);
          return { success: false, error: e?.message || "Failed to persist to DB" };
        }
      }),

    updateParkingLotItem: publicProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        notes: z.string().optional(),
        category: z.string().optional(),
        priority: z.string().optional(),
        status: z.string().optional(),
        spotNumber: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          await db.updateParkingLotItem(input.id, {
            title: input.title,
            notes: input.notes,
            category: input.category,
            priority: input.priority,
            status: input.status,
            spotNumber: input.spotNumber,
          });
          return { success: true };
        } catch (e: any) {
          console.error("Failed to update parking lot item in DB", e);
          return { success: false, error: e?.message };
        }
      }),

    deleteParkingLotItem: publicProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input }) => {
        try {
          await db.deleteParkingLotItem(input.id);
          return { success: true };
        } catch (e: any) {
          console.error("Failed to delete parking lot item in DB", e);
          return { success: false, error: e?.message };
        }
      }),

    // ── PG-023-COM: UNIFIED PARENT PORTAL COMMUNICATION CENTER ──────────────
    getCommunicationFeed: portalProcedure
      .input(z.object({
        studentContactId: z.number().optional().nullable(),
        filterType: z.enum(["all", "email", "sms", "unread"]).default("all"),
        searchQuery: z.string().optional(),
        parentContactId: z.number().optional().nullable(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const {
          contacts: contactsTable,
          callLogs: callLogsTable,
          messages: messagesTable,
          users: usersTable,
          quoSettings: quoSettingsTable,
          clientFiles: clientFilesTable
        } = await import("../../drizzle/schema");

        // 1. Resolve active parent contact ID
        let parentContactId: number | null = (ctx as any).portalContactId;

        if ((ctx as any).isAdminPreview) {
          if (input?.parentContactId) {
            parentContactId = input.parentContactId;
          } else if (input?.studentContactId) {
            const [student] = await dbConn
              .select({ parentContactId: contactsTable.parentContactId })
              .from(contactsTable)
              .where(eq(contactsTable.id, input.studentContactId))
              .limit(1);
            if (student?.parentContactId) {
              parentContactId = student.parentContactId;
            }
          }
          // Fallback in admin preview: find first parent contact or fallback to 1
          if (!parentContactId) {
            const [firstParent] = await dbConn
              .select({ id: contactsTable.id })
              .from(contactsTable)
              .where(or(eq(contactsTable.jobTitle, "Parent"), eq(contactsTable.jobTitle, "parent")))
              .limit(1);
            parentContactId = firstParent?.id ?? 1;
          }
        }

        if (!parentContactId) {
          return {
            primaryContact: { id: 0, name: "Family Account", firstName: "Family", lastName: "Account", email: null, phone: null },
            students: [],
            channels: { emailConnected: false, smsConnected: false, primaryPhone: null },
            timeline: [],
            recentAttachments: [],
            totalUnreadCount: 0,
          };
        }

        // 2. Fetch primary contact details
        const [parentContact] = await dbConn
          .select()
          .from(contactsTable)
          .where(eq(contactsTable.id, parentContactId))
          .limit(1);

        const parentName = parentContact ? `${parentContact.firstName} ${parentContact.lastName}`.trim() : "Family Account";
        const parentFirstName = parentContact?.firstName || "Family";
        const parentLastName = parentContact?.lastName || "";
        const parentEmail = parentContact?.email || null;
        const parentPhone = parentContact?.phone || null;

        // 3. Fetch linked students
        const linkedStudents = await dbConn
          .select({
            id: contactsTable.id,
            firstName: contactsTable.firstName,
            lastName: contactsTable.lastName,
            gradeLevel: contactsTable.gradeLevel,
          })
          .from(contactsTable)
          .where(eq(contactsTable.parentContactId, parentContactId));

        const studentIds = linkedStudents.map((s) => s.id);
        const studentMap = new Map<number, { id: number; firstName: string; lastName: string; fullName: string; gradeLevel?: string | null }>(
          linkedStudents.map((s) => [s.id, { ...s, fullName: `${s.firstName} ${s.lastName}`.trim() }])
        );

        // 4. Verify connected communication channels
        const [ownerUser] = await dbConn
          .select({
            id: usersTable.id,
            name: usersTable.name,
            email: usersTable.email,
            phone: usersTable.phone,
            gmailUser: usersTable.gmailUser,
            gmailAppPassword: usersTable.gmailAppPassword,
          })
          .from(usersTable)
          .where(eq(usersTable.role, "admin"))
          .limit(1);

        const emailConnected = !!(ownerUser?.gmailUser && ownerUser?.gmailAppPassword);

        const [quoSetting] = await dbConn.select().from(quoSettingsTable).limit(1);
        const smsConnected = quoSetting?.status === "connected" || !!quoSetting?.primaryPhoneNumber;
        const primaryPhone = quoSetting?.primaryPhoneNumber || ownerUser?.phone || "+1 (770) 555-0199";

        // 5. Staff users map for sender attribution
        const staffUsers = await dbConn
          .select({
            id: usersTable.id,
            name: usersTable.name,
            email: usersTable.email,
            role: usersTable.role,
          })
          .from(usersTable);
        const staffMap = new Map<number, { id: number; name: string | null; email: string | null; role: string }>(
          staffUsers.map((u) => [u.id, u])
        );

        // 6. Query CallLogs for SMS and Email records
        const allAssociatedIds = [parentContactId, ...studentIds];
        const rawCallLogs = await dbConn
          .select()
          .from(callLogsTable)
          .where(
            or(
              inArray(callLogsTable.contactId, allAssociatedIds),
              inArray(callLogsTable.studentId, allAssociatedIds)
            )
          )
          .orderBy(desc(callLogsTable.createdAt))
          .limit(200);

        // 7. Query Messages for direct portal messages
        const rawMessages = await dbConn
          .select()
          .from(messagesTable)
          .where(
            or(
              eq(messagesTable.senderId, parentContactId),
              eq(messagesTable.recipientId, parentContactId)
            )
          )
          .orderBy(desc(messagesTable.createdAt))
          .limit(100);

        // Helper date formatters
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

        const formatDateLabel = (date: Date): string => {
          if (date >= startOfToday) return "Today";
          if (date >= startOfYesterday) return "Yesterday";
          return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
        };

        const formatTimeLabel = (date: Date): string => {
          return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
        };

        // 8. Normalize into unified timeline
        const timelineItems: Array<{
          id: string;
          type: "email" | "sms" | "portal_message";
          direction: "inbound" | "outbound";
          senderName: string;
          senderAvatar?: string | null;
          senderRole?: string | null;
          recipientName?: string;
          subject?: string | null;
          body: string;
          bodyPreview?: string;
          timestamp: string;
          dateSortKey: number;
          dateLabel: string;
          timeLabel: string;
          isRead: boolean;
          deliveryStatus?: string | null;
          studentId?: number | null;
          studentName?: string | null;
          hasAttachments: boolean;
          attachments?: Array<{ id: string; name: string; url: string; size?: string; mimeType?: string }>;
          rawThreadId?: string | null;
        }> = [];

        // Process callLogs (SMS & Email)
        for (const log of rawCallLogs) {
          const payload = (log.rawPayload as any) || {};
          const isEmail = log.eventType?.startsWith("email") || payload?.channel === "email";
          const isSms = !!log.smsBody || log.eventType?.startsWith("message") || payload?.channel === "sms";

          if (!isEmail && !isSms) continue;

          const createdAtDate = log.createdAt ? new Date(log.createdAt) : new Date();
          const direction = log.direction === "outbound" ? "outbound" : "inbound";
          const linkedStudent = log.studentId ? studentMap.get(log.studentId) : null;

          let senderName = direction === "inbound" ? parentName : (ownerUser?.name || "Waypoint Advocates");
          if (direction === "outbound" && payload?.senderEmployeeName) {
            senderName = payload.senderEmployeeName;
          } else if (direction === "outbound" && payload?.senderEmployeeId) {
            const matchedStaff = staffMap.get(payload.senderEmployeeId);
            if (matchedStaff?.name) senderName = matchedStaff.name;
          }

          if (isEmail) {
            const subject = payload?.subject || log.summary || "Waypoint Update";
            const body = payload?.body || log.transcript || log.smsBody || "";
            const attachments = Array.isArray(payload?.attachments) ? payload.attachments : [];

            timelineItems.push({
              id: `email-${log.id}`,
              type: "email",
              direction,
              senderName,
              senderAvatar: null,
              senderRole: direction === "outbound" ? "Advocate" : "Parent",
              recipientName: direction === "outbound" ? parentName : (ownerUser?.name || "Waypoint Advocates"),
              subject,
              body,
              bodyPreview: body.length > 180 ? `${body.slice(0, 180)}...` : body,
              timestamp: createdAtDate.toISOString(),
              dateSortKey: createdAtDate.getTime(),
              dateLabel: formatDateLabel(createdAtDate),
              timeLabel: formatTimeLabel(createdAtDate),
              isRead: payload?.isRead ?? true,
              deliveryStatus: "Delivered",
              studentId: linkedStudent?.id || null,
              studentName: linkedStudent?.fullName || null,
              hasAttachments: attachments.length > 0,
              attachments,
              rawThreadId: payload?.threadId || String(log.id),
            });
          } else if (isSms) {
            const body = log.smsBody || payload?.body || "";
            timelineItems.push({
              id: `sms-${log.id}`,
              type: "sms",
              direction,
              senderName,
              senderAvatar: null,
              senderRole: direction === "outbound" ? "Advocate" : "Parent",
              recipientName: direction === "outbound" ? parentName : (ownerUser?.name || "Waypoint Advocates"),
              subject: null,
              body,
              bodyPreview: body,
              timestamp: createdAtDate.toISOString(),
              dateSortKey: createdAtDate.getTime(),
              dateLabel: formatDateLabel(createdAtDate),
              timeLabel: formatTimeLabel(createdAtDate),
              isRead: true,
              deliveryStatus: direction === "inbound" ? "Delivered" : null,
              studentId: linkedStudent?.id || null,
              studentName: linkedStudent?.fullName || null,
              hasAttachments: false,
              attachments: [],
              rawThreadId: String(log.id),
            });
          }
        }

        // Process messages (direct portal messages)
        for (const msg of rawMessages) {
          const createdAtDate = msg.createdAt ? new Date(msg.createdAt) : new Date();
          const isOutbound = msg.senderId === ownerUser?.id;
          const direction = isOutbound ? "outbound" : "inbound";
          const senderName = isOutbound ? (ownerUser?.name || "Waypoint Advocates") : parentName;

          timelineItems.push({
            id: `msg-${msg.id}`,
            type: "portal_message",
            direction,
            senderName,
            senderAvatar: null,
            senderRole: isOutbound ? "Advocate" : "Parent",
            recipientName: isOutbound ? parentName : (ownerUser?.name || "Waypoint Advocates"),
            subject: null,
            body: msg.content,
            bodyPreview: msg.content,
            timestamp: createdAtDate.toISOString(),
            dateSortKey: createdAtDate.getTime(),
            dateLabel: formatDateLabel(createdAtDate),
            timeLabel: formatTimeLabel(createdAtDate),
            isRead: msg.isRead,
            deliveryStatus: !isOutbound ? "Delivered" : null,
            studentId: linkedStudents[0]?.id || null,
            studentName: linkedStudents[0]?.fullName || null,
            hasAttachments: false,
            attachments: [],
            rawThreadId: String(msg.id),
          });
        }

        // Sort timeline items newest first or ascending based on view
        timelineItems.sort((a, b) => b.dateSortKey - a.dateSortKey);

        // 9. Query recent attachments across communication & student files
        const recentAttachments: Array<{
          id: string;
          name: string;
          url: string;
          uploadedAt: string;
          dateLabel: string;
          timeLabel: string;
          studentId?: number | null;
          studentName?: string | null;
        }> = [];

        // Attachments from timeline
        for (const item of timelineItems) {
          if (item.attachments && item.attachments.length > 0) {
            for (const att of item.attachments) {
              recentAttachments.push({
                id: att.id,
                name: att.name,
                url: att.url,
                uploadedAt: item.timestamp,
                dateLabel: item.dateLabel,
                timeLabel: item.timeLabel,
                studentId: item.studentId,
                studentName: item.studentName,
              });
            }
          }
        }

        // Also include real files from clientFiles for linked students
        if (studentIds.length > 0) {
          const rawClientFiles = await dbConn
            .select()
            .from(clientFilesTable)
            .where(inArray(clientFilesTable.clientId, studentIds))
            .orderBy(desc(clientFilesTable.uploadedAt))
            .limit(10);

          for (const cf of rawClientFiles) {
            const cfDate = cf.uploadedAt ? new Date(cf.uploadedAt) : new Date();
            const student = studentMap.get(cf.clientId);
            recentAttachments.push({
              id: `cf-${cf.id}`,
              name: cf.fileName,
              url: cf.fileUrl,
              uploadedAt: cfDate.toISOString(),
              dateLabel: formatDateLabel(cfDate),
              timeLabel: formatTimeLabel(cfDate),
              studentId: cf.clientId,
              studentName: student?.fullName || null,
            });
          }
        }

        // Deduplicate attachments by name
        const seenAttachmentNames = new Set<string>();
        const uniqueAttachments = recentAttachments.filter((att) => {
          if (seenAttachmentNames.has(att.name)) return false;
          seenAttachmentNames.add(att.name);
          return true;
        }).slice(0, 8);

        // 10. Filter timeline if filters applied
        let filteredTimeline = timelineItems;

        if (input?.studentContactId) {
          filteredTimeline = filteredTimeline.filter((item) => item.studentId === input.studentContactId);
        }

        if (input?.filterType === "email") {
          filteredTimeline = filteredTimeline.filter((item) => item.type === "email");
        } else if (input?.filterType === "sms") {
          filteredTimeline = filteredTimeline.filter((item) => item.type === "sms" || item.type === "portal_message");
        } else if (input?.filterType === "unread") {
          filteredTimeline = filteredTimeline.filter((item) => !item.isRead);
        }

        if (input?.searchQuery?.trim()) {
          const q = input.searchQuery.toLowerCase().trim();
          filteredTimeline = filteredTimeline.filter((item) => {
            return (
              item.body.toLowerCase().includes(q) ||
              (item.subject && item.subject.toLowerCase().includes(q)) ||
              item.senderName.toLowerCase().includes(q) ||
              (item.studentName && item.studentName.toLowerCase().includes(q)) ||
              (item.attachments && item.attachments.some((a) => a.name.toLowerCase().includes(q)))
            );
          });
        }

        const totalUnreadCount = timelineItems.filter((i) => !i.isRead).length;

        return {
          primaryContact: {
            id: parentContactId,
            name: parentName,
            firstName: parentFirstName,
            lastName: parentLastName,
            email: parentEmail,
            phone: parentPhone,
          },
          students: linkedStudents.map((s) => ({
            id: s.id,
            firstName: s.firstName,
            lastName: s.lastName,
            fullName: `${s.firstName} ${s.lastName}`.trim(),
            gradeLevel: s.gradeLevel,
          })),
          channels: {
            emailConnected,
            smsConnected,
            primaryPhone,
          },
          timeline: filteredTimeline,
          recentAttachments: uniqueAttachments,
          totalUnreadCount,
        };
      }),

    sendCommunication: portalProcedure
      .input(z.object({
        type: z.enum(["email", "sms", "portal_message"]),
        studentContactId: z.number().optional().nullable(),
        subject: z.string().optional(),
        body: z.string().min(1, "Message cannot be empty"),
        parentContactId: z.number().optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const {
          contacts: contactsTable,
          callLogs: callLogsTable,
          messages: messagesTable,
          users: usersTable,
        } = await import("../../drizzle/schema");

        let parentContactId: number | null = (ctx as any).portalContactId;
        if ((ctx as any).isAdminPreview) {
          parentContactId = input.parentContactId || 1;
        }

        if (!parentContactId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Portal parent identity required" });

        const [parent] = await dbConn.select().from(contactsTable).where(eq(contactsTable.id, parentContactId)).limit(1);
        const parentName = parent ? `${parent.firstName} ${parent.lastName}`.trim() : "Parent Client";
        const [ownerUser] = await dbConn.select().from(usersTable).where(eq(usersTable.role, "admin")).limit(1);

        const isEmail = input.type === "email";
        const eventType = isEmail ? "email.received" : "message.received";

        // Insert into callLogs as canonical communication record
        const [record] = await dbConn.insert(callLogsTable).values({
          ownerId: ownerUser?.id || 1,
          contactId: parentContactId,
          studentId: input.studentContactId || undefined,
          fromNumber: parent?.phone || undefined,
          toNumber: ownerUser?.phone || undefined,
          direction: "inbound",
          eventType,
          smsBody: input.body,
          summary: input.subject || `Message from ${parentName}`,
          status: "assigned",
          rawPayload: {
            channel: input.type,
            subject: input.subject || null,
            body: input.body,
            fromName: parentName,
            fromEmail: parent?.email || null,
            fromPhone: parent?.phone || null,
            isRead: false,
            sentAt: new Date().toISOString(),
          },
        }).returning();

        // Also insert into messages table for real-time notification compatibility
        if (ownerUser?.id) {
          await dbConn.insert(messagesTable).values({
            senderId: parentContactId,
            recipientId: ownerUser.id,
            content: isEmail && input.subject ? `[${input.subject}]\n\n${input.body}` : input.body,
            isRead: false,
          });
        }

        // Notify owner
        try {
          await notifyOwner({
            title: `New ${isEmail ? "Email" : "Text"} from ${parentName}`,
            content: (input.subject ? `Subject: ${input.subject}\n` : "") + input.body.slice(0, 180),
          });
        } catch (err) {
          console.warn("[Communication] Notification to owner warning:", err);
        }

        return { success: true, id: record?.id ? String(record.id) : "ok" };
      }),

    requestCallback: portalProcedure
      .input(z.object({
        phone: z.string().optional(),
        preferredTime: z.string().optional(),
        note: z.string().optional(),
        studentContactId: z.number().optional().nullable(),
        parentContactId: z.number().optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const { contacts: contactsTable, callLogs: callLogsTable, users: usersTable } = await import("../../drizzle/schema");

        let parentContactId: number | null = (ctx as any).portalContactId;
        if ((ctx as any).isAdminPreview) {
          parentContactId = input.parentContactId || 1;
        }

        const [parent] = parentContactId
          ? await dbConn.select().from(contactsTable).where(eq(contactsTable.id, parentContactId)).limit(1)
          : [null];

        const parentName = parent ? `${parent.firstName} ${parent.lastName}`.trim() : "Parent Client";
        const callbackPhone = input.phone || parent?.phone || "(Not provided)";
        const [ownerUser] = await dbConn.select().from(usersTable).where(eq(usersTable.role, "admin")).limit(1);

        await dbConn.insert(callLogsTable).values({
          ownerId: ownerUser?.id || 1,
          contactId: parentContactId || undefined,
          studentId: input.studentContactId || undefined,
          fromNumber: callbackPhone,
          direction: "inbound",
          eventType: "callback.requested",
          isMissed: true,
          callbackStatus: "pending",
          summary: `Callback requested by ${parentName}: ${input.preferredTime || "ASAP"} — ${input.note || "General Inquiry"}`,
          rawPayload: {
            type: "callback_request",
            preferredTime: input.preferredTime,
            note: input.note,
            phone: callbackPhone,
            requestedAt: new Date().toISOString(),
          },
        });

        try {
          await notifyOwner({
            title: `Callback Request from ${parentName}`,
            content: `Phone: ${callbackPhone} | Time: ${input.preferredTime || "ASAP"} | Note: ${input.note || "None"}`,
          });
        } catch (err) {
          console.warn("[Communication] Callback notification warning:", err);
        }

        return { success: true, message: "Callback request submitted! Our team will reach out within 1 business day." };
      }),

    markCommunicationRead: portalProcedure
      .input(z.object({
        id: z.string(),
      }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return { success: false };

        const { callLogs: callLogsTable, messages: messagesTable } = await import("../../drizzle/schema");

        if (input.id.startsWith("msg-")) {
          const numId = parseInt(input.id.replace("msg-", ""), 10);
          if (!isNaN(numId)) {
            await dbConn.update(messagesTable).set({ isRead: true }).where(eq(messagesTable.id, numId));
          }
        } else if (input.id.startsWith("email-") || input.id.startsWith("sms-")) {
          const numId = parseInt(input.id.replace("email-", "").replace("sms-", ""), 10);
          if (!isNaN(numId)) {
            // Updated rawPayload isRead
            const [log] = await dbConn.select().from(callLogsTable).where(eq(callLogsTable.id, numId)).limit(1);
            if (log) {
              const payload = (log.rawPayload as any) || {};
              await dbConn.update(callLogsTable).set({ rawPayload: { ...payload, isRead: true } }).where(eq(callLogsTable.id, numId));
            }
          }
        }
        return { success: true };
      }),

});

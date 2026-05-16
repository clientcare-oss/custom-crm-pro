import { brainDumpItems, brainDumpImages } from "../drizzle/schema";
import { smartFilesRouter } from "./routers/smartFiles";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { portalAuthRouter } from "./routers/portalAuth";
import { publicProcedure, router, protectedProcedure, portalProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { eq, and, asc, desc } from "drizzle-orm";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";
import { ENV } from "./_core/env";
import { transcribeAudio } from "./_core/voiceTranscription";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  portalAuth: portalAuthRouter,
  voice: router({
    transcribe: protectedProcedure
      .input(z.object({
        // base64-encoded audio blob — avoids S3 URL resolution issues
        audioBase64: z.string(),
        mimeType: z.string().default("audio/webm"),
        language: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Voice transcription service is not configured" });
        }
        const audioBuffer = Buffer.from(input.audioBase64, "base64");
        if (audioBuffer.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Empty audio data" });
        }
        const sizeMB = audioBuffer.length / (1024 * 1024);
        if (sizeMB > 16) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Audio file too large (${sizeMB.toFixed(1)}MB, max 16MB)` });
        }
        const mimeType = input.mimeType || "audio/webm";
        const ext = mimeType.includes("webm") ? "webm" : mimeType.includes("mp4") ? "mp4" : "webm";
        const formData = new FormData();
        const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
        formData.append("file", audioBlob, `audio.${ext}`);
        formData.append("model", "whisper-1");
        formData.append("response_format", "json");
        formData.append("prompt", "Transcribe the user's voice input for a CRM field. Return exact words spoken.");
        if (input.language) formData.append("language", input.language);
        const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
        const whisperUrl = new URL("v1/audio/transcriptions", baseUrl).toString();
        const response = await fetch(whisperUrl, {
          method: "POST",
          headers: { authorization: `Bearer ${ENV.forgeApiKey}`, "Accept-Encoding": "identity" },
          body: formData,
        });
        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Transcription failed: ${response.status} ${errorText}` });
        }
        const result = await response.json() as { text?: string };
        if (!result.text) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Transcription returned empty result" });
        }
        return { text: result.text.trim() };
      }),
  }),
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    getOwner: publicProcedure.query(async () => {
      const owner = await db.getUserByOpenId(ENV.ownerOpenId);
      return owner ? { id: owner.id, name: owner.name } : null;
    }),
  }),

  // ============ CONTACTS ============
  contacts: router({
    list: adminProcedure.query(async ({ ctx }) => {
      const contacts = await db.getContactsByOwner(ctx.user.id);
      console.log('[contacts.list] User:', ctx.user.id, 'Contacts:', contacts.length, contacts);
      return contacts;
    }),

    get: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getContactById(input.id, ctx.user.id);
      }),

    create: adminProcedure
      .input(
        z.object({
          firstName: z.string().min(1),
          lastName: z.string().min(1),
          email: z.union([z.string().email(), z.literal("")]).optional(),
          phone: z.string().optional(),
          company: z.string().optional(),
          jobTitle: z.string().optional(),
          address: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          zipCode: z.string().optional(),
          country: z.string().optional(),
          notes: z.string().optional(),
          parentContactId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await db.createContact(input, ctx.user.id);
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          email: z.union([z.string().email(), z.literal("")]).optional(),
          phone: z.string().optional(),
          company: z.string().optional(),
          jobTitle: z.string().optional(),
          address: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          zipCode: z.string().optional(),
          country: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return await db.updateContact(id, ctx.user.id, data);
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return await db.deleteContact(input.id, ctx.user.id);
      }),

    // Contact detail hub: all data for one contact
    detail: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const contact = await db.getContactById(input.id, ctx.user.id);
        if (!contact) throw new TRPCError({ code: "NOT_FOUND" });
        const [projects, invoices, contracts, appointments, files, messages] = await Promise.all([
          db.getProjectsByClient(input.id),
          db.getInvoicesByClient(input.id),
          db.getContractsByClient(input.id),
          db.getAppointmentsByClient(input.id),
          db.getClientFilesByClient(input.id),
          db.getMessagesBetween(ctx.user.id, input.id),
        ]);
        // Fetch compass using caseId (unique per student)
        const compass = contact.caseId
          ? await db.getCaseCompass(contact.caseId)
          : null;
        const compassHistory = contact.caseId
          ? await db.getCaseCompassHistory(contact.caseId)
          : [];
        return { contact, projects, invoices, contracts, appointments, files, messages, compass, compassHistory };
      }),

    // Get students linked to a parent contact with next meeting + task summary
    getStudentsWithSummary: adminProcedure
      .input(z.object({ parentContactId: z.number() }))
      .query(async ({ input }) => {
        return await db.getStudentsWithSummary(input.parentContactId);
      }),

    // Link a contact to a portal user account
    linkPortalUser: adminProcedure
      .input(z.object({ contactId: z.number(), portalUserId: z.number().nullable() }))
      .mutation(async ({ ctx, input }) => {
        return await db.updateContact(input.contactId, ctx.user.id, { portalUserId: input.portalUserId });
      }),

    // Send portal link to parent contact(s) via email
    sendPortalLink: adminProcedure
      .input(z.object({
        parentContactIds: z.array(z.number()).min(1),
        portalLink: z.string(),
        studentName: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { sendEmail } = await import("./_core/email");
        
        // Fetch parent contact details
        const parentContacts = await Promise.all(
          input.parentContactIds.map(id => db.getContactById(id, ctx.user.id))
        );

        const validContacts = parentContacts
          .filter(contact => contact?.email)
          .map(contact => ({
            email: contact!.email!,
            name: `${contact!.firstName} ${contact!.lastName}`,
          }));

        if (validContacts.length === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'No parent contacts with valid email addresses found.',
          });
        }

        // Send email to each parent contact
        const emailResults = await Promise.all(
          validContacts.map(contact =>
            sendEmail({
              to: contact.email,
              subject: `Portal Access for ${input.studentName}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px;">
                  <h2>Portal Access</h2>
                  <p>Hello ${contact.name},</p>
                  <p>You have been granted access to the client portal for <strong>${input.studentName}</strong>.</p>
                  <p style="margin-top: 20px;">
                    <a href="${input.portalLink}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Access Portal</a>
                  </p>
                  <p style="margin-top: 20px; color: #666; font-size: 14px;">If you have any questions, please contact us.</p>
                </div>
              `,
            })
          )
        );

        const successCount = emailResults.filter(Boolean).length;
        return {
          sent: successCount,
          total: validContacts.length,
          success: successCount > 0,
        };
      }),
  }),

  // ============ LEADS ============
  leads: router({
    list: adminProcedure.query(async ({ ctx }) => {
      return await db.getLeadsByOwner(ctx.user.id);
    }),

    get: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getLeadById(input.id, ctx.user.id);
      }),

    create: adminProcedure
      .input(
        z.object({
          contactId: z.number().optional(),
          source: z.string().optional(),
          status: z.enum(["New", "Follow-up", "Qualified", "Won", "Lost"]).optional(),
          value: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await db.createLead(input, ctx.user.id);
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          contactId: z.number().optional(),
          source: z.string().optional(),
          status: z.enum(["New", "Follow-up", "Qualified", "Won", "Lost"]).optional(),
          value: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return await db.updateLead(id, ctx.user.id, data);
      }),
  }),

  // ============ PROJECTS ============
  projects: router({
    list: adminProcedure.query(async ({ ctx }) => {
      return await db.getProjectsByOwner(ctx.user.id);
    }),

    get: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getProjectById(input.id, ctx.user.id, ctx.user.role);
      }),

    create: adminProcedure
      .input(
        z.object({
          clientId: z.number().optional(),
          leadId: z.number().optional(),
          name: z.string().min(1),
          description: z.string().optional(),
          status: z.enum(["Planning", "In Progress", "On Hold", "Completed"]).optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          budget: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await db.createProject(input, ctx.user.id);
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          clientId: z.number().optional(),
          leadId: z.number().optional(),
          name: z.string().optional(),
          description: z.string().optional(),
          status: z.enum(["Planning", "In Progress", "On Hold", "Completed"]).optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          budget: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return await db.updateProject(id, ctx.user.id, data);
      }),
  }),

  // ============ TASKS ============
  tasks: router({
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
        const { projects: projectsTable, contacts: contactsTable } = await import("../drizzle/schema");
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
        const { internalTasks, internalSubtasks, projectTasks, projects: projectsTable, contacts: contactsTable } = await import("../drizzle/schema");

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
  }),
  // ============ INVOICES ============
  invoices: router({
    list: adminProcedure.query(async ({ ctx }) => {
      return await db.getInvoicesByOwner(ctx.user.id);
    }),

    get: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getInvoiceById(input.id, ctx.user.id, ctx.user.role);
      }),

    create: adminProcedure
      .input(
        z.object({
          clientId: z.number().optional(),
          projectId: z.number().optional(),
          invoiceNumber: z.string().min(1),
          amount: z.string(),
          tax: z.string().optional(),
          total: z.string(),
          status: z.enum(["Draft", "Sent", "Paid", "Overdue", "Cancelled"]).optional(),
          dueDate: z.date().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await db.createInvoice(input, ctx.user.id);
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          clientId: z.number().optional(),
          projectId: z.number().optional(),
          invoiceNumber: z.string().optional(),
          amount: z.string().optional(),
          tax: z.string().optional(),
          total: z.string().optional(),
          status: z.enum(["Draft", "Sent", "Paid", "Overdue", "Cancelled"]).optional(),
          dueDate: z.date().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return await db.updateInvoice(id, ctx.user.id, data);
      }),
  }),

  // ============ CONTRACTS ============
  contracts: router({
    list: adminProcedure.query(async ({ ctx }) => {
      return await db.getContractsByOwner(ctx.user.id);
    }),

    get: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getContractById(input.id, ctx.user.id, ctx.user.role);
      }),

    create: adminProcedure
      .input(
        z.object({
          clientId: z.number().optional(),
          projectId: z.number().optional(),
          title: z.string().min(1),
          content: z.string().min(1),
          status: z.enum(["Draft", "Sent", "Signed", "Executed", "Cancelled"]).optional(),
          expiryDate: z.date().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await db.createContract(input, ctx.user.id);
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          clientId: z.number().optional(),
          projectId: z.number().optional(),
          title: z.string().optional(),
          content: z.string().optional(),
          status: z.enum(["Draft", "Sent", "Signed", "Executed", "Cancelled"]).optional(),
          expiryDate: z.date().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return await db.updateContract(id, ctx.user.id, data);
      }),

    sign: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          signatureData: z.string(), // base64 PNG data URL
        })
      )
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new Error("Database not available");

        const schema = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");

        // Authorization: verify the contract is assigned to this client
        const [contract] = await dbInstance.select()
          .from(schema.contracts)
          .where(eq(schema.contracts.id, input.id))
          .limit(1);

        if (!contract) throw new TRPCError({ code: "NOT_FOUND", message: "Contract not found" });

        // Only the assigned client or admin can sign
        if (ctx.user.role !== "admin" && contract.clientId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You are not authorized to sign this contract" });
        }

        // Only contracts with status "Sent" can be signed
        if (contract.status !== "Sent") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This contract cannot be signed in its current state" });
        }

        // Store signature in S3
        const { storagePut } = await import("./storage");
        const base64Data = input.signatureData.replace(/^data:image\/png;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const fileKey = `signatures/contract-${input.id}-${Date.now()}.png`;
        const { url } = await storagePut(fileKey, buffer, "image/png");

        // Update contract status to Signed
        await dbInstance.update(schema.contracts)
          .set({
            status: "Signed",
            signedDate: new Date(),
            signatureUrl: url,
            signatureKey: fileKey,
          })
          .where(eq(schema.contracts.id, input.id));

        return { success: true, signatureUrl: url };
      }),

    clientList: protectedProcedure.query(async ({ ctx }) => {
      // Get contracts assigned to this client
      const dbInstance = await db.getDb();
      if (!dbInstance) return [];
      const schema = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      return await dbInstance.select().from(schema.contracts).where(eq(schema.contracts.clientId, ctx.user.id));
    }),
  }),

  // ============ APPOINTMENTS ============
  appointments: router({
    list: adminProcedure.query(async ({ ctx }) => {
      return await db.getAppointmentsByOwner(ctx.user.id);
    }),

    // Public booking endpoint - no auth required
    book: publicProcedure
      .input(
        z.object({
          title: z.string().min(1),
          clientId: z.number().optional(),
          description: z.string().optional(),
          startTime: z.date(),
          endTime: z.date(),
          sessionTypeId: z.number().optional(), // used to recompute endTime server-side
          location: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { users: usersTable, sessionTypes: sessionTypesTable } = await import("../drizzle/schema");
        const dbConn2 = await db.getDb();
        let owner = await db.getUserByOpenId(ENV.ownerOpenId);
        if (!owner && dbConn2) {
          const [firstAdmin] = await dbConn2.select().from(usersTable).where(eq(usersTable.role, 'admin')).limit(1);
          owner = firstAdmin ?? null;
        }
        if (!owner) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Owner not found" });

        // Recompute endTime server-side from session type to prevent client-side duration bugs
        let computedEndTime = input.endTime;
        if (input.sessionTypeId && dbConn2) {
          const [st] = await dbConn2.select().from(sessionTypesTable).where(eq(sessionTypesTable.id, input.sessionTypeId)).limit(1);
          if (st) {
            const durationMin = String(st.durationUnit).trim() === 'hours' ? Number(st.duration) * 60 : Number(st.duration);
            computedEndTime = new Date(input.startTime.getTime() + durationMin * 60 * 1000);
            console.log('[book] sessionType:', st.name, 'duration:', st.duration, st.durationUnit, '-> durationMin:', durationMin, 'endTime:', computedEndTime);
          }
        } else {
          console.log('[book] no sessionTypeId, using client endTime, diff_min:', (input.endTime.getTime() - input.startTime.getTime()) / 60000);
        }

        const appointment = await db.createAppointment({
          ...input,
          endTime: computedEndTime,
          status: "Scheduled",
        }, owner.id);
        // Notify owner of new booking
        try {
          await notifyOwner({
            title: "New Appointment Booking",
            content: `${input.title} scheduled for ${new Date(input.startTime).toLocaleString()}`,
          });
        } catch (e) {
          console.error("[Notification] Failed to notify owner of booking:", e);
        }
        return appointment;
      }),

    get: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getAppointmentsByOwner(ctx.user.id);
      }),

    create: adminProcedure
      .input(
        z.object({
          clientId: z.number().optional(),
          title: z.string().min(1),
          description: z.string().optional(),
          startTime: z.date(),
          endTime: z.date(),
          location: z.string().optional(),
          videoLink: z.string().optional(),
          parentName: z.string().optional(),
          parentPhone: z.string().optional(),
          studentName: z.string().optional(),
          status: z.enum(["Scheduled", "Confirmed", "Completed", "Cancelled"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await db.createAppointment(input, ctx.user.id);
      }),
    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          description: z.string().optional(),
          startTime: z.date().optional(),
          endTime: z.date().optional(),
          location: z.string().optional(),
          videoLink: z.string().optional(),
          parentName: z.string().optional(),
          parentPhone: z.string().optional(),
          studentName: z.string().optional(),
          status: z.enum(["Scheduled", "Confirmed", "Completed", "Cancelled"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return await db.updateAppointment(id, ctx.user.id, data);
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return await db.deleteAppointment(input.id, ctx.user.id);
      }),

    cancelWithNotify: adminProcedure
      .input(z.object({
        id: z.number(),
        notifyParent: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        // Mark appointment as Cancelled
        await db.updateAppointment(input.id, ctx.user.id, { status: "Cancelled" });

        if (input.notifyParent) {
          // Fetch the appointment to get parent email / name / time
          const apts = await db.getAppointmentsByOwner(ctx.user.id);
          const apt = (apts as any[]).find((a: any) => a.id === input.id);
          if (apt) {
            // Try to find parent email from contacts
            let parentEmail: string | null = null;
            if (apt.clientId) {
              try {
                const contact = await db.getContactById(apt.clientId, ctx.user.id);
                if (contact) parentEmail = (contact as any).email ?? null;
              } catch { /* ignore */ }
            }
            if (parentEmail) {
              const { sendEmail } = await import("./_core/email");
              const dateStr = new Date(apt.startTime).toLocaleString("en-US", {
                weekday: "long", month: "long", day: "numeric", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              });
              await sendEmail({
                to: parentEmail,
                subject: `Appointment Cancelled: ${apt.title}`,
                html: `
                  <p>Hello${apt.parentName ? ` ${apt.parentName}` : ""},</p>
                  <p>We wanted to let you know that the following appointment has been <strong>cancelled</strong>:</p>
                  <ul>
                    <li><strong>Meeting:</strong> ${apt.title}</li>
                    <li><strong>Date &amp; Time:</strong> ${dateStr}</li>
                    ${apt.studentName ? `<li><strong>Student:</strong> ${apt.studentName}</li>` : ""}
                  </ul>
                  <p>Please reach out if you have any questions or would like to reschedule.</p>
                  <p>Thank you,<br/>Waypoint Advocacy</p>
                `,
              });
            }
          }
        }

        return { success: true };
      }),

    // Public: get available time slots for a session type on a given date
    getAvailableSlots: publicProcedure
      .input(z.object({
        sessionTypeId: z.number(),
        date: z.string(), // YYYY-MM-DD
      }))
      .query(async ({ input }) => {
        const { sessionTypes } = await import("../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const rows = await dbConn.select().from(sessionTypes).where(eq(sessionTypes.id, input.sessionTypeId)).limit(1);
        const st = rows[0];
        if (!st) throw new TRPCError({ code: "NOT_FOUND", message: "Session type not found" });
        // Parse weekly hours
        const weeklyHours: Record<string, { start: string; end: string }[]> = st.weeklyHours ? JSON.parse(st.weeklyHours) : {};
        const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
        const dateObj = new Date(input.date + "T00:00:00");
        const dayKey = dayNames[dateObj.getDay()];
        const daySlots = weeklyHours[dayKey] || [];
        if (daySlots.length === 0) return [];
        // Generate slots based on duration and increment
        const durationMin = st.durationUnit === "hours" ? st.duration * 60 : st.duration;
        const increment = st.customIncrements || durationMin;
        const slots: string[] = [];
        for (const range of daySlots) {
          const [startH, startM] = range.start.split(":").map(Number);
          const [endH, endM] = range.end.split(":").map(Number);
          let current = startH * 60 + startM;
          const end = endH * 60 + endM;
          while (current + durationMin <= end) {
            const h = Math.floor(current / 60);
            const m = current % 60;
            slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
            current += increment;
          }
        }
        // ── Double-booking prevention ──────────────────────────────────────
        // The slots are generated as local "wall clock" times (e.g. "09:00").
        // Appointments are stored as UTC datetime values in the DB.
        // Strategy: convert each slot to an absolute UTC timestamp for the
        // requested date, then do a proper timestamp-based overlap check.
        // We treat the slot times as America/New_York (Eastern) because that
        // is the business timezone.  The UTC offset is determined at runtime
        // so it handles EST (-5) vs EDT (-4) automatically.
        const { appointments } = await import("../drizzle/schema");
        const { gte: aGte, lte: aLte, sql: aSql } = await import("drizzle-orm");

        // Helper: convert a "HH:MM" wall-clock time on input.date to a UTC ms timestamp.
        // We use the Intl API to find the UTC offset for America/New_York on that date.
        function localToUtcMs(dateStr: string, timeStr: string, tz = "America/New_York"): number {
          const [h, m] = timeStr.split(":").map(Number);
          // Use noon UTC as reference — noon UTC always falls on the same calendar day
          // in Eastern time (UTC-4 to UTC-5), avoiding the midnight off-by-one-day bug.
          const noonUtc = Date.UTC(
            Number(dateStr.slice(0,4)),
            Number(dateStr.slice(5,7)) - 1,
            Number(dateStr.slice(8,10)),
            12, 0, 0
          );
          const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", second: "2-digit",
            hour12: false,
          });
          const parts = formatter.formatToParts(new Date(noonUtc));
          const p: Record<string,string> = {};
          parts.forEach(x => { p[x.type] = x.value; });
          // tzNoonMs = the UTC timestamp that corresponds to noon in this tz
          const tzNoonMs = Date.UTC(
            Number(p.year), Number(p.month)-1, Number(p.day),
            Number(p.hour === '24' ? '0' : p.hour), Number(p.minute), Number(p.second)
          );
          const offsetMs = noonUtc - tzNoonMs; // positive = tz is behind UTC
          const utcMidnight = Date.UTC(
            Number(dateStr.slice(0,4)),
            Number(dateStr.slice(5,7)) - 1,
            Number(dateStr.slice(8,10))
          );
          return utcMidnight + h * 3600000 + m * 60000 + offsetMs;
        }

        // Fetch ALL appointments that could overlap this day (±1 day buffer for timezone edge cases)
        const bufferDayStart = new Date(input.date + "T00:00:00Z");
        bufferDayStart.setUTCDate(bufferDayStart.getUTCDate() - 1);
        const bufferDayEnd = new Date(input.date + "T23:59:59Z");
        bufferDayEnd.setUTCDate(bufferDayEnd.getUTCDate() + 1);

        const booked = await dbConn
          .select({ startTime: appointments.startTime, endTime: appointments.endTime })
          .from(appointments)
          .where(
            and(
              aGte(appointments.startTime, bufferDayStart),
              aLte(appointments.startTime, bufferDayEnd),
              aSql`${appointments.status} NOT IN ('Cancelled', 'No-Show')`
            )
          );

        console.log(`[scheduler] date=${input.date} booked appointments:`, booked.map(b => ({ start: b.startTime, end: b.endTime })));

        const availableSlots = slots.filter((slot) => {
          const slotStartMs = localToUtcMs(input.date, slot);
          const slotEndMs   = slotStartMs + durationMin * 60000;
          const blocked = booked.some((appt) => {
            const apptStartMs = new Date(appt.startTime).getTime();
            let apptEndMs: number;
            const apptEndDate = new Date(appt.endTime);
            if (apptEndDate.getTime() > apptStartMs) {
              apptEndMs = apptEndDate.getTime();
            } else {
              apptEndMs = apptStartMs + durationMin * 60000;
            }
            // Overlap: slot starts before appt ends AND slot ends after appt starts
            return slotStartMs < apptEndMs && slotEndMs > apptStartMs;
          });
          return !blocked;
        });
        console.log(`[scheduler] date=${input.date} slots generated=${slots.length} available=${availableSlots.length}`);
        return availableSlots;
      }),
  }),

  // ============ MESSAGES ============
  messages: router({
    list: protectedProcedure
      .input(z.object({ recipientId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getMessagesBetween(ctx.user.id, input.recipientId);
      }),

    unread: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUnreadMessages(ctx.user.id);
    }),

    create: protectedProcedure
      .input(
        z.object({
          recipientId: z.number(),
          content: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const message = await db.createMessage({
          senderId: ctx.user.id,
          recipientId: input.recipientId,
          content: input.content,
        });
        // Notify owner when a client sends a message
        try {
          const owner = await db.getUserByOpenId(ENV.ownerOpenId);
          if (owner && input.recipientId === owner.id && ctx.user.id !== owner.id) {
            await notifyOwner({
              title: `New message from ${ctx.user.name || "a client"}`,
              content: input.content.substring(0, 200),
            });
          }
        } catch (e) {
          // Don't fail the message send if notification fails
          console.error("[Notification] Failed to notify owner:", e);
        }
        return message;
      }),

    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.markMessageAsRead(input.id);
      }),
  }),

  // ============ OWNER AVAILABILITY ============
  availability: router({
    get: adminProcedure.query(async ({ ctx }) => {
      return await db.getOwnerAvailability(ctx.user.id);
    }),

    update: adminProcedure
      .input(
        z.array(
          z.object({
            dayOfWeek: z.number().min(0).max(6),
            startTime: z.string(),
            endTime: z.string(),
            isAvailable: z.boolean(),
          })
        )
      )
      .mutation(async ({ ctx, input }) => {
        return await db.updateOwnerAvailability(ctx.user.id, input);
      }),
  }),

  // ============ CLIENT FILES ============
  clientFiles: router({
    listByClient: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === "admin") {
        return [];
      }
      return await db.getClientFilesByClient(ctx.user.id);
    }),

    listForAdmin: adminProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        return await db.getClientFilesByClient(input.clientId);
      }),

    listByProject: adminProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getClientFilesByProject(input.projectId, ctx.user.id);
      }),

    upload: protectedProcedure
      .input(
        z.object({
          projectId: z.number().optional(),
          fileName: z.string().min(1),
          fileData: z.string(), // base64 encoded file data
          fileSize: z.number().max(1024 * 1024 * 1024), // 1GB max
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Validate PDF
        if (!input.fileName.toLowerCase().endsWith(".pdf")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only PDF files are accepted.",
          });
        }

        // Upload to S3
        const buffer = Buffer.from(input.fileData, "base64");
        const fileKey = `client-files/${ctx.user.id}/${Date.now()}-${input.fileName}`;
        const { key, url } = await storagePut(fileKey, buffer, "application/pdf");

        // Save metadata to database
        return await db.createClientFile({
          clientId: ctx.user.id,
          projectId: input.projectId,
          fileName: input.fileName,
          fileUrl: url,
          fileKey: key,
          fileSize: input.fileSize,
          mimeType: "application/pdf",
        });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return await db.deleteClientFile(input.id, ctx.user.id);
      }),
  }),

  // ============ VAULT SUBSCRIPTIONS ============
  vault: router({
    getSubscription: protectedProcedure.query(async ({ ctx }) => {
      // Admin preview mode returns null (no subscription to show)
      // Client users get their actual subscription
      if (ctx.user.role === "admin") {
        return null;
      }
      return await db.getVaultSubscription(ctx.user.id);
    }),

    // Admin can view all vault subscriptions
    listAll: adminProcedure.query(async () => {
      return await db.getAllVaultSubscriptions();
    }),

    createSubscription: protectedProcedure
      .input(
        z.object({
          tier: z.enum(["basic", "pro", "enterprise"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "client") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const storageLimits: Record<string, number> = {
          basic: 50 * 1024 * 1024 * 1024,
          pro: 500 * 1024 * 1024 * 1024,
          enterprise: 2000 * 1024 * 1024 * 1024,
        };
        return await db.createVaultSubscription({
          clientId: ctx.user.id,
          tier: input.tier,
          storageLimit: storageLimits[input.tier],
          startDate: new Date(),
        });
      }),

    cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "client") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return await db.cancelVaultSubscription(ctx.user.id);
    }),
  }),

  // ============ PORTAL (parent-facing) ============
  portal: router({
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
  }),

  // ============ CASE COMPASS ============
  caseCompass: router({
    // Admin: list all portal clients (users with role=client)
    portalClients: adminProcedure.query(async () => {
      return await db.getPortalClients();
    }),

    // Admin: get compass for a specific case
    get: adminProcedure
      .input(z.object({ caseId: z.string() }))
      .query(async ({ input }) => {
        return await db.getCaseCompass(input.caseId);
      }),

    // Admin: upsert compass (auto-snapshots old version)
    upsert: adminProcedure
      .input(
        z.object({
          caseId: z.string(),
          currentStatus: z.string().optional(),
          lastMeetingSummary: z.string().optional(),
          nextStep: z.string().optional(),
          whoHasBall: z.string().optional(),
          nextMeetingDate: z.date().optional().nullable(),
        })
      )
      .mutation(async ({ input }) => {
        const { caseId, ...data } = input;
        return await db.upsertCaseCompass(caseId, data);
      }),

    // Admin: get history for a specific case
    history: adminProcedure
      .input(z.object({ caseId: z.string() }))
      .query(async ({ input }) => {
        return await db.getCaseCompassHistory(input.caseId);
      }),

    // Client: get their own compass (looks up by portalUserId → caseId)
    myCompass: protectedProcedure.query(async ({ ctx }) => {
      // Find the contact linked to this portal user to get their caseId
      const contact = await db.getContactByPortalUserId(ctx.user.id);
      if (!contact?.caseId) return null;
      return await db.getCaseCompass(contact.caseId) ?? null;
    }),

    // Client: get their own compass history
    myHistory: protectedProcedure.query(async ({ ctx }) => {
      const contact = await db.getContactByPortalUserId(ctx.user.id);
      if (!contact?.caseId) return [];
      return await db.getCaseCompassHistory(contact.caseId);
    }),
  }),

  // ============ IEP DOCUMENTS ============
  iep: router({
    // Get IEP document record for a student (admin or parent portal)
    get: protectedProcedure
      .input(z.object({ contactId: z.number() }))
      .query(async ({ input }) => {
        const { iepDocuments } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const rows = await dbConn
          .select()
          .from(iepDocuments)
          .where(eq(iepDocuments.contactId, input.contactId))
          .limit(1);
        return rows[0] ?? null;
      }),

    // Admin or portal user uploads IEP for a student
    upload: protectedProcedure
      .input(z.object({
        contactId: z.number(),
        fileKey: z.string(),
        fileName: z.string(),
        fileUrl: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { iepDocuments, contacts } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        // Non-admin: verify student belongs to this portal user's parent
        if (ctx.user.role !== 'admin') {
          const parentContact = await dbConn
            .select()
            .from(contacts)
            .where(eq(contacts.portalUserId, ctx.user.id))
            .limit(1);
          if (parentContact.length === 0) throw new TRPCError({ code: 'FORBIDDEN' });
          const students = await dbConn
            .select()
            .from(contacts)
            .where(eq(contacts.parentContactId, parentContact[0].id));
          if (!students.map(s => s.id).includes(input.contactId)) {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
        }
        // Upsert with auto-archive
        const existing = await dbConn
          .select()
          .from(iepDocuments)
          .where(eq(iepDocuments.contactId, input.contactId))
          .limit(1);
        const now = new Date();
        if (existing.length > 0 && existing[0].currentFileKey) {
          await dbConn.update(iepDocuments).set({
            previousFileKey: existing[0].currentFileKey,
            previousFileName: existing[0].currentFileName,
            previousFileUrl: existing[0].currentFileUrl,
            previousUploadedAt: existing[0].currentUploadedAt,
            currentFileKey: input.fileKey,
            currentFileName: input.fileName,
            currentFileUrl: input.fileUrl,
            currentUploadedAt: now,
          }).where(eq(iepDocuments.contactId, input.contactId));
        } else if (existing.length > 0) {
          await dbConn.update(iepDocuments).set({
            currentFileKey: input.fileKey,
            currentFileName: input.fileName,
            currentFileUrl: input.fileUrl,
            currentUploadedAt: now,
          }).where(eq(iepDocuments.contactId, input.contactId));
        } else {
          await dbConn.insert(iepDocuments).values({
            contactId: input.contactId,
            currentFileKey: input.fileKey,
            currentFileName: input.fileName,
            currentFileUrl: input.fileUrl,
            currentUploadedAt: now,
          });
        }
        return { success: true };
      }),
    // ── Draft IEP History (completely separate from official IEP records) ──
    // Upload a draft IEP — creates a NEW row in draftIepHistory (never overwrites)
    uploadDraft: adminProcedure
      .input(z.object({
        contactId: z.number(),
        fileKey: z.string(),
        fileName: z.string(),
        fileUrl: z.string(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { draftIepHistory } = await import("../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await dbConn.insert(draftIepHistory).values({
          contactId: input.contactId,
          ownerId: ctx.user.id,
          fileKey: input.fileKey,
          fileName: input.fileName,
          fileUrl: input.fileUrl,
          notes: input.notes ?? null,
        });
        return { success: true };
      }),

    // List all draft IEP history entries for a student (newest first)
    listDraftHistory: adminProcedure
      .input(z.object({ contactId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { draftIepHistory } = await import("../drizzle/schema");
        const { eq: deq, desc: ddesc, and: dand } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        return await dbConn
          .select()
          .from(draftIepHistory)
          .where(dand(deq(draftIepHistory.contactId, input.contactId), deq(draftIepHistory.ownerId, ctx.user.id)))
          .orderBy(ddesc(draftIepHistory.uploadedAt));
      }),

    // Delete a specific draft history entry
    deleteDraftHistory: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { draftIepHistory } = await import("../drizzle/schema");
        const { eq: deq, and: dand } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await dbConn
          .delete(draftIepHistory)
          .where(dand(deq(draftIepHistory.id, input.id), deq(draftIepHistory.ownerId, ctx.user.id)));
        return { success: true };
      }),

    // Update notes on a specific draft history entry
    updateDraftNotes: adminProcedure
      .input(z.object({ id: z.number(), notes: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { draftIepHistory } = await import("../drizzle/schema");
        const { eq: deq, and: dand } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await dbConn
          .update(draftIepHistory)
          .set({ notes: input.notes })
          .where(dand(deq(draftIepHistory.id, input.id), deq(draftIepHistory.ownerId, ctx.user.id)));
        return { success: true };
      }),
  }),

  // ============ SESSION TYPES (SCHEDULER) ============
  sessionTypes: router({
    // List all session types for the owner
    list: adminProcedure.query(async ({ ctx }) => {
      const { sessionTypes } = await import("../drizzle/schema");
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("DB unavailable");
      const rows = await dbConn
        .select()
        .from(sessionTypes)
        .where(eq(sessionTypes.ownerId, ctx.user.id))
        .orderBy(asc(sessionTypes.createdAt));
      return rows;
    }),

    // Get a single session type
    get: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const { sessionTypes } = await import("../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("DB unavailable");
        const [row] = await dbConn
          .select()
          .from(sessionTypes)
          .where(and(eq(sessionTypes.id, input.id), eq(sessionTypes.ownerId, ctx.user.id)))
          .limit(1);
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });
        return row;
      }),

    // Create a new session type with standard defaults pre-filled
    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          description: z.string().optional(),
          sessionFormat: z.enum(["phone", "video"]).default("phone"),
          videoType: z.string().optional(),
          videoLink: z.string().optional(),
          timezone: z.string().default("America/New_York"),
          duration: z.number().default(60),
          durationUnit: z.enum(["minutes", "hours"]).default("minutes"),
          dateRange: z.enum(["rolling", "indefinitely", "fixed"]).default("indefinitely"),
          dateRangeDays: z.number().optional(),
          color: z.string().default("#e11d48"),
          instructions: z.string().optional(),
          confirmationMessage: z.string().optional(),
          bufferBefore: z.number().default(30),
          bufferBeforeUnit: z.enum(["minutes", "hours"]).default("minutes"),
          bufferAfter: z.number().default(6),
          bufferAfterUnit: z.enum(["minutes", "hours"]).default("hours"),
          minNotice: z.number().default(3),
          minNoticeUnit: z.enum(["minutes", "hours", "days"]).default("days"),
          customIncrements: z.number().default(15),
          teamMemberIds: z.string().optional(), // JSON array string
          weeklyHours: z.string().optional(),   // JSON object string
          reminderSettings: z.string().optional(), // JSON array string
          canReschedule: z.boolean().default(true),
          canCancel: z.boolean().default(false),
          sendConfirmationEmail: z.boolean().default(true),
          isActive: z.boolean().default(true),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { sessionTypes } = await import("../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("DB unavailable");

        // Standard default weekly hours: Mon/Tue/Thu/Fri 8am-5pm
        const defaultWeeklyHours = JSON.stringify({
          mon: [{ start: "08:00", end: "17:00" }],
          tue: [{ start: "08:00", end: "17:00" }],
          wed: [],
          thu: [{ start: "08:00", end: "17:00" }],
          fri: [{ start: "08:00", end: "17:00" }],
          sat: [],
          sun: [],
        });

        // Standard default reminders: 1hr before + 15min before
        const defaultReminders = JSON.stringify([
          { method: "both", amount: 1, unit: "hours", notifyOwner: true },
          { method: "both", amount: 15, unit: "minutes", notifyOwner: true },
        ]);

        const [result] = await dbConn.insert(sessionTypes).values({
          ownerId: ctx.user.id,
          ...input,
          weeklyHours: input.weeklyHours ?? defaultWeeklyHours,
          reminderSettings: input.reminderSettings ?? defaultReminders,
        });
        return { id: (result as any).insertId };
      }),

    // Update a session type
    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).max(255).optional(),
          description: z.string().optional(),
          sessionFormat: z.enum(["phone", "video"]).optional(),
          videoType: z.string().optional(),
          videoLink: z.string().optional(),
          timezone: z.string().optional(),
          duration: z.number().optional(),
          durationUnit: z.enum(["minutes", "hours"]).optional(),
          dateRange: z.enum(["rolling", "indefinitely", "fixed"]).optional(),
          dateRangeDays: z.number().optional(),
          color: z.string().optional(),
          instructions: z.string().optional(),
          confirmationMessage: z.string().optional(),
          bufferBefore: z.number().optional(),
          bufferBeforeUnit: z.enum(["minutes", "hours"]).optional(),
          bufferAfter: z.number().optional(),
          bufferAfterUnit: z.enum(["minutes", "hours"]).optional(),
          minNotice: z.number().optional(),
          minNoticeUnit: z.enum(["minutes", "hours", "days"]).optional(),
          customIncrements: z.number().optional(),
          teamMemberIds: z.string().optional(),
          weeklyHours: z.string().optional(),
          reminderSettings: z.string().optional(),
          canReschedule: z.boolean().optional(),
          canCancel: z.boolean().optional(),
          sendConfirmationEmail: z.boolean().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { sessionTypes } = await import("../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("DB unavailable");
        const { id, ...data } = input;
        await dbConn
          .update(sessionTypes)
          .set({ ...data, updatedAt: new Date() })
          .where(and(eq(sessionTypes.id, id), eq(sessionTypes.ownerId, ctx.user.id)));
        return { success: true };
      }),

    // Delete a session type
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { sessionTypes } = await import("../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("DB unavailable");
        await dbConn
          .delete(sessionTypes)
          .where(and(eq(sessionTypes.id, input.id), eq(sessionTypes.ownerId, ctx.user.id)));
        return { success: true };
      }),

    // Toggle active/inactive
    toggleActive: adminProcedure
      .input(z.object({ id: z.number(), isActive: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const { sessionTypes } = await import("../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("DB unavailable");
        await dbConn
          .update(sessionTypes)
          .set({ isActive: input.isActive, updatedAt: new Date() })
          .where(and(eq(sessionTypes.id, input.id), eq(sessionTypes.ownerId, ctx.user.id)));
        return { success: true };
      }),

    // Public: list active session types for a booking page (by ownerId)
    // Returns all active session types for the owner (no ownerId required — uses ENV owner)
    listAll: publicProcedure.query(async () => {
      const { sessionTypes, users } = await import("../drizzle/schema");
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("DB unavailable");
      let owner = await db.getUserByOpenId(ENV.ownerOpenId);
      // Fallback: if OWNER_OPEN_ID doesn't match, use the first admin user
      if (!owner) {
        const [firstAdmin] = await dbConn.select().from(users).where(eq(users.role, 'admin')).limit(1);
        owner = firstAdmin ?? null;
      }
      if (!owner) return [];
      const rows = await dbConn
        .select()
        .from(sessionTypes)
        .where(and(eq(sessionTypes.ownerId, owner.id), eq(sessionTypes.isActive, true)))
        .orderBy(asc(sessionTypes.createdAt));
      return rows;
    }),

    // Public: get a single session type by ID (for inline scheduler)
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const { sessionTypes } = await import("../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("DB unavailable");
        const [row] = await dbConn
          .select()
          .from(sessionTypes)
          .where(eq(sessionTypes.id, input.id))
          .limit(1);
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });
        return row;
      }),

    listPublic: publicProcedure
      .input(z.object({ ownerId: z.number() }))
      .query(async ({ input }) => {
        const { sessionTypes } = await import("../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("DB unavailable");
        const rows = await dbConn
          .select()
          .from(sessionTypes)
          .where(and(eq(sessionTypes.ownerId, input.ownerId), eq(sessionTypes.isActive, true)))
          .orderBy(asc(sessionTypes.createdAt));
        return rows;
      }),
  }),

  // ============ WEBHOOKS ============
  webhooks: router({
    list: adminProcedure.query(async ({ ctx }) => {
      return await db.getWebhooksByOwner(ctx.user.id);
    }),

    create: adminProcedure
      .input(
        z.object({
          eventType: z.string().min(1),
          targetUrl: z.string().url(),
          isActive: z.boolean().default(true),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await db.createWebhook(input, ctx.user.id);
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          eventType: z.string().optional(),
          targetUrl: z.string().url().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return await db.updateWebhook(id, ctx.user.id, data);
      }),
  }),

  // ── Workflows ──────────────────────────────────────────────────────────────
  workflows: router({
    list: protectedProcedure.query(async () => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { workflows } = await import("../drizzle/schema");
      return await database.select().from(workflows).orderBy(asc(workflows.createdAt));
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { workflows } = await import("../drizzle/schema");
        const [wf] = await database.select().from(workflows).where(eq(workflows.id, input.id));
        if (!wf) throw new TRPCError({ code: "NOT_FOUND" });
        return wf;
      }),

    create: adminProcedure
      .input(z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        category: z.string().optional(),
        color: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { workflows } = await import("../drizzle/schema");
        const [result] = await database.insert(workflows).values({ ...input, createdBy: ctx.user.id });
        return { id: (result as any).insertId };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        color: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { workflows } = await import("../drizzle/schema");
        const { id, ...data } = input;
        await database.update(workflows).set(data).where(eq(workflows.id, id));
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { workflows } = await import("../drizzle/schema");
        await database.delete(workflows).where(eq(workflows.id, input.id));
        return { success: true };
      }),

    saveCanvas: adminProcedure
      .input(z.object({
        id: z.number(),
        canvasData: z.string(),
      }))
      .mutation(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { workflows } = await import("../drizzle/schema");
        await database.update(workflows).set({ canvasData: input.canvasData }).where(eq(workflows.id, input.id));
        return { success: true };
      }),
  }),

  internalTasks: router({
    getTeamUsers: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role === "client") throw new TRPCError({ code: "FORBIDDEN", message: "Clients cannot access internal tasks" });
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { users } = await import("../drizzle/schema");
        return database.select({ id: users.id, name: users.name, role: users.role }).from(users)
          .then(rows => rows.filter(u => u.role !== "client"));
      }),

    // Returns all students that have at least one file, for task file picker
    getStudentsWithFiles: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role === "client") throw new TRPCError({ code: "FORBIDDEN", message: "Clients cannot access internal tasks" });
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { contacts, clientFiles } = await import("../drizzle/schema");
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
        const { internalTasks, internalSubtasks, users, projects, contacts } = await import("../drizzle/schema");
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
        const { internalTasks } = await import("../drizzle/schema");
        const [result] = await database.insert(internalTasks).values({
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
        return { id: (result as any).insertId };
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
        const { internalTasks } = await import("../drizzle/schema");
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
        const { internalTasks, internalSubtasks } = await import("../drizzle/schema");
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
        const { internalTasks } = await import("../drizzle/schema");
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
        const { internalTasks } = await import("../drizzle/schema");
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
        const { internalSubtasks } = await import("../drizzle/schema");
        const existing = await database.select({ id: internalSubtasks.id }).from(internalSubtasks).where(eq(internalSubtasks.taskId, input.taskId));
        const [result] = await database.insert(internalSubtasks).values({
          taskId: input.taskId,
          title: input.title,
          isComplete: false,
          assigneeId: input.assigneeId,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
          resources: "[]",
          sortOrder: existing.length,
        });
        return { id: (result as any).insertId };
      }),

    toggleSubtask: protectedProcedure
      .input(z.object({ subtaskId: z.number(), isComplete: z.boolean() }))
      .mutation(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { internalSubtasks, internalTasks } = await import("../drizzle/schema");
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
        const { internalSubtasks } = await import("../drizzle/schema");
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
        const { internalSubtasks } = await import("../drizzle/schema");
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
        const { internalSubtasks } = await import("../drizzle/schema");
        const [sub] = await database.select({ resources: internalSubtasks.resources }).from(internalSubtasks).where(eq(internalSubtasks.id, input.subtaskId));
        if (!sub) throw new TRPCError({ code: "NOT_FOUND" });
        const resources = (sub.resources ? JSON.parse(sub.resources) : []).filter((r: any) => r.id !== input.resourceId);
        await database.update(internalSubtasks).set({ resources: JSON.stringify(resources) }).where(eq(internalSubtasks.id, input.subtaskId));
        return { success: true };
      }),
  }),

  // ============ KNOWLEDGE BASE ============
  knowledgeBase: router({
    list: adminProcedure
      .input(z.object({
        category: z.string().optional(),
        search: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { knowledgeBase } = await import("../drizzle/schema");
        const { like, and: dbAnd, eq: dbEq } = await import("drizzle-orm");
        const conditions: any[] = [dbEq(knowledgeBase.ownerId, ctx.user.id)];
        if (input.category && input.category !== "All") {
          conditions.push(dbEq(knowledgeBase.category, input.category));
        }
        if (input.search) {
          conditions.push(like(knowledgeBase.title, `%${input.search}%`));
        }
        return await database
          .select()
          .from(knowledgeBase)
          .where(dbAnd(...conditions))
          .orderBy(desc(knowledgeBase.createdAt));
      }),

    upload: adminProcedure
      .input(z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        category: z.string().default("Other"),
        fileName: z.string().min(1),
        fileSize: z.number().optional(),
        fileData: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { knowledgeBase } = await import("../drizzle/schema");
        const fileBuffer = Buffer.from(input.fileData, "base64");
        const fileKey = `kb/${ctx.user.id}/${Date.now()}-${input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { storagePut } = await import("./storage");
        const { url } = await storagePut(fileKey, fileBuffer, "application/pdf");
        const [result] = await database.insert(knowledgeBase).values({
          ownerId: ctx.user.id,
          title: input.title,
          description: input.description || null,
          category: input.category,
          fileKey,
          fileUrl: url,
          fileName: input.fileName,
          fileSize: input.fileSize || fileBuffer.length,
        });
        return { success: true, id: (result as any).insertId, url };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { knowledgeBase } = await import("../drizzle/schema");
        const { eq: dbEq } = await import("drizzle-orm");
        const [doc] = await database.select().from(knowledgeBase).where(dbEq(knowledgeBase.id, input.id));
        if (!doc || doc.ownerId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        await database.delete(knowledgeBase).where(dbEq(knowledgeBase.id, input.id));
        return { success: true };
      }),

    categories: adminProcedure.query(() => {
      return ["Law Books", "Test Books", "OSEP Letters", "Work Documents", "Other"] as const;
    }),
  }),

  // ============ TIME TRACKER ============
  timeTracker: router({
    // Get the currently running (open) entry for a student
    getActive: adminProcedure
      .input(z.object({ studentId: z.number() }))
      .query(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { timeEntries } = await import("../drizzle/schema");
        const { eq: dbEq, and: dbAnd, isNull } = await import("drizzle-orm");
        const [active] = await database
          .select()
          .from(timeEntries)
          .where(dbAnd(
            dbEq(timeEntries.studentId, input.studentId),
            dbEq(timeEntries.ownerId, ctx.user.id),
            isNull(timeEntries.endedAt)
          ))
          .limit(1);
        return active ?? null;
      }),

    // Start a new timer
    start: adminProcedure
      .input(z.object({ studentId: z.number(), hourlyRate: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { timeEntries, contacts } = await import("../drizzle/schema");
        const { eq: dbEq, and: dbAnd, isNull } = await import("drizzle-orm");
        // Stop any existing open entry first
        const now = Date.now();
        const [existing] = await database
          .select()
          .from(timeEntries)
          .where(dbAnd(
            dbEq(timeEntries.studentId, input.studentId),
            dbEq(timeEntries.ownerId, ctx.user.id),
            isNull(timeEntries.endedAt)
          ))
          .limit(1);
        if (existing) {
          const dur = Math.round((now - existing.startedAt) / 1000);
          await database.update(timeEntries)
            .set({ endedAt: now, durationSeconds: dur })
            .where(dbEq(timeEntries.id, existing.id));
        }
        // Get student's hourly rate if not provided
        let rate = input.hourlyRate;
        if (!rate) {
          const [student] = await database.select({ hourlyRate: contacts.hourlyRate }).from(contacts).where(dbEq(contacts.id, input.studentId));
          rate = student?.hourlyRate ?? undefined;
        }
        const [result] = await database.insert(timeEntries).values({
          studentId: input.studentId,
          ownerId: ctx.user.id,
          startedAt: now,
          hourlyRate: rate ?? null,
          billable: true,
          invoiced: false,
        });
        return { success: true, id: (result as any).insertId, startedAt: now };
      }),

    // Stop the running timer
    stop: adminProcedure
      .input(z.object({ entryId: z.number(), notes: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { timeEntries } = await import("../drizzle/schema");
        const { eq: dbEq } = await import("drizzle-orm");
        const [entry] = await database.select().from(timeEntries).where(dbEq(timeEntries.id, input.entryId));
        if (!entry || entry.ownerId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        if (entry.endedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Timer already stopped" });
        const now = Date.now();
        const dur = Math.round((now - entry.startedAt) / 1000);
        await database.update(timeEntries)
          .set({ endedAt: now, durationSeconds: dur, notes: input.notes ?? entry.notes })
          .where(dbEq(timeEntries.id, input.entryId));
        return { success: true, durationSeconds: dur };
      }),

    // List all entries for a student
    list: adminProcedure
      .input(z.object({ studentId: z.number() }))
      .query(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { timeEntries } = await import("../drizzle/schema");
        const { eq: dbEq, and: dbAnd, isNotNull } = await import("drizzle-orm");
        return await database
          .select()
          .from(timeEntries)
          .where(dbAnd(
            dbEq(timeEntries.studentId, input.studentId),
            dbEq(timeEntries.ownerId, ctx.user.id),
            isNotNull(timeEntries.endedAt)
          ))
          .orderBy(desc(timeEntries.startedAt));
      }),

    // Update notes on an entry
    updateNotes: adminProcedure
      .input(z.object({ entryId: z.number(), notes: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { timeEntries } = await import("../drizzle/schema");
        const { eq: dbEq } = await import("drizzle-orm");
        const [entry] = await database.select().from(timeEntries).where(dbEq(timeEntries.id, input.entryId));
        if (!entry || entry.ownerId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        await database.update(timeEntries).set({ notes: input.notes }).where(dbEq(timeEntries.id, input.entryId));
        return { success: true };
      }),

    // Toggle billable / invoiced flags
    toggleFlag: adminProcedure
      .input(z.object({ entryId: z.number(), field: z.enum(["billable", "invoiced"]), value: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { timeEntries } = await import("../drizzle/schema");
        const { eq: dbEq } = await import("drizzle-orm");
        const [entry] = await database.select().from(timeEntries).where(dbEq(timeEntries.id, input.entryId));
        if (!entry || entry.ownerId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        await database.update(timeEntries)
          .set(input.field === "billable" ? { billable: input.value } : { invoiced: input.value })
          .where(dbEq(timeEntries.id, input.entryId));
        return { success: true };
      }),

    // Delete an entry
    delete: adminProcedure
      .input(z.object({ entryId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { timeEntries } = await import("../drizzle/schema");
        const { eq: dbEq } = await import("drizzle-orm");
        const [entry] = await database.select().from(timeEntries).where(dbEq(timeEntries.id, input.entryId));
        if (!entry || entry.ownerId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        await database.delete(timeEntries).where(dbEq(timeEntries.id, input.entryId));
        return { success: true };
      }),

    // Set hourly rate on a student contact
    setHourlyRate: adminProcedure
      .input(z.object({ studentId: z.number(), hourlyRate: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { contacts } = await import("../drizzle/schema");
        const { eq: dbEq } = await import("drizzle-orm");
        await database.update(contacts)
          .set({ hourlyRate: input.hourlyRate })
          .where(dbEq(contacts.id, input.studentId));
        return { success: true };
      }),
  }),

  // ============ WALKTHROUGHS (SOP) ============
  walkthroughs: router({
    list: adminProcedure
      .input(z.object({ category: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { walkthroughs } = await import("../drizzle/schema");
        const { eq: dbEq } = await import("drizzle-orm");
        const rows = await database.select().from(walkthroughs).where(dbEq(walkthroughs.ownerId, ctx.user.id));
        if (input.category && input.category !== "All") {
          return rows.filter((r) => r.category === input.category);
        }
        return rows;
      }),

    create: adminProcedure
      .input(z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        category: z.string().default("General"),
        steps: z.array(z.object({
          id: z.string(),
          title: z.string(),
          instructions: z.string(),
          script: z.string().optional(),
          notes: z.string().optional(),
          order: z.number(),
        })).default([]),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { walkthroughs } = await import("../drizzle/schema");
        const [result] = await database.insert(walkthroughs).values({
          ownerId: ctx.user.id,
          title: input.title,
          description: input.description ?? null,
          category: input.category,
          steps: input.steps,
        });
        return { id: (result as any).insertId };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        steps: z.array(z.object({
          id: z.string(),
          title: z.string(),
          instructions: z.string(),
          script: z.string().optional(),
          notes: z.string().optional(),
          order: z.number(),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { walkthroughs } = await import("../drizzle/schema");
        const { eq: dbEq } = await import("drizzle-orm");
        const updates: Record<string, any> = {};
        if (input.title !== undefined) updates.title = input.title;
        if (input.description !== undefined) updates.description = input.description;
        if (input.category !== undefined) updates.category = input.category;
        if (input.steps !== undefined) updates.steps = input.steps;
        await database.update(walkthroughs).set(updates).where(dbEq(walkthroughs.id, input.id));
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { walkthroughs, walkthroughRuns } = await import("../drizzle/schema");
        const { eq: dbEq } = await import("drizzle-orm");
        await database.delete(walkthroughRuns).where(dbEq(walkthroughRuns.walkthroughId, input.id));
        await database.delete(walkthroughs).where(dbEq(walkthroughs.id, input.id));
        return { success: true };
      }),

    startRun: adminProcedure
      .input(z.object({ walkthroughId: z.number(), studentId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { walkthroughRuns } = await import("../drizzle/schema");
        const [result] = await database.insert(walkthroughRuns).values({
          walkthroughId: input.walkthroughId,
          studentId: input.studentId ?? null,
          ownerId: ctx.user.id,
          completedSteps: [],
          status: "in_progress",
        });
        return { id: (result as any).insertId };
      }),

    updateRun: adminProcedure
      .input(z.object({
        runId: z.number(),
        completedSteps: z.array(z.string()),
        status: z.enum(["in_progress", "completed", "abandoned"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { walkthroughRuns } = await import("../drizzle/schema");
        const { eq: dbEq } = await import("drizzle-orm");
        const updates: Record<string, any> = { completedSteps: input.completedSteps };
        if (input.status) updates.status = input.status;
        if (input.status === "completed") updates.completedAt = new Date();
        if (input.notes !== undefined) updates.notes = input.notes;
        await database.update(walkthroughRuns).set(updates).where(dbEq(walkthroughRuns.id, input.runId));
        return { success: true };
      }),

    listRuns: adminProcedure
      .input(z.object({ studentId: z.number().optional(), walkthroughId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { walkthroughRuns, walkthroughs } = await import("../drizzle/schema");
        const { eq: dbEq, and: dbAnd } = await import("drizzle-orm");
        const conditions: any[] = [dbEq(walkthroughRuns.ownerId, ctx.user.id)];
        if (input.studentId) conditions.push(dbEq(walkthroughRuns.studentId, input.studentId));
        if (input.walkthroughId) conditions.push(dbEq(walkthroughRuns.walkthroughId, input.walkthroughId));
        const runs = await database
          .select()
          .from(walkthroughRuns)
          .where(dbAnd(...conditions))
          .orderBy(walkthroughRuns.startedAt);
        return runs;
      }),
  }),

  // ============ AI ASSISTANT ============
  ai: router({
    chat: protectedProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(["user", "assistant", "system"]),
          content: z.string(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const { invokeLLM } = await import("./_core/llm");
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { contacts, internalTasks, appointments } = await import("../drizzle/schema");
        const { eq: dbEq, and: dbAnd } = await import("drizzle-orm");
        const todayStart = new Date(); todayStart.setHours(0,0,0,0);
        const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
        // Today's appointments
        const allAppts = await database
          .select({ id: appointments.id, title: appointments.title, startTime: appointments.startTime, endTime: appointments.endTime, status: appointments.status })
          .from(appointments)
          .where(dbEq(appointments.ownerId, ctx.user.id))
          .limit(30);
        const todayAppts = allAppts.filter(a => {
          const d = new Date(a.startTime);
          return d >= todayStart && d <= todayEnd;
        });
        // Tasks
        const allTasks = await database
          .select({ id: internalTasks.id, title: internalTasks.title, status: internalTasks.status, dueDate: internalTasks.dueDate, linkedStudentName: internalTasks.linkedStudentName })
          .from(internalTasks)
          .where(dbEq(internalTasks.createdBy, ctx.user.id))
          .limit(100);
        const overdueTasks = allTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "complete");
        const openTasks = allTasks.filter(t => t.status !== "complete");
        // Students
        const students = await database
          .select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName, caseId: contacts.caseId })
          .from(contacts)
          .where(dbAnd(dbEq(contacts.ownerId, ctx.user.id), dbEq(contacts.jobTitle, "Student")))
          .limit(30);
        const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
        const apptLines = todayAppts.length === 0 ? "None scheduled today." : todayAppts.map(a => "- " + a.title + " at " + new Date(a.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) + " [" + a.status + "]").join("\n");
        const overdueLines = overdueTasks.length === 0 ? "No overdue tasks." : overdueTasks.slice(0, 10).map(t => "- " + t.title + (t.dueDate ? " (due " + new Date(t.dueDate).toLocaleDateString() + ")" : "") + (t.linkedStudentName ? " — Student: " + t.linkedStudentName : "")).join("\n");
        const openLines = openTasks.length === 0 ? "No open tasks." : openTasks.slice(0, 15).map(t => "- [" + t.status + "] " + t.title + (t.dueDate ? " (due " + new Date(t.dueDate).toLocaleDateString() + ")" : "") + (t.linkedStudentName ? " — " + t.linkedStudentName : "")).join("\n");
        const studentLines = students.map(s => "- " + s.firstName + " " + s.lastName + " (Case: " + (s.caseId ?? "N/A") + ")").join("\n");
        const contextBlock = "Today is " + dateStr + ".\n\nTODAY'S APPOINTMENTS (" + todayAppts.length + "):\n" + apptLines + "\n\nOVERDUE TASKS (" + overdueTasks.length + "):\n" + overdueLines + "\n\nALL OPEN TASKS (" + openTasks.length + "):\n" + openLines + "\n\nACTIVE STUDENTS (" + students.length + "):\n" + studentLines;
        const systemPrompt = "You are an AI assistant for a special education advocacy CRM called Waypoint Advocates. You help advocates manage their caseload, stay on top of tasks, and support families navigating the IEP process.\n\nYou have access to the following live data from the CRM:\n\n" + contextBlock + "\n\nGuidelines:\n- Be concise, warm, and professional\n- When asked about tasks, meetings, or students, reference the actual data above\n- For prioritization questions, consider overdue items and today's schedule first\n- You can suggest next steps, draft messages, or summarize case status\n- If asked about something not in the data, say so honestly";
        const llmMessages = [
          { role: "system" as const, content: systemPrompt },
          ...input.messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        ];
        const response = await invokeLLM({ messages: llmMessages });
        const reply = (response.choices?.[0]?.message?.content as string) ?? "I couldn't generate a response. Please try again.";
        return { reply };
      }),
    dailyBriefing: protectedProcedure
      .query(async ({ ctx }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { internalTasks, appointments } = await import("../drizzle/schema");
        const { eq: dbEq } = await import("drizzle-orm");
        const todayStart = new Date(); todayStart.setHours(0,0,0,0);
        const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
        const allAppts = await database
          .select({ id: appointments.id, title: appointments.title, startTime: appointments.startTime, endTime: appointments.endTime, status: appointments.status })
          .from(appointments)
          .where(dbEq(appointments.ownerId, ctx.user.id))
          .limit(30);
        const todayAppts = allAppts.filter(a => {
          const d = new Date(a.startTime);
          return d >= todayStart && d <= todayEnd;
        });
        const allTasks = await database
          .select({ id: internalTasks.id, title: internalTasks.title, status: internalTasks.status, dueDate: internalTasks.dueDate, linkedStudentName: internalTasks.linkedStudentName })
          .from(internalTasks)
          .where(dbEq(internalTasks.createdBy, ctx.user.id))
          .limit(100);
        const overdueTasks = allTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "complete");
        const dueTodayTasks = allTasks.filter(t => {
          if (!t.dueDate || t.status === "complete") return false;
          const d = new Date(t.dueDate);
          return d >= todayStart && d <= todayEnd;
        });
        const openCount = allTasks.filter(t => t.status !== "complete").length;
        return {
          todayAppointments: todayAppts,
          overdueTasks,
          dueTodayTasks,
          openTaskCount: openCount,
          date: new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
        };
      }),
  }),


  callLogs: router({
    // List call logs for a specific student
    listByStudent: protectedProcedure
      .input(z.object({ studentId: z.number() }))
      .query(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { callLogs } = await import("../drizzle/schema");
        return await database
          .select()
          .from(callLogs)
          .where(and(eq(callLogs.ownerId, ctx.user.id), eq(callLogs.studentId, input.studentId)))
          .orderBy(desc(callLogs.createdAt));
      }),

    // List ALL call logs (for the full call log view with filters)
    listAll: protectedProcedure
      .input(z.object({
        filter: z.enum(["all", "unassigned", "calls", "voicemails", "sms"]).optional().default("all"),
        limit: z.number().min(1).max(200).optional().default(50),
      }).optional())
      .query(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { callLogs } = await import("../drizzle/schema");
        const filter = input?.filter ?? "all";
        const limit = input?.limit ?? 50;
        const conditions = [eq(callLogs.ownerId, ctx.user.id)];
        if (filter === "unassigned") conditions.push(eq(callLogs.status, "unassigned"));
        if (filter === "voicemails") conditions.push(eq(callLogs.isVoicemail, true));
        if (filter === "sms") conditions.push(eq(callLogs.eventType, "message.received"));
        if (filter === "calls") {
          const { or, isNull, ne } = await import("drizzle-orm");
          return await database.select().from(callLogs)
            .where(and(eq(callLogs.ownerId, ctx.user.id), or(isNull(callLogs.eventType), ne(callLogs.eventType, "message.received"))))
            .orderBy(desc(callLogs.createdAt)).limit(limit);
        }
        return await database.select().from(callLogs)
          .where(and(...conditions))
          .orderBy(desc(callLogs.createdAt)).limit(limit);
      }),
    // List unassigned call logs (no student matched)
    listUnassigned: protectedProcedure.query(async ({ ctx }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { callLogs } = await import("../drizzle/schema");
      return await database
        .select()
        .from(callLogs)
        .where(and(eq(callLogs.ownerId, ctx.user.id), eq(callLogs.status, "unassigned")))
        .orderBy(desc(callLogs.createdAt));
    }),

    // Assign an unassigned call log to a student
    assign: protectedProcedure
      .input(z.object({ callLogId: z.number(), studentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { callLogs } = await import("../drizzle/schema");
        await database
          .update(callLogs)
          .set({ studentId: input.studentId, status: "assigned", assignedAt: new Date() })
          .where(and(eq(callLogs.id, input.callLogId), eq(callLogs.ownerId, ctx.user.id)));
        return { success: true };
      }),

    // Delete a call log
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { callLogs } = await import("../drizzle/schema");
        await database
          .delete(callLogs)
          .where(and(eq(callLogs.id, input.id), eq(callLogs.ownerId, ctx.user.id)));
        return { success: true };
      }),

    // Get unassigned count (for sidebar badge)
    unassignedCount: protectedProcedure.query(async ({ ctx }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { callLogs } = await import("../drizzle/schema");
      const rows = await database
        .select({ id: callLogs.id })
        .from(callLogs)
        .where(and(eq(callLogs.ownerId, ctx.user.id), eq(callLogs.status, "unassigned")));
      return { count: rows.length };
    }),
  }),

  // ============ TEAM MANAGEMENT ============
  team: router({
    // List all accepted team members for this owner
    listMembers: adminProcedure.query(async ({ ctx }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { teamInvites, users } = await import("../drizzle/schema");
      const { eq: teq, and: tand } = await import("drizzle-orm");
      const rows = await database
        .select({
          inviteId: teamInvites.id,
          email: teamInvites.email,
          name: teamInvites.name,
          role: teamInvites.role,
          acceptedAt: teamInvites.acceptedAt,
          acceptedUserId: teamInvites.acceptedUserId,
          userName: users.name,
          userEmail: users.email,
        })
        .from(teamInvites)
        .leftJoin(users, teq(users.id, teamInvites.acceptedUserId))
        .where(tand(teq(teamInvites.ownerId, ctx.user.id), teq(teamInvites.status, "accepted")));
      return rows;
    }),

    // List all pending and revoked invites
    listInvites: adminProcedure.query(async ({ ctx }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { teamInvites } = await import("../drizzle/schema");
      const { eq: teq, and: tand, ne } = await import("drizzle-orm");
      return await database
        .select()
        .from(teamInvites)
        .where(tand(teq(teamInvites.ownerId, ctx.user.id), ne(teamInvites.status, "accepted")))
        .orderBy(desc(teamInvites.createdAt));
    }),

    // Create a new invite — returns the invite link token
    invite: adminProcedure
      .input(z.object({
        email: z.string().email(),
        name: z.string().optional(),
        role: z.enum(["admin", "member"]).default("member"),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { teamInvites } = await import("../drizzle/schema");
        const { eq: teq, and: tand } = await import("drizzle-orm");
        // Check if a pending invite already exists for this email
        const existing = await database
          .select()
          .from(teamInvites)
          .where(tand(teq(teamInvites.ownerId, ctx.user.id), teq(teamInvites.email, input.email), teq(teamInvites.status, "pending")))
          .limit(1);
        if (existing.length > 0) {
          return { token: existing[0].token, alreadyExists: true };
        }
        // Generate a secure random token
        const crypto = await import("crypto");
        const token = crypto.randomBytes(32).toString("hex");
        await database.insert(teamInvites).values({
          ownerId: ctx.user.id,
          email: input.email,
          name: input.name ?? null,
          role: input.role,
          token,
          status: "pending",
        });
        return { token, alreadyExists: false };
      }),

    // Revoke a pending invite
    revokeInvite: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { teamInvites } = await import("../drizzle/schema");
        const { eq: teq, and: tand } = await import("drizzle-orm");
        await database
          .update(teamInvites)
          .set({ status: "revoked" })
          .where(tand(teq(teamInvites.id, input.id), teq(teamInvites.ownerId, ctx.user.id)));
        return { success: true };
      }),

    // Remove an accepted team member
    removeMember: adminProcedure
      .input(z.object({ inviteId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { teamInvites } = await import("../drizzle/schema");
        const { eq: teq, and: tand } = await import("drizzle-orm");
        await database
          .delete(teamInvites)
          .where(tand(teq(teamInvites.id, input.inviteId), teq(teamInvites.ownerId, ctx.user.id)));
        return { success: true };
      }),

    // Update a member's role
    updateRole: adminProcedure
      .input(z.object({ inviteId: z.number(), role: z.enum(["admin", "member"]) }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { teamInvites } = await import("../drizzle/schema");
        const { eq: teq, and: tand } = await import("drizzle-orm");
        await database
          .update(teamInvites)
          .set({ role: input.role })
          .where(tand(teq(teamInvites.id, input.inviteId), teq(teamInvites.ownerId, ctx.user.id)));
        return { success: true };
      }),

    // Public: accept an invite by token (called from invite link)
    acceptInvite: publicProcedure
      .input(z.object({ token: z.string(), userId: z.number() }))
      .mutation(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { teamInvites } = await import("../drizzle/schema");
        const { eq: teq } = await import("drizzle-orm");
        const invite = await database
          .select()
          .from(teamInvites)
          .where(teq(teamInvites.token, input.token))
          .limit(1);
        if (invite.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });
        if (invite[0].status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Invite is no longer valid" });
        await database
          .update(teamInvites)
          .set({ status: "accepted", acceptedUserId: input.userId, acceptedAt: new Date() })
          .where(teq(teamInvites.token, input.token));
        return { success: true, ownerId: invite[0].ownerId, role: invite[0].role };
      }),

    // Get invite details by token (for the accept page)
    getInvite: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { teamInvites } = await import("../drizzle/schema");
        const { eq: teq } = await import("drizzle-orm");
        const rows = await database
          .select()
          .from(teamInvites)
          .where(teq(teamInvites.token, input.token))
          .limit(1);
        return rows[0] ?? null;
      }),

    // ── Case Assignments (participant bar on student detail) ──
    // List all team members assigned to a specific case/contact
    listCaseAssignments: adminProcedure
      .input(z.object({ contactId: z.number() }))
      .query(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { caseAssignments, teamInvites } = await import("../drizzle/schema");
        const { eq: ceq, and: cand } = await import("drizzle-orm");
        return await database
          .select({
            assignmentId: caseAssignments.id,
            teamInviteId: caseAssignments.teamInviteId,
            assignedAt: caseAssignments.assignedAt,
            memberName: teamInvites.name,
            memberEmail: teamInvites.email,
            memberRole: teamInvites.role,
          })
          .from(caseAssignments)
          .innerJoin(teamInvites, ceq(teamInvites.id, caseAssignments.teamInviteId))
          .where(cand(
            ceq(caseAssignments.contactId, input.contactId),
            ceq(caseAssignments.assignedBy, ctx.user.id)
          ));
      }),

    // Assign a team member to a case
    assignToCase: adminProcedure
      .input(z.object({ contactId: z.number(), teamInviteId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { caseAssignments } = await import("../drizzle/schema");
        const { eq: ceq, and: cand } = await import("drizzle-orm");
        // Avoid duplicate assignments
        const existing = await database
          .select()
          .from(caseAssignments)
          .where(cand(
            ceq(caseAssignments.contactId, input.contactId),
            ceq(caseAssignments.teamInviteId, input.teamInviteId)
          ))
          .limit(1);
        if (existing.length > 0) return { success: true, alreadyAssigned: true };
        await database.insert(caseAssignments).values({
          contactId: input.contactId,
          teamInviteId: input.teamInviteId,
          assignedBy: ctx.user.id,
        });
        return { success: true, alreadyAssigned: false };
      }),

    // Remove a team member from a case
    removeFromCase: adminProcedure
      .input(z.object({ contactId: z.number(), teamInviteId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { caseAssignments } = await import("../drizzle/schema");
        const { eq: ceq, and: cand } = await import("drizzle-orm");
        await database
          .delete(caseAssignments)
          .where(cand(
            ceq(caseAssignments.contactId, input.contactId),
            ceq(caseAssignments.teamInviteId, input.teamInviteId),
            ceq(caseAssignments.assignedBy, ctx.user.id)
          ));
        return { success: true };
      }),
  }),

  // ============ STATE COMPLAINT BUILDER ============
  stateComplaint: router({
    generate: protectedProcedure
      .input(z.object({
        contactId: z.number(),
        violationSummary: z.string().min(10),
        desiredResolution: z.string().min(10),
        additionalContext: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { contacts, iepDocuments } = await import("../drizzle/schema");
        const { eq: ceq, and: cand } = await import("drizzle-orm");

        const [student] = await database
          .select()
          .from(contacts)
          .where(cand(ceq(contacts.id, input.contactId), ceq(contacts.ownerId, ctx.user.id)))
          .limit(1);
        if (!student) throw new TRPCError({ code: "NOT_FOUND", message: "Student not found" });

        const [iep] = await database
          .select()
          .from(iepDocuments)
          .where(ceq(iepDocuments.contactId, input.contactId))
          .limit(1);

        const studentName = `${student.firstName} ${student.lastName}`;
        const iepContext = iep?.currentFileName
          ? `The student has a current IEP on file: "${iep.currentFileName}".`
          : "No IEP document is currently on file.";

        const { invokeLLM } = await import("./_core/llm");
        const systemContent: string = `You are an expert special education advocate helping draft a formal state complaint letter to a State Education Agency (SEA) under IDEA (Individuals with Disabilities Education Act). Your output must be a complete, professional, and legally structured state complaint document. Use clear section headers. Be specific, cite IDEA regulations where applicable (e.g., 34 CFR Part 300), and maintain a formal but assertive tone. Do not include placeholder brackets — write complete sentences using the information provided.`;
        const userContent: string = `Please draft a formal state complaint for the following student:\n\nStudent Name: ${studentName}\n${student.caseId ? `Case ID: ${student.caseId}` : ""}\n${iepContext}\n\nAlleged Violations / Summary of Concerns:\n${input.violationSummary}\n\nDesired Resolution:\n${input.desiredResolution}\n\n${input.additionalContext ? `Additional Context:\n${input.additionalContext}` : ""}\n\nPlease structure the complaint with the following sections:\n1. Introduction & Parties\n2. Jurisdiction & Legal Basis\n3. Statement of Facts\n4. Alleged Violations (cite specific IDEA regulations)\n5. Requested Relief / Corrective Actions\n6. Conclusion`;
        const response = await invokeLLM({
          messages: [
            { role: "system" as const, content: systemContent },
            { role: "user" as const, content: userContent },
          ],
        });

        const rawContent = response?.choices?.[0]?.message?.content;
        const content = typeof rawContent === "string" ? rawContent : Array.isArray(rawContent) ? rawContent.map((p: any) => p.text ?? "").join("") : "";
        return { complaint: content, studentName };
      }),
  }),

  // ─── BrainDump ────────────────────────────────────────────────────────────
  brainDump: router({
    list: protectedProcedure
      .input(z.object({
        category: z.string().optional(),
        status: z.enum(["not_started", "in_progress", "done", "archived"]).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        search: z.string().optional(),
        pinnedOnly: z.boolean().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const { brainDumpItems: bdi } = await import("../drizzle/schema");
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
      const { brainDumpItems: bdi } = await import("../drizzle/schema");
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
        const { brainDumpItems: bdi } = await import("../drizzle/schema");
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
        return { id: (result as any).insertId };
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
        const { brainDumpItems: bdi } = await import("../drizzle/schema");
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
        const { brainDumpItems: bdi } = await import("../drizzle/schema");
        const { eq: beq, and: band } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await dbConn.delete(bdi).where(band(beq(bdi.id, input.id), beq(bdi.ownerId, ctx.user.id)));
        return { ok: true };
      }),
  }),

  // ============ BILL GUARDIAN™ ============
  billGuardian: router({
    // ── Accounts
    listAccounts: protectedProcedure.query(async ({ ctx }) => {
      const { billGuardianAccounts: bga } = await import("../drizzle/schema");
      const { eq: geq } = await import("drizzle-orm");
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return dbConn.select().from(bga).where(geq(bga.ownerId, ctx.user.id)).orderBy(bga.createdAt);
    }),
    addAccount: protectedProcedure
      .input(z.object({ bankName: z.string(), accountName: z.string(), accountType: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const { billGuardianAccounts: bga } = await import("../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await dbConn.insert(bga).values({ ownerId: ctx.user.id, bankName: input.bankName, accountName: input.accountName, accountType: input.accountType || "checking" });
        return { ok: true };
      }),
    deleteAccount: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { billGuardianAccounts: bga } = await import("../drizzle/schema");
        const { eq: geq, and: gand } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await dbConn.delete(bga).where(gand(geq(bga.id, input.id), geq(bga.ownerId, ctx.user.id)));
        return { ok: true };
      }),

    // ── Bills
    listBills: protectedProcedure.query(async ({ ctx }) => {
      const { billGuardianBills: bgb } = await import("../drizzle/schema");
      const { eq: beq } = await import("drizzle-orm");
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return dbConn.select().from(bgb).where(beq(bgb.ownerId, ctx.user.id)).orderBy(bgb.dueDay);
    }),
    createBill: protectedProcedure
      .input(z.object({
        vendorName: z.string(),
        vendorAliases: z.array(z.string()).optional(),
        expectedAmount: z.string(),
        dueDay: z.number().min(1).max(31),
        frequency: z.enum(["monthly", "quarterly", "annual", "weekly"]).default("monthly"),
        category: z.string().default("General"),
        autopay: z.boolean().default(false),
        priority: z.enum(["critical", "high", "medium", "low"]).default("medium"),
        notes: z.string().optional(),
        paymentLink: z.string().optional(),
        paymentLinkNote: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { billGuardianBills: bgb } = await import("../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { vendorAliases, ...rest } = input;
        await dbConn.insert(bgb).values({ ...rest, ownerId: ctx.user.id, vendorAliases: vendorAliases ? JSON.stringify(vendorAliases) : null });
        return { ok: true };
      }),
    updateBill: protectedProcedure
      .input(z.object({
        id: z.number(),
        vendorName: z.string().optional(),
        vendorAliases: z.array(z.string()).optional(),
        expectedAmount: z.string().optional(),
        dueDay: z.number().min(1).max(31).optional(),
        frequency: z.enum(["monthly", "quarterly", "annual", "weekly"]).optional(),
        category: z.string().optional(),
        autopay: z.boolean().optional(),
        priority: z.enum(["critical", "high", "medium", "low"]).optional(),
        notes: z.string().optional(),
        paymentLink: z.string().optional(),
        paymentLinkNote: z.string().optional(),
        manuallyPaid: z.boolean().optional(),
        paymentStatus: z.enum(["unpaid", "paid", "autopay_on", "disputed", "skipped"]).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { billGuardianBills: bgb } = await import("../drizzle/schema");
        const { eq: beq, and: band } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { id, vendorAliases, ...rest } = input;
        const updateData: Record<string, any> = { ...rest };
        if (vendorAliases !== undefined) updateData.vendorAliases = JSON.stringify(vendorAliases);
        await dbConn.update(bgb).set(updateData).where(band(beq(bgb.id, id), beq(bgb.ownerId, ctx.user.id)));
        return { ok: true };
      }),
    deleteBill: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { billGuardianBills: bgb } = await import("../drizzle/schema");
        const { eq: beq, and: band } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await dbConn.delete(bgb).where(band(beq(bgb.id, input.id), beq(bgb.ownerId, ctx.user.id)));
        return { ok: true };
      }),

    // ── Transactions
    listTransactions: protectedProcedure
      .input(z.object({ bankAccountId: z.number().optional(), matchStatus: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const { billGuardianTransactions: bgt } = await import("../drizzle/schema");
        const { eq: teq, and: tand, desc: tdesc } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const conditions: any[] = [teq(bgt.ownerId, ctx.user.id)];
        if (input?.bankAccountId) conditions.push(teq(bgt.bankAccountId, input.bankAccountId));
        return dbConn.select().from(bgt).where(tand(...conditions)).orderBy(tdesc(bgt.transactionDate)).limit(500);
      }),
    importTransactions: protectedProcedure
      .input(z.object({
        transactions: z.array(z.object({
          description: z.string(),
          amount: z.string(),
          transactionDate: z.string(),
          category: z.string().optional(),
          bankAccountId: z.number().optional(),
          externalId: z.string().optional(),
        }))
      }))
      .mutation(async ({ ctx, input }) => {
        const { billGuardianTransactions: bgt } = await import("../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const rows = input.transactions.map(t => ({
          ownerId: ctx.user.id,
          description: t.description,
          amount: t.amount,
          transactionDate: new Date(t.transactionDate),
          category: t.category,
          bankAccountId: t.bankAccountId,
          externalId: t.externalId,
          matchStatus: "unmatched" as const,
        }));
        await dbConn.insert(bgt).values(rows);
        return { ok: true, count: rows.length };
      }),
    deleteTransaction: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { billGuardianTransactions: bgt } = await import("../drizzle/schema");
        const { eq: teq, and: tand } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await dbConn.delete(bgt).where(tand(teq(bgt.id, input.id), teq(bgt.ownerId, ctx.user.id)));
        return { ok: true };
      }),
    overrideMatch: protectedProcedure
      .input(z.object({
        transactionId: z.number(),
        billId: z.number().optional(),
        matchStatus: z.enum(["matched", "duplicate", "increased", "needs_review", "ignored", "unmatched"]),
        matchNotes: z.string().optional(),
        isManuallyVerified: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { billGuardianTransactions: bgt } = await import("../drizzle/schema");
        const { eq: teq, and: tand } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await dbConn.update(bgt).set({
          matchedBillId: input.billId ?? null,
          matchStatus: input.matchStatus,
          matchNotes: input.matchNotes,
          isManuallyVerified: input.isManuallyVerified ?? true,
          matchConfidence: 100,
        }).where(tand(teq(bgt.id, input.transactionId), teq(bgt.ownerId, ctx.user.id)));
        return { ok: true };
      }),

    // ── AI Matching Engine
    runMatching: protectedProcedure.mutation(async ({ ctx }) => {
      const { billGuardianBills: bgb, billGuardianTransactions: bgt } = await import("../drizzle/schema");
      const { eq: meq, and: mand, gte: mgte } = await import("drizzle-orm");
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const bills = await dbConn.select().from(bgb).where(mand(meq(bgb.ownerId, ctx.user.id), meq(bgb.isActive, true)));
      const since = new Date();
      since.setDate(since.getDate() - 60);
      const transactions = await dbConn.select().from(bgt).where(mand(meq(bgt.ownerId, ctx.user.id), mgte(bgt.transactionDate, since)));
      if (bills.length === 0 || transactions.length === 0) return { ok: true, matched: 0, total: 0 };
      const billList = bills.map(b => `ID:${b.id} vendor:"${b.vendorName}" aliases:${b.vendorAliases || '[]'} amount:$${b.expectedAmount} dueDay:${b.dueDay} freq:${b.frequency}`).join('\n');
      const txList = transactions.map(t => `ID:${t.id} desc:"${t.description}" amount:$${t.amount} date:${new Date(t.transactionDate).toISOString().slice(0,10)}`).join('\n');
      const prompt = `You are a financial bill-matching AI. Match bank transactions to expected recurring bills.\n\nEXPECTED BILLS:\n${billList}\n\nBANK TRANSACTIONS (last 60 days):\n${txList}\n\nFor each transaction determine: which bill it matches (if any) using vendor name similarity, amount proximity (within 20%), and date proximity to dueDay. Match status options: matched (normal pay), duplicate (same bill paid twice in same period), increased (amount >5% over expected), needs_review (partial match), unmatched (no match). Return ONLY JSON: {"matches":[{"transactionId":number,"billId":number|null,"matchStatus":string,"confidence":number,"notes":string}]}`;
      const { invokeLLM } = await import("./_core/llm");
      const response = await invokeLLM({
        messages: [{ role: "user", content: prompt as string }],
        response_format: { type: "json_schema", json_schema: { name: "bill_matches", strict: true, schema: { type: "object", properties: { matches: { type: "array", items: { type: "object", properties: { transactionId: { type: "number" }, billId: { type: ["number", "null"] }, matchStatus: { type: "string" }, confidence: { type: "number" }, notes: { type: "string" } }, required: ["transactionId", "billId", "matchStatus", "confidence", "notes"], additionalProperties: false } } }, required: ["matches"], additionalProperties: false } } },
      });
      let matches: Array<{transactionId: number; billId: number|null; matchStatus: string; confidence: number; notes: string}> = [];
      try {
        const raw = response.choices[0].message.content as string;
        const parsed = JSON.parse(raw);
        matches = parsed.matches || parsed;
      } catch { return { ok: false, error: "Failed to parse AI response", matched: 0, total: 0 }; }
      let matchedCount = 0;
      const validStatuses = ["matched", "duplicate", "increased", "needs_review", "unmatched", "ignored"];
      for (const m of matches) {
        const status = validStatuses.includes(m.matchStatus) ? m.matchStatus as any : "needs_review";
        await dbConn.update(bgt).set({ matchedBillId: m.billId ?? null, matchStatus: status, matchConfidence: Math.min(100, Math.max(0, m.confidence)), matchNotes: m.notes, isManuallyVerified: false }).where(mand(meq(bgt.id, m.transactionId), meq(bgt.ownerId, ctx.user.id)));
        if (status === "matched") matchedCount++;
      }
      return { ok: true, matched: matchedCount, total: matches.length };
    }),

    // ── Dashboard
    getDashboard: protectedProcedure.query(async ({ ctx }) => {
      const { billGuardianBills: bgb, billGuardianTransactions: bgt } = await import("../drizzle/schema");
      const { eq: deq, and: dand, gte: dgte } = await import("drizzle-orm");
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const bills = await dbConn.select().from(bgb).where(dand(deq(bgb.ownerId, ctx.user.id), deq(bgb.isActive, true)));
      const since = new Date();
      since.setDate(since.getDate() - 60);
      const transactions = await dbConn.select().from(bgt).where(dand(deq(bgt.ownerId, ctx.user.id), dgte(bgt.transactionDate, since)));
      const currentDay = new Date().getDate();
      const billStatuses = bills.map(bill => {
        const matchedTx = transactions.filter(t => t.matchedBillId === bill.id && t.matchStatus === "matched");
        const duplicateTx = transactions.filter(t => t.matchedBillId === bill.id && t.matchStatus === "duplicate");
        const increasedTx = transactions.filter(t => t.matchedBillId === bill.id && t.matchStatus === "increased");
        const daysUntilDue = bill.dueDay - currentDay;
        let status: string;
        if (matchedTx.length > 0 || transactions.some(t => t.matchedBillId === bill.id && t.isManuallyVerified)) status = "paid";
        else if (duplicateTx.length > 0) status = "duplicate";
        else if (increasedTx.length > 0) status = "increased";
        else if (daysUntilDue >= 0 && daysUntilDue <= 5) status = "due_soon";
        else if (daysUntilDue < 0) status = "missing";
        else status = "upcoming";
        return { bill, status, matchedTx, duplicateTx, increasedTx };
      });
      return {
        bills: billStatuses,
        summary: {
          paid: billStatuses.filter(b => b.status === "paid").length,
          dueSoon: billStatuses.filter(b => b.status === "due_soon").length,
          missing: billStatuses.filter(b => b.status === "missing").length,
          duplicate: billStatuses.filter(b => b.status === "duplicate").length,
          increased: billStatuses.filter(b => b.status === "increased").length,
          needsReview: transactions.filter(t => t.matchStatus === "needs_review").length,
          unmatched: transactions.filter(t => t.matchStatus === "unmatched").length,
          totalBills: bills.length,
          totalTransactions: transactions.length,
        },
      };
    }),
    // ── Alert Summary (no bill details exposed — dashboard use only)
    getAlertSummary: protectedProcedure.query(async ({ ctx }) => {
      const { billGuardianBills: bgb, billGuardianTransactions: bgt } = await import("../drizzle/schema");
      const { eq: aeq, and: aand, gte: agte } = await import("drizzle-orm");
      const dbConn = await db.getDb();
      if (!dbConn) return { needsAttention: false, count: 0, severity: "info" as const };
      const bills = await dbConn.select().from(bgb).where(aand(aeq(bgb.ownerId, ctx.user.id), aeq(bgb.isActive, true)));
      if (bills.length === 0) return { needsAttention: false, count: 0, severity: "info" as const };
      const since = new Date();
      since.setDate(since.getDate() - 60);
      const transactions = await dbConn.select().from(bgt).where(aand(aeq(bgt.ownerId, ctx.user.id), agte(bgt.transactionDate, since)));
      const currentDay = new Date().getDate();
      let critical = 0, warning = 0;
      for (const bill of bills) {
        // Skip bills manually marked as paid/autopay/skipped
        const ps = (bill as any).paymentStatus;
        if (ps === "paid" || ps === "autopay_on" || ps === "skipped") continue;
        const matched = transactions.some(t => t.matchedBillId === bill.id && (t.matchStatus === "matched" || t.isManuallyVerified));
        if (matched) continue;
        const daysUntilDue = bill.dueDay - currentDay;
        const duplicate = transactions.some(t => t.matchedBillId === bill.id && t.matchStatus === "duplicate");
        const increased = transactions.some(t => t.matchedBillId === bill.id && t.matchStatus === "increased");
        if (daysUntilDue < 0) critical++;
        else if (daysUntilDue <= 5 || duplicate || increased) warning++;
      }
      const count = critical + warning;
      const severity = critical > 0 ? "critical" : warning > 0 ? "warning" : "info";
      return { needsAttention: count > 0, count, severity: severity as "critical" | "warning" | "info" };
    }),
  }),

  // ============ PROJECT NOTES ============
  notes: router({
    list: adminProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        // Verify project ownership
        const project = await db.getProjectById(input.projectId, ctx.user.id, ctx.user.role);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        return await db.getProjectNotes(input.projectId);
      }),

    listForClient: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        // Client can only see notes marked as visible
        return await db.getProjectNotesForClient(input.projectId);
      }),

    create: adminProcedure
      .input(
        z.object({
          projectId: z.number(),
          title: z.string().min(1),
          content: z.string(),
          isVisibleToClient: z.boolean().default(false),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify project ownership
        const project = await db.getProjectById(input.projectId, ctx.user.id, ctx.user.role);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        return await db.createProjectNote({
          ...input,
          createdBy: ctx.user.id,
        });
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          projectId: z.number(),
          title: z.string().optional(),
          content: z.string().optional(),
          isVisibleToClient: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify project ownership
        const project = await db.getProjectById(input.projectId, ctx.user.id, ctx.user.role);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        
        const note = await db.getProjectNoteById(input.id);
        if (!note) throw new TRPCError({ code: "NOT_FOUND" });
        
        return await db.updateProjectNote(input.id, {
          title: input.title,
          content: input.content,
          isVisibleToClient: input.isVisibleToClient,
        });
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number(), projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Verify project ownership
        const project = await db.getProjectById(input.projectId, ctx.user.id, ctx.user.role);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        
        const note = await db.getProjectNoteById(input.id);
        if (!note) throw new TRPCError({ code: "NOT_FOUND" });
        
        return await db.deleteProjectNote(input.id);
      }),

    getHistory: adminProcedure
      .input(z.object({ noteId: z.number(), projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verify project ownership
        const project = await db.getProjectById(input.projectId, ctx.user.id, ctx.user.role);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        return await db.getProjectNoteHistory(input.noteId);
      }),
  }),

  // ============ AI CONNECTIONS ============
  aiConnections: router({
    list: adminProcedure.query(async ({ ctx }) => {
      return await db.getAiConnectionsByOwner(ctx.user.id);
    }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        icon: z.string().default("Sparkles"),
        color: z.string().default("blue"),
        location: z.enum(["notes", "compass", "files", "tasks", "details", "any"]).default("notes"),
        outputTarget: z.enum(["note", "compass", "popup"]).default("popup"),
        promptTemplate: z.string().min(1),
        description: z.string().optional(),
        sortOrder: z.number().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createAiConnection(input, ctx.user.id);
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        location: z.enum(["notes", "compass", "files", "tasks", "details", "any"]).optional(),
        outputTarget: z.enum(["note", "compass", "popup"]).optional(),
        promptTemplate: z.string().min(1).optional(),
        description: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const conn = await db.getAiConnectionById(id, ctx.user.id);
        if (!conn) throw new TRPCError({ code: "NOT_FOUND" });
        return await db.updateAiConnection(id, ctx.user.id, data);
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const conn = await db.getAiConnectionById(input.id, ctx.user.id);
        if (!conn) throw new TRPCError({ code: "NOT_FOUND" });
        return await db.deleteAiConnection(input.id, ctx.user.id);
      }),

    run: adminProcedure
      .input(z.object({
        connectionId: z.number(),
        contactId: z.number(),
        projectId: z.number().optional(),
        contextData: z.object({
          studentName: z.string().optional(),
          caseId: z.string().optional(),
          compassContent: z.string().optional(),
          noteContent: z.string().optional(),
          extraContext: z.string().optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const conn = await db.getAiConnectionById(input.connectionId, ctx.user.id);
        if (!conn) throw new TRPCError({ code: "NOT_FOUND" });

        const ctx_data = input.contextData || {};
        let prompt = conn.promptTemplate
          .replace(/\{\{studentName\}\}/g, ctx_data.studentName || "the student")
          .replace(/\{\{caseId\}\}/g, ctx_data.caseId || "N/A")
          .replace(/\{\{compassContent\}\}/g, ctx_data.compassContent || "(no compass data)")
          .replace(/\{\{noteContent\}\}/g, ctx_data.noteContent || "(no note content)")
          .replace(/\{\{extraContext\}\}/g, ctx_data.extraContext || "");

        const { invokeLLM } = await import("./_core/llm");
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a special education advocate assistant. Provide clear, actionable, professional responses. Format your response in plain text with clear sections.",
            },
            { role: "user", content: prompt },
          ],
        });

        const outputText = (response as any)?.choices?.[0]?.message?.content || "No response generated.";

        await db.createAiConnectionRun({
          connectionId: input.connectionId,
          contactId: input.contactId,
          projectId: input.projectId,
          inputSummary: prompt.substring(0, 500),
          outputText,
        });

        return { outputText, connectionName: conn.name };
      }),

    getRuns: adminProcedure
      .input(z.object({ contactId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getAiConnectionRunsByContact(input.contactId);
      }),
  }),

  // ─── Internal Quick Setup (Phone Call) ─────────────────────────────────────
  quickSetup: router({
    create: adminProcedure
      .input(z.object({
        // Parent / Guardian
        parentFirstName: z.string().min(1),
        parentLastName: z.string().min(1),
        parentEmail: z.string().email(),
        parentPhone: z.string().min(1),
        timezone: z.string().optional(),
        bestTimeToCall: z.string().optional(),
        howHeardAboutUs: z.string().optional(),
        referredBy: z.string().optional(),
        // Second parent (optional)
        secondParentName: z.string().optional(),
        secondParentPhone: z.string().optional(),
        secondParentEmail: z.string().optional(),
        // Student
        studentFirstName: z.string().min(1),
        studentLastName: z.string().min(1),
        dateOfBirth: z.string().optional(),
        diagnosis: z.string().optional(),
        schoolName: z.string().optional(),
        gradeLevel: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        countyDistrict: z.string().optional(),
        challenges: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const ownerId = ctx.user.id;

        // 1. Create parent contact
        const parentResult = await db.createContact({
          firstName: input.parentFirstName,
          lastName: input.parentLastName,
          email: input.parentEmail,
          phone: input.parentPhone,
          jobTitle: "Parent",
          timezone: input.timezone,
          bestTimeToCall: input.bestTimeToCall,
          howHeardAboutUs: input.howHeardAboutUs,
          referredBy: input.referredBy,
          secondParentName: input.secondParentName,
          secondParentPhone: input.secondParentPhone,
          secondParentEmail: input.secondParentEmail,
          state: input.state,
          zipCode: input.zipCode,
          city: input.city,
        }, ownerId);
        const parentContactId = db.getInsertId(parentResult);

        // 2. Create student contact linked to parent (db auto-generates caseId)
        const studentResult = await db.createContact({
          firstName: input.studentFirstName,
          lastName: input.studentLastName,
          jobTitle: "Student",
          parentContactId,
          dateOfBirth: input.dateOfBirth,
          diagnosis: input.diagnosis,
          schoolName: input.schoolName,
          gradeLevel: input.gradeLevel,
          city: input.city,
          state: input.state,
          zipCode: input.zipCode,
          countyDistrict: input.countyDistrict,
          challenges: input.challenges,
        }, ownerId);
        const studentContactId = db.getInsertId(studentResult);

        // 3. Read back the auto-generated caseId
        const studentContact = await db.getContactById(studentContactId, ownerId);
        const caseId = studentContact?.caseId || `WP-${new Date().getFullYear()}-${studentContactId}`;

        // 4. Create initial project/case for the student
        const projectName = `${input.studentFirstName} ${input.studentLastName} — Case`;
        await db.createProject({
          clientId: studentContactId,
          name: projectName,
          description: `Case created via Quick Setup. Student: ${input.studentFirstName} ${input.studentLastName}. Diagnosis: ${input.diagnosis || 'Not specified'}.`,
          status: "Planning",
        }, ownerId);

        // 5. Create a lead record for pipeline tracking
        await db.createLead({
          contactId: parentContactId,
          source: input.howHeardAboutUs || "Phone Call",
          status: "New",
          notes: `Quick setup via phone call. Student: ${input.studentFirstName} ${input.studentLastName}. Challenges: ${input.challenges || 'Not specified'}.`,
        }, ownerId);

        // 6. Notify advocate
        await notifyOwner({
          title: `Quick Setup: ${input.parentFirstName} ${input.parentLastName}`,
          content: `New client setup via phone call.\n\nParent: ${input.parentFirstName} ${input.parentLastName} (${input.parentEmail})\nStudent: ${input.studentFirstName} ${input.studentLastName}\nCase ID: ${caseId}\nDiagnosis: ${input.diagnosis || 'Not specified'}\nSchool: ${input.schoolName || 'Not specified'}`,
        });

        return {
          success: true,
          caseId,
          parentContactId,
          studentContactId,
        };
      }),
  }),

  // ─── Lead Forms (Multi-form management) ────────────────────────────────────
  leadForms: router({
    // List all forms for the owner
    list: adminProcedure.query(async ({ ctx }) => {
      return await db.getLeadForms(ctx.user.id);
    }),

    // Get or auto-create the built-in public intake form record (admin only)
    getPublicIntakeForm: adminProcedure.query(async ({ ctx }) => {
      const slug = "public-intake";
      let form = await db.getLeadFormBySlug(slug);
      if (!form) {
        // Auto-create the record so it can be edited
        const result = await db.createLeadForm({
          ownerId: ctx.user.id,
          name: "Public Intake Form",
          slug,
          description: "Default public intake form for families",
          schedulingEnabled: false,
          schedulingType: "builtin",
          isActive: true,
        });
        const id = db.getInsertId(result);
        form = await db.getLeadFormBySlug(slug);
      }
      return form;
    }),

    // Get a single form by slug (public — for rendering the form)
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const form = await db.getLeadFormBySlug(input.slug);
        if (!form || !form.isActive) throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
        return form;
      }),

    // Create a new form
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        schedulingEnabled: z.boolean().default(false),
        schedulingType: z.enum(["builtin", "external"]).default("builtin"),
        schedulingUrl: z.string().optional(),
        schedulingLabel: z.string().optional(),
        isActive: z.boolean().default(true),
        fields: z.array(z.string()).optional(),
        customLabels: z.string().optional(),
        sessionTypeId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Auto-generate slug from name
        const baseSlug = input.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 80);
        // Ensure uniqueness by appending timestamp if needed
        const existing = await db.getLeadFormBySlug(baseSlug);
        const slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug;
        const result = await db.createLeadForm({
          ownerId: ctx.user.id,
          name: input.name,
          slug,
          description: input.description,
          schedulingEnabled: input.schedulingEnabled,
          schedulingType: input.schedulingType,
          schedulingUrl: input.schedulingUrl,
          schedulingLabel: input.schedulingLabel,
          isActive: input.isActive,
          fields: input.fields ? JSON.stringify(input.fields) : undefined,
          customLabels: input.customLabels,
          sessionTypeId: input.sessionTypeId,
        });
        const id = db.getInsertId(result);
        return { id, slug };
      }),

    // Update an existing form
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        schedulingEnabled: z.boolean().optional(),
        schedulingType: z.enum(["builtin", "external"]).optional(),
        schedulingUrl: z.string().optional(),
        schedulingLabel: z.string().optional(),
        isActive: z.boolean().optional(),
        fields: z.array(z.string()).optional(),
        customLabels: z.string().optional(),
        sessionTypeId: z.number().nullable().optional(),
        confirmationHeadline: z.string().max(200).optional(),
        confirmationBody: z.string().optional(),
        saveOurNumberMessage: z.string().optional(),
        confirmationImageKey: z.string().optional().nullable(),
        confirmationImageUrl: z.string().optional().nullable(),
        confirmationHeadlineAlign: z.enum(["left", "center"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, fields, customLabels, sessionTypeId, ...rest } = input;
        await db.updateLeadForm(id, ctx.user.id, {
          ...rest,
          ...(fields !== undefined ? { fields: JSON.stringify(fields) } : {}),
          ...(customLabels !== undefined ? { customLabels } : {}),
          ...(sessionTypeId !== undefined ? { sessionTypeId } : {}),
        });
        return { success: true };
      }),
    // Delete a form
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteLeadForm(input.id, ctx.user.id);
        return { success: true };
      }),

    // Submit a custom form (public)
    submit: publicProcedure
      .input(z.object({
        slug: z.string(),
        parentFirstName: z.string().min(1),
        parentLastName: z.string().min(1),
        parentEmail: z.string().email(),
        parentPhone: z.string().min(1),
        timezone: z.string().optional(),
        bestTimeToCall: z.string().optional(),
        howHeardAboutUs: z.string().optional(),
        referredBy: z.string().optional(),
        secondParentName: z.string().optional(),
        secondParentPhone: z.string().optional(),
        secondParentEmail: z.string().optional(),
        studentFirstName: z.string().min(1),
        studentLastName: z.string().min(1),
        dateOfBirth: z.string().optional(),
        diagnosis: z.string().optional(),
        schoolName: z.string().optional(),
        gradeLevel: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        countyDistrict: z.string().optional(),
        challenges: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Get form and owner
        const form = await db.getLeadFormBySlug(input.slug);
        if (!form || !form.isActive) throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
        const ownerId = form.ownerId;
        // Create parent contact
        const parentResult = await db.createContact({
          firstName: input.parentFirstName,
          lastName: input.parentLastName,
          email: input.parentEmail,
          phone: input.parentPhone,
          jobTitle: "Parent",
          timezone: input.timezone,
          bestTimeToCall: input.bestTimeToCall,
          howHeardAboutUs: input.howHeardAboutUs,
          referredBy: input.referredBy,
          secondParentName: input.secondParentName,
          secondParentPhone: input.secondParentPhone,
          secondParentEmail: input.secondParentEmail,
        }, ownerId);
        const parentContactId = db.getInsertId(parentResult);
        // Create student contact
        const studentResult = await db.createContact({
          firstName: input.studentFirstName,
          lastName: input.studentLastName,
          jobTitle: "Student",
          parentContactId,
          dateOfBirth: input.dateOfBirth,
          diagnosis: input.diagnosis,
          schoolName: input.schoolName,
          gradeLevel: input.gradeLevel,
          city: input.city,
          state: input.state,
          zipCode: input.zipCode,
          countyDistrict: input.countyDistrict,
          challenges: input.challenges,
        }, ownerId);
        const studentContactId = db.getInsertId(studentResult);
        const studentContact = await db.getContactById(studentContactId, ownerId);
        const caseId = studentContact?.caseId || `WP-${new Date().getFullYear()}-${studentContactId}`;
        // Create project
        await db.createProject({
          clientId: studentContactId,
          name: `${input.studentFirstName} ${input.studentLastName} — Case`,
          description: `Case from form: ${form.name}. Diagnosis: ${input.diagnosis || 'Not specified'}.`,
          status: "Planning",
        }, ownerId);
        // Create lead
        await db.createLead({
          contactId: parentContactId,
          source: form.name,
          status: "New",
          notes: `Form submission: ${form.name}. Student: ${input.studentFirstName} ${input.studentLastName}.`,
        }, ownerId);
        // Increment submission count
        await db.incrementLeadFormSubmissionCount(input.slug);
        // Notify
        await notifyOwner({
          title: `New Lead via "${form.name}": ${input.parentFirstName} ${input.parentLastName}`,
          content: `Form: ${form.name}\nParent: ${input.parentFirstName} ${input.parentLastName} (${input.parentEmail})\nStudent: ${input.studentFirstName} ${input.studentLastName}\nCase ID: ${caseId}`,
        });
        return { success: true, caseId, parentContactId, studentContactId };
      }),
    // Upload a confirmation page image (QR code, logo, etc.)
    uploadConfirmationImage: adminProcedure
      .input(z.object({
        formId: z.number(),
        fileName: z.string().min(1),
        fileData: z.string().min(1), // base64
        mimeType: z.string().default("image/png"),
      }))
      .mutation(async ({ ctx, input }) => {
        const fileBuffer = Buffer.from(input.fileData, "base64");
        const ext = input.fileName.split(".").pop() ?? "png";
        const fileKey = `lead-forms/${ctx.user.id}/confirmation-${input.formId}-${Date.now()}.${ext}`;
        const { key, url } = await storagePut(fileKey, fileBuffer, input.mimeType);
        await db.updateLeadForm(input.formId, ctx.user.id, {
          confirmationImageKey: key,
          confirmationImageUrl: url,
        });
        return { success: true, key, url };
      }),
  }),
  // ─── Public Lead Intake Form ────────────────────────────────────────────────
  intake: router({
    submit: publicProcedure
      .input(z.object({
        // Parent / Guardian
        parentFirstName: z.string().min(1),
        parentLastName: z.string().min(1),
        parentEmail: z.string().email(),
        parentPhone: z.string().min(1),
        timezone: z.string().optional(),
        bestTimeToCall: z.string().optional(),
        howHeardAboutUs: z.string().optional(),
        referredBy: z.string().optional(),
        // Second parent (optional)
        secondParentName: z.string().optional(),
        secondParentPhone: z.string().optional(),
        secondParentEmail: z.string().optional(),
        // Student
        studentFirstName: z.string().min(1),
        studentLastName: z.string().min(1),
        dateOfBirth: z.string().optional(),
        diagnosis: z.string().optional(),
        schoolName: z.string().optional(),
        gradeLevel: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        countyDistrict: z.string().optional(),
        challenges: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Resolve the owner (advocate/admin)
        const ownerUser = await db.getOwnerUser();
        if (!ownerUser) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No owner configured" });
        const ownerId = ownerUser.id;

        // 1. Create parent contact
        const parentResult = await db.createContact({
          firstName: input.parentFirstName,
          lastName: input.parentLastName,
          email: input.parentEmail,
          phone: input.parentPhone,
          jobTitle: "Parent",
          timezone: input.timezone,
          bestTimeToCall: input.bestTimeToCall,
          howHeardAboutUs: input.howHeardAboutUs,
          referredBy: input.referredBy,
          secondParentName: input.secondParentName,
          secondParentPhone: input.secondParentPhone,
          secondParentEmail: input.secondParentEmail,
          state: input.state,
          zipCode: input.zipCode,
          city: input.city,
        }, ownerId);
        const parentContactId = db.getInsertId(parentResult);

        // 2. Generate unique caseId for the student
        const year = new Date().getFullYear();
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const caseId = `WP-${year}-${randomSuffix}`;

        // 3. Create student contact linked to parent
        const studentResult = await db.createContact({
          firstName: input.studentFirstName,
          lastName: input.studentLastName,
          jobTitle: "Student",
          parentContactId,
          caseId,
          dateOfBirth: input.dateOfBirth,
          diagnosis: input.diagnosis,
          schoolName: input.schoolName,
          gradeLevel: input.gradeLevel,
          city: input.city,
          state: input.state,
          zipCode: input.zipCode,
          countyDistrict: input.countyDistrict,
          challenges: input.challenges,
        }, ownerId);
        const studentContactId = db.getInsertId(studentResult);

        // 4. Create initial project/case for the student
        const projectName = `${input.studentFirstName} ${input.studentLastName} — Case`;
        await db.createProject({
          clientId: studentContactId,
          name: projectName,
          description: `Intake case created from lead form. Student: ${input.studentFirstName} ${input.studentLastName}. Diagnosis: ${input.diagnosis || 'Not specified'}.`,
          status: "Planning",
        }, ownerId);

        // 5. Create a lead record for pipeline tracking
        await db.createLead({
          contactId: parentContactId,
          source: input.howHeardAboutUs || "Lead Form",
          status: "New",
          notes: `Intake form submitted. Student: ${input.studentFirstName} ${input.studentLastName}. Challenges: ${input.challenges || 'Not specified'}.`,
        }, ownerId);

        // 6. Notify the advocate
        await notifyOwner({
          title: `New Lead: ${input.parentFirstName} ${input.parentLastName}`,
          content: `A new intake form was submitted.\n\nParent: ${input.parentFirstName} ${input.parentLastName} (${input.parentEmail})\nStudent: ${input.studentFirstName} ${input.studentLastName}\nCase ID: ${caseId}\nDiagnosis: ${input.diagnosis || 'Not specified'}\nSchool: ${input.schoolName || 'Not specified'}\nChallenges: ${input.challenges || 'Not specified'}`,
        });

        return {
          success: true,
          caseId,
          parentContactId,
          studentContactId,
        };
      }),
  }),
  smartFiles: smartFilesRouter,
  brainDumpImages: router({
      upload: protectedProcedure
        .input(z.object({
          brainDumpItemId: z.number(),
          imageUrl: z.string().min(1),
        }))
        .mutation(async ({ ctx, input }) => {
          const { brainDumpItems: bdi, brainDumpImages: bimg } = await import("../drizzle/schema");
          const { eq: beq } = await import("drizzle-orm");
          const dbConn = await db.getDb();
          if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
          const [item] = await dbConn.select().from(bdi).where(beq(bdi.id, input.brainDumpItemId)).limit(1);
          if (!item || item.ownerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
          await dbConn.insert(bimg).values({
            brainDumpItemId: input.brainDumpItemId,
            imageUrl: input.imageUrl,
          });
          const [inserted] = await dbConn.select().from(bimg)
            .where(beq(bimg.brainDumpItemId, input.brainDumpItemId))
            .orderBy(bimg.id)
            .limit(1);
          return inserted;
        }),
      listByItem: protectedProcedure
        .input(z.object({ brainDumpItemId: z.number() }))
        .query(async ({ ctx, input }) => {
          const { brainDumpItems: bdi, brainDumpImages: bimg } = await import("../drizzle/schema");
          const { eq: beq, desc: bdesc } = await import("drizzle-orm");
          const dbConn = await db.getDb();
          if (!dbConn) return [];
          const [item] = await dbConn.select().from(bdi).where(beq(bdi.id, input.brainDumpItemId)).limit(1);
          if (!item || item.ownerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
          return dbConn.select().from(bimg)
            .where(beq(bimg.brainDumpItemId, input.brainDumpItemId))
            .orderBy(bdesc(bimg.uploadedAt));
        }),
      delete: protectedProcedure
        .input(z.object({ imageId: z.number() }))
        .mutation(async ({ ctx, input }) => {
          const { brainDumpItems: bdi, brainDumpImages: bimg } = await import("../drizzle/schema");
          const { eq: beq } = await import("drizzle-orm");
          const dbConn = await db.getDb();
          if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
          const [image] = await dbConn.select().from(bimg).where(beq(bimg.id, input.imageId)).limit(1);
          if (!image) throw new TRPCError({ code: 'NOT_FOUND' });
          const [item] = await dbConn.select().from(bdi).where(beq(bdi.id, image.brainDumpItemId)).limit(1);
          if (!item || item.ownerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
          await dbConn.delete(bimg).where(beq(bimg.id, input.imageId));
          return { success: true };
        }),
  }),
});
export type AppRouter = typeof appRouter;

import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { eq, and, asc, desc } from "drizzle-orm";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";
import { ENV } from "./_core/env";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    getOwner: protectedProcedure.query(async () => {
      const owner = await db.getUserByOpenId(require("./_core/env").ENV.ownerOpenId);
      return owner ? { id: owner.id, name: owner.name } : null;
    }),
  }),

  // ============ CONTACTS ============
  contacts: router({
    list: adminProcedure.query(async ({ ctx }) => {
      return await db.getContactsByOwner(ctx.user.id);
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
          location: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const owner = await db.getUserByOpenId(ENV.ownerOpenId);
        if (!owner) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Owner not found" });
        const appointment = await db.createAppointment({
          ...input,
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
          status: z.enum(["Scheduled", "Confirmed", "Completed", "Cancelled"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return await db.updateAppointment(id, ctx.user.id, data);
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
    // Parent portal: returns all students linked to the logged-in parent
    getMyStudents: protectedProcedure.query(async ({ ctx }) => {
      return await db.getStudentsByParentPortalUser(ctx.user.id);
    }),

     // Parent portal: get compass for a specific student caseId (must belong to parent, or admin)
    getStudentCompass: protectedProcedure
      .input(z.object({ caseId: z.string() }))
      .query(async ({ ctx, input }) => {
        // Admins can always preview any student's compass
        if (ctx.user.role !== "admin") {
          const students = await db.getStudentsByParentPortalUser(ctx.user.id);
          const isOwned = students.some((s) => s.caseId === input.caseId);
          if (!isOwned) throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.getCaseCompass(input.caseId) ?? null;
      }),
    // Parent portal: get history for a specific student caseId (must belong to parent, or admin)
    getStudentHistory: protectedProcedure
      .input(z.object({ caseId: z.string() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          const students = await db.getStudentsByParentPortalUser(ctx.user.id);
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
    getStudentAppointments: protectedProcedure
      .input(z.object({ studentContactId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          const students = await db.getStudentsByParentPortalUser(ctx.user.id);
          const isOwned = students.some((s) => s.id === input.studentContactId);
          if (!isOwned) throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.getAppointmentsByClient(input.studentContactId);
      }),

    // Portal: get files for a specific student (by their contact id)
    getStudentFiles: protectedProcedure
      .input(z.object({ studentContactId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          const students = await db.getStudentsByParentPortalUser(ctx.user.id);
          const isOwned = students.some((s) => s.id === input.studentContactId);
          if (!isOwned) throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.getClientFilesByClient(input.studentContactId);
      }),

    // Portal: get billing (invoices + contracts) for a specific student
    getStudentBilling: protectedProcedure
      .input(z.object({ studentContactId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          const students = await db.getStudentsByParentPortalUser(ctx.user.id);
          const isOwned = students.some((s) => s.id === input.studentContactId);
          if (!isOwned) throw new TRPCError({ code: "FORBIDDEN" });
        }
        const invoicesList = await db.getInvoicesByClient(input.studentContactId);
        const contractsList = await db.getContractsByClient(input.studentContactId);
        return { invoices: invoicesList, contracts: contractsList };
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
        const { internalTasks, internalSubtasks, users, projects } = await import("../drizzle/schema");
        const tasks = await database.select().from(internalTasks).orderBy(asc(internalTasks.createdAt));
        const subtasks = await database.select().from(internalSubtasks).orderBy(asc(internalSubtasks.sortOrder));
        const allUsers = await database.select({ id: users.id, name: users.name }).from(users);
        const allProjects = await database.select({ id: projects.id, name: projects.name }).from(projects);
        const userMap = Object.fromEntries(allUsers.map(u => [u.id, u.name]));
        const projectMap = Object.fromEntries(allProjects.map(p => [p.id, p.name]));
        const subtasksByTask = subtasks.reduce((acc, s) => {
          if (!acc[s.taskId]) acc[s.taskId] = [];
          acc[s.taskId].push(s);
          return acc;
        }, {} as Record<number, typeof subtasks>);
        let result = tasks.map(t => ({
          ...t,
          resources: t.resources ? JSON.parse(t.resources) : [],
          assigneeName: t.assigneeId ? userMap[t.assigneeId] : null,
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
        dueDate: z.string().optional(),
        linkedFileId: z.number().optional(),
        linkedFileName: z.string().optional(),
        linkedFileUrl: z.string().optional(),
        linkedStudentId: z.number().optional(),
        linkedStudentName: z.string().optional(),
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
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
          resources: "[]",
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
});

export type AppRouter = typeof appRouter;

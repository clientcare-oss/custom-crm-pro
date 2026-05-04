import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";

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
          email: z.string().email().optional(),
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
        return await db.createContact(input, ctx.user.id);
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          email: z.string().email().optional(),
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
          status: z.enum(["New", "Follow-up", "Qualified", "Won", "Lost"]).default("New"),
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
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === "admin") {
        return await db.getProjectsByOwner(ctx.user.id);
      } else {
        return await db.getProjectsByClient(ctx.user.id);
      }
    }),

    get: protectedProcedure
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
          status: z.enum(["Planning", "In Progress", "On Hold", "Completed"]).default("Planning"),
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

  // ============ PROJECT TASKS ============
  projectTasks: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTasksByProject(input.projectId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          projectId: z.number(),
          title: z.string().min(1),
          description: z.string().optional(),
          status: z.enum(["Todo", "In Progress", "Done"]).default("Todo"),
          dueDate: z.date().optional(),
          assignedTo: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createTask(input);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          description: z.string().optional(),
          status: z.enum(["Todo", "In Progress", "Done"]).optional(),
          dueDate: z.date().optional(),
          assignedTo: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateTask(id, data);
      }),
  }),

  // ============ INVOICES ============
  invoices: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === "admin") {
        return await db.getInvoicesByOwner(ctx.user.id);
      } else {
        return await db.getInvoicesByClient(ctx.user.id);
      }
    }),

    get: protectedProcedure
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
          status: z.enum(["Draft", "Sent", "Paid", "Overdue", "Cancelled"]).default("Draft"),
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
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === "admin") {
        return await db.getContractsByOwner(ctx.user.id);
      } else {
        return await db.getContractsByClient(ctx.user.id);
      }
    }),

    get: protectedProcedure
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
          status: z.enum(["Draft", "Sent", "Signed", "Executed", "Cancelled"]).default("Draft"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await db.createContract(input, ctx.user.id);
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          content: z.string().optional(),
          status: z.enum(["Draft", "Sent", "Signed", "Executed", "Cancelled"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return await db.updateContract(id, ctx.user.id, data);
      }),
  }),

  // ============ APPOINTMENTS ============
  appointments: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === "admin") {
        return await db.getAppointmentsByOwner(ctx.user.id);
      } else {
        return await db.getAppointmentsByClient(ctx.user.id);
      }
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
          status: z.enum(["Scheduled", "Confirmed", "Completed", "Cancelled"]).default("Scheduled"),
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
        return await db.createMessage({
          senderId: ctx.user.id,
          recipientId: input.recipientId,
          content: input.content,
        });
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
});

export type AppRouter = typeof appRouter;

import { z } from "zod";
import * as db from "../db";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import {
  syncQuoContact,
  sendQuoMessage,
  getQuoMessagesForContact,
  sendCallToPhone,
  registerEmployeeDevice,
  listEmployeeDevices,
  deleteEmployeeDevice,
} from "../services/quo";

export const quoRouter = router({
  // ─── 1. INTEGRATION SETTINGS ───────────────────────────────────────
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const database = await db.getDb();
    if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const { quoSettings } = await import("../../drizzle/schema");
    const [settings] = await database
      .select()
      .from(quoSettings)
      .where(eq(quoSettings.ownerId, ctx.user.id))
      .limit(1);

    if (!settings) {
      return {
        id: 0,
        status: "disconnected" as const,
        hasApiKey: false,
        webhookUrl: "/api/integrations/quo/webhooks",
        webhookStatus: "pending",
        primaryPhoneId: null,
        primaryPhoneNumber: "+1 (770) 555-0199",
        primaryPhoneDisplayName: "Waypoint Advocates Primary Line",
        lastSyncAt: null,
      };
    }

    return {
      id: settings.id,
      status: settings.status,
      hasApiKey: settings.hasApiKey,
      webhookUrl: settings.webhookUrl || "/api/integrations/quo/webhooks",
      webhookStatus: settings.status === "connected" ? "active" : "pending",
      primaryPhoneId: settings.primaryPhoneId,
      primaryPhoneNumber: settings.primaryPhoneNumber || "+1 (770) 555-0199",
      primaryPhoneDisplayName: settings.primaryPhoneDisplayName || "Waypoint Advocates Primary Line",
      lastSyncAt: settings.lastSyncAt,
    };
  }),

  saveSettings: adminProcedure
    .input(
      z.object({
        primaryPhoneId: z.string().optional(),
        primaryPhoneNumber: z.string().min(1),
        primaryPhoneDisplayName: z.string().optional(),
        status: z.enum(["disconnected", "connected", "pending_verification"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const { quoSettings } = await import("../../drizzle/schema");
      const [existing] = await database
        .select({ id: quoSettings.id })
        .from(quoSettings)
        .where(eq(quoSettings.ownerId, ctx.user.id))
        .limit(1);

      if (existing) {
        await database
          .update(quoSettings)
          .set({
            primaryPhoneId: input.primaryPhoneId,
            primaryPhoneNumber: input.primaryPhoneNumber,
            primaryPhoneDisplayName: input.primaryPhoneDisplayName,
            ...(input.status ? { status: input.status } : {}),
            updatedAt: new Date(),
          })
          .where(eq(quoSettings.id, existing.id));
      } else {
        await database.insert(quoSettings).values({
          ownerId: ctx.user.id,
          hasApiKey: false,
          webhookUrl: "/api/integrations/quo/webhooks",
          primaryPhoneId: input.primaryPhoneId,
          primaryPhoneNumber: input.primaryPhoneNumber,
          primaryPhoneDisplayName: input.primaryPhoneDisplayName || "Waypoint Advocates Primary Line",
          status: input.status || "disconnected",
        });
      }

      return { success: true };
    }),

  testConnection: adminProcedure.mutation(async () => {
    // Non-breaking placeholder test connection (No real Quo API calls yet)
    return {
      success: true,
      status: "connected",
      message: "Quo API endpoint ready (simulated handshake successful). Webhook receiver active.",
      checkedAt: new Date().toISOString(),
    };
  }),

  // ─── 2. EMPLOYEE MAPPINGS ──────────────────────────────────────────
  listEmployeeMappings: adminProcedure.query(async ({ ctx }) => {
    const database = await db.getDb();
    if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const { quoEmployeeMappings, users } = await import("../../drizzle/schema");

    const mappings = await database
      .select()
      .from(quoEmployeeMappings)
      .where(eq(quoEmployeeMappings.ownerId, ctx.user.id));

    const teamUsers = await database
      .select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users);

    return {
      mappings,
      teamUsers,
    };
  }),

  saveEmployeeMapping: adminProcedure
    .input(
      z.object({
        employeeId: z.number(),
        employeeName: z.string().optional(),
        quoUserId: z.string().min(1),
        quoUserDisplayName: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const { quoEmployeeMappings } = await import("../../drizzle/schema");
      const [existing] = await database
        .select({ id: quoEmployeeMappings.id })
        .from(quoEmployeeMappings)
        .where(
          and(
            eq(quoEmployeeMappings.ownerId, ctx.user.id),
            eq(quoEmployeeMappings.employeeId, input.employeeId)
          )
        )
        .limit(1);

      if (existing) {
        await database
          .update(quoEmployeeMappings)
          .set({
            quoUserId: input.quoUserId,
            quoUserDisplayName: input.quoUserDisplayName,
            employeeName: input.employeeName,
            updatedAt: new Date(),
          })
          .where(eq(quoEmployeeMappings.id, existing.id));
      } else {
        await database.insert(quoEmployeeMappings).values({
          ownerId: ctx.user.id,
          employeeId: input.employeeId,
          employeeName: input.employeeName,
          quoUserId: input.quoUserId,
          quoUserDisplayName: input.quoUserDisplayName,
        });
      }

      return { success: true };
    }),

  deleteEmployeeMapping: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const { quoEmployeeMappings } = await import("../../drizzle/schema");
      await database
        .delete(quoEmployeeMappings)
        .where(
          and(
            eq(quoEmployeeMappings.id, input.id),
            eq(quoEmployeeMappings.ownerId, ctx.user.id)
          )
        );

      return { success: true };
    }),

  // ─── 3. CONTACT SYNC ───────────────────────────────────────────────
  syncContact: protectedProcedure
    .input(z.object({ contactId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await syncQuoContact(ctx.user.id, input.contactId);
    }),

  // ─── 4. SMS COMPOSER & THREADS ────────────────────────────────────
  sendSms: protectedProcedure
    .input(
      z.object({
        contactId: z.number(),
        body: z.string().min(1, "Message cannot be empty"),
        mediaUrls: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const { contacts } = await import("../../drizzle/schema");
      const [contact] = await database
        .select()
        .from(contacts)
        .where(eq(contacts.id, input.contactId))
        .limit(1);

      if (!contact || !contact.phone) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Client does not have a valid telephone number on file.",
        });
      }

      return await sendQuoMessage({
        ownerId: ctx.user.id,
        contactId: input.contactId,
        toNumber: contact.phone,
        body: input.body,
        employeeId: ctx.user.id,
        employeeName: ctx.user.name ?? undefined,
      });
    }),

  listSms: protectedProcedure
    .input(z.object({ contactId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await getQuoMessagesForContact(ctx.user.id, input.contactId);
    }),

  // ─── 5. SEND CALL TO MY PHONE (PUSH HANDOFF) ───────────────────────
  sendCallToPhone: protectedProcedure
    .input(z.object({ contactId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const { contacts } = await import("../../drizzle/schema");
      const [contact] = await database
        .select()
        .from(contacts)
        .where(eq(contacts.id, input.contactId))
        .limit(1);

      if (!contact || !contact.phone) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Client does not have a valid telephone number on file.",
        });
      }

      const clientName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Client";

      return await sendCallToPhone({
        ownerId: ctx.user.id,
        employeeId: ctx.user.id,
        contactId: input.contactId,
        clientName,
        phoneNumber: contact.phone,
      });
    }),

  registerDevice: protectedProcedure
    .input(
      z.object({
        deviceId: z.string().min(1),
        deviceName: z.string().min(1),
        platform: z.enum(["ios", "android", "web", "other"]).default("web"),
        pushSubscription: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const device = await registerEmployeeDevice({
        employeeId: ctx.user.id,
        deviceId: input.deviceId,
        deviceName: input.deviceName,
        platform: input.platform,
        pushSubscription: input.pushSubscription,
      });
      return {
        success: true,
        device,
        message: `Device "${input.deviceName}" registered for call handoff`,
      };
    }),

  listMyDevices: protectedProcedure.query(async ({ ctx }) => {
    return await listEmployeeDevices(ctx.user.id);
  }),

  deleteDevice: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await deleteEmployeeDevice(input.id, ctx.user.id);
    }),

  // ─── 6. CALL LOGS & CALLBACK TASK CREATION ─────────────────────────
  createCallbackTask: protectedProcedure
    .input(
      z.object({
        callLogId: z.number(),
        title: z.string().optional(),
        notes: z.string().optional(),
        dueDate: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const { callLogs, internalTasks, contacts } = await import("../../drizzle/schema");

      const [log] = await database
        .select()
        .from(callLogs)
        .where(eq(callLogs.id, input.callLogId))
        .limit(1);

      if (!log) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Call log not found" });
      }

      // Fetch contact details if available
      let contactName = log.fromNumber || "Client";
      if (log.contactId) {
        const [c] = await database
          .select({ firstName: contacts.firstName, lastName: contacts.lastName })
          .from(contacts)
          .where(eq(contacts.id, log.contactId))
          .limit(1);
        if (c) contactName = `${c.firstName || ""} ${c.lastName || ""}`.trim() || contactName;
      }

      const taskTitle = input.title || `📞 Return Missed Call: ${contactName} (${log.fromNumber})`;
      const taskDescription = [
        input.notes || `Callback requested for missed call from ${log.fromNumber}.`,
        log.voicemailTranscript ? `\nVoicemail transcript:\n"${log.voicemailTranscript}"` : "",
        log.recordingUrl ? `\nRecording: ${log.recordingUrl}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      // Insert new internal task
      const [insertedTask] = await database
        .insert(internalTasks)
        .values({
          title: taskTitle,
          description: taskDescription,
          status: "not_started",
          dueDate: input.dueDate ? new Date(input.dueDate) : new Date(Date.now() + 24 * 60 * 60 * 1000), // Default 24h
          assigneeId: ctx.user.id,
          linkedStudentId: log.studentId || log.contactId || null,
          linkedStudentName: contactName,
          createdBy: ctx.user.id,
        })
        .returning();

      const taskId = insertedTask?.id ?? 0;

      // Update callLog to mark callback completed and link task
      await database
        .update(callLogs)
        .set({
          callbackStatus: "completed",
          callbackTaskId: taskId,
        })
        .where(eq(callLogs.id, input.callLogId));

      return {
        success: true,
        taskId,
        message: `Callback task created successfully: "${taskTitle}"`,
      };
    }),

  listCallLogs: protectedProcedure
    .input(
      z.object({
        contactId: z.number().optional(),
        studentId: z.number().optional(),
        filter: z.enum(["all", "calls", "voicemails", "sms", "missed"]).default("all"),
      })
    )
    .query(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const { callLogs } = await import("../../drizzle/schema");
      const conditions = [eq(callLogs.ownerId, ctx.user.id)];

      if (input.contactId) {
        conditions.push(eq(callLogs.contactId, input.contactId));
      } else if (input.studentId) {
        conditions.push(eq(callLogs.studentId, input.studentId));
      }

      if (input.filter === "voicemails") {
        conditions.push(eq(callLogs.isVoicemail, true));
      } else if (input.filter === "missed") {
        conditions.push(eq(callLogs.isMissed, true));
      } else if (input.filter === "sms") {
        conditions.push(eq(callLogs.eventType, "message.received"));
      }

      return await database
        .select()
        .from(callLogs)
        .where(and(...conditions))
        .orderBy(desc(callLogs.createdAt))
        .limit(100);
    }),
});

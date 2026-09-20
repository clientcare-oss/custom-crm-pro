import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";

export const crewMessagesRouter = router({
  // Lists all conversations for current employee
  listConversations: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role === "client") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Clients cannot access Crew Messages" });
    }
    return await db.getConversationsForUser(ctx.user.id);
  }),

  // Lists active employees available for direct messages or assignments
  listEmployees: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role === "client") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Clients cannot access Crew Messages" });
    }
    return await db.getAvailableEmployees(ctx.user.id);
  }),

  // Returns messages for a conversation
  getMessages: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        limit: z.number().min(1).max(200).default(80),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role === "client") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Clients cannot access Crew Messages" });
      }
      return await db.getMessagesForConversation(input.conversationId, ctx.user.id, input.limit);
    }),

  // Sends a message
  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        body: z.string().min(1),
        messageType: z.enum(["text", "attachment", "linked_record", "action_request", "system"]).default("text"),
        replyToMessageId: z.number().optional(),
        links: z
          .array(
            z.object({
              recordType: z.string(),
              recordId: z.string(),
              metadata: z.any().optional(),
            })
          )
          .optional(),
        attachments: z
          .array(
            z.object({
              fileName: z.string(),
              mimeType: z.string(),
              fileSize: z.number(),
              r2Key: z.string().optional(),
              documentId: z.number().optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role === "client") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Clients cannot access Crew Messages" });
      }
      return await db.sendMessage({
        conversationId: input.conversationId,
        senderUserId: ctx.user.id,
        body: input.body,
        messageType: input.messageType,
        replyToMessageId: input.replyToMessageId,
        links: input.links,
        attachments: input.attachments,
      });
    }),

  // Marks conversation as read
  markRead: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        messageId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role === "client") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Clients cannot access Crew Messages" });
      }
      await db.markConversationRead(input.conversationId, ctx.user.id, input.messageId);
      return { success: true };
    }),

  // Starts or opens a Direct Message conversation
  getOrCreateDirect: protectedProcedure
    .input(z.object({ targetUserId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role === "client") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Clients cannot access Crew Messages" });
      }
      return await db.getOrCreateDirectConversation(ctx.user.id, input.targetUserId);
    }),

  // Starts a Group Message conversation
  createGroup: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        memberUserIds: z.array(z.number()),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role === "client") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Clients cannot access Crew Messages" });
      }
      return await db.createGroupConversation(
        ctx.user.id,
        input.name,
        input.memberUserIds,
        input.description
      );
    }),

  // Starts or opens a Student Case Thread
  getOrCreateCaseThread: protectedProcedure
    .input(z.object({ studentContactId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role === "client") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Clients cannot access Crew Messages" });
      }
      return await db.getOrCreateCaseThread(ctx.user.id, input.studentContactId);
    }),

  // Toggles an emoji reaction
  toggleReaction: protectedProcedure
    .input(
      z.object({
        messageId: z.number(),
        emoji: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role === "client") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Clients cannot access Crew Messages" });
      }
      return await db.toggleMessageReaction(input.messageId, ctx.user.id, input.emoji);
    }),

  // Creates a lightweight Action Request
  createActionRequest: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        assignedApproverId: z.number(),
        requestType: z.string(),
        title: z.string().min(1),
        explanation: z.string().optional(),
        relatedRecordType: z.string().optional(),
        relatedRecordId: z.string().optional(),
        dueAt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role === "client") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Clients cannot access Crew Messages" });
      }

      const dueAtDate = input.dueAt ? new Date(input.dueAt) : undefined;

      return await db.createActionRequest({
        conversationId: input.conversationId,
        requestedBy: ctx.user.id,
        assignedApproverId: input.assignedApproverId,
        requestType: input.requestType,
        title: input.title,
        explanation: input.explanation,
        relatedRecordType: input.relatedRecordType,
        relatedRecordId: input.relatedRecordId,
        dueAt: dueAtDate,
      });
    }),

  // Decides an Action Request (permission-checked, single-use, audited)
  decideActionRequest: protectedProcedure
    .input(
      z.object({
        actionRequestId: z.number(),
        decision: z.enum(["approved", "declined", "changes_requested"]),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role === "client") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Clients cannot access Crew Messages" });
      }

      const deciderName = ctx.user.name || (ctx.user.email ? ctx.user.email.split("@")[0] : "Advocate");

      return await db.decideActionRequest({
        actionRequestId: input.actionRequestId,
        deciderUserId: ctx.user.id,
        deciderName,
        decision: input.decision,
        note: input.note,
      });
    }),

  // Converts a message into an existing CRM task
  convertToTask: protectedProcedure
    .input(
      z.object({
        messageId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]).default("medium"),
        dueDate: z.string().optional(),
        studentContactId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role === "client") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Clients cannot access Crew Messages" });
      }

      const creatorName = ctx.user.name || "Advocate";

      return await db.convertMessageToTask({
        messageId: input.messageId,
        creatorUserId: ctx.user.id,
        creatorName,
        title: input.title,
        description: input.description,
        priority: input.priority,
        dueDate: input.dueDate,
        studentContactId: input.studentContactId,
      });
    }),

  // Alias for convertToTask
  convertMessageToTask: protectedProcedure
    .input(
      z.object({
        messageId: z.number(),
        taskTitle: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]).default("medium"),
        dueDate: z.string().optional(),
        studentContactId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role === "client") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Clients cannot access Crew Messages" });
      }

      const creatorName = ctx.user.name || "Advocate";
      const resolvedTitle = input.taskTitle || input.title || "Task from message";

      return await db.convertMessageToTask({
        messageId: input.messageId,
        creatorUserId: ctx.user.id,
        creatorName,
        title: resolvedTitle,
        description: input.description,
        priority: input.priority,
        dueDate: input.dueDate,
        studentContactId: input.studentContactId,
      });
    }),

  // Returns Linked Context for the active conversation
  getLinkedContext: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role === "client") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Clients cannot access Crew Messages" });
      }
      return await db.getLinkedContext(input.conversationId);
    }),

  // Returns stats for the Crew Quarters Overview widget & notification bell
  getOverviewStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role === "client") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Clients cannot access Crew Messages" });
    }
    return await db.getCrewOverviewStats(ctx.user.id);
  }),

  // Adds an important message directly to the student's Activity Timeline
  addToActivityTimeline: protectedProcedure
    .input(
      z.object({
        messageId: z.number(),
        studentContactId: z.number(),
        title: z.string().min(1),
        notes: z.string().optional(),
        whyReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role === "client") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Clients cannot access Crew Messages" });
      }

      const actorName = ctx.user.name || "Staff";

      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { caseActivityTimeline } = await import("../../drizzle/schema");
      await database.insert(caseActivityTimeline).values({
        studentContactId: input.studentContactId,
        eventType: "note",
        title: input.title,
        description: input.notes || "Flagged note from internal crew messaging",
        whyReason: input.whyReason || "Important advocacy communication record",
        ownerName: actorName,
        ownerRole: ctx.user.role === "admin" ? "Master IEP Coach" : "Senior Advocate",
      });

      return { success: true };
    }),
});

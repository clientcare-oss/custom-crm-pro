import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  staffProcedure,
  assertClientContactOwnership,
} from "../_core/trpc";
import {
  checkBackendModuleAccess,
  checkBackendActionPermission,
  checkBackendCaseAccess,
} from "../_core/staffAccess";
import { ENV } from "../_core/env";
import { notifyOwner } from "../_core/notification";
import {
  getGmailHubStatus,
  initiateGmailOAuth,
  connectGmailMailbox,
  disconnectGmailMailbox,
  reconnectGmailMailbox,
  updateGmailMailboxSettings,
  syncGmailMessages,
  assignEmailAssociation,
  listEmailsAndThreads,
  getEmailThreadById,
  markEmailOrThreadRead,
  composeAndSendEmail,
  setEmailPortalVisibility,
} from "../services/gmailCommunicationHub";

function assertManagementMailboxControl(ctx: any) {
  const sa = ctx.staffAccess;
  const isAuthorizedManagement =
    Boolean(sa?.isProtectedOwner) ||
    Boolean(sa?.hasAdminAccess) ||
    sa?.primaryRole === "management" ||
    checkBackendModuleAccess(sa, "integrations") === "edit" ||
    checkBackendActionPermission(sa, "manage_integrations");

  if (!isAuthorizedManagement) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only authorized management may connect, reconnect, or disconnect company Gmail accounts.",
    });
  }
}

function assertStaffEmailCommunicationAccess(ctx: any, mode: "view" | "edit" = "view") {
  const sa = ctx.staffAccess;
  if (!sa?.isStaff) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Staff access is required for the Client Communication Hub.",
    });
  }
  if (sa.isProtectedOwner || sa.hasAdminAccess || sa.primaryRole === "management") {
    return;
  }

  const contactsAccess = checkBackendModuleAccess(sa, "contacts");
  const studentsAccess = checkBackendModuleAccess(sa, "students");
  const callCenterAccess = checkBackendModuleAccess(sa, "call_center");
  const activityCaseAccess = checkBackendCaseAccess(sa, "activity");

  if (mode === "view") {
    const canView =
      contactsAccess !== "none" ||
      studentsAccess !== "none" ||
      callCenterAccess !== "none" ||
      activityCaseAccess !== "none";
    if (!canView) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to view client email correspondence.",
      });
    }
    return;
  }

  const canEdit =
    contactsAccess === "edit" ||
    studentsAccess === "edit" ||
    callCenterAccess === "edit" ||
    activityCaseAccess === "edit" ||
    activityCaseAccess === "manage" ||
    checkBackendActionPermission(sa, "edit_clients");

  if (!canEdit) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Read-only permission: you cannot send or modify client email correspondence.",
    });
  }
}

export const messagesRouter = router({
  // ── Existing Direct Portal Message Procedures (Preserved) ──
  list: protectedProcedure
    .input(z.object({ recipientId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.staffAccess?.isStaff) {
        await assertClientContactOwnership(ctx, input.recipientId);
      }
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
      if (!ctx.staffAccess?.isStaff) {
        await assertClientContactOwnership(ctx, input.recipientId);
      }
      const message = await db.createMessage({
        senderId: ctx.user.id,
        recipientId: input.recipientId,
        content: input.content,
      });
      try {
        const owner = await db.getUserByOpenId(ENV.ownerOpenId);
        if (owner && input.recipientId === owner.id && ctx.user.id !== owner.id) {
          await notifyOwner({
            title: `New message from ${ctx.user.name || "a client"}`,
            content: input.content.substring(0, 200),
          });
        }
      } catch (e) {
        console.error("[Notification] Failed to notify owner:", e);
      }
      return message;
    }),

  markAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await db.markMessageAsRead(input.id);
    }),

  // ── WAP 1B.1: Gmail-Connected Client Communication Hub Procedures ──

  /**
   * Returns current Gmail OAuth/Mailbox status, scopes, and queue statistics.
   * Never exposes OAuth tokens or secrets.
   */
  gmailStatus: staffProcedure.query(async ({ ctx }) => {
    assertStaffEmailCommunicationAccess(ctx, "view");
    return await getGmailHubStatus();
  }),

  /**
   * Initiates Google OAuth 2.0 flow for a company Gmail mailbox (Management only).
   */
  initiateGmailOAuth: staffProcedure
    .input(
      z
        .object({
          emailHint: z.string().email().optional(),
        })
        .optional()
    )
    .mutation(async ({ ctx, input }) => {
      assertManagementMailboxControl(ctx);
      return await initiateGmailOAuth({
        emailHint: input?.emailHint,
        actorUserId: ctx.user.id,
        actorName: ctx.staffAccess?.name || ctx.user.name || "Management",
      });
    }),

  /**
   * Connects or authorizes a company Gmail mailbox (Management only).
   */
  connectGmailMailbox: staffProcedure
    .input(
      z.object({
        email: z.string().email(),
        displayName: z.string().optional(),
        authType: z.enum(["oauth2", "app_password"]).optional().default("oauth2"),
        accessToken: z.string().optional(),
        refreshToken: z.string().optional(),
        syncRangeDays: z.number().min(1).max(3650).optional().default(90),
        syncAuthorized: z.boolean().optional().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertManagementMailboxControl(ctx);
      return await connectGmailMailbox({
        email: input.email,
        displayName: input.displayName,
        authType: input.authType,
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
        syncRangeDays: input.syncRangeDays,
        syncAuthorized: input.syncAuthorized,
        actorUserId: ctx.user.id,
        actorName: ctx.staffAccess?.name || ctx.user.name || "Management",
      });
    }),

  /**
   * Reconnects an existing company Gmail mailbox (Management only).
   */
  reconnectGmailMailbox: staffProcedure
    .input(
      z
        .object({
          mailboxId: z.string().optional(),
          email: z.string().email().optional(),
          accessToken: z.string().optional(),
          refreshToken: z.string().optional(),
        })
        .optional()
    )
    .mutation(async ({ ctx, input }) => {
      assertManagementMailboxControl(ctx);
      return await reconnectGmailMailbox({
        mailboxId: input?.mailboxId,
        email: input?.email,
        accessToken: input?.accessToken,
        refreshToken: input?.refreshToken,
        actorUserId: ctx.user.id,
        actorName: ctx.staffAccess?.name || ctx.user.name || "Management",
      });
    }),

  /**
   * Disconnects a company Gmail mailbox (Management only).
   */
  disconnectGmailMailbox: staffProcedure
    .input(
      z
        .object({
          mailboxId: z.string().optional(),
          email: z.string().email().optional(),
        })
        .optional()
    )
    .mutation(async ({ ctx, input }) => {
      assertManagementMailboxControl(ctx);
      return await disconnectGmailMailbox({
        mailboxId: input?.mailboxId,
        email: input?.email,
        actorUserId: ctx.user.id,
        actorName: ctx.staffAccess?.name || ctx.user.name || "Management",
      });
    }),

  /**
   * Updates sync range or mailbox settings (Management only).
   */
  updateGmailSettings: staffProcedure
    .input(
      z.object({
        mailboxId: z.string().optional(),
        syncRangeDays: z.number().min(1).max(3650).optional(),
        syncAuthorized: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertManagementMailboxControl(ctx);
      return await updateGmailMailboxSettings(input);
    }),

  /**
   * Triggers two-way Gmail synchronization for the connected mailbox.
   */
  syncGmail: staffProcedure
    .input(
      z
        .object({
          mailboxId: z.string().optional(),
        })
        .optional()
    )
    .mutation(async ({ ctx, input }) => {
      assertStaffEmailCommunicationAccess(ctx, "edit");
      return await syncGmailMessages({
        mailboxId: input?.mailboxId,
      });
    }),

  /**
   * Lists synchronized emails and conversation threads with folder filtering and search.
   */
  listGmailThreads: staffProcedure
    .input(
      z
        .object({
          folder: z.enum(["all", "inbox", "sent", "unread", "needs_review"]).optional().default("all"),
          studentContactId: z.number().optional().nullable(),
          parentContactId: z.number().optional().nullable(),
          searchQuery: z.string().optional(),
          limit: z.number().min(1).max(200).optional().default(50),
          offset: z.number().min(0).optional().default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      assertStaffEmailCommunicationAccess(ctx, "view");
      return await listEmailsAndThreads(input);
    }),

  /**
   * Retrieves a full email conversation thread in chronological order.
   */
  getGmailThread: staffProcedure
    .input(z.object({ gmailThreadId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      assertStaffEmailCommunicationAccess(ctx, "view");
      return await getEmailThreadById(input.gmailThreadId);
    }),

  /**
   * Marks an email message or entire conversation thread as read/unread.
   */
  markGmailRead: staffProcedure
    .input(
      z.object({
        gmailMessageId: z.string().optional(),
        gmailThreadId: z.string().optional(),
        isRead: z.boolean().optional().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertStaffEmailCommunicationAccess(ctx, "view");
      return await markEmailOrThreadRead(input);
    }),

  /**
   * Assigns, confirms, or reassigns the client/family and student association
   * for an email or thread (including resolving Needs Review items).
   */
  assignEmailAssociation: staffProcedure
    .input(
      z.object({
        emailIdOrMessageId: z.string().min(1),
        parentContactId: z.number().nullable(),
        studentContactId: z.number().nullable(),
        applyToThread: z.boolean().optional().default(true),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertStaffEmailCommunicationAccess(ctx, "edit");
      return await assignEmailAssociation({
        emailIdOrMessageId: input.emailIdOrMessageId,
        parentContactId: input.parentContactId,
        studentContactId: input.studentContactId,
        applyToThread: input.applyToThread,
        reason: input.reason,
        actorUserId: ctx.user.id,
        actorName: ctx.staffAccess?.name || ctx.user.name || "Waypoint Staff",
      });
    }),

  /**
   * Composes and sends an email or reply through the connected company Gmail account.
   */
  composeAndSendEmail: staffProcedure
    .input(
      z.object({
        toEmails: z.array(z.string().email()).min(1),
        ccEmails: z.array(z.string().email()).optional(),
        subject: z.string().min(1),
        bodyHtml: z.string().min(1),
        bodyText: z.string().optional(),
        parentContactId: z.number().optional().nullable(),
        studentContactId: z.number().optional().nullable(),
        gmailThreadId: z.string().optional().nullable(),
        replyToMessageId: z.string().optional().nullable(),
        templateId: z.number().optional().nullable(),
        portalVisible: z.boolean().optional().default(false),
        attachments: z
          .array(
            z.object({
              id: z.string(),
              fileName: z.string(),
              mimeType: z.string().default("application/octet-stream"),
              sizeBytes: z.number().default(0),
              url: z.string().optional(),
              clientFileId: z.number().optional().nullable(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertStaffEmailCommunicationAccess(ctx, "edit");
      return await composeAndSendEmail({
        ...input,
        actorUserId: ctx.user.id,
        actorName: ctx.staffAccess?.name || ctx.user.name || "Waypoint Staff",
      });
    }),

  /**
   * Publishes or unpublishes a matched client email/thread to the Parent Portal.
   * Newly synced Gmail messages default to internal-only (portalVisible: false).
   */
  setEmailPortalVisibility: staffProcedure
    .input(
      z.object({
        emailIdOrMessageId: z.string().min(1),
        portalVisible: z.boolean(),
        applyToThread: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertStaffEmailCommunicationAccess(ctx, "edit");
      const sa = ctx.staffAccess;
      const canManagePortalVisibility =
        sa?.isProtectedOwner ||
        sa?.hasAdminAccess ||
        sa?.primaryRole === "management" ||
        sa?.primaryRole === "advocate" ||
        checkBackendActionPermission(sa, "manage_portal_access");

      if (!canManagePortalVisibility) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Publishing correspondence to the Parent Portal requires Advocate or Management portal permissions.",
        });
      }

      return await setEmailPortalVisibility({
        emailIdOrMessageId: input.emailIdOrMessageId,
        portalVisible: input.portalVisible,
        applyToThread: input.applyToThread,
        actorUserId: ctx.user.id,
        actorName: ctx.staffAccess?.name || ctx.user.name || "Waypoint Staff",
      });
    }),
});

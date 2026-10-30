import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  requireStaffModule,
  assertClientContactOwnership,
} from "../_core/trpc";
import { checkBackendModuleAccess } from "../_core/staffAccess";
import {
  getParentProfile,
  updateParentProfileFields,
  requestEmailChange,
  verifyEmailChange,
  requestPhoneChange,
  verifyPhoneChange,
  getParentProfileChangeHistory,
  setContactConcern,
  resolveContactConcern,
  getStaffNotifications,
  markNotificationAsRead,
} from "../db/parentProfile";
import { resolveAccountContactId } from "../db/reviewTrackers";

async function assertParentProfileAccess(
  ctx: any,
  targetContactId: number | undefined,
  minStaffLevel: "view" | "edit"
) {
  if (ctx.staffAccess?.isStaff) {
    const cLevel = checkBackendModuleAccess(ctx.staffAccess, "contacts");
    const sLevel = checkBackendModuleAccess(ctx.staffAccess, "students");
    const allowed =
      minStaffLevel === "edit"
        ? cLevel === "edit" || sLevel === "edit"
        : cLevel !== "none" || sLevel !== "none";
    if (!allowed) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Access to parent profile records is restricted for your role.",
      });
    }
    return;
  }

  if (targetContactId !== undefined) {
    await assertClientContactOwnership(ctx, targetContactId);
  }
}

export const parentProfileRouter = router({
  /**
   * Get Parent Profile by parentContactId or studentContactId.
   * Accessible by authenticated portal clients (own family only) or CRM staff.
   */
  getProfile: protectedProcedure
    .input(
      z.object({
        parentContactId: z.number().optional(),
        studentContactId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      await assertParentProfileAccess(
        ctx,
        input.parentContactId ?? input.studentContactId,
        "view"
      );
      let targetParentId = input.parentContactId;

      if (!targetParentId && input.studentContactId) {
        const resolved = await resolveAccountContactId(input.studentContactId);
        targetParentId = resolved.accountId;
      }

      // If still not specified, try to resolve from user session
      if (!targetParentId) {
        const user = (ctx as any)?.user;
        if (user?.id) {
          targetParentId = Number(user.id);
        }
      }

      if (!targetParentId) {
        return null;
      }

      return getParentProfile(targetParentId);
    }),

  /**
   * Update Parent Profile fields directly.
   * Non-restricted fields update immediately and record an audit log.
   * Legal-name changes submitted by clients require staff review before altering contract identity.
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        parentContactId: z.number(),
        updates: z.object({
          preferredName: z.string().optional(),
          altPhone: z.string().optional(),
          address: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          zipCode: z.string().optional(),
          country: z.string().optional(),
          preferredCommunicationMethod: z.string().optional(),
          preferredCallingStartTime: z.string().optional(),
          preferredCallingEndTime: z.string().optional(),
          preferredCallingDays: z.string().optional(),
          emergencyContactName: z.string().optional(),
          emergencyContactRelationship: z.string().optional(),
          emergencyContactPhone: z.string().optional(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
        }),
        actorRole: z.enum(["client", "staff", "admin"]).optional(),
        actorName: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertParentProfileAccess(ctx, input.parentContactId, "edit");
      const user = (ctx as any)?.user;
      const isStaff = Boolean(ctx.staffAccess?.isStaff);
      const actorRole = isStaff ? "staff" : "client";
      const actorName = input.actorName || user?.name || (isStaff ? "Waypoint Staff" : "Parent Client");

      return updateParentProfileFields({
        parentContactId: input.parentContactId,
        updates: input.updates,
        actor: {
          id: user?.id ? String(user.id) : undefined,
          name: actorName,
          role: actorRole,
        },
        source: isStaff ? "internal_crm" : "client_portal",
      });
    }),

  /**
   * Request primary email change with link verification (Requirement 4).
   * Original email remains active until new email is confirmed.
   */
  requestEmailChange: protectedProcedure
    .input(
      z.object({
        parentContactId: z.number(),
        newEmail: z.string().email("Please provide a valid email address."),
        actorName: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertParentProfileAccess(ctx, input.parentContactId, "edit");
      const user = (ctx as any)?.user;
      const actorName = input.actorName || user?.name || "Parent Client";
      const isStaff = Boolean(ctx.staffAccess?.isStaff);

      return requestEmailChange({
        parentContactId: input.parentContactId,
        newEmail: input.newEmail.trim().toLowerCase(),
        actor: {
          id: user?.id ? String(user.id) : undefined,
          name: actorName,
          role: isStaff ? "staff" : "client",
        },
        source: isStaff ? "internal_crm" : "client_portal",
      });
    }),

  /**
   * Verify primary email change via token or staff override.
   */
  verifyEmailChange: protectedProcedure
    .input(
      z.object({
        token: z.string().optional(),
        parentContactId: z.number().optional(),
        staffOverride: z.boolean().optional(),
        staffName: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (input.staffOverride && !ctx.staffAccess?.isStaff) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Staff override requires authorized staff credentials.",
        });
      }
      await assertParentProfileAccess(ctx, input.parentContactId, "edit");
      const user = (ctx as any)?.user;
      const verifiedByStaff =
        input.staffOverride && ctx.staffAccess?.isStaff
          ? input.staffName || user?.name || "Waypoint Lead Advocate"
          : undefined;

      return verifyEmailChange({
        token: input.token,
        parentContactId: input.parentContactId,
        verifiedByStaff,
      });
    }),

  /**
   * Request primary phone change with SMS OTP verification (Requirement 5).
   * Original phone remains active until new phone is confirmed.
   */
  requestPhoneChange: protectedProcedure
    .input(
      z.object({
        parentContactId: z.number(),
        newPhone: z.string().min(7, "Please enter a valid phone number."),
        actorName: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertParentProfileAccess(ctx, input.parentContactId, "edit");
      const user = (ctx as any)?.user;
      const actorName = input.actorName || user?.name || "Parent Client";
      const isStaff = Boolean(ctx.staffAccess?.isStaff);

      return requestPhoneChange({
        parentContactId: input.parentContactId,
        newPhone: input.newPhone.trim(),
        actor: {
          id: user?.id ? String(user.id) : undefined,
          name: actorName,
          role: isStaff ? "staff" : "client",
        },
        source: isStaff ? "internal_crm" : "client_portal",
      });
    }),

  /**
   * Verify primary phone change via 6-digit code or staff override.
   */
  verifyPhoneChange: protectedProcedure
    .input(
      z.object({
        parentContactId: z.number(),
        code: z.string().optional(),
        staffOverride: z.boolean().optional(),
        staffName: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (input.staffOverride && !ctx.staffAccess?.isStaff) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Staff override requires authorized staff credentials.",
        });
      }
      await assertParentProfileAccess(ctx, input.parentContactId, "edit");
      const user = (ctx as any)?.user;
      const verifiedByStaff =
        input.staffOverride && ctx.staffAccess?.isStaff
          ? input.staffName || user?.name || "Waypoint Lead Advocate"
          : undefined;

      return verifyPhoneChange({
        parentContactId: input.parentContactId,
        code: input.code,
        verifiedByStaff,
      });
    }),

  /**
   * Internal CRM: Get permanent Contact Change History (Requirement 7).
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        parentContactId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      await assertParentProfileAccess(ctx, input.parentContactId, "view");
      return getParentProfileChangeHistory(input.parentContactId);
    }),

  /**
   * Staff-Only: Open a Contact Concern on a parent account (Requirement 9).
   */
  setContactConcern: requireStaffModule("contacts", "edit")
    .input(
      z.object({
        parentContactId: z.number(),
        reason: z.string(),
        notes: z.string().optional(),
        followUpDate: z.string().optional(),
        assignedTo: z.string().optional(),
        reportedBy: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = (ctx as any)?.user;
      const reportedBy = input.reportedBy || user?.name || "Waypoint Lead Advocate";

      return setContactConcern({
        parentContactId: input.parentContactId,
        reason: input.reason,
        notes: input.notes,
        followUpDate: input.followUpDate,
        assignedTo: input.assignedTo,
        reportedBy,
      });
    }),

  /**
   * Staff-Only: Resolve an active Contact Concern.
   */
  resolveContactConcern: requireStaffModule("contacts", "edit")
    .input(
      z.object({
        parentContactId: z.number(),
        resolutionNotes: z.string().optional(),
        resolvedBy: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = (ctx as any)?.user;
      const resolvedBy = input.resolvedBy || user?.name || "Waypoint Lead Advocate";

      return resolveContactConcern({
        parentContactId: input.parentContactId,
        resolutionNotes: input.resolutionNotes,
        resolvedBy,
      });
    }),

  /**
   * Internal Staff: List notifications for profile and contact alerts (Requirement 6).
   */
  getStaffNotifications: requireStaffModule("contacts", "view")
    .input(
      z.object({
        unreadOnly: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return getStaffNotifications(input?.unreadOnly ?? false);
    }),

  /**
   * Mark a staff notification as read.
   */
  markNotificationRead: requireStaffModule("contacts", "view")
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return markNotificationAsRead(input.id);
    }),
});

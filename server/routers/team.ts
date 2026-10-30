import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, staffProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { brainDumpItems, brainDumpImages } from "../../drizzle/schema";
import {
  resolveStaffAccess,
  listStaffAccessProfiles,
  deactivateStaffAccount,
  reactivateStaffAccount,
  updateStaffAccessPermissions,
  checkBackendModuleAccess,
  checkBackendActionPermission,
  type StaffRoleId,
  type ModuleAccessLevel,
  type CaseAccessLevel,
  type StaffAccountStatus,
} from "../_core/staffAccess";
import {
  onboardStaffEmployee,
  resendStaffInvitation,
  revokeStaffInvitation,
  expireStaffInvitation,
  getStaffInvitationByToken,
  acceptStaffInvitation,
} from "../_core/staffOnboarding";

const staffRoleEnum = z.enum([
  "management",
  "advocate",
  "call_center",
  "documentation",
  "technology",
  "operations",
  "none",
]);

const activeStaffRoleEnum = z.enum([
  "management",
  "advocate",
  "call_center",
  "documentation",
  "technology",
  "operations",
]);

export const teamRouter = router({

    // List all accepted team members for this owner
    listMembers: adminProcedure.query(async ({ ctx }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { teamInvites, users } = await import("../../drizzle/schema");
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
      const { teamInvites } = await import("../../drizzle/schema");
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
        const { teamInvites } = await import("../../drizzle/schema");
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
        const { teamInvites } = await import("../../drizzle/schema");
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
        const { teamInvites } = await import("../../drizzle/schema");
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
        const { teamInvites } = await import("../../drizzle/schema");
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
        const { teamInvites } = await import("../../drizzle/schema");
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
        const { teamInvites } = await import("../../drizzle/schema");
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
        const { caseAssignments, teamInvites } = await import("../../drizzle/schema");
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
        const { caseAssignments } = await import("../../drizzle/schema");
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
        const { caseAssignments } = await import("../../drizzle/schema");
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

    // ── Trusted Backend Staff Access & Deactivation (WAP 1A.1) ──
    getMyStaffAccess: protectedProcedure.query(async ({ ctx }) => {
      return await resolveStaffAccess(ctx.user);
    }),

    getStaffAccessList: staffProcedure.query(async ({ ctx }) => {
      const canAccessTeam =
        ctx.staffAccess.hasAdminAccess ||
        checkBackendModuleAccess(ctx.staffAccess, "team") !== "none" ||
        checkBackendActionPermission(ctx.staffAccess, "manage_employees") ||
        checkBackendActionPermission(ctx.staffAccess, "manage_roles");
      if (!canAccessTeam) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view the Team Management directory.",
        });
      }
      return await listStaffAccessProfiles();
    }),

    deactivateEmployee: staffProcedure
      .input(
        z.object({
          targetUserId: z.number().optional(),
          targetEmployeeId: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!input.targetUserId && !input.targetEmployeeId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Either targetUserId or targetEmployeeId is required.",
          });
        }
        const updated = await deactivateStaffAccount({
          actorUser: ctx.user,
          targetUserId: input.targetUserId,
          targetEmployeeId: input.targetEmployeeId,
          notes: input.notes,
        });
        return { success: true, profile: updated };
      }),

    reactivateEmployee: staffProcedure
      .input(
        z.object({
          targetUserId: z.number().optional(),
          targetEmployeeId: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!input.targetUserId && !input.targetEmployeeId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Either targetUserId or targetEmployeeId is required.",
          });
        }
        const updated = await reactivateStaffAccount({
          actorUser: ctx.user,
          targetUserId: input.targetUserId,
          targetEmployeeId: input.targetEmployeeId,
        });
        return { success: true, profile: updated };
      }),

    updateStaffAccess: staffProcedure
      .input(
        z.object({
          targetUserId: z.number().optional(),
          targetEmployeeId: z.string().optional(),
          primaryRole: staffRoleEnum.optional(),
          additionalRoles: z.array(staffRoleEnum).optional(),
          hasAdminAccess: z.boolean().optional(),
          isProtectedOwner: z.boolean().optional(),
          accountStatus: z.enum(["active", "on_leave", "inactive"]).optional(),
          modulePermissions: z.record(z.string(), z.enum(["none", "view", "edit"])).optional(),
          caseWorkspaceAccess: z
            .record(z.string(), z.enum(["none", "view", "edit", "manage"]))
            .optional(),
          permissionOverrides: z.record(z.string(), z.boolean()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const updated = await updateStaffAccessPermissions({
          actorUser: ctx.user,
          targetUserId: input.targetUserId,
          targetEmployeeId: input.targetEmployeeId,
          primaryRole: input.primaryRole as StaffRoleId | undefined,
          additionalRoles: input.additionalRoles as StaffRoleId[] | undefined,
          hasAdminAccess: input.hasAdminAccess,
          isProtectedOwner: input.isProtectedOwner,
          accountStatus: input.accountStatus as StaffAccountStatus | undefined,
          modulePermissions: input.modulePermissions as Record<string, ModuleAccessLevel> | undefined,
          caseWorkspaceAccess: input.caseWorkspaceAccess as Record<string, CaseAccessLevel> | undefined,
          permissionOverrides: input.permissionOverrides as Record<string, boolean> | undefined,
        });
        return { success: true, profile: updated };
      }),

    // ── Employee Onboarding & Invitation Lifecycle (WAP 1A.3) ──
    onboardEmployee: staffProcedure
      .input(
        z.object({
          name: z.string().min(1),
          preferredName: z.string().optional(),
          email: z.string().email(),
          phone: z.string().optional(),
          jobTitle: z.string().min(1),
          employmentType: z.string().optional(),
          department: z.string().optional(),
          normalScheduleSummary: z.string().optional(),
          primaryRole: activeStaffRoleEnum,
          additionalRoles: z.array(activeStaffRoleEnum).optional(),
          modulePermissions: z.record(z.string(), z.enum(["none", "view", "edit"])).optional(),
          caseWorkspaceAccess: z
            .record(z.string(), z.enum(["none", "view", "edit", "manage"]))
            .optional(),
          permissionOverrides: z.record(z.string(), z.boolean()).optional(),
          sendInvite: z.boolean().optional(),
          originUrl: z.string().optional(),
          expiresInMs: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await onboardStaffEmployee({
          actorUser: ctx.user,
          ...input,
        });
      }),

    resendEmployeeInvitation: staffProcedure
      .input(
        z.object({
          targetUserId: z.number().optional(),
          targetEmployeeId: z.string().optional(),
          originUrl: z.string().optional(),
          expiresInMs: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!input.targetUserId && !input.targetEmployeeId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Either targetUserId or targetEmployeeId is required.",
          });
        }
        return await resendStaffInvitation({
          actorUser: ctx.user,
          targetUserId: input.targetUserId,
          targetEmployeeId: input.targetEmployeeId,
          originUrl: input.originUrl,
          expiresInMs: input.expiresInMs,
        });
      }),

    revokeEmployeeInvitation: staffProcedure
      .input(
        z.object({
          targetUserId: z.number().optional(),
          targetEmployeeId: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!input.targetUserId && !input.targetEmployeeId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Either targetUserId or targetEmployeeId is required.",
          });
        }
        return await revokeStaffInvitation({
          actorUser: ctx.user,
          targetUserId: input.targetUserId,
          targetEmployeeId: input.targetEmployeeId,
        });
      }),

    expireEmployeeInvitation: staffProcedure
      .input(
        z.object({
          targetUserId: z.number().optional(),
          targetEmployeeId: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!input.targetUserId && !input.targetEmployeeId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Either targetUserId or targetEmployeeId is required.",
          });
        }
        return await expireStaffInvitation({
          actorUser: ctx.user,
          targetUserId: input.targetUserId,
          targetEmployeeId: input.targetEmployeeId,
        });
      }),

    getEmployeeInvitation: publicProcedure
      .input(z.object({ token: z.string().min(1) }))
      .query(async ({ input }) => {
        return await getStaffInvitationByToken(input.token);
      }),

    acceptEmployeeInvitation: publicProcedure
      .input(
        z.object({
          token: z.string().min(1),
          acceptingOpenId: z.string().optional(),
          acceptingEmail: z.string().email().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await acceptStaffInvitation({
          token: input.token,
          acceptingOpenId: input.acceptingOpenId || ctx.user?.openId,
          acceptingEmail: input.acceptingEmail || ctx.user?.email || undefined,
        });
      }),
});

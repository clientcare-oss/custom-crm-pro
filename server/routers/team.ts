import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { brainDumpItems, brainDumpImages } from "../../drizzle/schema";

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
  
});

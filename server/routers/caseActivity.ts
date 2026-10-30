import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  staffProcedure,
  assertClientContactOwnership,
} from "../_core/trpc";
import {
  checkBackendCaseAccess,
  checkBackendModuleAccess,
} from "../_core/staffAccess";
import { getStudentCaseTimeline, recordCaseActivity } from "../services/caseActivityService";
import { getUnifiedStudentActivityFeed } from "../services/gmailCommunicationHub";
import { askCaseHistory } from "../services/caseHistoryAi";
import * as db from "../db";

function assertStaffActivityEdit(ctx: any) {
  const caseLvl = checkBackendCaseAccess(ctx.staffAccess, "activity");
  const modLvl = checkBackendModuleAccess(ctx.staffAccess, "students");
  if (caseLvl !== "edit" && caseLvl !== "manage" && modLvl !== "edit") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Modifying Student Case Activity Timeline is restricted for your role.",
    });
  }
}

export const caseActivityRouter = router({
  /**
   * Retrieves the full Case Activity Timeline for a student.
   * Auto-seeds authentic default milestones if no entries exist yet.
   */
  list: protectedProcedure
    .input(
      z.object({
        studentContactId: z.number(),
        caseId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.staffAccess?.isStaff) {
        if (checkBackendCaseAccess(ctx.staffAccess, "activity") === "none") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access to Student Case Activity Timeline is restricted for your role.",
          });
        }
      } else {
        await assertClientContactOwnership(ctx, input.studentContactId);
      }
      return await getStudentCaseTimeline(input.studentContactId, input.caseId);
    }),

  /**
   * WAP 1B.1: HoneyBook-style continuous, scrollable communication & activity feed
   * with paginated infinite scrolling, date separators, category filters, email sub-filters, and search.
   */
  unifiedFeed: protectedProcedure
    .input(
      z.object({
        studentContactId: z.number(),
        caseId: z.string().optional(),
        categoryFilter: z
          .enum(["all", "emails", "documents", "meetings", "notes"])
          .optional()
          .default("all"),
        emailSubFilter: z
          .enum(["all", "inbox", "sent", "unread", "needs_review"])
          .optional()
          .default("all"),
        searchQuery: z.string().optional(),
        limit: z.number().min(1).max(200).optional().default(25),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.staffAccess?.isStaff) {
        if (checkBackendCaseAccess(ctx.staffAccess, "activity") === "none") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access to Student Case Activity Timeline is restricted for your role.",
          });
        }
      } else {
        await assertClientContactOwnership(ctx, input.studentContactId);
      }
      return await getUnifiedStudentActivityFeed(input);
    }),

  /**
   * Automatically records a meaningful action or manual decision into the timeline.
   */
  create: staffProcedure
    .input(
      z.object({
        studentContactId: z.number(),
        caseId: z.string().optional(),
        eventType: z.string().default("general"),
        title: z.string().min(1),
        description: z.string().min(1),
        whyReason: z.string().optional(),
        ownerName: z.string().min(1),
        ownerRole: z.string().optional().default("Advocate"),
        sources: z
          .array(
            z.object({
              type: z.enum(["email", "call", "note", "document", "task"]),
              label: z.string(),
              url: z.string().optional(),
              excerpt: z.string().optional(),
              id: z.union([z.string(), z.number()]).optional(),
            })
          )
          .optional(),
        quoteText: z.string().optional(),
        nextStepAction: z.string().optional(),
        isActionNeeded: z.boolean().optional().default(false),
        isCompleted: z.boolean().optional().default(false),
        categoryColor: z.string().optional().default("blue"),
        eventDate: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertStaffActivityEdit(ctx);
      const created = await recordCaseActivity({
        studentContactId: input.studentContactId,
        caseId: input.caseId,
        eventType: input.eventType,
        title: input.title,
        description: input.description,
        whyReason: input.whyReason,
        ownerName: input.ownerName,
        ownerRole: input.ownerRole,
        sources: input.sources,
        quoteText: input.quoteText,
        nextStepAction: input.nextStepAction,
        isActionNeeded: input.isActionNeeded,
        isCompleted: input.isCompleted,
        categoryColor: input.categoryColor,
        eventDate: input.eventDate,
      });
      return created;
    }),

  /**
   * Toggles the completion status of a next step or action item in the timeline.
   */
  toggleComplete: staffProcedure
    .input(
      z.object({
        id: z.number(),
        isCompleted: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertStaffActivityEdit(ctx);
      return await db.toggleCaseActivityCompletion(input.id, input.isCompleted);
    }),

  /**
   * Updates an existing activity timeline entry.
   */
  update: staffProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        whyReason: z.string().optional(),
        nextStepAction: z.string().optional(),
        isCompleted: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertStaffActivityEdit(ctx);
      const { id, ...updates } = input;
      return await db.updateCaseActivityItem(id, updates);
    }),

  /**
   * Deletes an activity timeline entry.
   */
  delete: staffProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      assertStaffActivityEdit(ctx);
      return await db.deleteCaseActivityItem(input.id);
    }),

  /**
   * Ask Case History: AI intelligence engine providing instant, accurate answers
   * and source citations from the student's complete case story.
   */
  ask: staffProcedure
    .input(
      z.object({
        studentContactId: z.number(),
        query: z.string().min(1),
        studentName: z.string().optional(),
        caseId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (
        checkBackendCaseAccess(ctx.staffAccess, "activity") === "none" ||
        checkBackendCaseAccess(ctx.staffAccess, "files") === "none"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Ask Case History is restricted to staff with full case file access.",
        });
      }
      return await askCaseHistory({
        studentContactId: input.studentContactId,
        query: input.query,
        studentName: input.studentName,
        caseId: input.caseId,
      });
    }),
});

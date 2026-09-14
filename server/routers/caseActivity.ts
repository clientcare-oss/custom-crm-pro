import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getStudentCaseTimeline, recordCaseActivity } from "../services/caseActivityService";
import { askCaseHistory } from "../services/caseHistoryAi";
import * as db from "../db";

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
    .query(async ({ input }) => {
      return await getStudentCaseTimeline(input.studentContactId, input.caseId);
    }),

  /**
   * Automatically records a meaningful action or manual decision into the timeline.
   */
  create: protectedProcedure
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
    .mutation(async ({ input }) => {
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
  toggleComplete: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        isCompleted: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.toggleCaseActivityCompletion(input.id, input.isCompleted);
    }),

  /**
   * Updates an existing activity timeline entry.
   */
  update: protectedProcedure
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
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      return await db.updateCaseActivityItem(id, updates);
    }),

  /**
   * Deletes an activity timeline entry.
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await db.deleteCaseActivityItem(input.id);
    }),

  /**
   * Ask Case History: AI intelligence engine providing instant, accurate answers
   * and source citations from the student's complete case story.
   */
  ask: protectedProcedure
    .input(
      z.object({
        studentContactId: z.number(),
        query: z.string().min(1),
        studentName: z.string().optional(),
        caseId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await askCaseHistory({
        studentContactId: input.studentContactId,
        query: input.query,
        studentName: input.studentName,
        caseId: input.caseId,
      });
    }),
});

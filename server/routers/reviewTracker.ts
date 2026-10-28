import { z } from "zod";
import * as db from "../db";
import { router, publicProcedure } from "../_core/trpc";

export const reviewTrackerRouter = router({
  /**
   * Get the account-level review tracker for a given student ID.
   * Sibling students automatically resolve to the shared parent account tracker.
   */
  getByStudent: publicProcedure
    .input(z.object({ studentId: z.number() }))
    .query(async ({ input }) => {
      return await db.getReviewTrackerForStudent(input.studentId);
    }),

  /**
   * Get review tracker by account (parent) ID directly.
   */
  getByAccount: publicProcedure
    .input(z.object({ accountId: z.number() }))
    .query(async ({ input }) => {
      return await db.getReviewTrackerByAccountId(input.accountId);
    }),

  /**
   * Send / record a review request to the family account.
   */
  requestReview: publicProcedure
    .input(
      z.object({
        accountId: z.number(),
        studentId: z.number().optional(),
        requestedBy: z.string().default("Byron Honea"),
        requestChannel: z.enum(["email", "sms", "portal"]).default("email"),
        customNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.recordReviewRequest(input);
    }),

  /**
   * Record a follow-up reminder sent.
   */
  sendFollowUp: publicProcedure
    .input(
      z.object({
        accountId: z.number(),
        studentId: z.number().optional(),
        sentBy: z.string().default("Byron Honea"),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.recordReviewFollowUp(input);
    }),

  /**
   * Detect / match a Google Review for the family.
   */
  detectGoogleReview: publicProcedure
    .input(
      z.object({
        accountId: z.number(),
        authorName: z.string(),
        rating: z.number().default(5),
        snippet: z.string().optional(),
        reviewUrl: z.string().optional(),
        reviewDate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.detectOrMatchGoogleReview(input);
    }),

  /**
   * Mandatory Employee Verification:
   * Explicitly confirms the review, halts reminders, prepares thank-you email draft,
   * and logs to Activity Timeline.
   */
  verifyReview: publicProcedure
    .input(
      z.object({
        accountId: z.number(),
        verifiedBy: z.string().min(1, "Employee name is required"),
        notes: z.string().optional(),
        studentId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.verifyReviewByEmployee(input);
    }),

  /**
   * Update the prepared thank-you email draft before staff approval.
   */
  updateThankYouDraft: publicProcedure
    .input(
      z.object({
        accountId: z.number(),
        subject: z.string(),
        body: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.updateThankYouDraft(input);
    }),

  /**
   * Approve & dispatch the personalized thank-you email.
   * Requires staff approval; never sends automatically!
   */
  sendThankYou: publicProcedure
    .input(
      z.object({
        accountId: z.number(),
        sentBy: z.string().default("Byron Honea"),
        studentId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.sendThankYouEmail(input);
    }),

  /**
   * Update confidential internal advocate notes.
   */
  updateInternalNotes: publicProcedure
    .input(
      z.object({
        accountId: z.number(),
        internalNotes: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.updateReviewInternalNotes(input);
    }),
});

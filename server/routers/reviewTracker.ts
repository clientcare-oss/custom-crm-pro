import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import {
  router,
  protectedProcedure,
  requireStaffModule,
  assertClientContactOwnership,
} from "../_core/trpc";
import { checkBackendModuleAccess } from "../_core/staffAccess";

export const reviewTrackerRouter = router({
  /**
   * Get the account-level review tracker for a given student ID.
   * Sibling students automatically resolve to the shared parent account tracker.
   */
  getByStudent: requireStaffModule("contacts", "view")
    .input(z.object({ studentId: z.number() }))
    .query(async ({ input }) => {
      return await db.getReviewTrackerForStudent(input.studentId);
    }),

  /**
   * Get review tracker by account (parent) ID directly.
   */
  getByAccount: requireStaffModule("contacts", "view")
    .input(z.object({ accountId: z.number() }))
    .query(async ({ input }) => {
      return await db.getReviewTrackerByAccountId(input.accountId);
    }),

  /**
   * Evaluate Review Eligibility (Smart Account-Level Check)
   */
  checkEligibility: requireStaffModule("contacts", "view")
    .input(
      z.object({
        accountId: z.number().optional(),
        studentId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      let targetAccountId = input.accountId;
      if (!targetAccountId && input.studentId) {
        const { accountId } = await db.resolveAccountContactId(input.studentId);
        targetAccountId = accountId;
      }
      if (!targetAccountId) {
        throw new Error("Either accountId or studentId must be provided.");
      }
      return await db.evaluateReviewEligibility(targetAccountId);
    }),

  /**
   * Create Review Opportunity (Trigger B: Milestone or manual trigger)
   */
  createOpportunity: requireStaffModule("contacts", "edit")
    .input(
      z.object({
        studentId: z.number(),
        milestoneTitle: z.string().default("Successful Advocacy Milestone"),
        assignedAdvocate: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.triggerMilestoneReviewOpportunity({
        studentContactId: input.studentId,
        milestoneTitle: input.milestoneTitle,
        assignedAdvocate: input.assignedAdvocate,
        notes: input.notes,
      });
    }),

  /**
   * Action: Remind Me Later
   * Stores a persistent reminder for tomorrow, 3 days, 7 days, or a custom chosen date.
   */
  remindLater: requireStaffModule("contacts", "edit")
    .input(
      z.object({
        accountId: z.number(),
        studentId: z.number().optional(),
        reminderDate: z.string(), // ISO date string
        notes: z.string().optional(),
        employee: z.string().default("Byron Honea"),
      })
    )
    .mutation(async ({ input }) => {
      return await db.remindLater(input);
    }),

  /**
   * Action: Not Appropriate Right Now (Suppression)
   * Dismisses the opportunity without sending anything or negative judgment.
   */
  suppressOpportunity: requireStaffModule("contacts", "edit")
    .input(
      z.object({
        accountId: z.number(),
        studentId: z.number().optional(),
        reason: z.string().min(1, "Suppression reason is required"),
        notes: z.string().optional(),
        suppressedBy: z.string().default("Byron Honea"),
      })
    )
    .mutation(async ({ input }) => {
      return await db.suppressReviewOpportunity(input);
    }),

  /**
   * Reconsider a previously suppressed review opportunity.
   */
  reconsiderSuppression: requireStaffModule("contacts", "edit")
    .input(
      z.object({
        accountId: z.number(),
        studentId: z.number().optional(),
        employee: z.string().default("Byron Honea"),
      })
    )
    .mutation(async ({ input }) => {
      return await db.reconsiderSuppression(input);
    }),

  /**
   * Action: Client Confirmed Review
   * Parent reports they have posted a review. Halts future reminders and queues thank-you draft.
   */
  confirmClientReview: protectedProcedure
    .input(
      z.object({
        accountId: z.number(),
        studentId: z.number().optional(),
        confirmedBy: z.string().default("Byron Honea"),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.staffAccess?.isStaff) {
        if (checkBackendModuleAccess(ctx.staffAccess, "contacts") !== "edit") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Modifying review records is restricted for your role.",
          });
        }
      } else {
        await assertClientContactOwnership(ctx, input.accountId);
        if (input.studentId !== undefined) {
          await assertClientContactOwnership(ctx, input.studentId);
        }
      }
      return await db.confirmReviewByClient(input);
    }),

  /**
   * List all pending or actionable review opportunities for Staff Dashboard & Notifications.
   */
  listPendingOpportunities: requireStaffModule("contacts", "view")
    .input(
      z.object({
        filterAdvocate: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return await db.listPendingReviewOpportunities(input?.filterAdvocate);
    }),

  /**
   * Send / record a review request to the family account.
   */
  requestReview: requireStaffModule("contacts", "edit")
    .input(
      z.object({
        accountId: z.number(),
        studentId: z.number().optional(),
        requestedBy: z.string().default("Byron Honea"),
        requestChannel: z.enum(["email", "sms", "portal"]).default("email"),
        customSubject: z.string().optional(),
        customBody: z.string().optional(),
        reviewUrl: z.string().optional(),
        customNotes: z.string().optional(),
        followUpDays: z.number().default(14),
      })
    )
    .mutation(async ({ input }) => {
      return await db.recordReviewRequest(input);
    }),

  /**
   * Record a follow-up reminder sent.
   */
  sendFollowUp: requireStaffModule("contacts", "edit")
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
  detectGoogleReview: requireStaffModule("contacts", "edit")
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
  verifyReview: requireStaffModule("contacts", "edit")
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
  updateThankYouDraft: requireStaffModule("contacts", "edit")
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
  sendThankYou: requireStaffModule("contacts", "edit")
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
  updateInternalNotes: requireStaffModule("contacts", "edit")
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

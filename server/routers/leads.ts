import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { resolveOrCreateFamilyIdentity } from "../services/familyIdentityService";
import {
  checkInquiryMatches,
  createServiceInquiry,
  logCallToExistingLead,
  listHydratedLeads,
  getHydratedLeadWorkspace,
} from "../services/leadJourneyService";
import {
  updateInquiryDetails,
  scheduleLeadDiscovery,
  startLeadDiscoveryNow,
  completeLeadDiscovery,
  saveLeadDecision,
  reopenLeadFromClosed,
  advanceOnboardingStep,
  activateClientFromLead,
} from "../services/leadJourneyActions";

const leadStatusEnum = z.enum([
  "New",
  "14 Day Follow-up",
  "30 Day Follow-up",
  "60 Day Follow-up",
  "90 Day Follow-up",
  "Discovery Completed",
  "Approved for Enrollment",
  "Ready for Archive",
  "Won",
  "Lost",
]);

const inquiryStudentSchema = z.object({
  id: z.number().optional(),
  firstName: z.string().min(1),
  lastName: z.string().optional().default(""),
  gradeLevel: z.string().optional(),
  schoolName: z.string().optional(),
  iepOr504: z.string().optional(),
  diagnosis: z.string().optional(),
  challenges: z.string().optional(),
});

export const leadsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await db.getLeadsByOwner(ctx.user.id);
  }),

  listHydrated: protectedProcedure.query(async ({ ctx }) => {
    return await listHydratedLeads(ctx.user.id);
  }),

  get: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return await db.getLeadById(input.id, ctx.user.id);
    }),

  getWorkspace: protectedProcedure
    .input(
      z.object({
        id: z.number().optional(),
        leadId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const targetId = input.leadId ?? input.id ?? 0;
      const ws = await getHydratedLeadWorkspace(targetId, ctx.user.id);
      if (!ws) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead workspace not found" });
      }
      return ws;
    }),

  checkMatches: protectedProcedure
    .input(
      z.object({
        parentFirstName: z.string().optional(),
        parentLastName: z.string().optional(),
        parentEmail: z.string().optional(),
        parentPhone: z.string().optional(),
        studentName: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await checkInquiryMatches({
        ownerId: ctx.user.id,
        ...input,
      });
    }),

  createInquiry: protectedProcedure
    .input(
      z.object({
        existingContactId: z.number().optional(),
        forceCreateSeparate: z.boolean().optional(),
        parent: z.object({
          firstName: z.string().min(1),
          lastName: z.string().optional().default(""),
          phone: z.string().optional(),
          email: z.string().optional(),
          preferredContactMethod: z.string().optional(),
          availability: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
        }),
        students: z.array(inquiryStudentSchema).default([]),
        concerns: z.string().default(""),
        desiredOutcome: z.string().default(""),
        source: z.string().optional(),
        originatingCallLogId: z.number().optional(),
        callNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await createServiceInquiry({
        ownerId: ctx.user.id,
        actorName: ctx.user.name || ctx.user.email || "Waypoint Staff",
        ...input,
      });
    }),

  logCallToLead: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        callLogId: z.number().optional(),
        callNotes: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await logCallToExistingLead({
        ownerId: ctx.user.id,
        leadId: input.leadId,
        callLogId: input.callLogId,
        callNotes: input.callNotes,
        actorName: ctx.user.name || ctx.user.email || "Call Center Staff",
      });
    }),

  updateInquiry: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        parent: z
          .object({
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            phone: z.string().optional(),
            email: z.string().optional(),
            preferredContactMethod: z.string().optional(),
            availability: z.string().optional(),
          })
          .optional(),
        students: z.array(inquiryStudentSchema).optional(),
        concerns: z.string().optional(),
        desiredOutcome: z.string().optional(),
        timeZone: z.string().optional(),
        assignedAdvocate: z.string().optional(),
        sendSchedulingLink: z.boolean().optional(),
        recordContactAttempt: z.string().optional(),
        progressDirectlyToDecision: z.boolean().optional(),
        directToDecisionNote: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await updateInquiryDetails({
        ownerId: ctx.user.id,
        actorName: ctx.user.name || ctx.user.email || "Waypoint Staff",
        ...input,
      });
    }),

  scheduleDiscovery: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        startTime: z.union([z.date(), z.string()]),
        durationMinutes: z.number().optional(),
        assignedAdvocateName: z.string().optional(),
        timeZone: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await scheduleLeadDiscovery({
        ownerId: ctx.user.id,
        leadId: input.leadId,
        startTime: new Date(input.startTime),
        durationMinutes: input.durationMinutes,
        assignedAdvocateName: input.assignedAdvocateName,
        timeZone: input.timeZone,
        notes: input.notes,
        actorName: ctx.user.name || ctx.user.email || "Waypoint Staff",
      });
    }),

  startDiscoveryNow: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await startLeadDiscoveryNow({
        ownerId: ctx.user.id,
        leadId: input.leadId,
        actorName: ctx.user.name || ctx.user.email || "Lead Special Education Advocate",
      });
    }),

  completeDiscovery: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        outcome: z.enum([
          "completed",
          "no_answer",
          "reschedule_needed",
          "follow_up_later",
          "cancelled",
          "declined",
        ]),
        note: z.string().optional(),
        nextActionLabel: z.string().optional(),
        nextActionDate: z.union([z.date(), z.string(), z.null()]).optional(),
        rescheduleStartTime: z.union([z.date(), z.string(), z.null()]).optional(),
        declineReason: z.string().optional(),
        theirStoryNotes: z.string().optional(),
        howItWorksNotes: z.string().optional(),
        additionalNotes: z.string().optional(),
        questionNotes: z.record(z.string(), z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await completeLeadDiscovery({
          ownerId: ctx.user.id,
          leadId: input.leadId,
          outcome: input.outcome,
          note: input.note,
          nextActionLabel: input.nextActionLabel,
          nextActionDate: input.nextActionDate ? new Date(input.nextActionDate) : null,
          rescheduleStartTime: input.rescheduleStartTime
            ? new Date(input.rescheduleStartTime)
            : null,
          declineReason: input.declineReason,
          theirStoryNotes: input.theirStoryNotes,
          howItWorksNotes: input.howItWorksNotes,
          additionalNotes: input.additionalNotes,
          questionNotes: input.questionNotes,
          actorName: ctx.user.name || ctx.user.email || "Lead Special Education Advocate",
        });
      } catch (err: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err?.message || "Failed to complete discovery outcome.",
        });
      }
    }),

  saveDecision: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        choice: z.enum([
          "considering",
          "ready_to_start",
          "ready_to_proceed",
          "needs_time",
          "another_conversation",
          "not_proceeding",
          "declined",
        ]),
        selectedPlanKey: z.string().optional(),
        enrollmentMode: z.enum(["standard", "custom"]).optional(),
        customPlanName: z.string().optional(),
        customMonthlyPrice: z.number().optional(),
        paymentStructure: z.enum(["monthly_autopay", "pay_in_full"]).optional(),
        billingArrangement: z.enum(["autopay", "manual_invoice"]).optional(),
        manualInvoiceDueDate: z.string().optional(),
        manualInvoiceReason: z.string().optional(),
        reason: z.string().optional(),
        followUpDate: z.union([z.date(), z.string(), z.null()]).optional(),
        followUpSequenceId: z.number().nullable().optional(),
        note: z.string().optional(),
        conversationPurpose: z.string().optional(),
        conversationScheduledAt: z.union([z.date(), z.string(), z.null()]).optional(),
        nextContactAction: z.string().optional(),
        nextContactDate: z.union([z.date(), z.string(), z.null()]).optional(),
        closedReason: z.string().optional(),
        assignedStaff: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await saveLeadDecision({
          ownerId: ctx.user.id,
          leadId: input.leadId,
          choice: input.choice,
          selectedPlanKey: input.selectedPlanKey,
          enrollmentMode: input.enrollmentMode,
          customPlanName: input.customPlanName,
          customMonthlyPrice: input.customMonthlyPrice,
          paymentStructure: input.paymentStructure,
          billingArrangement: input.billingArrangement,
          manualInvoiceDueDate: input.manualInvoiceDueDate,
          manualInvoiceReason: input.manualInvoiceReason,
          reason: input.reason,
          followUpDate: input.followUpDate ? new Date(input.followUpDate) : null,
          followUpSequenceId: input.followUpSequenceId,
          note: input.note,
          conversationPurpose: input.conversationPurpose,
          conversationScheduledAt: input.conversationScheduledAt
            ? new Date(input.conversationScheduledAt)
            : null,
          nextContactAction: input.nextContactAction,
          nextContactDate: input.nextContactDate ? new Date(input.nextContactDate) : null,
          closedReason: input.closedReason,
          assignedStaff: input.assignedStaff,
          actorName: ctx.user.name || ctx.user.email || "Lead Special Education Advocate",
        });
      } catch (err: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err?.message || "Failed to save family decision.",
        });
      }
    }),

  reopenLead: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        targetStage: z.enum(["discovery", "decision"]).optional(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await reopenLeadFromClosed({
        ownerId: ctx.user.id,
        leadId: input.leadId,
        targetStage: input.targetStage,
        note: input.note,
        actorName: ctx.user.name || ctx.user.email || "Lead Special Education Advocate",
      });
    }),

  advanceOnboarding: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        action: z.enum([
          "prepare_offer",
          "send_offer",
          "select_plan",
          "send_agreement",
          "mark_agreement_signed",
          "issue_manual_invoice",
          "send_purchase_link",
          "verify_payment",
          "continue_to_onboarding",
        ]),
        planKey: z.string().optional(),
        paymentStructure: z.enum(["monthly_autopay", "pay_in_full"]).optional(),
        signerName: z.string().optional(),
        paymentReference: z.string().optional(),
        recipient: z.string().optional(),
        messageContent: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await advanceOnboardingStep({
          ownerId: ctx.user.id,
          ...input,
          actorName: ctx.user.name || ctx.user.email || "Lead Special Education Advocate",
        });
      } catch (err: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err?.message || "Failed to update onboarding requirement.",
        });
      }
    }),

  activateClient: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await activateClientFromLead({
          ownerId: ctx.user.id,
          leadId: input.leadId,
          actorName: ctx.user.name || ctx.user.email || "Lead Special Education Advocate",
        });
      } catch (err: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err?.message || "Cannot activate client until onboarding requirements are met.",
        });
      }
    }),

  create: adminProcedure
    .input(
      z.object({
        contactId: z.number().optional(),
        source: z.string().optional(),
        status: leadStatusEnum.optional(),
        value: z.string().optional(),
        notes: z.string().optional(),
        parentName: z.string().optional(),
        parentPhone: z.string().optional(),
        studentName: z.string().optional(),
        studentAge: z.number().optional(),
        studentGrade: z.string().optional(),
        discoveryCallDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let contactId = input.contactId;

      if (!contactId && (input.parentName || input.parentPhone)) {
        const rawParent = (input.parentName || "").trim();
        const pParts = rawParent.split(/\s+/);
        const parentFirstName = pParts[0] || "Unknown";
        const parentLastName = pParts.slice(1).join(" ") || "Parent";

        let studentInfo: any = undefined;
        if (input.studentName) {
          const sParts = input.studentName.trim().split(/\s+/);
          studentInfo = {
            firstName: sParts[0] || "Student",
            lastName: sParts.slice(1).join(" ") || parentLastName,
            gradeLevel: input.studentGrade,
          };
        }

        const identity = await resolveOrCreateFamilyIdentity({
          parent: {
            firstName: parentFirstName,
            lastName: parentLastName,
            phone: input.parentPhone,
          },
          student: studentInfo,
          leadSource: input.source || "Manual Entry",
          ownerId: ctx.user.id,
        });

        contactId = identity.parentContactId;

        if (identity.leadId) {
          await db.updateLead(identity.leadId, ctx.user.id, {
            ...input,
            contactId,
          });
          return { id: identity.leadId };
        }
      }

      return await db.createLead(
        {
          ...input,
          contactId,
        },
        ctx.user.id
      );
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        contactId: z.number().optional(),
        source: z.string().optional(),
        status: leadStatusEnum.optional(),
        value: z.string().optional(),
        notes: z.string().optional(),
        parentName: z.string().optional(),
        parentPhone: z.string().optional(),
        studentName: z.string().optional(),
        studentAge: z.number().optional(),
        studentGrade: z.string().optional(),
        discoveryCallDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return await db.updateLead(id, ctx.user.id, data);
    }),
});

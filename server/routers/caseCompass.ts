import { z } from "zod";
import * as db from "../db";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { generateCaseCompassAiUpdate } from "../compassAi";

export const caseCompassRouter = router({
  // Admin: list all portal clients (users with role=client)
  portalClients: adminProcedure.query(async () => {
    return await db.getPortalClients();
  }),

  // Admin / Staff: get compass for a specific case or student
  get: adminProcedure
    .input(z.object({ caseId: z.string().optional(), studentId: z.number().optional() }))
    .query(async ({ input }) => {
      if (input.studentId && !input.caseId) {
        return await db.getCaseCompassByStudent(input.studentId);
      }
      if (!input.caseId) return null;
      return await db.getCaseCompass(input.caseId, input.studentId);
    }),

  // Admin / Staff: get compass directly by studentId
  getByStudent: adminProcedure
    .input(z.object({ studentId: z.number() }))
    .query(async ({ input }) => {
      return await db.getCaseCompassByStudent(input.studentId);
    }),

  // Admin / Staff: list all available meeting transcripts & closeouts for a student
  getAvailableTranscripts: adminProcedure
    .input(z.object({ studentId: z.number() }))
    .query(async ({ input }) => {
      return await db.getAvailableCompassTranscripts(input.studentId);
    }),

  // Admin / Staff: get full versioned history for a specific case/student
  history: adminProcedure
    .input(z.object({ caseId: z.string().optional(), studentId: z.number().optional() }))
    .query(async ({ input }) => {
      return await db.getCaseCompassHistory(input.caseId || "", input.studentId);
    }),

  // Admin / Staff: get all pending or reviewed drafts for a student/case
  drafts: adminProcedure
    .input(z.object({ caseId: z.string().optional(), studentId: z.number().optional() }))
    .query(async ({ input }) => {
      return await db.getCaseCompassDrafts(input.caseId || "", input.studentId);
    }),

  // Admin / Staff: get specific draft by ID
  draftById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getCaseCompassDraftById(input.id);
    }),

  // Admin / Staff: trigger AI analysis to generate a 5-field Case Compass draft
  generateAiDraft: adminProcedure
    .input(
      z.object({
        studentId: z.number(),
        caseId: z.string().optional(),
        meetingId: z.string().optional(),
        transcriptText: z.string().optional(),
        extraInstructions: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const advocateName = (ctx.user as any)?.name || (ctx.user as any)?.email || "Lead Special Education Advocate";
      const resolvedCaseId = input.caseId || `CASE-${input.studentId}`;

      const aiResult = await generateCaseCompassAiUpdate({
        studentId: input.studentId,
        caseId: resolvedCaseId,
        meetingId: input.meetingId,
        transcriptText: input.transcriptText,
        extraInstructions: input.extraInstructions,
        advocateName,
      });

      // Save as pending draft for advocate review
      const draft = await db.createCaseCompassDraft({
        caseId: resolvedCaseId,
        studentId: input.studentId,
        currentStatus: aiResult.currentStatus,
        nextStep: aiResult.nextStep,
        whoHasBall: aiResult.whoHasBall,
        ideaRiskLevel: aiResult.ideaRiskLevel,
        meetingId: input.meetingId,
        transcriptId: input.meetingId,
        sourceType: "ai",
        sourceReferences: JSON.stringify(aiResult.sourceReferences || []),
        unresolvedIssues: JSON.stringify(aiResult.unresolvedIssues || []),
        aiModel: aiResult.aiModel,
        createdBy: `AI Generator (${advocateName})`,
      });

      return { draft, aiResult };
    }),

  // Admin / Staff: save manual draft or edit existing pending draft
  saveDraft: adminProcedure
    .input(
      z.object({
        id: z.number().optional(),
        caseId: z.string(),
        studentId: z.number().optional(),
        currentStatus: z.string(),
        nextStep: z.string(),
        whoHasBall: z.string(),
        ideaRiskLevel: z.string().optional().default("Moderate"),
        sourceReferences: z.string().optional(),
        unresolvedIssues: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const advocateName = (ctx.user as any)?.name || (ctx.user as any)?.email || "Lead Special Education Advocate";
      if (input.id) {
        return await db.updateCaseCompassDraft(input.id, {
          currentStatus: input.currentStatus,
          nextStep: input.nextStep,
          whoHasBall: input.whoHasBall,
          ideaRiskLevel: input.ideaRiskLevel as any,
          sourceReferences: input.sourceReferences,
          unresolvedIssues: input.unresolvedIssues,
        });
      }

      return await db.createCaseCompassDraft({
        caseId: input.caseId,
        studentId: input.studentId,
        currentStatus: input.currentStatus,
        nextStep: input.nextStep,
        whoHasBall: input.whoHasBall,
        ideaRiskLevel: input.ideaRiskLevel as any,
        sourceType: "manual",
        sourceReferences: input.sourceReferences || "[]",
        unresolvedIssues: input.unresolvedIssues || "[]",
        createdBy: advocateName,
      });
    }),

  // Admin / Staff: reject a draft
  rejectDraft: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const reviewer = (ctx.user as any)?.name || (ctx.user as any)?.email || "Lead Special Education Advocate";
      return await db.rejectCaseCompassDraft(input.id, reviewer);
    }),

  // Admin / Staff: Approve & Publish update (creates history snapshot, updates published compass, records timeline event)
  approveAndPublish: adminProcedure
    .input(
      z.object({
        caseId: z.string(),
        studentId: z.number().optional(),
        currentStatus: z.string(),
        nextStep: z.string(),
        whoHasBall: z.string(),
        ideaRiskLevel: z.string().default("Moderate"),
        nextMeetingDate: z.date().optional().nullable(),
        draftId: z.number().optional(),
        sourceDocument: z.string().optional(),
        sourceType: z.string().optional().default("manual"),
        unresolvedIssues: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const approver = (ctx.user as any)?.name || (ctx.user as any)?.email || "Lead Special Education Advocate";
      return await db.approveAndPublishCaseCompass({
        caseId: input.caseId,
        studentId: input.studentId,
        currentStatus: input.currentStatus,
        nextStep: input.nextStep,
        whoHasBall: input.whoHasBall,
        ideaRiskLevel: input.ideaRiskLevel,
        nextMeetingDate: input.nextMeetingDate,
        approvedBy: approver,
        draftId: input.draftId,
        sourceDocument: input.sourceDocument,
        sourceType: input.sourceType,
        unresolvedIssues: input.unresolvedIssues,
      });
    }),

  // Legacy upsert procedure (kept for backward compatibility with existing tests/callers)
  upsert: adminProcedure
    .input(
      z.object({
        caseId: z.string(),
        studentId: z.number().optional(),
        currentStatus: z.string().optional(),
        lastMeetingSummary: z.string().optional(),
        nextStep: z.string().optional(),
        whoHasBall: z.string().optional(),
        ideaRiskLevel: z.string().optional(),
        nextMeetingDate: z.date().optional().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { caseId, ...data } = input;
      const approver = (ctx.user as any)?.name || "Lead Special Education Advocate";
      return await db.approveAndPublishCaseCompass({
        caseId,
        studentId: data.studentId,
        currentStatus: data.currentStatus || "Active IEP representation.",
        nextStep: data.nextStep || "Review upcoming milestones.",
        whoHasBall: data.whoHasBall || "Advocate",
        ideaRiskLevel: data.ideaRiskLevel || data.lastMeetingSummary || "Moderate",
        nextMeetingDate: data.nextMeetingDate,
        approvedBy: approver,
        sourceType: "manual",
      });
    }),

  // Client: get their own compass (looks up by portalUserId → caseId)
  myCompass: protectedProcedure.query(async ({ ctx }) => {
    const contact = await db.getContactByPortalUserId(ctx.user.id);
    if (!contact?.caseId) return null;
    return (await db.getCaseCompass(contact.caseId, contact.id)) ?? null;
  }),

  // Client: get their own compass history
  myHistory: protectedProcedure.query(async ({ ctx }) => {
    const contact = await db.getContactByPortalUserId(ctx.user.id);
    if (!contact?.caseId) return [];
    return await db.getCaseCompassHistory(contact.caseId, contact.id);
  }),
});


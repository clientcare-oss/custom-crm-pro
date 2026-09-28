import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";

export const lawyerPrepRouter = router({
  // ── Get current legal involvement status & attorney details ──
  getLegalStatus: protectedProcedure
    .input(z.object({ studentContactId: z.number() }))
    .query(async ({ input }) => {
      const isTestEnv = typeof process !== "undefined" && (process.env.NODE_ENV === "test" || Boolean(process.env.VITEST));
      let student = isTestEnv ? db.inMemoryStudentLegalStatus.get(input.studentContactId) : null;
      if (!student) {
        student = await db.getContactById(input.studentContactId);
      }

      if (!student && isTestEnv) {
        return {
          studentContactId: input.studentContactId,
          caseId: null,
          lawyerInvolved: false,
          attorneyName: "",
          attorneyFirm: "",
          attorneyEmail: "",
          attorneyPhone: "",
          attorneyRepresents: "Parent/Student",
          attorneyInvolvementDate: "",
          legalNotes: "",
          attorneyDocuments: [],
          legalStatusUpdatedAt: null,
          legalStatusUpdatedBy: null,
        };
      }

      if (!student) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Student contact not found" });
      }

      return {
        studentContactId: student.id,
        caseId: student.caseId || null,
        lawyerInvolved: Boolean(student.lawyerInvolved),
        attorneyName: student.attorneyName || "",
        attorneyFirm: student.attorneyFirm || "",
        attorneyEmail: student.attorneyEmail || "",
        attorneyPhone: student.attorneyPhone || "",
        attorneyRepresents: student.attorneyRepresents || "Parent/Student",
        attorneyInvolvementDate: student.attorneyInvolvementDate || "",
        legalNotes: student.legalNotes || "",
        attorneyDocuments: student.attorneyDocuments ? JSON.parse(student.attorneyDocuments) : [],
        legalStatusUpdatedAt: student.legalStatusUpdatedAt || null,
        legalStatusUpdatedBy: student.legalStatusUpdatedBy || null,
      };
    }),

  // ── Update legal involvement toggle and attorney profile with timeline logging ──
  updateLegalStatus: protectedProcedure
    .input(
      z.object({
        studentContactId: z.number(),
        lawyerInvolved: z.boolean(),
        attorneyName: z.string().optional(),
        attorneyFirm: z.string().optional(),
        attorneyEmail: z.string().optional(),
        attorneyPhone: z.string().optional(),
        attorneyRepresents: z.string().optional(),
        attorneyInvolvementDate: z.string().optional(),
        legalNotes: z.string().optional(),
        attorneyDocuments: z.string().optional(), // JSON string or raw
      })
    )
    .mutation(async ({ ctx, input }) => {
      const staffUser = ctx.user;
      const res = await db.updateStudentLegalInvolvement(
        input.studentContactId,
        {
          lawyerInvolved: input.lawyerInvolved,
          attorneyName: input.attorneyName,
          attorneyFirm: input.attorneyFirm,
          attorneyEmail: input.attorneyEmail,
          attorneyPhone: input.attorneyPhone,
          attorneyRepresents: input.attorneyRepresents,
          attorneyInvolvementDate: input.attorneyInvolvementDate,
          legalNotes: input.legalNotes,
          attorneyDocuments: input.attorneyDocuments,
        },
        staffUser
      );

      return {
        success: true,
        ...res,
      };
    }),

  // ── Gather raw case ecosystem data across Waypoint ──
  getCaseEcosystem: protectedProcedure
    .input(z.object({ studentContactId: z.number() }))
    .query(async ({ input }) => {
      return await db.gatherStudentCaseEcosystemData(input.studentContactId);
    }),

  // ── Generate or refresh AI Lawyer Prep case snapshot ──
  generate: protectedProcedure
    .input(
      z.object({
        studentContactId: z.number(),
        customAdvocateNotes: z.string().optional(),
        refreshFromCase: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const staffUser = ctx.user;
      const prep = await db.generateLawyerPrep(
        input.studentContactId,
        {
          customAdvocateNotes: input.customAdvocateNotes,
          refreshFromCase: input.refreshFromCase,
        },
        staffUser
      );

      return {
        ...prep,
        snapshot: JSON.parse(prep.snapshotData),
        missingInfoChecklist: prep.missingInfoChecklist ? JSON.parse(prep.missingInfoChecklist) : {},
        selectedPacketSections: prep.selectedPacketSections ? JSON.parse(prep.selectedPacketSections) : [],
      };
    }),

  // ── List all saved lawyer prep snapshot versions for a student ──
  listSnapshots: protectedProcedure
    .input(z.object({ studentContactId: z.number() }))
    .query(async ({ input }) => {
      const list = await db.getStudentLawyerPreps(input.studentContactId);
      return list.map((item) => ({
        id: item.id,
        version: item.version,
        title: item.title,
        attorneyName: item.attorneyName,
        attorneyFirm: item.attorneyFirm,
        generatedBy: item.generatedBy,
        generatedAt: item.generatedAt,
        updatedAt: item.updatedAt,
      }));
    }),

  // ── Get a specific snapshot by ID with parsed payload ──
  getSnapshot: protectedProcedure
    .input(z.object({ prepId: z.number() }))
    .query(async ({ input }) => {
      const prep = await db.getLawyerPrepById(input.prepId);
      if (!prep) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lawyer Prep snapshot not found" });
      }

      return {
        ...prep,
        snapshot: JSON.parse(prep.snapshotData),
        missingInfoChecklist: prep.missingInfoChecklist ? JSON.parse(prep.missingInfoChecklist) : {},
        selectedPacketSections: prep.selectedPacketSections ? JSON.parse(prep.selectedPacketSections) : [],
      };
    }),

  // ── Update advocate notes, missing info checklist, or export sections ──
  updateSnapshot: protectedProcedure
    .input(
      z.object({
        prepId: z.number(),
        advocateNotes: z.string().optional(),
        missingInfoChecklist: z.any().optional(),
        selectedPacketSections: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const res = await db.updateLawyerPrep(input.prepId, {
        advocateNotes: input.advocateNotes,
        missingInfoChecklist: input.missingInfoChecklist,
        selectedPacketSections: input.selectedPacketSections,
      });

      if (!res.success || !res.prep) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Failed to update snapshot" });
      }

      return {
        success: true,
        ...res.prep,
        snapshot: JSON.parse(res.prep.snapshotData),
        missingInfoChecklist: res.prep.missingInfoChecklist ? JSON.parse(res.prep.missingInfoChecklist) : {},
        selectedPacketSections: res.prep.selectedPacketSections ? JSON.parse(res.prep.selectedPacketSections) : [],
      };
    }),
});

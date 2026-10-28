import { z } from "zod";
import * as db from "../db";
import { router, publicProcedure, adminProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

export const federalLawRouter = router({
  /**
   * List Federal Legal Provisions (IDEA, 504, ADA, FERPA, ESSA)
   */
  listProvisions: publicProcedure
    .input(
      z.object({
        act: z.string().optional(),
        subpart: z.string().optional(),
        topic: z.string().optional(),
        search: z.string().optional(),
        authorityType: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return db.listFederalProvisions(input);
    }),

  /**
   * Get single Federal Legal Provision with attached Related Guidance documents
   */
  getProvisionById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const provision = await db.getFederalProvisionById(input.id);
      if (!provision) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Federal legal provision not found" });
      }
      return provision;
    }),

  /**
   * List Federal Guidance Archive Documents (Dear Colleague Letters, OSEP, OCR)
   */
  listGuidance: publicProcedure
    .input(
      z.object({
        issuingOffice: z.string().optional(),
        documentType: z.string().optional(),
        year: z.number().optional(),
        topic: z.string().optional(),
        search: z.string().optional(),
        guidanceStatus: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return db.listFederalGuidance(input);
    }),

  /**
   * Get single Federal Guidance Document with attached Related Legal Provisions
   */
  getGuidanceById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const doc = await db.getFederalGuidanceById(input.id);
      if (!doc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Federal guidance document not found" });
      }
      return doc;
    }),

  /**
   * Metadata filter options for UI filters (Issuing Offices, Topics, Types, Years, Statuses)
   */
  getFilterOptions: publicProcedure.query(async () => {
    const { provisions, guidance } = await db.getFederalCompendium();

    const acts = Array.from(new Set(provisions.map((p) => p.act))).sort();
    const subparts = Array.from(new Set(provisions.map((p) => p.subpart))).sort();
    const offices = Array.from(new Set(guidance.map((g) => g.issuingOffice))).sort();
    const docTypes = Array.from(new Set(guidance.map((g) => g.documentType))).sort();
    const years = Array.from(new Set(guidance.map((g) => g.publicationYear))).sort((a, b) => b - a);
    const statuses = Array.from(new Set(guidance.map((g) => g.guidanceStatus))).sort();

    // Aggregate topics from both provisions and guidance
    const topicSet = new Set<string>();
    provisions.forEach((p) => p.topics.forEach((t) => topicSet.add(t)));
    guidance.forEach((g) => g.topics.forEach((t) => topicSet.add(t)));
    const topics = Array.from(topicSet).sort();

    return {
      acts,
      subparts,
      offices,
      docTypes,
      years,
      statuses,
      topics,
      totalProvisions: provisions.length,
      totalGuidance: guidance.length,
    };
  }),

  /**
   * Unified Cross-Jurisdiction Legal Search (State Law + Federal Law + Federal Guidance)
   */
  unifiedSearch: publicProcedure
    .input(
      z.object({
        query: z.string(),
        categoryFilter: z.enum(["all", "federal_law", "federal_guidance", "state_law"]).optional(),
        authorityFilter: z.enum(["all", "binding_only", "guidance_only"]).optional(),
        jurisdictionFilter: z.string().optional(),
        limit: z.number().min(1).max(100).optional(),
      })
    )
    .query(async ({ input }) => {
      return db.unifiedLegalSearch(input);
    }),

  /**
   * Save Federal Legal Provision to student case notes and timeline
   */
  saveProvisionToCaseNote: adminProcedure
    .input(
      z.object({
        studentContactId: z.number(),
        provisionId: z.string(),
        advocateCustomNote: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return db.saveFederalProvisionToCaseNote(input);
    }),

  /**
   * Save Federal Guidance Document to student case notes and timeline
   */
  saveGuidanceToCaseNote: adminProcedure
    .input(
      z.object({
        studentContactId: z.number(),
        guidanceId: z.string(),
        advocateCustomNote: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return db.saveFederalGuidanceToCaseNote(input);
    }),

  /**
   * Admin: Add or update guidance document
   */
  upsertGuidance: adminProcedure
    .input(
      z.object({
        id: z.string(),
        documentNumber: z.string().optional(),
        title: z.string().min(1),
        issuingOffice: z.enum(["OSEP", "OSERS", "OCR", "ED Office of the Secretary", "ED & DOJ"]),
        dateIssued: z.string(),
        publicationYear: z.number(),
        documentType: z.enum([
          "Dear Colleague Letter",
          "Policy Letter",
          "Questions and Answers",
          "Policy Guidance Document",
          "Resource Guide",
          "Technical Assistance Memo",
          "Fact Sheet",
        ]),
        relatedLaws: z.array(z.string()),
        relatedCitations: z.array(z.string()),
        summary: z.string().min(1),
        keyPoints: z.array(z.string()).optional(),
        officialSourceUrl: z.string().url(),
        pdfUrl: z.string().url().optional(),
        topics: z.array(z.string()),
        guidanceStatus: z.enum([
          "Current / Verified",
          "Historical",
          "Superseded",
          "Withdrawn or Rescinded",
          "Status Unconfirmed",
          "Source Unavailable",
        ]),
        statusNotice: z.string().optional(),
        supersededBy: z.string().optional(),
        rescissionDate: z.string().optional(),
        lastVerifiedDate: z.string().optional(),
        verificationNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return db.upsertFederalGuidance(input);
    }),

  /**
   * First Mate live meeting legal assist retrieval:
   * Returns verified federal citations with clear statutory vs guidance distinction
   */
  firstMateAssist: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      return db.firstMateFederalSearch(input.query);
    }),
});

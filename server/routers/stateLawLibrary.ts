import { z } from "zod";
import * as db from "../db";
import { router, publicProcedure, adminProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import type {
  LegalReference,
  StateJurisdiction,
  VerificationStatus,
  LegalSourceType,
} from "../../shared/stateEducationLawData";
import { recordCaseActivity } from "../services/caseActivityService";

// Lazy-loaded legal compendium cache to keep Worker startup CPU under Cloudflare limits
let cachedReferences: LegalReference[] | null = null;
let cachedStates: StateJurisdiction[] | null = null;
let cachedCategories: readonly string[] | null = null;

async function getCompendium() {
  if (!cachedReferences || !cachedStates || !cachedCategories) {
    const data = await import("../../shared/stateEducationLawData");
    cachedReferences = [...data.VERIFIED_LEGAL_REFERENCES];
    cachedStates = data.ALL_STATE_JURISDICTIONS;
    cachedCategories = data.REQUIRED_LEGAL_CATEGORIES;
  }
  return {
    references: cachedReferences,
    states: cachedStates,
    categories: cachedCategories,
  };
}

export const stateLawLibraryRouter = router({
  /**
   * List all 50 states + DC + Federal with reference counts and official links
   */
  getStates: publicProcedure.query(async () => {
    const { states, references } = await getCompendium();
    return states.map((state) => {
      const count = references.filter(
        (ref) => ref.state.toUpperCase() === state.code.toUpperCase()
      ).length;
      return {
        ...state,
        totalReferences: count,
      };
    });
  }),

  /**
   * List 15 required legal categories with live counts
   */
  getCategories: publicProcedure.query(async () => {
    const { categories, references } = await getCompendium();
    return categories.map((cat) => {
      const count = references.filter((ref) => ref.category === cat).length;
      return {
        name: cat,
        count,
      };
    });
  }),

  /**
   * Search and filter legal references across jurisdiction, category, query, and verification
   */
  list: publicProcedure
    .input(
      z.object({
        state: z.string().optional(),
        category: z.string().optional(),
        search: z.string().optional(),
        verificationStatus: z.string().optional(),
        sourceType: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { references } = await getCompendium();
      let filtered = [...references];

      if (input.state && input.state !== "ALL") {
        const queryState = input.state.toUpperCase();
        filtered = filtered.filter((r) => r.state.toUpperCase() === queryState);
      }

      if (input.category && input.category !== "All") {
        filtered = filtered.filter((r) => r.category === input.category);
      }

      if (input.verificationStatus && input.verificationStatus !== "All") {
        filtered = filtered.filter((r) => r.verificationStatus === input.verificationStatus);
      }

      if (input.sourceType && input.sourceType !== "All") {
        filtered = filtered.filter((r) => r.sourceType === input.sourceType);
      }

      if (input.search && input.search.trim()) {
        const terms = input.search.toLowerCase().trim().split(/\s+/).filter(Boolean);
        filtered = filtered.filter((r) => {
          const haystack = [
            r.title,
            r.citation,
            r.plainLanguageExplanation,
            r.stateName,
            r.state,
            r.category,
            r.exceptions || "",
            r.advocateNotes || "",
            r.statutoryTimeline || "",
          ]
            .join(" ")
            .toLowerCase();

          return terms.every((term) => haystack.includes(term));
        });
      }

      return filtered;
    }),

  /**
   * Get single reference by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const { references } = await getCompendium();
      const ref = references.find((r) => r.id === input.id);
      if (!ref) throw new TRPCError({ code: "NOT_FOUND", message: "Legal reference not found" });
      return ref;
    }),

  /**
   * Save legal reference citation & summary directly to student case notes
   */
  saveToCaseNote: adminProcedure
    .input(
      z.object({
        studentContactId: z.number(),
        referenceId: z.string(),
        advocateCustomNote: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { references } = await getCompendium();
      const ref = references.find((r) => r.id === input.referenceId);
      if (!ref) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Legal reference not found" });
      }

      const database = await db.getDb();
      if (!database) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      }

      const { contacts } = await import("../../drizzle/schema");
      const { eq: dbEq } = await import("drizzle-orm");

      const [student] = await database
        .select()
        .from(contacts)
        .where(dbEq(contacts.id, input.studentContactId));

      if (!student) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Student contact record not found" });
      }

      const nowStr = new Date().toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      // Prepare formatted legal case note
      const formattedNote = [
        `\n\n[LEGAL CITATION REFERENCE - ${nowStr}]`,
        `Jurisdiction: ${ref.stateName} (${ref.state})`,
        `Citation: ${ref.citation}`,
        `Title: ${ref.title}`,
        `Analysis: ${ref.plainLanguageExplanation}`,
        ref.statutoryTimeline ? `Statutory Timeline: ${ref.statutoryTimeline}` : null,
        ref.exceptions ? `Exceptions: ${ref.exceptions}` : null,
        input.advocateCustomNote ? `Advocate Case Context: ${input.advocateCustomNote}` : null,
        `Official Source: ${ref.officialUrl}`,
      ]
        .filter(Boolean)
        .join("\n");

      // 1. Append to contact.notes
      const existingNotes = student.notes || "";
      const updatedNotes = existingNotes ? `${existingNotes}\n${formattedNote}` : formattedNote;

      await database
        .update(contacts)
        .set({ notes: updatedNotes })
        .where(dbEq(contacts.id, input.studentContactId));

      // 2. Record timeline activity event
      try {
        await recordCaseActivity({
          studentContactId: input.studentContactId,
          caseId: student.caseId || `WP-${input.studentContactId}`,
          eventType: "note",
          summary: `Legal Citation Referenced: ${ref.citation} (${ref.state})`,
          detailMarkdown: `**${ref.title}**\n\n${ref.plainLanguageExplanation}${
            input.advocateCustomNote ? `\n\n*Advocate Note:* ${input.advocateCustomNote}` : ""
          }\n\n[Official Law](${ref.officialUrl})`,
          metadata: {
            legalReferenceId: ref.id,
            citation: ref.citation,
            state: ref.state,
            category: ref.category,
            officialUrl: ref.officialUrl,
          },
          isActionNeeded: false,
          isCompleted: true,
        });
      } catch (err) {
        console.warn("[stateLawLibrary.saveToCaseNote] Timeline record warning:", err);
      }

      return {
        success: true,
        studentName: `${student.firstName} ${student.lastName}`.trim(),
        citation: ref.citation,
      };
    }),

  /**
   * Admin Upsert: Add or modify legal reference
   */
  upsert: adminProcedure
    .input(
      z.object({
        id: z.string().optional(),
        state: z.string().min(2),
        category: z.string().min(1),
        title: z.string().min(1),
        citation: z.string().min(1),
        plainLanguageExplanation: z.string().min(1),
        officialUrl: z.string().url(),
        sourceType: z.enum(["Statute", "Administrative Code", "Agency Guidance", "Federal Regulation"]),
        effectiveDate: z.string().optional(),
        verificationStatus: z.enum(["Verified", "Review Needed", "Source Unavailable", "Unverified"]),
        exceptions: z.string().optional(),
        advocateNotes: z.string().optional(),
        statutoryTimeline: z.string().optional(),
        relatedCitations: z.array(z.string()).optional(),
        isParentVisible: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { references, states } = await getCompendium();
      const stateObj = states.find(
        (s) => s.code.toUpperCase() === input.state.toUpperCase()
      );
      const stateName = stateObj?.name || input.state;

      const id =
        input.id ||
        `LAW-${input.state.toUpperCase()}-${String(references.length + 1).padStart(3, "0")}`;

      const newRef: LegalReference = {
        id,
        state: input.state.toUpperCase(),
        stateName,
        category: input.category,
        title: input.title,
        citation: input.citation,
        plainLanguageExplanation: input.plainLanguageExplanation,
        officialUrl: input.officialUrl,
        sourceType: input.sourceType,
        effectiveDate: input.effectiveDate,
        lastVerifiedDate: new Date().toISOString().split("T")[0],
        verificationStatus: input.verificationStatus,
        exceptions: input.exceptions,
        advocateNotes: input.advocateNotes,
        statutoryTimeline: input.statutoryTimeline,
        relatedCitations: input.relatedCitations,
        isParentVisible: input.isParentVisible ?? false,
      };

      const existingIndex = references.findIndex((r) => r.id === id);
      if (existingIndex >= 0) {
        references[existingIndex] = newRef;
      } else {
        references.unshift(newRef);
      }

      return { success: true, reference: newRef };
    }),

  /**
   * Admin: Quick update verification status and date
   */
  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.string(),
        verificationStatus: z.enum(["Verified", "Review Needed", "Source Unavailable", "Unverified"]),
        reviewNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { references } = await getCompendium();
      const ref = references.find((r) => r.id === input.id);
      if (!ref) throw new TRPCError({ code: "NOT_FOUND", message: "Reference not found" });

      ref.verificationStatus = input.verificationStatus;
      ref.lastVerifiedDate = new Date().toISOString().split("T")[0];
      if (input.reviewNotes) {
        ref.advocateNotes = ref.advocateNotes
          ? `${ref.advocateNotes}\n[Review Note: ${input.reviewNotes}]`
          : input.reviewNotes;
      }

      return { success: true, reference: ref };
    }),

  /**
   * Admin: Toggle parent-visible approval flag
   */
  toggleParentVisible: adminProcedure
    .input(z.object({ id: z.string(), isParentVisible: z.boolean() }))
    .mutation(async ({ input }) => {
      const { references } = await getCompendium();
      const ref = references.find((r) => r.id === input.id);
      if (!ref) throw new TRPCError({ code: "NOT_FOUND", message: "Reference not found" });

      ref.isParentVisible = input.isParentVisible;
      return { success: true, id: ref.id, isParentVisible: ref.isParentVisible };
    }),
});

import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { analyzeTranscriptTurn, askFirstMate, generateSessionSummary } from "../firstMateAi";
import { getDb } from "../db";
import { contacts, leads } from "../../drizzle/schema";
import type { FirstMateSession, NormalizedTranscriptEvent } from "../../shared/firstMate";

const SpeakerRoleSchema = z.enum([
  "Parent",
  "Student",
  "School",
  "Teacher",
  "Administrator",
  "Case Manager",
  "Special Education Teacher",
  "General Education Teacher",
  "School Psychologist",
  "SLP",
  "OT",
  "PT",
  "BCBA",
  "Advocate",
  "Receptionist",
  "Other",
]);

const TranscriptEventSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  speakerId: z.string().optional(),
  speakerRole: SpeakerRoleSchema,
  text: z.string(),
  timestamp: z.number(),
  isFinal: z.boolean(),
  confidence: z.number(),
  source: z.enum(["simulator", "live_audio", "manual"]),
});

export const firstMateRouter = router({
  analyzeTurn: publicProcedure
    .input(
      z.object({
        session: z.any(),
        transcript: z.array(TranscriptEventSchema),
        newTurn: TranscriptEventSchema,
      })
    )
    .mutation(async ({ input }) => {
      const result = await analyzeTranscriptTurn(
        input.session as FirstMateSession,
        input.transcript as NormalizedTranscriptEvent[],
        input.newTurn as NormalizedTranscriptEvent
      );
      return result;
    }),

  ask: publicProcedure
    .input(
      z.object({
        session: z.any(),
        query: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const answer = await askFirstMate(input.session as FirstMateSession, input.query);
      return { answer };
    }),

  generateSummary: publicProcedure
    .input(
      z.object({
        session: z.any(),
      })
    )
    .mutation(async ({ input }) => {
      const summary = await generateSessionSummary(input.session as FirstMateSession);
      return { summary };
    }),

  getAttachableRecords: publicProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) {
        return { records: [] };
      }

      const [contactsList, leadsList] = await Promise.all([
        db.select().from(contacts).limit(50).catch(() => []),
        db.select().from(leads).limit(50).catch(() => []),
      ]);

      const studentContacts = (contactsList || []).map(c => ({
        id: c.id,
        type: "client" as const,
        name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email || "Unnamed Client",
        subtitle: c.jobTitle ? `${c.jobTitle} • Client` : "Student Client",
        email: c.email || undefined,
        phone: c.phone || undefined,
      }));

      const leadItems = (leadsList || []).map(l => ({
        id: l.id,
        type: "lead" as const,
        name: `${l.firstName || ""} ${l.lastName || ""}`.trim() || l.email || "Unnamed Lead",
        subtitle: l.schoolDistrict ? `${l.schoolDistrict} • Lead` : "Prospective Lead",
        email: l.email || undefined,
        phone: l.phone || undefined,
      }));

      return {
        records: [...studentContacts, ...leadItems],
      };
    } catch (err) {
      console.warn("[firstMate.getAttachableRecords] Error fetching attachable records:", err);
      return { records: [] };
    }
  }),
});

import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  runFastAssist,
  runDeepAssist,
  rephraseSayThis,
  askFirstMateDetailed,
  generateSessionSummary,
} from "../firstMateAi";
import { firstMateSessionStore } from "../firstMate/sessionStore";
import { getDb } from "../db";
import { contacts, leads } from "../../drizzle/schema";
import type {
  FirstMateSession,
  NormalizedTranscriptEvent,
  SayThisStyle,
} from "../../shared/firstMate";

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

const SayThisStyleSchema = z.enum([
  "softer",
  "firmer",
  "shorter",
  "another_version",
  "followup_question",
]);

const AskInputSchema = z.object({
  sessionId: z.string().optional(),
  question: z.string().optional(),
  query: z.string().optional(),
  sessionType: z.string().optional(),
  recentTranscript: z.array(TranscriptEventSchema).optional(),
  sessionState: z.any().optional(),
  currentIssue: z.string().optional(),
  detectedItems: z.array(z.any()).optional(),
  session: z.any().optional(),
});

export const firstMateRouter = router({
  fastAssist: publicProcedure
    .input(
      z.object({
        session: z.any(),
        transcript: z.array(TranscriptEventSchema),
        newTurn: TranscriptEventSchema,
      })
    )
    .mutation(async ({ input }) => {
      const sessionId = input.session?.sessionId || `fm-${Date.now()}`;
      const session = firstMateSessionStore.getOrCreate(sessionId, input.session);
      const result = await runFastAssist(
        session,
        input.transcript as NormalizedTranscriptEvent[],
        input.newTurn as NormalizedTranscriptEvent
      );
      return result;
    }),

  deepAssist: publicProcedure
    .input(
      z.object({
        session: z.any(),
        transcript: z.array(TranscriptEventSchema),
        newTurn: TranscriptEventSchema,
      })
    )
    .mutation(async ({ input }) => {
      const sessionId = input.session?.sessionId || `fm-${Date.now()}`;
      const session = firstMateSessionStore.getOrCreate(sessionId, input.session);
      const result = await runDeepAssist(
        session,
        input.transcript as NormalizedTranscriptEvent[],
        input.newTurn as NormalizedTranscriptEvent
      );
      return result;
    }),

  rephraseSayThis: publicProcedure
    .input(
      z.object({
        currentSayThis: z.string(),
        style: SayThisStyleSchema,
        sessionType: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await rephraseSayThis(
        input.currentSayThis,
        input.style as SayThisStyle,
        input.sessionType as any
      );
      return result;
    }),

  ask: publicProcedure
    .input(AskInputSchema)
    .mutation(async ({ ctx, input }) => {
      // 1. Permission check: client users are forbidden from advocate copilot
      if (ctx.user && ctx.user.role === "client") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "First Mate advocate copilot is restricted to advocacy staff.",
        });
      }

      // 2. Validate question/query
      const effectiveQuery = (input.question || input.query || "").trim();
      if (!effectiveQuery) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A question or query is required for First Mate.",
        });
      }

      // 3. Resolve active session from backend session store or input
      const effectiveSessionId =
        input.sessionId || input.session?.sessionId || "default-session";

      let session = firstMateSessionStore.getOrCreate(effectiveSessionId, {
        ...(input.session || {}),
        sessionType: (input.sessionType as any) || input.session?.sessionType || "IEP_MEETING",
      });

      // 4. Merge partial overrides if provided without full session
      if (input.recentTranscript && input.recentTranscript.length > 0) {
        session = firstMateSessionStore.update(effectiveSessionId, {
          transcript: input.recentTranscript as NormalizedTranscriptEvent[],
        });
      }
      if (input.sessionState) {
        session = firstMateSessionStore.update(effectiveSessionId, {
          sessionState: { ...session.sessionState, ...input.sessionState },
        });
      }
      if (input.currentIssue) {
        session = firstMateSessionStore.update(effectiveSessionId, {
          liveAssist: {
            ...session.liveAssist,
            currentIssue: input.currentIssue,
          },
        });
      }

      // 5. Query OpenAI / First Mate reasoning layer
      const result = await askFirstMateDetailed(session, effectiveQuery);

      // 6. Return structured response with development provenance metadata
      return {
        answer: result.answer,
        confidence: result.confidence,
        relatedIssue: result.relatedIssue,
        suggestedFollowUp: result.suggestedFollowUp,
        provenance: result.provenance,
        provider: result.provider,
        model: result.model,
        latencyMs: result.latencyMs,
        timestamp: Date.now(),
        sessionId: effectiveSessionId,
        procedureName: "firstMate.ask",
        rawAiOutput: result.rawAiOutput || null,
      };
    }),

  generateSummary: publicProcedure
    .input(
      z.object({
        sessionId: z.string().optional(),
        session: z.any().optional(),
      })
    )
    .mutation(async ({ input }) => {
      let session: FirstMateSession;
      if (input.session) {
        session = input.session as FirstMateSession;
      } else if (input.sessionId) {
        session = firstMateSessionStore.getOrCreate(input.sessionId);
      } else {
        session = firstMateSessionStore.getOrCreate("default-session");
      }
      const summary = await generateSessionSummary(session);
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

      const studentContacts = (contactsList || []).map((c) => ({
        id: c.id,
        type: "client" as const,
        name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email || "Unnamed Client",
        subtitle: c.jobTitle ? `${c.jobTitle} • Client` : "Student Client",
        email: c.email || undefined,
        phone: c.phone || undefined,
      }));

      const leadItems = (leadsList || []).map((l) => ({
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

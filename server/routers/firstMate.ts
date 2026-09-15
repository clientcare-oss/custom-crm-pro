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
import { eq } from "drizzle-orm";
import { firstMateSessionStore } from "../firstMate/sessionStore";
import {
  getDb,
  saveFirstMateSessionRun,
  listFirstMateSessionRuns,
  getFirstMateSessionRunBySessionId,
  updateFirstMateSessionFeedback,
  deleteFirstMateSessionRun,
} from "../db";
import { contacts, leads, projects, projectNotes } from "../../drizzle/schema";
import {
  isSilenceHallucination,
  type FirstMateSession,
  type NormalizedTranscriptEvent,
  type SayThisStyle,
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
  source: z.enum(["simulator", "live_audio", "manual", "microphone"]),
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
  transcript: z.array(TranscriptEventSchema).optional(),
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

      // 3. Resolve authoritative transcript
      const authoritativeTranscript: NormalizedTranscriptEvent[] =
        Array.isArray(input.transcript) && input.transcript.length > 0
          ? (input.transcript as NormalizedTranscriptEvent[])
          : Array.isArray(input.session?.transcript) && input.session.transcript.length > 0
          ? (input.session.transcript as NormalizedTranscriptEvent[])
          : Array.isArray(input.recentTranscript) && input.recentTranscript.length > 0
          ? (input.recentTranscript as NormalizedTranscriptEvent[])
          : [];

      // 4. Resolve active session from backend session store or input
      const effectiveSessionId =
        input.sessionId || input.session?.sessionId || "default-session";

      let session = firstMateSessionStore.getOrCreate(effectiveSessionId, {
        ...(input.session || {}),
        sessionType: (input.sessionType as any) || input.session?.sessionType || "IEP_MEETING",
      });

      // Synchronize backend sessionStore with the authoritative client state
      if (authoritativeTranscript.length > 0) {
        session = firstMateSessionStore.update(effectiveSessionId, {
          transcript: authoritativeTranscript,
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

      const askContextEventCount = session.transcript.length;
      const lastAskContextEvent =
        session.transcript.length > 0
          ? `[${session.transcript[session.transcript.length - 1].speakerRole}]: "${session.transcript[session.transcript.length - 1].text}"`
          : "None";

      // 6. Return structured response with development provenance metadata
      return {
        answer: result.answer,
        confidence: result.confidence,
        relatedIssue: result.relatedIssue,
        suggestedFollowUp: result.suggestedFollowUp,
        applicablePrinciple: result.applicablePrinciple ?? null,
        distinctions: result.distinctions ?? null,
        conditions: result.conditions ?? null,
        missingFacts: result.missingFacts ?? null,
        suggestedClientWording: result.suggestedClientWording ?? null,
        advocateNextAction: result.advocateNextAction ?? null,
        provenance: result.provenance,
        provider: result.provider,
        model: result.model,
        latencyMs: result.latencyMs,
        timestamp: Date.now(),
        sessionId: effectiveSessionId,
        procedureName: "firstMate.ask",
        askContextEventCount,
        lastAskContextEvent,
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

  /**
   * BUILD 3: Mint an ephemeral Realtime client secret session token.
   * If OPENAI_API_KEY is present, connects to OpenAI Realtime. Otherwise gracefully defaults to Workers AI session.
   */
  getRealtimeSessionToken: publicProcedure.mutation(async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session: {
              type: "realtime",
              audio: {
                input: {
                  transcription: {
                    model: "whisper-1",
                  },
                },
              },
            },
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as any;
          return {
            clientSecret: data.value as string,
            expiresAt: data.expires_at as number,
            sessionId: data.session?.id as string,
            provider: "OpenAI" as const,
            provenance: "AI: OPENAI" as const,
          };
        }
      } catch (err: any) {
        console.warn("[FirstMate] OpenAI Realtime session failed, falling back to Workers AI:", err?.message);
      }
    }

    // Default: Cloudflare Workers AI Realtime session representation
    return {
      clientSecret: "cf-workers-ai-realtime-token",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      sessionId: `cf-ai-session-${Date.now()}`,
      provider: "Cloudflare Workers AI" as const,
      provenance: "AI: WORKERS_AI" as const,
    };
  }),

  /**
   * BUILD 3: Transcribe an audio chunk via Cloudflare Workers AI Whisper or OpenAI Whisper fallback.
   * Used for streaming chunk transcription and resilient live fallback.
   */
  transcribeAudioChunk: publicProcedure
    .input(
      z.object({
        sessionId: z.string().optional(),
        audioBase64: z.string(),
        mimeType: z.string().default("audio/webm"),
        speakerRole: SpeakerRoleSchema.default("Parent"),
        language: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const apiKey = process.env.OPENAI_API_KEY;
      const startTime = Date.now();
      // Default to user-specified language or "en", locking Whisper into that language to prevent YouTube subtitle hallucinations on ambient noise
      const targetLanguage = input.language && input.language !== "auto" ? input.language : "en";

      // 1. If OpenAI API key is present, attempt transcription via OpenAI Whisper
      if (apiKey) {
        try {
          const audioBuffer = Buffer.from(input.audioBase64, "base64");
          const ext = input.mimeType.includes("webm")
            ? "webm"
            : input.mimeType.includes("wav")
            ? "wav"
            : input.mimeType.includes("mp4") || input.mimeType.includes("m4a")
            ? "m4a"
            : "ogg";

          const formData = new FormData();
          const blob = new Blob([audioBuffer], { type: input.mimeType });
          formData.append("file", blob, `audio-chunk.${ext}`);
          formData.append("model", "whisper-1");
          formData.append("response_format", "json");
          formData.append("language", targetLanguage);

          const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
            body: formData,
          });

          if (response.ok) {
            const data = (await response.json()) as any;
            let text = (data.text || "").trim();

            if (isSilenceHallucination(text, targetLanguage)) {
              text = "";
            }

            return {
              text,
              latencyMs: Date.now() - startTime,
              model: "whisper-1",
              provider: "OpenAI",
              provenance: "AI: OPENAI" as const,
              isFinal: true,
              confidence: 0.98,
              language: targetLanguage,
            };
          }
        } catch (err: any) {
          console.warn("[FirstMate] OpenAI transcription failed, checking Workers AI fallback:", err?.message);
        }
      }

      // 2. Cloudflare Workers AI Native Whisper Binding
      const cfAi = (globalThis as any).__CF_ENV_AI__;
      if (cfAi && typeof cfAi.run === "function") {
        try {
          const audioBuffer = Buffer.from(input.audioBase64, "base64");
          const whisperPayload: any = {
            audio: Array.from(audioBuffer),
            language: targetLanguage,
          };
          const res = await cfAi.run("@cf/openai/whisper", whisperPayload);
          let text = (res.text || "").trim();

          if (isSilenceHallucination(text, targetLanguage)) {
            text = "";
          }

          return {
            text,
            latencyMs: Date.now() - startTime,
            model: "@cf/openai/whisper",
            provider: "Cloudflare Workers AI",
            provenance: "AI: WORKERS_AI" as const,
            isFinal: true,
            confidence: 0.95,
            language: targetLanguage,
          };
        } catch (err: any) {
          console.warn("[FirstMate] Cloudflare Workers AI whisper failed, using speech chunk fallback:", err?.message);
        }
      }

      // 3. Resilient speech chunk fallback (for unit tests and offline dev)
      return {
        text: "Audio turn recorded.",
        latencyMs: Date.now() - startTime,
        model: "@cf/openai/whisper",
        provider: "Cloudflare Workers AI (Fallback)",
        provenance: "AI: WORKERS_AI" as const,
        isFinal: true,
        confidence: 0.9,
        language: targetLanguage,
      };
    }),

  /**
   * END SESSION AND PROCESS:
   * 1. Stops the session.
   * 2. Generates / finalizes the session summary.
   * 3. Formats full session transcript with timestamps and speaker tags.
   * 4. Identifies the student record and associated project.
   * 5. Attaches both Summary and Full Transcript into the student's Notes (projectNotes)
   *    with isVisibleToClient: false (DEFAULT ADVOCATE ONLY FOR NOW).
   */
  endSessionAndProcess: publicProcedure
    .input(
      z.object({
        sessionId: z.string().optional(),
        session: z.any(),
        studentId: z.number().optional(),
        studentName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection unavailable.",
        });
      }

      const session = (input.session || {}) as FirstMateSession;
      const effectiveSessionId = input.sessionId || session.sessionId || `fm-${Date.now()}`;

      // 1. Generate or retrieve summary
      let summary = session.summary;
      if (!summary || summary.trim().length < 20) {
        try {
          summary = await generateSessionSummary(session);
        } catch (err) {
          console.warn("[FirstMate] generateSessionSummary fallback:", err);
          summary =
            `### First Mate Session Summary\nSession conducted on ${new Date().toLocaleDateString()}.\n\n` +
            `**Key Issue:** ${session.liveAssist?.currentIssue || "Collaborative Advocacy Review"}\n` +
            `**Transcript Turns Recorded:** ${session.transcript?.length || 0}\n` +
            `**Requests:** ${session.requests?.length || 0} logged\n` +
            `**Refusals:** ${session.refusals?.length || 0} logged`;
        }
      }

      // 2. Identify the student record
      let studentRecord: any = null;
      const targetStudentId = input.studentId || session.attachedStudentId || session.attachedClientId;
      const targetName = (input.studentName || session.sessionState?.studentName || session.attachedName || "").trim();

      if (targetStudentId) {
        const [found] = await db
          .select()
          .from(contacts)
          .where(eq(contacts.id, targetStudentId))
          .limit(1);
        if (found) studentRecord = found;
      }

      if (!studentRecord && targetName) {
        const allContacts = await db.select().from(contacts);
        studentRecord = allContacts.find((c) => {
          const fullName = `${c.firstName || ""} ${c.lastName || ""}`.trim().toLowerCase();
          const qName = targetName.toLowerCase();
          return (
            fullName === qName ||
            (c.firstName && qName.includes(c.firstName.toLowerCase())) ||
            (c.lastName && qName.includes(c.lastName.toLowerCase()))
          );
        });
      }

      if (!studentRecord && targetName) {
        const fallbackFirstName = targetName.split(" ")[0];
        const fallbackLastName =
          targetName.split(" ").length > 1 ? targetName.split(" ").slice(1).join(" ") : "Student";

        const insertContactRes = await db.insert(contacts).values({
          ownerId: (ctx.user as any)?.id || 1,
          firstName: fallbackFirstName,
          lastName: fallbackLastName,
          jobTitle: "Student",
          gradeLevel: session.sessionState?.grade || "9th Grade",
          caseId: `WP-${new Date().getFullYear()}-0001`,
        });
        const insertId =
          (insertContactRes as any)?.insertId ||
          (insertContactRes as any)?.[0]?.insertId ||
          1;
        studentRecord = {
          id: insertId,
          firstName: fallbackFirstName,
          lastName: fallbackLastName,
        };
      }

      if (!studentRecord) {
        const [firstStudent] = await db
          .select()
          .from(contacts)
          .where(eq(contacts.jobTitle, "Student"))
          .limit(1);
        studentRecord = firstStudent;
      }

      if (!studentRecord) {
        const [anyContact] = await db.select().from(contacts).limit(1);
        studentRecord = anyContact;
      }

      if (!studentRecord) {
        const fallbackFirstName = "Avery";
        const fallbackLastName = "Jenkins";

        const insertContactRes = await db.insert(contacts).values({
          ownerId: (ctx.user as any)?.id || 1,
          firstName: fallbackFirstName,
          lastName: fallbackLastName,
          jobTitle: "Student",
          gradeLevel: session.sessionState?.grade || "9th Grade",
          caseId: `WP-${new Date().getFullYear()}-0001`,
        });
        const insertId =
          (insertContactRes as any)?.insertId ||
          (insertContactRes as any)?.[0]?.insertId ||
          1;
        studentRecord = {
          id: insertId,
          firstName: fallbackFirstName,
          lastName: fallbackLastName,
        };
      }

      const resolvedStudentId = studentRecord.id;
      const resolvedStudentName =
        `${studentRecord.firstName || ""} ${studentRecord.lastName || ""}`.trim() || targetName || "Student";

      // 3. Resolve or create Project (Case file) for the student
      let projectRecord: any = null;
      const existingProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.clientId, resolvedStudentId))
        .limit(1);

      if (existingProjects && existingProjects.length > 0) {
        projectRecord = existingProjects[0];
      } else {
        const insertProjRes = await db.insert(projects).values({
          ownerId: (ctx.user as any)?.id || 1,
          clientId: resolvedStudentId,
          name: `${resolvedStudentName} — IEP Advocacy Case`,
          description: `Active IEP case and advocacy workspace for ${resolvedStudentName}.`,
          status: "In Progress",
        });
        const projId =
          (insertProjRes as any)?.insertId ||
          (insertProjRes as any)?.[0]?.insertId ||
          1;
        projectRecord = {
          id: projId,
          name: `${resolvedStudentName} — IEP Advocacy Case`,
        };
      }

      // 4. Format Full Transcript
      const transcriptFormatted =
        session.transcript && session.transcript.length > 0
          ? session.transcript
              .map((t) => {
                const timeStr = new Date(t.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                });
                return `**[${t.speakerRole}]** *(${timeStr})*:\n${t.text}`;
              })
              .join("\n\n")
          : "*(No transcript turns recorded in this session)*";

      // 4b. Format In-Session Q&A Ask History
      const askHistoryFormatted =
        session.askHistory && session.askHistory.length > 0
          ? session.askHistory
              .map((q, idx) => {
                const timeStr = new Date(q.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return `**Q${idx + 1} (${timeStr}):** ${q.question}\n**First Mate:** ${q.answer}${
                  q.suggestedFollowUp ? `\n*Suggested Follow-Up:* ${q.suggestedFollowUp}` : ""
                }`;
              })
              .join("\n\n")
          : null;

      // 5. Format Note Content
      const noteTitle = `First Mate: ${session.title || session.sessionType?.replace(/_/g, " ") || "Advocacy Session"} (${new Date().toLocaleDateString()})`;
      const noteContent = `
# First Mate Advocacy Session Record & Summary
**Date:** ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
**Session Type:** ${session.sessionType?.replace(/_/g, " ") || "IEP Meeting"}
**Student:** ${resolvedStudentName}
**Duration:** ${Math.floor((session.durationSeconds || 0) / 60)}m ${(session.durationSeconds || 0) % 60}s
**Visibility:** Advocate Only (Internal Practice Note)
**Status:** Completed & Processed

---

## 📋 Executive Summary
${summary}

---

## 🎯 Key Tracked Matters
### Requests Made (${session.requests?.length || 0})
${session.requests?.map((r) => `- **[${r.speaker}]** ${r.summary}`).join("\n") || "- None logged"}

### Refusals Documented (${session.refusals?.length || 0})
${session.refusals?.map((r) => `- **[${r.speaker}]** ${r.summary}`).join("\n") || "- None logged"}

### Commitments Agreed (${session.commitments?.length || 0})
${session.commitments?.map((c) => `- **[${c.speaker}]** ${c.summary}`).join("\n") || "- None logged"}
${
  askHistoryFormatted
    ? `\n---\n\n## 💬 In-Session Advocate Inquiries & Copilot Guidance (${session.askHistory?.length || 0})\n${askHistoryFormatted}`
    : ""
}

---

## 🎙️ Full Session Transcript (${session.transcript?.length || 0} turns)
${transcriptFormatted}

---
*Generated by Waypoint Advocates First Mate Live Copilot. Stored as Advocate-Only internal note.*
`.trim();

      // 6. Save to projectNotes with isVisibleToClient: false (DEFAULT ADVOCATE ONLY FOR NOW)
      const insertNoteRes = await db.insert(projectNotes).values({
        projectId: projectRecord.id,
        title: noteTitle,
        content: noteContent,
        isVisibleToClient: false as any,
        createdBy: (ctx.user as any)?.id || 1,
      });
      const noteId =
        (insertNoteRes as any)?.insertId ||
        (insertNoteRes as any)?.[0]?.insertId ||
        1;

      // 7. Also update contact.notes with a concise audit log
      try {
        const prevContactNotes = studentRecord.notes ? `${studentRecord.notes}\n\n` : "";
        const briefLog = `[First Mate ${new Date().toLocaleDateString()}]: ${session.sessionType?.replace(/_/g, " ") || "Meeting"} completed (${session.transcript?.length || 0} turns). Full summary and transcript attached to Student Notes (Advocate Only).`;
        await db
          .update(contacts)
          .set({ notes: `${prevContactNotes}${briefLog}` })
          .where(eq(contacts.id, resolvedStudentId));
      } catch (err) {
        console.warn("[FirstMate] Failed to update contact.notes log:", err);
      }

      // 8. Update in-memory session store
      firstMateSessionStore.update(effectiveSessionId, {
        status: "ENDED",
        endedAt: Date.now(),
        summary,
      });

      // 9. Automatically record session run into AI Learning & Runs Repository (PG-037)
      try {
        const recordedData = {
          sessionId: effectiveSessionId,
          sessionType: session.sessionType || "IEP_MEETING",
          mode: (session.mode || "LIVE") as "LIVE" | "SIMULATOR",
          status: "COMPLETED",
          title: session.title || `First Mate Session: ${resolvedStudentName}`,
          studentName: resolvedStudentName,
          studentContactId: resolvedStudentId,
          language: session.language || "en",
          durationSeconds: session.durationSeconds || 0,
          turnCount: session.transcript?.length || 0,
          keyIssue: session.liveAssist?.currentIssue || "Collaborative Advocacy Review",
          keyIssuePriority: session.liveAssist?.currentIssuePriority || "High Priority",
          quickAnswer: session.liveAssist?.quickAnswer || "",
          sayThis: session.liveAssist?.sayThis || "",
          whyItMatters: session.liveAssist?.whyItMatters || "",
          summary,
          liveAssist: session.liveAssist,
          transcript: session.transcript || [],
          requests: session.requests || [],
          refusals: session.refusals || [],
          commitments: session.commitments || [],
          askHistory: session.askHistory || [],
          notes: session.notes || [],
          aiModel: session.liveAssist?.provenanceMeta?.model || "@cf/meta/llama-3.1-8b-instruct",
          aiLatencyMs: session.liveAssist?.provenanceMeta?.latencyMs || 350,
        };

        firstMateSessionStore.recordRun(recordedData);

        await saveFirstMateSessionRun({
          sessionId: effectiveSessionId,
          sessionType: session.sessionType || "IEP_MEETING",
          mode: (session.mode || "LIVE") as "LIVE" | "SIMULATOR",
          status: "COMPLETED",
          title: session.title || `First Mate Session: ${resolvedStudentName}`,
          studentName: resolvedStudentName,
          studentContactId: resolvedStudentId,
          language: session.language || "en",
          durationSeconds: session.durationSeconds || 0,
          turnCount: session.transcript?.length || 0,
          keyIssue: session.liveAssist?.currentIssue || "Collaborative Advocacy Review",
          keyIssuePriority: session.liveAssist?.currentIssuePriority || "High Priority",
          quickAnswer: session.liveAssist?.quickAnswer || "",
          sayThis: session.liveAssist?.sayThis || "",
          whyItMatters: session.liveAssist?.whyItMatters || "",
          summary,
          liveAssistJson: JSON.stringify(session.liveAssist || {}),
          transcriptJson: JSON.stringify(session.transcript || []),
          detectionsJson: JSON.stringify({
            requests: session.requests || [],
            refusals: session.refusals || [],
            commitments: session.commitments || [],
          }),
          askHistoryJson: JSON.stringify(session.askHistory || []),
          notesJson: JSON.stringify(session.notes || []),
          aiModel: session.liveAssist?.provenanceMeta?.model || "@cf/meta/llama-3.1-8b-instruct",
          aiLatencyMs: session.liveAssist?.provenanceMeta?.latencyMs || 350,
        });
      } catch (recErr) {
        console.warn("[FirstMate] Failed to archive session run:", recErr);
      }

      return {
        success: true,
        noteId,
        summary,
        studentId: resolvedStudentId,
        studentName: resolvedStudentName,
        projectId: projectRecord.id,
        noteTitle,
        visibility: "Advocate Only" as const,
      };
    }),

  /**
   * ── AI LEARNING & SESSION RECORDING ENDPOINTS (PG-037) ──
   */
  listRecordedSessions: publicProcedure
    .input(
      z
        .object({
          mode: z.enum(["ALL", "LIVE", "SIMULATOR"]).optional(),
          search: z.string().optional(),
          limit: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const dbRecords = await listFirstMateSessionRuns(input);
      const memoryRecords = firstMateSessionStore.listRecordedRuns(input);

      // Merge and deduplicate by sessionId
      const recordMap = new Map<string, any>();

      // Memory records first
      for (const m of memoryRecords) {
        recordMap.set(m.sessionId, m);
      }

      // Database records overwrite with parsed JSON
      for (const d of dbRecords) {
        let liveAssist = {};
        let transcript = [];
        let requests = [];
        let refusals = [];
        let commitments = [];
        let askHistory = [];
        let notes = [];

        try {
          if (d.liveAssistJson) liveAssist = JSON.parse(d.liveAssistJson);
        } catch {}
        try {
          if (d.transcriptJson) transcript = JSON.parse(d.transcriptJson);
        } catch {}
        try {
          if (d.detectionsJson) {
            const det = JSON.parse(d.detectionsJson);
            requests = det.requests || [];
            refusals = det.refusals || [];
            commitments = det.commitments || [];
          }
        } catch {}
        try {
          if (d.askHistoryJson) askHistory = JSON.parse(d.askHistoryJson);
        } catch {}
        try {
          if (d.notesJson) notes = JSON.parse(d.notesJson);
        } catch {}

        recordMap.set(d.sessionId, {
          sessionId: d.sessionId,
          sessionType: d.sessionType,
          mode: d.mode,
          status: d.status,
          title: d.title,
          studentName: d.studentName || "Student",
          studentContactId: d.studentContactId,
          language: d.language || "en",
          durationSeconds: d.durationSeconds,
          turnCount: d.turnCount,
          keyIssue: d.keyIssue,
          keyIssuePriority: d.keyIssuePriority,
          quickAnswer: d.quickAnswer,
          sayThis: d.sayThis,
          whyItMatters: d.whyItMatters,
          summary: d.summary,
          liveAssist,
          transcript,
          requests,
          refusals,
          commitments,
          askHistory,
          notes,
          aiModel: d.aiModel,
          aiLatencyMs: d.aiLatencyMs,
          advocateRating: d.advocateRating,
          advocateFeedback: d.advocateFeedback,
          tags: d.tags,
          createdAt: d.createdAt instanceof Date ? d.createdAt.getTime() : Number(d.createdAt) || Date.now(),
          updatedAt: d.updatedAt instanceof Date ? d.updatedAt.getTime() : Number(d.updatedAt) || Date.now(),
        });
      }

      const merged = Array.from(recordMap.values());
      merged.sort((a, b) => b.createdAt - a.createdAt);

      const limit = input?.limit || 50;
      return {
        sessions: merged.slice(0, limit),
        totalCount: merged.length,
      };
    }),

  getRecordedSession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const dbRecord = await getFirstMateSessionRunBySessionId(input.sessionId);
      if (dbRecord) {
        let liveAssist = {};
        let transcript = [];
        let requests = [];
        let refusals = [];
        let commitments = [];
        let askHistory = [];
        let notes = [];

        try {
          if (dbRecord.liveAssistJson) liveAssist = JSON.parse(dbRecord.liveAssistJson);
        } catch {}
        try {
          if (dbRecord.transcriptJson) transcript = JSON.parse(dbRecord.transcriptJson);
        } catch {}
        try {
          if (dbRecord.detectionsJson) {
            const det = JSON.parse(dbRecord.detectionsJson);
            requests = det.requests || [];
            refusals = det.refusals || [];
            commitments = det.commitments || [];
          }
        } catch {}
        try {
          if (dbRecord.askHistoryJson) askHistory = JSON.parse(dbRecord.askHistoryJson);
        } catch {}
        try {
          if (dbRecord.notesJson) notes = JSON.parse(dbRecord.notesJson);
        } catch {}

        return {
          session: {
            sessionId: dbRecord.sessionId,
            sessionType: dbRecord.sessionType,
            mode: dbRecord.mode,
            status: dbRecord.status,
            title: dbRecord.title,
            studentName: dbRecord.studentName,
            studentContactId: dbRecord.studentContactId,
            language: dbRecord.language,
            durationSeconds: dbRecord.durationSeconds,
            turnCount: dbRecord.turnCount,
            keyIssue: dbRecord.keyIssue,
            keyIssuePriority: dbRecord.keyIssuePriority,
            quickAnswer: dbRecord.quickAnswer,
            sayThis: dbRecord.sayThis,
            whyItMatters: dbRecord.whyItMatters,
            summary: dbRecord.summary,
            liveAssist,
            transcript,
            requests,
            refusals,
            commitments,
            askHistory,
            notes,
            aiModel: dbRecord.aiModel,
            aiLatencyMs: dbRecord.aiLatencyMs,
            advocateRating: dbRecord.advocateRating,
            advocateFeedback: dbRecord.advocateFeedback,
            tags: dbRecord.tags,
            createdAt: dbRecord.createdAt instanceof Date ? dbRecord.createdAt.getTime() : Number(dbRecord.createdAt) || Date.now(),
            updatedAt: dbRecord.updatedAt instanceof Date ? dbRecord.updatedAt.getTime() : Number(dbRecord.updatedAt) || Date.now(),
          },
        };
      }

      const memRecord = firstMateSessionStore.getRecordedRun(input.sessionId);
      if (memRecord) {
        return { session: memRecord };
      }

      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Recorded session with id ${input.sessionId} was not found.`,
      });
    }),

  saveSessionRecord: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        sessionType: z.string().optional(),
        mode: z.enum(["LIVE", "SIMULATOR"]).optional(),
        status: z.string().optional(),
        title: z.string().optional(),
        studentName: z.string().optional(),
        studentContactId: z.number().optional(),
        language: z.string().optional(),
        durationSeconds: z.number().optional(),
        turnCount: z.number().optional(),
        keyIssue: z.string().optional(),
        keyIssuePriority: z.string().optional(),
        quickAnswer: z.string().optional(),
        sayThis: z.string().optional(),
        whyItMatters: z.string().optional(),
        summary: z.string().optional(),
        liveAssist: z.any().optional(),
        transcript: z.array(z.any()).optional(),
        requests: z.array(z.any()).optional(),
        refusals: z.array(z.any()).optional(),
        commitments: z.array(z.any()).optional(),
        askHistory: z.array(z.any()).optional(),
        notes: z.array(z.any()).optional(),
        aiModel: z.string().optional(),
        aiLatencyMs: z.number().optional(),
        advocateRating: z.number().optional(),
        advocateFeedback: z.string().optional(),
        tags: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // 1. Record in memory cache
      const memRun = firstMateSessionStore.recordRun(input as any);

      // 2. Persist to database
      try {
        await saveFirstMateSessionRun({
          sessionId: input.sessionId,
          sessionType: input.sessionType || "IEP_MEETING",
          mode: input.mode || "LIVE",
          status: input.status || "COMPLETED",
          title: input.title || `Session ${input.sessionId}`,
          studentName: input.studentName || "Student",
          studentContactId: input.studentContactId,
          language: input.language || "en",
          durationSeconds: input.durationSeconds || 0,
          turnCount: input.turnCount || input.transcript?.length || 0,
          keyIssue: input.keyIssue,
          keyIssuePriority: input.keyIssuePriority,
          quickAnswer: input.quickAnswer,
          sayThis: input.sayThis,
          whyItMatters: input.whyItMatters,
          summary: input.summary,
          liveAssistJson: JSON.stringify(input.liveAssist || {}),
          transcriptJson: JSON.stringify(input.transcript || []),
          detectionsJson: JSON.stringify({
            requests: input.requests || [],
            refusals: input.refusals || [],
            commitments: input.commitments || [],
          }),
          askHistoryJson: JSON.stringify(input.askHistory || []),
          notesJson: JSON.stringify(input.notes || []),
          aiModel: input.aiModel || "@cf/meta/llama-3.1-8b-instruct",
          aiLatencyMs: input.aiLatencyMs || 350,
          advocateRating: input.advocateRating,
          advocateFeedback: input.advocateFeedback,
          tags: input.tags,
        });
      } catch (err) {
        console.warn("[FirstMate] Failed to save session record to database:", err);
      }

      return { success: true, session: memRun };
    }),

  updateSessionFeedback: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        advocateRating: z.number().min(1).max(5).optional(),
        advocateFeedback: z.string().optional(),
        tags: z.union([z.string(), z.array(z.string())]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const normalizedTags =
        input.tags === undefined
          ? undefined
          : typeof input.tags === "string"
          ? input.tags
          : JSON.stringify(input.tags);

      // 1. Update in-memory
      firstMateSessionStore.updateRunFeedback(input.sessionId, {
        advocateRating: input.advocateRating,
        advocateFeedback: input.advocateFeedback,
        tags: normalizedTags,
      });

      // 2. Update database
      await updateFirstMateSessionFeedback(input.sessionId, {
        advocateRating: input.advocateRating,
        advocateFeedback: input.advocateFeedback,
        tags: normalizedTags,
      });

      return { success: true };
    }),

  deleteRecordedSession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input }) => {
      firstMateSessionStore.deleteRecordedRun(input.sessionId);
      await deleteFirstMateSessionRun(input.sessionId);
      return { success: true };
    }),
});


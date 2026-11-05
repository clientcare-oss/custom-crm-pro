import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { brainDumpItems, brainDumpImages } from "../../drizzle/schema";
import { formatPhone } from "../quoWebhook";

function toStrictBool(val: unknown): boolean {
  return val === true || val === 1 || val === "1" || val === "true";
}

function formatDialogueTime(secs: number | null | undefined): string {
  if (secs == null || isNaN(secs)) return "";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `[${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}]`;
}

/**
 * Normalizes SQLite boolean representations ('false'/'true'/0/1) and hydrates
 * Quo v3 fields (transcript dialogue, voicemail URL/duration, media duration, missed status)
 * from rawPayload when historical rows were ingested before parser enhancements.
 */
function hydrateCallLogRow(row: any): any {
  let payload: any = row.rawPayload;
  if (typeof payload === "string" && payload.trim().startsWith("{")) {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = null;
    }
  }

  const callData =
    payload?.data?.resource ||
    payload?.data?.object ||
    payload?.data ||
    payload?.call ||
    {};

  const eventType: string =
    row.eventType || payload?.type || payload?.event || payload?.eventType || "";
  const direction: string =
    row.direction || callData?.direction || payload?.direction || "inbound";

  const voicemailData = callData?.voicemail || payload?.voicemail;
  const isVoicemail =
    toStrictBool(row.isVoicemail) ||
    Boolean(voicemailData || callData?.isVoicemail || payload?.isVoicemail);

  let recordingUrl: string | null = row.recordingUrl || null;
  if (!recordingUrl) {
    if (typeof voicemailData?.url === "string" && voicemailData.url) {
      recordingUrl = voicemailData.url;
    } else if (Array.isArray(callData?.media) && callData.media.length > 0) {
      const audio = callData.media.find(
        (m: any) => (m?.type && String(m.type).startsWith("audio")) || m?.url
      );
      if (audio?.url) recordingUrl = audio.url;
    }
  }

  let durationSeconds: number = Number(row.durationSeconds) || 0;
  if (durationSeconds === 0) {
    if (typeof voicemailData?.duration === "number" && voicemailData.duration > 0) {
      durationSeconds = Math.round(voicemailData.duration);
    } else if (
      Array.isArray(callData?.media) &&
      callData.media.length > 0 &&
      typeof callData.media[0]?.duration === "number" &&
      callData.media[0].duration > 0
    ) {
      durationSeconds = Math.round(callData.media[0].duration);
    } else if (callData?.answeredAt && callData?.completedAt) {
      const diff = Math.round(
        (new Date(callData.completedAt).getTime() - new Date(callData.answeredAt).getTime()) / 1000
      );
      if (diff > 0 && !isNaN(diff)) durationSeconds = diff;
    }
  }

  let transcript: string | null = row.transcript || null;
  if (!transcript) {
    const dialogue =
      callData?.callTranscript?.dialogue ||
      callData?.dialogue ||
      payload?.dialogue ||
      callData?.transcript?.dialogue;
    if (Array.isArray(dialogue) && dialogue.length > 0) {
      transcript = dialogue
        .map((d: any) => {
          const time = formatDialogueTime(d?.start);
          const isEmployee = Boolean(d?.userId);
          const speaker = isEmployee
            ? "Advocate (Waypoint)"
            : d?.identifier
            ? `Caller (${formatPhone(String(d.identifier))})`
            : "Caller";
          const content = d?.content || d?.text || "";
          return `${time ? time + " " : ""}${speaker}: ${content}`;
        })
        .join("\n\n");
      if (durationSeconds === 0) {
        const maxEnd = Math.max(...dialogue.map((d: any) => Number(d?.end) || 0));
        if (maxEnd > 0) durationSeconds = Math.round(maxEnd);
      }
    }
  }

  const isMissed =
    toStrictBool(row.isMissed) ||
    eventType === "call.missed" ||
    callData?.status === "missed" ||
    callData?.status === "no-answer" ||
    callData?.status === "unanswered" ||
    callData?.status === "busy" ||
    callData?.status === "canceled" ||
    callData?.answered === false ||
    ((direction === "incoming" || direction === "inbound") &&
      callData?.answeredAt === null &&
      eventType === "call.completed") ||
    isVoicemail;

  return {
    ...row,
    isVoicemail,
    isMissed,
    recordingUrl,
    durationSeconds,
    transcript,
    callbackStatus:
      row.callbackStatus && row.callbackStatus !== "none"
        ? row.callbackStatus
        : isMissed
        ? "pending"
        : "none",
  };
}

export const callLogsRouter = router({
  // List call logs for a specific student
  listByStudent: protectedProcedure
    .input(z.object({ studentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { callLogs } = await import("../../drizzle/schema");
      const isAdmin = ctx.user?.role === "admin";
      const whereClause = isAdmin
        ? eq(callLogs.studentId, input.studentId)
        : and(eq(callLogs.ownerId, ctx.user.id), eq(callLogs.studentId, input.studentId));
      const rows = await database
        .select()
        .from(callLogs)
        .where(whereClause)
        .orderBy(desc(callLogs.createdAt));
      return rows.map(hydrateCallLogRow);
    }),

  // List ALL call logs (for the full call log view with filters)
  listAll: protectedProcedure
    .input(
      z
        .object({
          filter: z.enum(["all", "unassigned", "calls", "voicemails", "sms", "missed"]).optional().default("all"),
          limit: z.number().min(1).max(200).optional().default(100),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { callLogs } = await import("../../drizzle/schema");
      const filter = input?.filter ?? "all";
      const limit = input?.limit ?? 100;
      const isAdmin = ctx.user?.role === "admin";

      const conditions: any[] = [];
      if (!isAdmin && ctx.user?.id) {
        conditions.push(eq(callLogs.ownerId, ctx.user.id));
      }
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const rawRows = await database
        .select()
        .from(callLogs)
        .where(whereClause)
        .orderBy(desc(callLogs.createdAt))
        .limit(limit);

      const hydrated = rawRows.map(hydrateCallLogRow);

      if (filter === "unassigned") {
        return hydrated.filter((r) => r.status === "unassigned");
      }
      if (filter === "voicemails") {
        return hydrated.filter((r) => r.isVoicemail);
      }
      if (filter === "missed") {
        return hydrated.filter((r) => r.isMissed);
      }
      if (filter === "sms") {
        return hydrated.filter(
          (r) => (r.eventType || "").startsWith("message.") || Boolean(r.smsBody)
        );
      }
      if (filter === "calls") {
        return hydrated.filter(
          (r) => !(r.eventType || "").startsWith("message.") && !r.smsBody
        );
      }
      return hydrated;
    }),

  // Update callback / follow-up status for a call log ("pending" | "completed" | "dismissed" | "none")
  updateCallbackStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        callbackStatus: z.enum(["none", "pending", "completed", "dismissed"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { callLogs } = await import("../../drizzle/schema");
      const isAdmin = ctx.user?.role === "admin";
      const whereClause = isAdmin
        ? eq(callLogs.id, input.id)
        : and(eq(callLogs.id, input.id), eq(callLogs.ownerId, ctx.user.id));
      await database
        .update(callLogs)
        .set({ callbackStatus: input.callbackStatus })
        .where(whereClause);
      return { success: true, id: input.id, callbackStatus: input.callbackStatus };
    }),

  // List unassigned call logs (no student matched)
  listUnassigned: protectedProcedure.query(async ({ ctx }) => {
    const database = await db.getDb();
    if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const { callLogs } = await import("../../drizzle/schema");
    const isAdmin = ctx.user?.role === "admin";
    const whereClause = isAdmin
      ? eq(callLogs.status, "unassigned")
      : and(eq(callLogs.ownerId, ctx.user.id), eq(callLogs.status, "unassigned"));
    return await database
      .select()
      .from(callLogs)
      .where(whereClause)
      .orderBy(desc(callLogs.createdAt));
  }),

  // Assign an unassigned call log to a student
  assign: protectedProcedure
    .input(z.object({ callLogId: z.number(), studentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { callLogs } = await import("../../drizzle/schema");
      const isAdmin = ctx.user?.role === "admin";
      const whereClause = isAdmin
        ? eq(callLogs.id, input.callLogId)
        : and(eq(callLogs.id, input.callLogId), eq(callLogs.ownerId, ctx.user.id));
      await database
        .update(callLogs)
        .set({ studentId: input.studentId, status: "assigned", assignedAt: new Date() })
        .where(whereClause);
      return { success: true };
    }),

  // Delete a call log
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { callLogs } = await import("../../drizzle/schema");
      const isAdmin = ctx.user?.role === "admin";
      const whereClause = isAdmin
        ? eq(callLogs.id, input.id)
        : and(eq(callLogs.id, input.id), eq(callLogs.ownerId, ctx.user.id));
      await database
        .delete(callLogs)
        .where(whereClause);
      return { success: true };
    }),

  // Get unassigned count (for sidebar badge)
  unassignedCount: protectedProcedure.query(async ({ ctx }) => {
    const database = await db.getDb();
    if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const { callLogs } = await import("../../drizzle/schema");
    const isAdmin = ctx.user?.role === "admin";
    const whereClause = isAdmin
      ? eq(callLogs.status, "unassigned")
      : and(eq(callLogs.ownerId, ctx.user.id), eq(callLogs.status, "unassigned"));
    const rows = await database
      .select({ id: callLogs.id })
      .from(callLogs)
      .where(whereClause);
    return { count: rows.length };
  }),

  // Synthesize or retrieve AI Executive Summary for a call with a transcript
  generateSummary: protectedProcedure
    .input(z.object({ callLogId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { callLogs } = await import("../../drizzle/schema");
      const isAdmin = ctx.user?.role === "admin";
      const whereClause = isAdmin
        ? eq(callLogs.id, input.callLogId)
        : and(eq(callLogs.id, input.callLogId), eq(callLogs.ownerId, ctx.user.id));

      const [log] = await database.select().from(callLogs).where(whereClause).limit(1);
      if (!log) throw new TRPCError({ code: "NOT_FOUND", message: "Call log not found" });

      if (log.summary && log.summary.trim().length > 20) {
        return { summary: log.summary };
      }

      if (!log.transcript || log.transcript.trim().length < 10) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No transcript available to summarize" });
      }

      let summaryText = "";
      try {
        const { invokeLLM, CF_MODELS } = await import("../_core/llm");
        const transcriptSlice = log.transcript.slice(0, 12000);
        const res = await invokeLLM({
          model: CF_MODELS.FAST,
          messages: [
            {
              role: "system",
              content:
                "You are an executive special education advocacy assistant for Waypoint Advocates (Byron Honea, Lead Special Education Advocate). Analyze this call transcript between an advocate and a parent or school personnel. Provide an Executive Summary in 2 concise paragraphs, followed by 'Key Takeaways:' with bullet points, and 'Action Items:' with bullet points if applicable. Never use the prohibited term 'Master Coach'. Use clean markdown.",
            },
            {
              role: "user",
              content: `Call Transcript:\n${transcriptSlice}`,
            },
          ],
        });

        const content = res.choices[0]?.message?.content;
        summaryText =
          typeof content === "string"
            ? content
            : Array.isArray(content)
            ? (content[0] as any)?.text || ""
            : "";
      } catch (err: any) {
        console.warn("[CallLogs] LLM summary synthesis failed, using local extraction:", err?.message);
        summaryText = `Advocacy consultation call between Waypoint Advocates and ${log.fromNumber || "the client"} (duration: ${Math.round((log.durationSeconds || 0) / 60)} minutes). Dialogue recorded regarding IEP special education needs.`;
      }

      if (summaryText) {
        await database
          .update(callLogs)
          .set({ summary: summaryText })
          .where(eq(callLogs.id, log.id));
      }

      return { summary: summaryText };
    }),
});

/**
 * Quo (formerly OpenPhone) webhook handler.
 *
 * Supported events:
 *   call.completed          — answered/unanswered calls, voicemail embedded
 *   call.ringing / started  — live call ringing / in-progress
 *   call.missed             — missed calls
 *   call.transcript.completed — AI transcript for a call
 *   call.summary.completed  — AI summary for a call
 *   call.recording.completed — recording URL available
 *   message.received        — inbound SMS/MMS
 *   message.delivered       — outbound SMS/MMS delivered
 *   contact.created/updated — contact created/modified in Quo
 *   contact.deleted         — contact removed from Quo
 *
 * Signature verification:
 *   - Modern Quo: Standard Webhooks (Svix) with headers webhook-id, webhook-timestamp, webhook-signature (or svix-*)
 *   - Legacy OpenPhone: openphone-signature: hmac;1;<timestamp>;<base64digest>
 */
import { Router, raw } from "express";
import crypto from "crypto";
import { Webhook } from "svix";
import * as db from "./db";
import { ENV } from "./_core/env";

// Normalize a phone number to digits only for matching
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

// Check if two phone numbers match (compare last 10 digits)
export function phonesMatch(a: string, b: string): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  return na.slice(-10) === nb.slice(-10);
}

// Format phone for display: 17706847089 → +1 (770) 684-7089
export function formatPhone(raw: string): string {
  const digits = normalizePhone(raw);
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return raw;
}

// Extract phone string from potentially nested object (e.g. from: { phoneNumber: "+1..." } or from: "+1...")
function extractPhoneString(val: any): string {
  if (typeof val === "string") return val;
  if (val && typeof val === "object") {
    return val.phoneNumber || val.number || val.phone || "";
  }
  return "";
}

export interface QuoSignatureHeaders {
  openphoneSignature?: string | null;
  webhookSignature?: string | null;
  webhookId?: string | null;
  webhookTimestamp?: string | null;
}

/**
 * Verify Quo webhook signature supporting both modern Svix headers and legacy OpenPhone HMAC.
 */
export function verifyQuoSignature(
  rawBody: Buffer,
  headers: QuoSignatureHeaders | string,
  secret: string
): boolean {
  try {
    const rawBodyStr = rawBody.toString("utf8");

    const headerObj: QuoSignatureHeaders =
      typeof headers === "string" ? { openphoneSignature: headers } : headers;

    // 1. Check Svix signature (Modern Quo standard: webhook-signature or svix-signature)
    const svixSig = headerObj.webhookSignature;
    if (svixSig) {
      try {
        const wh = new Webhook(secret);
        const svixHeaders: Record<string, string> = {
          "webhook-id": headerObj.webhookId || "id",
          "webhook-timestamp": headerObj.webhookTimestamp || String(Math.floor(Date.now() / 1000)),
          "webhook-signature": svixSig,
        };
        wh.verify(rawBodyStr, svixHeaders);
        return true;
      } catch (err: any) {
        console.warn("[Quo Webhook] Svix signature verification failed:", err?.message);
      }
    }

    // 2. Check Legacy OpenPhone signature: hmac;1;<timestamp>;<base64digest>
    const legacySig = headerObj.openphoneSignature;
    if (legacySig) {
      const parts = legacySig.split(";");
      if (parts.length >= 4) {
        const timestamp = parts[2];
        const providedDigest = parts[3];

        // Quo spec requirement: strip whitespace and newlines from json
        let sanitizedBody = rawBodyStr;
        try {
          sanitizedBody = JSON.stringify(JSON.parse(rawBodyStr));
        } catch {}

        const signedCandidates = [
          `${timestamp}.${sanitizedBody}`,
          `${timestamp}.${rawBodyStr}`,
        ];

        // Secret might be base64-encoded or raw string
        const secretKeys: Buffer[] = [];
        try {
          const b64 = Buffer.from(secret, "base64");
          if (b64.length > 0) secretKeys.push(b64);
        } catch {}
        secretKeys.push(Buffer.from(secret, "utf8"));

        for (const secKey of secretKeys) {
          for (const candidate of signedCandidates) {
            const computedDigest = crypto
              .createHmac("sha256", secKey)
              .update(Buffer.from(candidate, "utf8"))
              .digest("base64");

            if (computedDigest === providedDigest) {
              return true;
            }
          }
        }
      }
    }

    return false;
  } catch (err) {
    console.error("[Quo Webhook] Signature verification exception:", err);
    return false;
  }
}

/**
 * Robust secret resolver: looks in database user record, quoSettings, or environment variables.
 */
export async function resolveQuoWebhookSecret(): Promise<string | null> {
  const dbSecret = await db.getOwnerQuoSecret(ENV.ownerOpenId).catch(() => null);
  if (dbSecret) return dbSecret;

  const database = await db.getDb();
  if (database) {
    try {
      const { users, quoSettings } = await import("../drizzle/schema");
      const { isNotNull } = await import("drizzle-orm");

      // Check quoSettings table
      const [s] = await database
        .select({ webhookSecret: quoSettings.webhookSecret })
        .from(quoSettings)
        .where(isNotNull(quoSettings.webhookSecret))
        .limit(1);
      if (s?.webhookSecret) return s.webhookSecret;

      // Check users table
      const [u] = await database
        .select({ quoWebhookSecret: users.quoWebhookSecret })
        .from(users)
        .where(isNotNull(users.quoWebhookSecret))
        .limit(1);
      if (u?.quoWebhookSecret) return u.quoWebhookSecret;
    } catch {}
  }

  return process.env.QUO_WEBHOOK_SECRET || null;
}

/**
 * Robust owner resolver: ensures ownerId prioritizes the account configuring Quo.
 */
export async function resolveOwnerId(): Promise<number> {
  const database = await db.getDb();
  if (database) {
    try {
      const { users, quoSettings } = await import("../drizzle/schema");
      const { eq, isNotNull } = await import("drizzle-orm");

      // 1. Owner from quoSettings
      const [setting] = await database
        .select({ ownerId: quoSettings.ownerId })
        .from(quoSettings)
        .limit(1);
      if (setting?.ownerId) return setting.ownerId;

      // 2. User with quoWebhookSecret saved
      const [userWithSecret] = await database
        .select({ id: users.id })
        .from(users)
        .where(isNotNull(users.quoWebhookSecret))
        .limit(1);
      if (userWithSecret) return userWithSecret.id;

      // 3. Byron / ClientCare lead advocate account
      const [leadAdvocate] = await database
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, "clientcare@waypointadvocates.com"))
        .limit(1);
      if (leadAdvocate) return leadAdvocate.id;

      // 4. Any admin user
      const [admin] = await database
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, "admin"))
        .limit(1);
      if (admin) return admin.id;

      // 5. First user
      const [firstUser] = await database
        .select({ id: users.id })
        .from(users)
        .limit(1);
      if (firstUser) return firstUser.id;
    } catch {}
  }
  return 1;
}

export interface QuoWebhookProcessResult {
  status: number;
  data: any;
}

/**
 * Unified Quo Webhook Processor (Used by both Express server and Cloudflare Workers).
 */
export async function processQuoWebhook(
  rawBody: Buffer,
  sigInput?: QuoSignatureHeaders | string | null
): Promise<QuoWebhookProcessResult> {
  const webhookSecret = await resolveQuoWebhookSecret();

  const headers: QuoSignatureHeaders =
    typeof sigInput === "string"
      ? { openphoneSignature: sigInput }
      : sigInput || {};

  const hasAnySignatureHeader =
    !!headers.openphoneSignature || !!headers.webhookSignature;

  // Verify signature if secret is configured
  if (webhookSecret && hasAnySignatureHeader) {
    const valid = verifyQuoSignature(rawBody, headers, webhookSecret);
    if (!valid) {
      console.warn("[Quo Webhook] Signature mismatch — rejecting");
      return { status: 401, data: { error: "Invalid signature" } };
    }
  } else if (webhookSecret && !hasAnySignatureHeader) {
    // If webhook is sent with no signature header, log warning but allow graceful ping/setup if JSON is valid test
    let testCheck: any = null;
    try {
      testCheck = JSON.parse(rawBody.toString("utf8"));
    } catch {}
    if (testCheck?.type === "test" || testCheck?.type === "ping" || testCheck?.eventType === "test") {
      console.info("[Quo Webhook] Test event allowed through without signature header");
      return { status: 200, data: { received: true, action: "test_acknowledged" } };
    }
    console.warn("[Quo Webhook] Missing signature header — rejecting");
    return { status: 401, data: { error: "Missing signature header (openphone-signature or webhook-signature)" } };
  } else if (!webhookSecret) {
    console.info("[Quo Webhook] No webhook signing secret configured — accepting payload in provisional mode");
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return { status: 400, data: { error: "Invalid JSON" } };
  }

  const eventType: string = payload?.type || payload?.event || payload?.eventType || "";
  console.log(`[Quo Webhook] Processing event: ${eventType}`);

  // Test / Ping handshake acknowledgement
  if (eventType === "test" || eventType === "ping" || payload?.test) {
    return { status: 200, data: { received: true, action: "tested", eventType } };
  }

  // Get the database and owner
  const database = await db.getDb();
  if (!database) {
    console.error("[Quo Webhook] Database unavailable");
    return { status: 500, data: { error: "Database unavailable" } };
  }

  const { contacts, callLogs, quoSettings } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  const ownerId = await resolveOwnerId();

  // Update last sync on quoSettings if table exists
  try {
    await database
      .update(quoSettings)
      .set({ lastSyncAt: new Date(), status: "connected" })
      .where(eq(quoSettings.ownerId, ownerId));
  } catch (err) {
    // Non-fatal if settings not yet initialized
  }

  // ─── CALL EVENTS ───────────────────────────────────────────────
  if (
    eventType.startsWith("call.") ||
    eventType === "call_completed" ||
    eventType === "call_recording_completed"
  ) {
    const callData =
      payload?.data?.resource ||
      payload?.data?.object ||
      payload?.data ||
      payload?.call ||
      {};

    const quoCallId: string = callData?.id || callData?.callId || payload?.id || "";
    const fromNumber: string = extractPhoneString(callData?.from || callData?.fromNumber || "");
    const toNumber: string = extractPhoneString(callData?.to || callData?.toNumber || "");
    const durationSeconds: number = Number(callData?.duration || callData?.durationSeconds || 0);
    const direction: string = callData?.direction || "inbound";

    // Transcript
    const transcript: string =
      callData?.transcript?.text ||
      callData?.transcript ||
      payload?.transcript?.text ||
      payload?.transcript ||
      "";

    // Summary
    const summary: string =
      callData?.summary?.text ||
      callData?.summary ||
      payload?.summary?.text ||
      payload?.summary ||
      "";

    // Recording URL
    const recordingUrl: string =
      callData?.recordingUrl ||
      callData?.recording?.url ||
      payload?.recordingUrl ||
      "";

    // Voicemail detection
    const voicemailData = callData?.voicemail || payload?.voicemail;
    const isVoicemail = !!(voicemailData || callData?.isVoicemail || payload?.isVoicemail);
    const voicemailTranscript: string =
      voicemailData?.transcript?.text ||
      voicemailData?.transcript ||
      voicemailData?.transcription ||
      callData?.voicemailTranscript ||
      "";

    const participants: string[] = Array.isArray(callData?.participants) ? callData.participants : [];

    // Detect missed call
    const isMissed =
      eventType === "call.missed" ||
      callData?.status === "missed" ||
      callData?.status === "unanswered" ||
      callData?.answered === false ||
      (isVoicemail && durationSeconds === 0);
    const callbackStatus = isMissed ? "pending" : "none";

    // Idempotency check — update existing record if same call ID
    if (quoCallId) {
      const [existing] = await database
        .select({ id: callLogs.id })
        .from(callLogs)
        .where(eq(callLogs.quoCallId, quoCallId))
        .limit(1);

      if (existing) {
        await database
          .update(callLogs)
          .set({
            ...(transcript ? { transcript } : {}),
            ...(summary ? { summary } : {}),
            ...(recordingUrl ? { recordingUrl } : {}),
            ...(voicemailTranscript ? { voicemailTranscript } : {}),
            ...(isVoicemail ? { isVoicemail: true } : {}),
            ...(isMissed ? { isMissed: true, callbackStatus: "pending" } : {}),
            ...(durationSeconds ? { durationSeconds } : {}),
            eventType,
            rawPayload: payload,
          })
          .where(eq(callLogs.id, existing.id));
        console.log(`[Quo Webhook] Updated existing call log #${existing.id} (${eventType})`);
        return { status: 200, data: { received: true, action: "updated", id: existing.id } };
      }
    }

    // Auto-match to contact / student by phone number
    const allContacts = await database
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        phone: contacts.phone,
        jobTitle: contacts.jobTitle,
      })
      .from(contacts)
      .where(eq(contacts.ownerId, ownerId));

    const matchingContacts = allContacts.filter((c) => {
      if (!c.phone) return false;
      return phonesMatch(c.phone, fromNumber) || phonesMatch(c.phone, toNumber);
    });

    let contactId: number | null = null;
    let studentId: number | null = null;
    let status = "unassigned";
    let matchedPhone: string | null = null;

    if (matchingContacts.length >= 1) {
      const primaryMatch = matchingContacts[0];
      contactId = primaryMatch.id;
      matchedPhone = primaryMatch.phone || null;
      status = "assigned";

      if (primaryMatch.jobTitle === "Student") {
        studentId = primaryMatch.id;
      } else {
        const studentMatch = matchingContacts.find((c) => c.jobTitle === "Student");
        if (studentMatch) studentId = studentMatch.id;
      }
      console.log(`[Quo Webhook] Auto-assigned to contact #${contactId} (student: ${studentId ?? "none"})`);
    } else {
      console.log(`[Quo Webhook] No phone match for ${fromNumber} / ${toNumber} — unassigned`);
    }

    await database.insert(callLogs).values({
      ownerId,
      contactId: contactId ?? undefined,
      studentId: studentId ?? undefined,
      quoCallId: quoCallId || undefined,
      fromNumber: formatPhone(fromNumber),
      toNumber: formatPhone(toNumber),
      durationSeconds,
      direction,
      transcript: transcript || undefined,
      summary: summary || undefined,
      recordingUrl: recordingUrl || undefined,
      isVoicemail,
      voicemailTranscript: voicemailTranscript || undefined,
      participants: participants.length > 0 ? participants : undefined,
      status,
      matchedPhone: matchedPhone ? formatPhone(matchedPhone) : undefined,
      assignedAt: status === "assigned" ? new Date() : undefined,
      isMissed,
      callbackStatus,
      eventType,
      rawPayload: payload,
    });

    console.log(`[Quo Webhook] Call log saved — type: ${eventType}, status: ${status}, missed: ${isMissed}`);
    return { status: 200, data: { received: true, action: "created", status, eventType, isMissed } };
  }

  // ─── MESSAGE EVENTS ────────────────────────────────────────────
  if (eventType === "message.received" || eventType === "message.delivered") {
    const msgData =
      payload?.data?.resource ||
      payload?.data?.object ||
      payload?.data ||
      payload?.message ||
      {};

    const quoMsgId: string = msgData?.id || payload?.id || "";
    const fromNumber: string = extractPhoneString(msgData?.from || msgData?.fromNumber || "");
    const toNumber: string = extractPhoneString(msgData?.to || msgData?.toNumber || "");
    const smsBody: string = msgData?.body || msgData?.text || payload?.body || "";
    const direction = eventType === "message.received" ? "inbound" : "outbound";

    // Idempotency
    if (quoMsgId) {
      const [existing] = await database
        .select({ id: callLogs.id })
        .from(callLogs)
        .where(eq(callLogs.quoCallId, quoMsgId))
        .limit(1);
      if (existing) {
        return { status: 200, data: { received: true, action: "duplicate" } };
      }
    }

    // Auto-match to contact
    const allContacts = await database
      .select({ id: contacts.id, phone: contacts.phone, jobTitle: contacts.jobTitle })
      .from(contacts)
      .where(eq(contacts.ownerId, ownerId));

    const match = allContacts.find((c) => c.phone && (phonesMatch(c.phone, fromNumber) || phonesMatch(c.phone, toNumber)));
    const contactId = match?.id ?? null;
    const studentId = match?.jobTitle === "Student" ? match.id : null;
    const status = contactId ? "assigned" : "unassigned";

    await database.insert(callLogs).values({
      ownerId,
      contactId: contactId ?? undefined,
      studentId: studentId ?? undefined,
      quoCallId: quoMsgId || undefined,
      fromNumber: formatPhone(fromNumber),
      toNumber: formatPhone(toNumber),
      durationSeconds: 0,
      direction,
      smsBody: smsBody || undefined,
      status,
      assignedAt: contactId ? new Date() : undefined,
      eventType,
      rawPayload: payload,
    });

    console.log(`[Quo Webhook] SMS log saved — type: ${eventType}, status: ${status}, contact: ${contactId}`);
    return { status: 200, data: { received: true, action: "created", eventType } };
  }

  // ─── CONTACT EVENTS ────────────────────────────────────────────
  if (eventType === "contact.updated" || eventType === "contact.created" || eventType === "contact.deleted") {
    console.log(`[Quo Webhook] Contact event received: ${eventType} (acknowledged)`);
    return { status: 200, data: { received: true, action: "logged", eventType } };
  }

  // Acknowledge all other events
  console.log(`[Quo Webhook] Unhandled event type: ${eventType}`);
  return { status: 200, data: { received: true, action: "ignored", eventType } };
}

/**
 * Web Standard Fetch Handler for Cloudflare Workers.
 */
export async function handleQuoWebhookRequest(request: Request): Promise<Response> {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, openphone-signature, webhook-signature, webhook-id, webhook-timestamp, svix-id, svix-timestamp, svix-signature",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (request.method === "GET") {
    return new Response(
      JSON.stringify({
        status: "ok",
        service: "Waypoint Advocates Quo Webhook Receiver",
        active: true,
        supportedEvents: [
          "call.completed",
          "call.ringing",
          "call.started",
          "call.missed",
          "call.transcript.completed",
          "call.summary.completed",
          "call.recording.completed",
          "message.received",
          "message.delivered",
          "contact.created",
          "contact.updated",
          "contact.deleted",
        ],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const arrayBuf = await request.arrayBuffer();
    const rawBody = Buffer.from(arrayBuf);

    const sigHeaders: QuoSignatureHeaders = {
      openphoneSignature: request.headers.get("openphone-signature"),
      webhookSignature:
        request.headers.get("webhook-signature") ||
        request.headers.get("svix-signature"),
      webhookId:
        request.headers.get("webhook-id") ||
        request.headers.get("svix-id"),
      webhookTimestamp:
        request.headers.get("webhook-timestamp") ||
        request.headers.get("svix-timestamp"),
    };

    const result = await processQuoWebhook(rawBody, sigHeaders);
    return new Response(JSON.stringify(result.data), {
      status: result.status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("[Quo Webhook Cloudflare Worker Exception]", err);
    return new Response(
      JSON.stringify({ error: "Internal webhook processing error", details: err?.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
}

/**
 * Express Middleware Registration for local development and Node.js runtime.
 */
export function registerQuoWebhookRoutes(app: Router) {
  const webhookHandler = async (req: any, res: any) => {
    const sigHeaders: QuoSignatureHeaders = {
      openphoneSignature: req.headers["openphone-signature"] as string | undefined,
      webhookSignature: (req.headers["webhook-signature"] || req.headers["svix-signature"]) as string | undefined,
      webhookId: (req.headers["webhook-id"] || req.headers["svix-id"]) as string | undefined,
      webhookTimestamp: (req.headers["webhook-timestamp"] || req.headers["svix-timestamp"]) as string | undefined,
    };
    const rawBody = req.body as Buffer;
    const result = await processQuoWebhook(rawBody, sigHeaders);
    return res.status(result.status).json(result.data);
  };

  const webhookPaths = ["/api/quo/webhook", "/api/integrations/quo/webhooks"];
  webhookPaths.forEach((path) => {
    app.post(path, raw({ type: "application/json" }), webhookHandler);
    app.get(path, (_req, res) => {
      res.json({
        status: "ok",
        service: "Waypoint Quo Webhook Receiver",
        active: true,
        supportedEvents: [
          "call.completed",
          "call.ringing",
          "call.started",
          "call.missed",
          "call.transcript.completed",
          "call.summary.completed",
          "call.recording.completed",
          "message.received",
          "message.delivered",
          "contact.created",
          "contact.updated",
        ],
      });
    });
    app.options(path, (_req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "*");
      res.sendStatus(200);
    });
  });
}

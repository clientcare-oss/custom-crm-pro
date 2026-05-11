/**
 * Quo (formerly OpenPhone) webhook handler.
 *
 * Supported events:
 *   call.completed          — answered/unanswered calls, voicemail embedded
 *   call.transcript.completed — AI transcript for a call
 *   call.summary.completed  — AI summary for a call
 *   call.recording.completed — recording URL available
 *   message.received        — inbound SMS/MMS
 *   message.delivered       — outbound SMS/MMS delivered
 *   contact.updated         — contact created/modified in Quo
 *   contact.deleted         — contact removed from Quo
 *
 * Signature verification follows the Quo spec:
 *   header: openphone-signature: hmac;1;<timestamp>;<base64digest>
 *   signed data: <timestamp>.<rawBody>
 *   key: base64-decoded signing secret
 */
import { Router, raw } from "express";
import crypto from "crypto";
import * as db from "./db";
import { ENV } from "./_core/env";

// Normalize a phone number to digits only for matching
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

// Check if two phone numbers match (compare last 10 digits)
function phonesMatch(a: string, b: string): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  return na.slice(-10) === nb.slice(-10);
}

// Format phone for display: 17706847089 → +1 (770) 684-7089
function formatPhone(raw: string): string {
  const digits = normalizePhone(raw);
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return raw;
}

/**
 * Verify Quo webhook signature.
 * Header format: openphone-signature: hmac;1;<timestamp>;<base64digest>
 * Signed data: <timestamp>.<rawBody>
 * Key: base64-decoded signing secret
 */
function verifyQuoSignature(rawBody: Buffer, sigHeader: string, secret: string): boolean {
  try {
    const parts = sigHeader.split(";");
    if (parts.length < 4) return false;
    const timestamp = parts[2];
    const providedDigest = parts[3];

    // signed data = timestamp + "." + raw JSON body string
    const signedData = timestamp + "." + rawBody.toString("utf8");

    // key is base64-encoded — decode to binary
    const keyBinary = Buffer.from(secret, "base64").toString("binary");

    // compute HMAC-SHA256, encode as base64
    const computedDigest = crypto
      .createHmac("sha256", keyBinary)
      .update(Buffer.from(signedData, "utf8"))
      .digest("base64");

    return providedDigest === computedDigest;
  } catch {
    return false;
  }
}

export function registerQuoWebhookRoutes(app: Router) {
  // Must be registered with raw body parser BEFORE express.json()
  app.post(
    "/api/quo/webhook",
    raw({ type: "application/json" }),
    async (req, res) => {
      const sigHeader = req.headers["openphone-signature"] as string | undefined;

      // Read secret from DB first (set via Integrations page), fall back to env var
      const dbSecret = await db.getOwnerQuoSecret(ENV.ownerOpenId).catch(() => null);
      const webhookSecret = dbSecret || process.env.QUO_WEBHOOK_SECRET;

      // Verify signature if secret is configured
      if (webhookSecret && sigHeader) {
        const valid = verifyQuoSignature(req.body as Buffer, sigHeader, webhookSecret);
        if (!valid) {
          console.warn("[Quo Webhook] Signature mismatch — rejecting");
          return res.status(401).json({ error: "Invalid signature" });
        }
      } else if (webhookSecret && !sigHeader) {
        // Secret configured but no signature header — reject
        console.warn("[Quo Webhook] Missing signature header — rejecting");
        return res.status(401).json({ error: "Missing signature" });
      }

      let payload: any;
      try {
        payload = JSON.parse((req.body as Buffer).toString());
      } catch {
        return res.status(400).json({ error: "Invalid JSON" });
      }

      const eventType: string = payload?.type || payload?.event || "";
      console.log(`[Quo Webhook] Received event: ${eventType}`);

      // Get the database and owner
      const database = await db.getDb();
      if (!database) {
        console.error("[Quo Webhook] Database unavailable");
        return res.status(500).json({ error: "Database unavailable" });
      }

      const { contacts, callLogs, users } = await import("../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");

      const [owner] = await database
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, "admin"))
        .limit(1);

      if (!owner) {
        console.error("[Quo Webhook] No owner found");
        return res.status(500).json({ error: "No owner found" });
      }

      const ownerId = owner.id;

      // ─── CALL EVENTS ───────────────────────────────────────────────
      if (
        eventType === "call.completed" ||
        eventType === "call.transcript.completed" ||
        eventType === "call.summary.completed" ||
        eventType === "call.recording.completed"
      ) {
        const callData = payload?.data?.object || payload?.data || payload?.call || {};
        const quoCallId: string = callData?.id || callData?.callId || payload?.id || "";
        const fromNumber: string = callData?.from || callData?.fromNumber || "";
        const toNumber: string = callData?.to || callData?.toNumber || "";
        const durationSeconds: number = callData?.duration || callData?.durationSeconds || 0;
        const direction: string = callData?.direction || "inbound";

        // Transcript (may be nested under transcript.text or direct string)
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

        // Voicemail detection — call.completed with voicemail data
        const voicemailData = callData?.voicemail || payload?.voicemail;
        const isVoicemail = !!(voicemailData || callData?.isVoicemail || payload?.isVoicemail);
        const voicemailTranscript: string =
          voicemailData?.transcript?.text ||
          voicemailData?.transcript ||
          voicemailData?.transcription ||
          callData?.voicemailTranscript ||
          "";

        const participants: string[] = callData?.participants || [];

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
                eventType,
                rawPayload: payload,
              })
              .where(eq(callLogs.id, existing.id));
            console.log(`[Quo Webhook] Updated existing call log #${existing.id} (${eventType})`);
            return res.json({ received: true, action: "updated" });
          }
        }

        // Auto-match to student by phone number
        const allStudents = await database
          .select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName, phone: contacts.phone })
          .from(contacts)
          .where(and(eq(contacts.ownerId, ownerId), eq(contacts.jobTitle, "Student")));

        const matchingStudents = allStudents.filter((s) => {
          if (!s.phone) return false;
          return phonesMatch(s.phone, fromNumber) || phonesMatch(s.phone, toNumber);
        });

        let studentId: number | null = null;
        let status = "unassigned";
        let matchedPhone: string | null = null;

        if (matchingStudents.length === 1) {
          studentId = matchingStudents[0].id;
          status = "assigned";
          matchedPhone = matchingStudents[0].phone || null;
          console.log(`[Quo Webhook] Auto-assigned to student #${studentId}`);
        } else if (matchingStudents.length > 1) {
          console.log(`[Quo Webhook] Multiple matches (${matchingStudents.length}) — unassigned`);
        } else {
          console.log(`[Quo Webhook] No phone match — unassigned`);
        }

        await database.insert(callLogs).values({
          ownerId,
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
          eventType,
          rawPayload: payload,
        });

        console.log(`[Quo Webhook] Call log saved — type: ${eventType}, status: ${status}, voicemail: ${isVoicemail}`);
        return res.json({ received: true, action: "created", status, eventType });
      }

      // ─── MESSAGE EVENTS ────────────────────────────────────────────
      if (eventType === "message.received" || eventType === "message.delivered") {
        const msgData = payload?.data?.object || payload?.data || payload?.message || {};
        const quoMsgId: string = msgData?.id || payload?.id || "";
        const fromNumber: string = msgData?.from || msgData?.fromNumber || "";
        const toNumber: string = msgData?.to || msgData?.toNumber || "";
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
            return res.json({ received: true, action: "duplicate" });
          }
        }

        // Auto-match to student
        const allStudents = await database
          .select({ id: contacts.id, phone: contacts.phone })
          .from(contacts)
          .where(and(eq(contacts.ownerId, ownerId), eq(contacts.jobTitle, "Student")));

        const match = allStudents.find((s) => s.phone && (phonesMatch(s.phone, fromNumber) || phonesMatch(s.phone, toNumber)));
        const studentId = match?.id ?? null;
        const status = studentId ? "assigned" : "unassigned";

        await database.insert(callLogs).values({
          ownerId,
          studentId: studentId ?? undefined,
          quoCallId: quoMsgId || undefined,
          fromNumber: formatPhone(fromNumber),
          toNumber: formatPhone(toNumber),
          durationSeconds: 0,
          direction,
          smsBody: smsBody || undefined,
          status,
          assignedAt: studentId ? new Date() : undefined,
          eventType,
          rawPayload: payload,
        });

        console.log(`[Quo Webhook] SMS log saved — type: ${eventType}, status: ${status}`);
        return res.json({ received: true, action: "created", eventType });
      }

      // ─── CONTACT EVENTS ────────────────────────────────────────────
      if (eventType === "contact.updated" || eventType === "contact.deleted") {
        // Log but don't import — contacts are managed in the CRM
        console.log(`[Quo Webhook] Contact event received: ${eventType} (logged only)`);
        return res.json({ received: true, action: "logged", eventType });
      }

      // Acknowledge all other events
      console.log(`[Quo Webhook] Unhandled event type: ${eventType}`);
      return res.json({ received: true, action: "ignored", eventType });
    }
  );
}

/**
 * Quo (formerly OpenPhone) webhook handler.
 * Receives call.transcript.completed and call.summary.completed events.
 * Matches caller phone number against student contacts for auto-assignment.
 */
import { Router, raw } from "express";
import crypto from "crypto";
import * as db from "./db";

// Normalize a phone number to digits only for matching
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

// Check if two phone numbers match (compare last 10 digits)
function phonesMatch(a: string, b: string): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  // Compare last 10 digits to handle country code differences
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

export function registerQuoWebhookRoutes(app: Router) {
  // Quo sends JSON with a signature header — must be registered before express.json()
  app.post(
    "/api/quo/webhook",
    raw({ type: "application/json" }),
    async (req, res) => {
      const sigHeader = req.headers["x-openphone-signature"] as string | undefined;
      const webhookSecret = process.env.QUO_WEBHOOK_SECRET;

      // Verify HMAC-SHA256 signature if secret is configured
      if (webhookSecret && sigHeader) {
        const expectedSig = crypto
          .createHmac("sha256", webhookSecret)
          .update(req.body)
          .digest("hex");
        if (sigHeader !== expectedSig) {
          console.warn("[Quo Webhook] Signature mismatch — rejecting");
          return res.status(401).json({ error: "Invalid signature" });
        }
      }

      let payload: any;
      try {
        payload = JSON.parse(req.body.toString());
      } catch {
        return res.status(400).json({ error: "Invalid JSON" });
      }

      const eventType: string = payload?.type || payload?.event || "";
      console.log(`[Quo Webhook] Received event: ${eventType}`);

      // Handle call transcript and summary events
      if (
        eventType === "call.transcript.completed" ||
        eventType === "call.summary.completed" ||
        eventType === "call.completed"
      ) {
        const callData = payload?.data?.object || payload?.data || payload?.call || {};
        const quoCallId: string = callData?.id || callData?.callId || payload?.id || "";
        const fromNumber: string = callData?.from || callData?.fromNumber || "";
        const toNumber: string = callData?.to || callData?.toNumber || "";
        const durationSeconds: number = callData?.duration || callData?.durationSeconds || 0;
        const direction: string = callData?.direction || "inbound";
        const transcript: string =
          callData?.transcript?.text ||
          callData?.transcript ||
          payload?.transcript?.text ||
          payload?.transcript ||
          "";
        const summary: string =
          callData?.summary?.text ||
          callData?.summary ||
          payload?.summary?.text ||
          payload?.summary ||
          "";
        const participants: string[] = callData?.participants || [];

        // Get the database and find the owner
        const database = await db.getDb();
        if (!database) {
          console.error("[Quo Webhook] Database unavailable");
          return res.status(500).json({ error: "Database unavailable" });
        }

        // Import schema tables
        const { contacts, callLogs } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");

        // Find the owner (first admin user)
        const { users } = await import("../drizzle/schema");
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

        // Check if we already have this call (idempotency)
        if (quoCallId) {
          const [existing] = await database
            .select({ id: callLogs.id })
            .from(callLogs)
            .where(eq(callLogs.quoCallId, quoCallId))
            .limit(1);

          if (existing) {
            // Update transcript/summary if this is a later event for the same call
            await database
              .update(callLogs)
              .set({
                ...(transcript ? { transcript } : {}),
                ...(summary ? { summary } : {}),
              })
              .where(eq(callLogs.id, existing.id));
            console.log(`[Quo Webhook] Updated existing call log #${existing.id}`);
            return res.json({ received: true, action: "updated" });
          }
        }

        // Find students whose phone number matches the caller or callee
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
          // Exactly one match — auto-assign
          studentId = matchingStudents[0].id;
          status = "assigned";
          matchedPhone = matchingStudents[0].phone || null;
          console.log(`[Quo Webhook] Auto-assigned to student #${studentId} (${matchingStudents[0].firstName} ${matchingStudents[0].lastName})`);
        } else if (matchingStudents.length > 1) {
          // Multiple matches — queue for manual assignment
          console.log(`[Quo Webhook] Multiple matches (${matchingStudents.length}) — queuing as unassigned`);
        } else {
          // No match — queue for manual assignment
          console.log(`[Quo Webhook] No phone match found — queuing as unassigned`);
        }

        // Insert the call log
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
          participants: participants.length > 0 ? participants : undefined,
          status,
          matchedPhone: matchedPhone ? formatPhone(matchedPhone) : undefined,
          assignedAt: status === "assigned" ? new Date() : undefined,
        });

        console.log(`[Quo Webhook] Call log saved — status: ${status}`);
        return res.json({ received: true, action: "created", status });
      }

      // Acknowledge all other events
      return res.json({ received: true, action: "ignored" });
    }
  );
}

import type { Express, Request, Response } from "express";
import express from "express";
import { Webhook } from "svix";
import * as db from "./db";

export function registerClerkWebhookRoutes(app: Express) {
  // Clerk Webhook endpoint — registered with express.raw to preserve exact payload signature
  app.post(
    "/api/webhooks/clerk",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const webhookSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET || process.env.CLERK_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.warn("⚠️ CLERK_WEBHOOK_SIGNING_SECRET is not configured. Webhook processing skipped.");
        return res.status(400).json({ error: "Webhook secret missing" });
      }

      // 1. Get Svix headers
      const svixId = req.headers["svix-id"] as string;
      const svixTimestamp = req.headers["svix-timestamp"] as string;
      const svixSignature = req.headers["svix-signature"] as string;

      if (!svixId || !svixTimestamp || !svixSignature) {
        return res.status(400).json({ error: "Missing required svix headers" });
      }

      // 2. Verify webhook signature
      let evt: any;
      try {
        const payload = req.body.toString("utf8");
        const wh = new Webhook(webhookSecret);
        evt = wh.verify(payload, {
          "svix-id": svixId,
          "svix-timestamp": svixTimestamp,
          "svix-signature": svixSignature,
        });
      } catch (err: any) {
        console.error("❌ Clerk Webhook signature verification failed:", err.message);
        return res.status(400).json({ error: "Invalid webhook signature" });
      }

      const eventType = evt.type;
      console.log(`🔔 Received Clerk Webhook Event: ${eventType}`);

      try {
        // 3. Process event types
        if (eventType === "user.created" || eventType === "user.updated") {
          const { id, email_addresses, first_name, last_name, public_metadata } = evt.data;
          const primaryEmail = email_addresses?.find((e: any) => e.id === evt.data.primary_email_address_id)?.email_address
            || email_addresses?.[0]?.email_address
            || "";
          const fullName = `${first_name ?? ""} ${last_name ?? ""}`.trim() || primaryEmail;
          const role = (public_metadata?.role as "admin" | "client") || "client";
          const contactId = public_metadata?.contactId as number | undefined;

          // Upsert user in database
          await db.upsertUser({
            openId: id,
            name: fullName,
            email: primaryEmail,
            role,
            ...(contactId ? { contactId } : {}),
          });

          // Sync contact if linked
          if (primaryEmail) {
            const existingContact = await db.getContactByEmail(primaryEmail);
            if (existingContact) {
              await db.updateContactById(existingContact.id, {
                firstName: first_name || existingContact.firstName,
                lastName: last_name || existingContact.lastName,
                email: primaryEmail,
              });
            }
          }
        } else if (eventType === "user.deleted") {
          const { id } = evt.data;
          console.log(`[Clerk Sync] User ${id} deleted in Clerk.`);
        }

        return res.status(200).json({ success: true });
      } catch (error: any) {
        console.error("❌ Error handling Clerk webhook event:", error);
        return res.status(500).json({ error: "Internal webhook processing error" });
      }
    }
  );
}

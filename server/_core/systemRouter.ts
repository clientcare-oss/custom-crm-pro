import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { notifyOwner } from "./notification";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./trpc";
import * as db from "../db";
import { ENV } from "./env";

/** Resolve the owner user — tries ENV.ownerOpenId first, falls back to first admin in DB */
async function resolveOwner() {
  let owner = await db.getUserByOpenId(ENV.ownerOpenId);
  if (!owner) {
    const { users } = await import("../../drizzle/schema");
    const dbConn = await db.getDb();
    if (dbConn) {
      const [firstAdmin] = await dbConn.select().from(users).where(eq(users.role, "admin")).limit(1);
      owner = firstAdmin ?? null;
    }
  }
  return owner;
}

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  // Returns the owner's business phone number (for the "Save our number" notice on forms)
  getBusinessPhone: publicProcedure.query(async () => {
    const owner = await resolveOwner();
    return { phone: owner?.phone ?? null };
  }),

  // Sets the owner's business phone number — uses the logged-in user's own openId
  // so it always updates the correct row regardless of OWNER_OPEN_ID env var
  setBusinessPhone: protectedProcedure
    .input(z.object({ phone: z.string().max(50) }))
    .mutation(async ({ ctx, input }) => {
      await db.updateOwnerPhone(ctx.user.openId, input.phone);
      return { success: true };
    }),

  // Get whether Quo webhook secret is configured (returns status only, not the secret)
  getQuoStatus: adminProcedure.query(async () => {
    const owner = await resolveOwner();
    return { configured: !!(owner?.quoWebhookSecret) };
  }),

  // Save the Quo webhook signing secret into the DB — uses logged-in user's openId
  setQuoSecret: adminProcedure
    .input(z.object({ secret: z.string().max(512) }))
    .mutation(async ({ ctx, input }) => {
      await db.updateOwnerQuoSecret(ctx.user.openId, input.secret || null);
      return { success: true };
    }),

  notifyOwner: adminProcedure
      .input(
        z.object({
          title: z.string().min(1, "title is required"),
          content: z.string().min(1, "content is required"),
        })
      )
      .mutation(async ({ input }) => {
        const delivered = await notifyOwner(input);
        return {
          success: delivered,
        } as const;
      }),

  // Get the saved custom portal domain
  getPortalDomain: adminProcedure.query(async ({ ctx }) => {
    const domain = await db.getOwnerPortalDomain(ctx.user.openId);
    return { portalDomain: domain ?? null };
  }),

  // Save a custom portal domain
  setPortalDomain: adminProcedure
    .input(z.object({ portalDomain: z.string().min(3) }))
    .mutation(async ({ ctx, input }) => {
      // Strip protocol if accidentally included
      const clean = input.portalDomain.replace(/^https?:\/\//, '').replace(/\/$/, '').trim();
      await db.updateOwnerPortalDomain(ctx.user.openId, clean);
      return { success: true, portalDomain: clean };
    }),

  // Remove the custom portal domain (revert to Manus subdomain)
  clearPortalDomain: adminProcedure
    .mutation(async ({ ctx }) => {
      await db.updateOwnerPortalDomain(ctx.user.openId, null);
      return { success: true };
    }),

  // Get Gmail integration status (returns whether configured, and the email address only — not the password)
  getGmailStatus: adminProcedure.query(async ({ ctx }) => {
    const creds = await db.getOwnerGmailCredentials(ctx.user.openId);
    return {
      configured: !!(creds.gmailUser && creds.gmailAppPassword),
      gmailUser: creds.gmailUser ?? null,
    };
  }),

  // Save Gmail credentials to the database
  setGmailCredentials: adminProcedure
    .input(z.object({
      gmailUser: z.string().email(),
      gmailAppPassword: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.updateOwnerGmailCredentials(ctx.user.openId, input.gmailUser, input.gmailAppPassword);
      return { success: true };
    }),

  // Remove Gmail credentials
  clearGmailCredentials: adminProcedure
    .mutation(async ({ ctx }) => {
      await db.updateOwnerGmailCredentials(ctx.user.openId, null, null);
      return { success: true };
    }),

  // Test Gmail connection by verifying SMTP credentials
  testGmailConnection: adminProcedure
    .mutation(async ({ ctx }) => {
      const creds = await db.getOwnerGmailCredentials(ctx.user.openId);
      if (!creds.gmailUser || !creds.gmailAppPassword) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Gmail credentials not configured.' });
      }
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: creds.gmailUser, pass: creds.gmailAppPassword },
      });
      try {
        await transporter.verify();
        return { success: true, message: 'Gmail connection verified successfully.' };
      } catch (err: any) {
        return { success: false, message: err?.message ?? 'Connection failed.' };
      }
    }),
});

import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { notifyOwner } from "./notification";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./trpc";
import * as db from "../db";
import { ENV } from "./env";

// In-memory cache for fast, reliable read-after-write consistency across sessions
let cachedBusinessPhone: string | null = null;
let cachedCompanyLogo: string | null = null;

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
    if (cachedBusinessPhone) {
      return { phone: cachedBusinessPhone };
    }
    const owner = await resolveOwner();
    if (owner?.phone) {
      cachedBusinessPhone = owner.phone;
      return { phone: owner.phone };
    }
    try {
      const { users } = await import("../../drizzle/schema");
      const dbConn = await db.getDb();
      if (dbConn) {
        const admins = await dbConn.select().from(users).where(eq(users.role, "admin"));
        const found = admins.find((u) => u.phone && u.phone.trim().length > 0);
        if (found?.phone) {
          cachedBusinessPhone = found.phone;
          return { phone: found.phone };
        }
        const allUsers = await dbConn.select().from(users).limit(25);
        const anyFound = allUsers.find((u) => u.phone && u.phone.trim().length > 0);
        if (anyFound?.phone) {
          cachedBusinessPhone = anyFound.phone;
          return { phone: anyFound.phone };
        }
      }
    } catch (e) {
      console.warn("[System] getBusinessPhone users fallback error:", e);
    }

    try {
      const { receiptSettings } = await import("../../drizzle/schema");
      const dbConn = await db.getDb();
      if (dbConn) {
        const [settings] = await dbConn.select().from(receiptSettings).limit(1);
        if (settings?.businessPhone && settings.businessPhone.trim().length > 0) {
          cachedBusinessPhone = settings.businessPhone;
          return { phone: settings.businessPhone };
        }
      }
    } catch {}

    return { phone: null };
  }),

  // Sets the owner's business phone number — uses the logged-in user's own openId
  // and updates all admin seats, resolved owner, and receiptSettings
  setBusinessPhone: protectedProcedure
    .input(z.object({ phone: z.string().max(50) }))
    .mutation(async ({ ctx, input }) => {
      const trimmed = input.phone.trim();
      cachedBusinessPhone = trimmed;

      try {
        const dbConn = await db.getDb();
        if (dbConn) {
          const { users } = await import("../../drizzle/schema");
          if (ctx.user?.openId) {
            await dbConn
              .update(users)
              .set({ phone: trimmed || null })
              .where(eq(users.openId, ctx.user.openId));
          }
          if (ctx.user?.id) {
            await dbConn
              .update(users)
              .set({ phone: trimmed || null })
              .where(eq(users.id, ctx.user.id));
          }
          // Update all admins so practice-wide business phone stays synchronized
          await dbConn
            .update(users)
            .set({ phone: trimmed || null })
            .where(eq(users.role, "admin"));
        }
      } catch (e) {
        console.warn("[System] updateOwnerPhone on users failed:", e);
      }

      try {
        const owner = await resolveOwner();
        if (owner && owner.openId && owner.openId !== ctx.user?.openId) {
          await db.updateOwnerPhone(owner.openId, trimmed);
        }
      } catch (e) {
        console.warn("[System] updateOwnerPhone for resolved owner failed:", e);
      }

      if (ENV.ownerOpenId && ENV.ownerOpenId !== ctx.user?.openId) {
        try {
          await db.updateOwnerPhone(ENV.ownerOpenId, trimmed);
        } catch {}
      }

      // Also keep receiptSettings synchronized
      try {
        const dbConn = await db.getDb();
        if (dbConn) {
          const { receiptSettings } = await import("../../drizzle/schema");
          const [existingReceipt] = await dbConn.select().from(receiptSettings).limit(1);
          if (existingReceipt) {
            await dbConn
              .update(receiptSettings)
              .set({ businessPhone: trimmed || "(404) 555-0100" })
              .where(eq(receiptSettings.id, existingReceipt.id));
          }
        }
      } catch {}

      return { success: true, phone: trimmed };
    }),

  // Returns the owner's custom company logo URL
  getCompanyLogo: publicProcedure.query(async () => {
    if (cachedCompanyLogo) {
      return { logoUrl: cachedCompanyLogo };
    }
    const owner = await resolveOwner();
    if (owner?.logoUrl) {
      cachedCompanyLogo = owner.logoUrl;
      return { logoUrl: owner.logoUrl };
    }
    try {
      const { users } = await import("../../drizzle/schema");
      const dbConn = await db.getDb();
      if (dbConn) {
        const admins = await dbConn.select().from(users).where(eq(users.role, "admin"));
        const found = admins.find((u) => u.logoUrl);
        if (found?.logoUrl) {
          cachedCompanyLogo = found.logoUrl;
          return { logoUrl: found.logoUrl };
        }
      }
    } catch {}
    return { logoUrl: null };
  }),

  // Sets the owner's custom company logo URL
  setCompanyLogo: protectedProcedure
    .input(z.object({ logoUrl: z.string().max(2048).nullable() }))
    .mutation(async ({ ctx, input }) => {
      cachedCompanyLogo = input.logoUrl;
      try {
        await db.updateOwnerLogo(ctx.user.openId, input.logoUrl);
      } catch (e) {
        console.warn("[System] updateOwnerLogo for user failed:", e);
      }
      try {
        const owner = await resolveOwner();
        if (owner && owner.openId && owner.openId !== ctx.user.openId) {
          await db.updateOwnerLogo(owner.openId, input.logoUrl);
        }
      } catch {}
      if (ENV.ownerOpenId && ENV.ownerOpenId !== ctx.user.openId) {
        try {
          await db.updateOwnerLogo(ENV.ownerOpenId, input.logoUrl);
        } catch {}
      }
      return { success: true, logoUrl: input.logoUrl };
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

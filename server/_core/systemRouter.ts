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
  getQuoStatus: adminProcedure.query(async ({ ctx }) => {
    const owner = await resolveOwner();
    let configured = !!(owner?.quoWebhookSecret);
    if (!configured) {
      const database = await db.getDb();
      if (database) {
        try {
          const { quoSettings } = await import("../../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          const [s] = await database
            .select({ webhookSecret: quoSettings.webhookSecret })
            .from(quoSettings)
            .where(eq(quoSettings.ownerId, ctx.user.id))
            .limit(1);
          if (s?.webhookSecret) configured = true;
        } catch {}
      }
    }
    return { configured };
  }),

  // Save the Quo webhook signing secret into the DB — uses logged-in user's openId
  setQuoSecret: adminProcedure
    .input(z.object({ secret: z.string().max(512) }))
    .mutation(async ({ ctx, input }) => {
      await db.updateOwnerQuoSecret(ctx.user.openId, input.secret || null);

      // Also sync to quoSettings table
      const database = await db.getDb();
      if (database) {
        try {
          const { quoSettings } = await import("../../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          const [existing] = await database
            .select({ id: quoSettings.id })
            .from(quoSettings)
            .where(eq(quoSettings.ownerId, ctx.user.id))
            .limit(1);

          if (existing) {
            await database
              .update(quoSettings)
              .set({
                webhookSecret: input.secret || null,
                status: input.secret ? "connected" : "disconnected",
                updatedAt: new Date(),
              })
              .where(eq(quoSettings.id, existing.id));
          } else {
            await database.insert(quoSettings).values({
              ownerId: ctx.user.id,
              status: input.secret ? "connected" : "disconnected",
              webhookSecret: input.secret || null,
              webhookUrl: "/api/quo/webhook",
              hasApiKey: false,
            });
          }
        } catch (e) {
          console.warn("[setQuoSecret] Could not sync to quoSettings:", e);
        }
      }

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

  // Consolidated business settings: address, email, phone, company name, website, and logo
  getBusinessProfile: publicProcedure.query(async () => {
    // 1. Resolve phone
    let phone: string | null = cachedBusinessPhone;
    if (!phone) {
      const owner = await resolveOwner();
      phone = owner?.phone || null;
    }

    // 2. Resolve logo
    let logoUrl: string | null = cachedCompanyLogo;
    if (!logoUrl) {
      const owner = await resolveOwner();
      logoUrl = owner?.logoUrl || null;
    }

    // 3. Resolve receiptSettings row (check in-memory store first for test/cache consistency, then DB)
    let memoryRow: any = null;
    try {
      const { inMemoryReceiptSettings } = await import("../routers/receipts");
      memoryRow = inMemoryReceiptSettings.get(1) || Array.from(inMemoryReceiptSettings.values())[0] || null;
    } catch {}

    let receiptRow: any = null;
    try {
      const { receiptSettings } = await import("../../drizzle/schema");
      const dbConn = await db.getDb();
      if (dbConn) {
        const [row] = await dbConn.select().from(receiptSettings).limit(1);
        if (row) receiptRow = row;
      }
    } catch (e) {
      console.warn("[System] getBusinessProfile receiptSettings query error:", e);
    }

    const companyName = memoryRow?.companyName || receiptRow?.companyName || "Waypoint Advocates";
    const receiptDisplayName = memoryRow?.receiptDisplayName || receiptRow?.receiptDisplayName || "WAYPOINT ADVOCATES";
    const businessPhone = phone || memoryRow?.businessPhone || receiptRow?.businessPhone || "(404) 919-8664";
    const businessEmail = memoryRow?.businessEmail || receiptRow?.businessEmail || "clientcare@waypointadvocates.com";
    const replyToEmail = memoryRow?.replyToEmail || receiptRow?.replyToEmail || "billing@waypointadvocates.com";
    const businessAddress = memoryRow?.businessAddress || receiptRow?.businessAddress || "PO Box 724944, Atlanta, GA 31139";
    const website = memoryRow?.website || receiptRow?.website || "https://waypointadvocates.com";
    const supportContactInfo = memoryRow?.supportContactInfo || receiptRow?.supportContactInfo || "Questions? Reach out to clientcare@waypointadvocates.com or call (404) 919-8664";
    const showBusinessAddress = Boolean(memoryRow?.showBusinessAddress ?? receiptRow?.showBusinessAddress ?? 1);

    // Parse address components for structured editing
    let street = "PO Box 724944";
    let city = "Atlanta";
    let state = "GA";
    let zip = "31139";
    let country = "United States";

    if (businessAddress && businessAddress.includes(",")) {
      const parts = businessAddress.split(",").map((s: string) => s.trim());
      if (parts.length >= 2) {
        street = parts[0] || street;
        city = parts[1] || city;
        if (parts.length >= 3) {
          const stateZip = parts[2].trim().split(/\s+/);
          if (stateZip.length >= 2) {
            state = stateZip[0] || state;
            zip = stateZip.slice(1).join(" ") || zip;
          } else {
            state = parts[2] || state;
          }
        }
        if (parts.length >= 4) {
          country = parts[3] || country;
        }
      }
    }

    return {
      companyName,
      receiptDisplayName,
      phone: businessPhone,
      email: businessEmail,
      replyToEmail,
      address: businessAddress,
      street,
      city,
      state,
      zip,
      country,
      website,
      supportContactInfo,
      leadAdvocate: "Byron Honea",
      practiceSpecialization: "Lead Special Education & IEP Advocacy Practice",
      logoUrl,
      showBusinessAddress,
    };
  }),

  // Mutation to update consolidated business profile across users, receiptSettings, and memory caches
  updateBusinessProfile: protectedProcedure
    .input(
      z.object({
        companyName: z.string().max(255).optional(),
        receiptDisplayName: z.string().max(255).optional(),
        phone: z.string().max(50).optional(),
        email: z.string().max(255).optional(),
        replyToEmail: z.string().max(255).optional(),
        address: z.string().max(500).optional(),
        street: z.string().max(255).optional(),
        city: z.string().max(100).optional(),
        state: z.string().max(50).optional(),
        zip: z.string().max(20).optional(),
        country: z.string().max(100).optional(),
        website: z.string().max(255).optional(),
        supportContactInfo: z.string().max(1000).optional(),
        logoUrl: z.string().max(2048).nullable().optional(),
        showBusinessAddress: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Compute full consolidated address
      let formattedAddress = input.address?.trim();
      if (!formattedAddress && (input.street || input.city || input.state || input.zip)) {
        const parts = [
          input.street?.trim(),
          input.city?.trim(),
          [input.state?.trim(), input.zip?.trim()].filter(Boolean).join(" "),
          input.country?.trim() && input.country?.trim() !== "United States" ? input.country?.trim() : null,
        ].filter(Boolean);
        formattedAddress = parts.join(", ");
      }

      // 2. Update phone if provided
      if (input.phone !== undefined) {
        const trimmedPhone = input.phone.trim();
        cachedBusinessPhone = trimmedPhone;
        try {
          const dbConn = await db.getDb();
          if (dbConn) {
            const { users } = await import("../../drizzle/schema");
            await dbConn
              .update(users)
              .set({ phone: trimmedPhone || null })
              .where(eq(users.role, "admin"));
          }
        } catch (e) {
          console.warn("[System] updateBusinessProfile users phone update failed:", e);
        }
        try {
          const owner = await resolveOwner();
          if (owner?.openId) {
            await db.updateOwnerPhone(owner.openId, trimmedPhone);
          }
        } catch {}
      }

      // 3. Update logo if provided
      if (input.logoUrl !== undefined) {
        cachedCompanyLogo = input.logoUrl;
        try {
          await db.updateOwnerLogo(ctx.user.openId, input.logoUrl);
          const owner = await resolveOwner();
          if (owner?.openId && owner.openId !== ctx.user.openId) {
            await db.updateOwnerLogo(owner.openId, input.logoUrl);
          }
        } catch (e) {
          console.warn("[System] updateBusinessProfile logo update failed:", e);
        }
      }

      // 4. Update receiptSettings table and in-memory cache
      try {
        const dbConn = await db.getDb();
        if (dbConn) {
          const { receiptSettings } = await import("../../drizzle/schema");
          const [existingReceipt] = await dbConn.select().from(receiptSettings).limit(1);

          const updateFields: any = {
            updatedAt: new Date(),
          };
          if (input.companyName !== undefined) updateFields.companyName = input.companyName.trim();
          if (input.receiptDisplayName !== undefined) updateFields.receiptDisplayName = input.receiptDisplayName.trim();
          if (input.phone !== undefined) updateFields.businessPhone = input.phone.trim();
          if (input.email !== undefined) updateFields.businessEmail = input.email.trim();
          if (input.replyToEmail !== undefined) updateFields.replyToEmail = input.replyToEmail.trim();
          if (formattedAddress !== undefined) updateFields.businessAddress = formattedAddress;
          if (input.website !== undefined) updateFields.website = input.website.trim();
          if (input.supportContactInfo !== undefined) updateFields.supportContactInfo = input.supportContactInfo.trim();
          if (input.showBusinessAddress !== undefined) updateFields.showBusinessAddress = input.showBusinessAddress ? 1 : 0;

          if (existingReceipt) {
            await dbConn
              .update(receiptSettings)
              .set(updateFields)
              .where(eq(receiptSettings.id, existingReceipt.id));
          } else {
            await dbConn.insert(receiptSettings).values({
              ownerId: ctx.user.id,
              ...updateFields,
            });
          }
        }
      } catch (e) {
        console.warn("[System] updateBusinessProfile receiptSettings update failed:", e);
      }

      // 5. Update in-memory receipts settings for immediate session consistency
      try {
        const { inMemoryReceiptSettings } = await import("../routers/receipts");
        const existing = inMemoryReceiptSettings.get(ctx.user.id) || {};
        inMemoryReceiptSettings.set(ctx.user.id, {
          ...existing,
          ...(input.companyName && { companyName: input.companyName.trim() }),
          ...(input.phone && { businessPhone: input.phone.trim() }),
          ...(input.email && { businessEmail: input.email.trim() }),
          ...(input.replyToEmail && { replyToEmail: input.replyToEmail.trim() }),
          ...(formattedAddress && { businessAddress: formattedAddress }),
          ...(input.website && { website: input.website.trim() }),
          ...(input.supportContactInfo && { supportContactInfo: input.supportContactInfo.trim() }),
          ...(input.showBusinessAddress !== undefined && { showBusinessAddress: input.showBusinessAddress ? 1 : 0 }),
        });
      } catch {}

      return {
        success: true,
        message: "Business profile and contact channels consolidated successfully.",
        address: formattedAddress,
        phone: input.phone?.trim() ?? cachedBusinessPhone,
      };
    }),
});

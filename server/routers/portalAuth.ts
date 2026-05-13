/**
 * Portal Auth Router
 * Handles client-only portal login/logout/me using email+password,
 * completely separate from the Manus OAuth admin login.
 */
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import * as db from "../db";
import { eq, and, gt } from "drizzle-orm";
import {
  clientCredentials,
  portalSessions,
  passwordResetTokens,
  contacts,
} from "../../drizzle/schema";
import { sendEmail } from "../_core/email";

const SALT_ROUNDS = 10;
const SESSION_DAYS = 30;
const RESET_TOKEN_MINUTES = 60;

async function getDbConn() {
  const conn = await db.getDb();
  if (!conn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
  return conn;
}

export const portalAuthRouter = router({
  /** Admin: set or reset a client's portal password */
  setClientPassword: protectedProcedure
    .input(z.object({
      contactId: z.number(),
      email: z.string().email(),
      password: z.string().min(8, "Password must be at least 8 characters"),
    }))
    .mutation(async ({ ctx, input }) => {
      const conn = await getDbConn();
      const [contact] = await conn.select().from(contacts)
        .where(eq(contacts.id, input.contactId)).limit(1);
      if (!contact || contact.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
      const existing = await conn.select().from(clientCredentials)
        .where(eq(clientCredentials.contactId, input.contactId)).limit(1);
      if (existing.length > 0) {
        await conn.update(clientCredentials)
          .set({ email: input.email.toLowerCase().trim(), passwordHash })
          .where(eq(clientCredentials.contactId, input.contactId));
      } else {
        await conn.insert(clientCredentials).values({
          contactId: input.contactId,
          email: input.email.toLowerCase().trim(),
          passwordHash,
        });
      }
      return { success: true };
    }),

  /** Admin: check if a contact has portal credentials set */
  getClientPortalStatus: protectedProcedure
    .input(z.object({ contactId: z.number() }))
    .query(async ({ ctx, input }) => {
      const conn = await getDbConn();
      const [contact] = await conn.select().from(contacts)
        .where(eq(contacts.id, input.contactId)).limit(1);
      if (!contact || contact.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const [cred] = await conn.select({ id: clientCredentials.id, email: clientCredentials.email })
        .from(clientCredentials)
        .where(eq(clientCredentials.contactId, input.contactId)).limit(1);
      return { hasCredentials: !!cred, email: cred?.email ?? null };
    }),

  /** Admin: remove portal credentials for a contact */
  removeClientCredentials: protectedProcedure
    .input(z.object({ contactId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const conn = await getDbConn();
      const [contact] = await conn.select().from(contacts)
        .where(eq(contacts.id, input.contactId)).limit(1);
      if (!contact || contact.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await conn.delete(clientCredentials).where(eq(clientCredentials.contactId, input.contactId));
      return { success: true };
    }),

  /** Public: client portal login */
  portalLogin: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const conn = await getDbConn();
      const [cred] = await conn.select().from(clientCredentials)
        .where(eq(clientCredentials.email, input.email.toLowerCase().trim())).limit(1);
      if (!cred) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
      }
      const valid = await bcrypt.compare(input.password, cred.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
      }
      const token = crypto.randomBytes(48).toString("hex");
      const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
      await conn.insert(portalSessions).values({
        token,
        contactId: cred.contactId,
        expiresAt,
      });
      (ctx as any).res?.cookie("portal_session", token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
        path: "/",
      });
      return { success: true, token };
    }),

  /** Public: get current portal session info */
  portalMe: publicProcedure
    .query(async ({ ctx }) => {
      const req = (ctx as any).req;
      const token = req?.cookies?.portal_session;
      if (!token) return null;
      const conn = await getDbConn();
      const now = new Date();
      const [session] = await conn.select().from(portalSessions)
        .where(eq(portalSessions.token, token)).limit(1);
      if (!session || session.expiresAt < now) return null;
      const [contact] = await conn.select().from(contacts)
        .where(eq(contacts.id, session.contactId)).limit(1);
      if (!contact) return null;
      return {
        contactId: contact.id,
        name: `${contact.firstName} ${contact.lastName}`,
        email: contact.email,
        caseId: contact.caseId,
      };
    }),

  /** Public: portal logout */
  portalLogout: publicProcedure
    .mutation(async ({ ctx }) => {
      const req = (ctx as any).req;
      const token = req?.cookies?.portal_session;
      if (token) {
        const conn = await getDbConn();
        await conn.delete(portalSessions).where(eq(portalSessions.token, token));
      }
      (ctx as any).res?.clearCookie("portal_session", { path: "/" });
      return { success: true };
    }),

  /**
   * Public: request a password reset email.
   * Always returns success to avoid email enumeration.
   */
  requestPasswordReset: publicProcedure
    .input(z.object({
      email: z.string().email(),
      portalUrl: z.string().min(1), // frontend passes its own origin
    }))
    .mutation(async ({ input }) => {
      const conn = await getDbConn();
      const normalizedEmail = input.email.toLowerCase().trim();
      const [cred] = await conn.select().from(clientCredentials)
        .where(eq(clientCredentials.email, normalizedEmail)).limit(1);

      // Always return success to prevent email enumeration
      if (!cred) return { success: true };

      // Get the contact name for the email
      const [contact] = await conn.select().from(contacts)
        .where(eq(contacts.id, cred.contactId)).limit(1);

      // Generate a secure token
      const token = crypto.randomBytes(48).toString("hex");
      const expiresAt = new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000);

      await conn.insert(passwordResetTokens).values({
        token,
        contactId: cred.contactId,
        expiresAt,
      });

      const resetLink = `${input.portalUrl}/portal?reset=${token}`;
      const firstName = contact?.firstName ?? "there";

      try {
        await sendEmail({
          to: normalizedEmail,
          subject: "Reset your portal password",
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #1e3a5f;">Reset Your Password</h2>
              <p>Hi ${firstName},</p>
              <p>We received a request to reset your client portal password. Click the button below to set a new password. This link expires in ${RESET_TOKEN_MINUTES} minutes.</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetLink}"
                   style="background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                  Reset Password
                </a>
              </div>
              <p style="color: #6b7280; font-size: 13px;">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
              <p style="color: #6b7280; font-size: 13px;">Or copy this link: ${resetLink}</p>
            </div>
          `,
        });
      } catch (err) {
        console.error("[portalAuth] Failed to send reset email:", err);
        // Don't throw — still return success to avoid leaking info
      }

      return { success: true };
    }),

  /**
   * Public: validate a reset token (used to show the reset form).
   */
  validateResetToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const conn = await getDbConn();
      const now = new Date();
      const [row] = await conn.select().from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.token, input.token),
            gt(passwordResetTokens.expiresAt, now)
          )
        ).limit(1);
      if (!row || row.usedAt) return { valid: false };
      return { valid: true };
    }),

  /**
   * Public: reset password using a valid token.
   */
  resetPassword: publicProcedure
    .input(z.object({
      token: z.string(),
      newPassword: z.string().min(8, "Password must be at least 8 characters"),
    }))
    .mutation(async ({ input }) => {
      const conn = await getDbConn();
      const now = new Date();
      const [row] = await conn.select().from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.token, input.token),
            gt(passwordResetTokens.expiresAt, now)
          )
        ).limit(1);

      if (!row || row.usedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This reset link is invalid or has already been used.",
        });
      }

      const passwordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);
      await conn.update(clientCredentials)
        .set({ passwordHash })
        .where(eq(clientCredentials.contactId, row.contactId));

      // Mark token as used
      await conn.update(passwordResetTokens)
        .set({ usedAt: now })
        .where(eq(passwordResetTokens.token, input.token));

      // Invalidate all existing portal sessions for this contact
      await conn.delete(portalSessions)
        .where(eq(portalSessions.contactId, row.contactId));

      return { success: true };
    }),
});

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
import { eq } from "drizzle-orm";
import {
  clientCredentials,
  portalSessions,
  contacts,
} from "../../drizzle/schema";

const SALT_ROUNDS = 10;
const SESSION_DAYS = 30;

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
});

import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { brainDumpItems, brainDumpImages } from "../../drizzle/schema";

export const iepRouter = router({

    // Get IEP document record for a student (admin or parent portal)
    get: protectedProcedure
      .input(z.object({ contactId: z.number() }))
      .query(async ({ input }) => {
        const { iepDocuments } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const rows = await dbConn
          .select()
          .from(iepDocuments)
          .where(eq(iepDocuments.contactId, input.contactId))
          .limit(1);
        return rows[0] ?? null;
      }),

    // Admin or portal user uploads IEP for a student
    upload: protectedProcedure
      .input(z.object({
        contactId: z.number(),
        fileKey: z.string().optional(),
        fileName: z.string(),
        fileUrl: z.string().optional(),
        fileData: z.string().optional(),
        fileSize: z.number().optional(),
        mimeType: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { iepDocuments, contacts, clientFiles } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        // Non-admin: verify student belongs to this portal user's parent
        if (ctx.user.role !== 'admin') {
          const parentContact = await dbConn
            .select()
            .from(contacts)
            .where(eq(contacts.portalUserId, ctx.user.id))
            .limit(1);
          if (parentContact.length === 0) throw new TRPCError({ code: 'FORBIDDEN' });
          const students = await dbConn
            .select()
            .from(contacts)
            .where(eq(contacts.parentContactId, parentContact[0].id));
          if (!students.map(s => s.id).includes(input.contactId)) {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
        }

        let fileKey = input.fileKey;
        let fileUrl = input.fileUrl;

        if (input.fileData) {
          const buffer = Buffer.from(input.fileData, "base64");
          const hash = (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)).replace(/-/g, "").slice(0, 8);
          const sanitizedName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
          const relKey = `iep-documents/${Date.now()}_${hash}_${sanitizedName}`;
          const putRes = await storagePut(relKey, buffer, input.mimeType || "application/pdf");
          fileKey = putRes.key;
          fileUrl = putRes.url;
        }

        if (!fileKey || !fileUrl) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "File data or storage key is required for upload" });
        }

        // Upsert with auto-archive
        const existing = await dbConn
          .select()
          .from(iepDocuments)
          .where(eq(iepDocuments.contactId, input.contactId))
          .limit(1);
        const now = new Date();
        if (existing.length > 0 && existing[0].currentFileKey) {
          await dbConn.update(iepDocuments).set({
            previousFileKey: existing[0].currentFileKey,
            previousFileName: existing[0].currentFileName,
            previousFileUrl: existing[0].currentFileUrl,
            previousUploadedAt: existing[0].currentUploadedAt,
            currentFileKey: fileKey,
            currentFileName: input.fileName,
            currentFileUrl: fileUrl,
            currentUploadedAt: now,
          }).where(eq(iepDocuments.contactId, input.contactId));
        } else if (existing.length > 0) {
          await dbConn.update(iepDocuments).set({
            currentFileKey: fileKey,
            currentFileName: input.fileName,
            currentFileUrl: fileUrl,
            currentUploadedAt: now,
          }).where(eq(iepDocuments.contactId, input.contactId));
        } else {
          await dbConn.insert(iepDocuments).values({
            contactId: input.contactId,
            currentFileKey: fileKey,
            currentFileName: input.fileName,
            currentFileUrl: fileUrl,
            currentUploadedAt: now,
          });
        }

        // Also record in clientFiles vault for full visibility in Document Vault
        try {
          const studentContact = await dbConn
            .select()
            .from(contacts)
            .where(eq(contacts.id, input.contactId))
            .limit(1);
          const clientId = studentContact[0]?.parentContactId || input.contactId;
          await dbConn.insert(clientFiles).values({
            clientId,
            studentContactId: input.contactId,
            fileName: input.fileName,
            fileKey,
            fileUrl,
            fileSize: input.fileSize || 0,
            mimeType: input.mimeType || "application/pdf",
            category: "ieps-504s",
            documentType: "IEP",
            uploadOrigin: ctx.user.role === "admin" ? "Advocate" : "Client",
            isCurrentPlan: 1,
            isCurrentVersion: 1,
            uploadedBy: ctx.user.id,
          });
        } catch (cfErr) {
          console.warn("[IEP Upload] Optional clientFiles insert skipped:", cfErr);
        }

        return { success: true, fileKey, fileUrl };
      }),
    // ── Draft IEP History (completely separate from official IEP records) ──
    // Upload a draft IEP — creates a NEW row in draftIepHistory (never overwrites)
    uploadDraft: adminProcedure
      .input(z.object({
        contactId: z.number(),
        fileKey: z.string().optional(),
        fileName: z.string(),
        fileUrl: z.string().optional(),
        fileData: z.string().optional(),
        fileSize: z.number().optional(),
        mimeType: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { draftIepHistory, contacts, clientFiles } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        let fileKey = input.fileKey;
        let fileUrl = input.fileUrl;

        if (input.fileData) {
          const buffer = Buffer.from(input.fileData, "base64");
          const hash = (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)).replace(/-/g, "").slice(0, 8);
          const sanitizedName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
          const relKey = `iep-drafts/${Date.now()}_${hash}_${sanitizedName}`;
          const putRes = await storagePut(relKey, buffer, input.mimeType || "application/pdf");
          fileKey = putRes.key;
          fileUrl = putRes.url;
        }

        if (!fileKey || !fileUrl) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "File data or storage key is required for draft upload" });
        }

        await dbConn.insert(draftIepHistory).values({
          contactId: input.contactId,
          ownerId: ctx.user.id,
          fileKey,
          fileName: input.fileName,
          fileUrl,
          notes: input.notes ?? null,
        });

        // Also record in clientFiles vault
        try {
          const studentContact = await dbConn
            .select()
            .from(contacts)
            .where(eq(contacts.id, input.contactId))
            .limit(1);
          const clientId = studentContact[0]?.parentContactId || input.contactId;
          await dbConn.insert(clientFiles).values({
            clientId,
            studentContactId: input.contactId,
            fileName: input.fileName,
            fileKey,
            fileUrl,
            fileSize: input.fileSize || 0,
            mimeType: input.mimeType || "application/pdf",
            category: "ieps-504s",
            documentType: "Draft IEP",
            uploadOrigin: "Advocate",
            isCurrentPlan: 0,
            isCurrentVersion: 0,
            uploadedBy: ctx.user.id,
          });
        } catch (cfErr) {
          console.warn("[IEP Draft Upload] Optional clientFiles insert skipped:", cfErr);
        }

        return { success: true, fileKey, fileUrl };
      }),

    // List all draft IEP history entries for a student (newest first)
    listDraftHistory: adminProcedure
      .input(z.object({ contactId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { draftIepHistory } = await import("../../drizzle/schema");
        const { eq: deq, desc: ddesc, and: dand } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        return await dbConn
          .select()
          .from(draftIepHistory)
          .where(dand(deq(draftIepHistory.contactId, input.contactId), deq(draftIepHistory.ownerId, ctx.user.id)))
          .orderBy(ddesc(draftIepHistory.uploadedAt));
      }),

    // Delete a specific draft history entry
    deleteDraftHistory: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { draftIepHistory } = await import("../../drizzle/schema");
        const { eq: deq, and: dand } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await dbConn
          .delete(draftIepHistory)
          .where(dand(deq(draftIepHistory.id, input.id), deq(draftIepHistory.ownerId, ctx.user.id)));
        return { success: true };
      }),

    // Update notes on a specific draft history entry
    updateDraftNotes: adminProcedure
      .input(z.object({ id: z.number(), notes: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { draftIepHistory } = await import("../../drizzle/schema");
        const { eq: deq, and: dand } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await dbConn
          .update(draftIepHistory)
          .set({ notes: input.notes })
          .where(dand(deq(draftIepHistory.id, input.id), deq(draftIepHistory.ownerId, ctx.user.id)));
        return { success: true };
      }),
  
});

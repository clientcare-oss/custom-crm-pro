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
        extractedText: z.string().optional(),
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

        // Automatic Smart Hybrid sync if extracted text was provided with upload
        let syncResult: any = null;
        if (input.extractedText && input.extractedText.trim().length > 0) {
          try {
            const { syncIepToStudentProfile } = await import("../services/iepExtractionService");
            syncResult = await syncIepToStudentProfile({
              contactId: input.contactId,
              extractedText: input.extractedText,
              sourceDocument: input.fileName,
            });
          } catch (syncErr) {
            console.warn("[IEP Upload] Auto sync failed:", syncErr);
          }
        }

        return { success: true, fileKey, fileUrl, syncResult };
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

    // ── Smart Hybrid Profile Sync Endpoints ─────────────────────────────────
    // Extract student data from IEP and execute Smart Hybrid sync
    extractStudentData: adminProcedure
      .input(z.object({
        contactId: z.number(),
        extractedText: z.string(),
        sourceDocument: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { syncIepToStudentProfile } = await import("../services/iepExtractionService");
        return await syncIepToStudentProfile({
          contactId: input.contactId,
          extractedText: input.extractedText,
          sourceDocument: input.sourceDocument,
        });
      }),

    // Retrieve pending review updates for student overview bubble
    getPendingUpdates: adminProcedure
      .input(z.object({ contactId: z.number() }))
      .query(async ({ input }) => {
        const { getPendingIepUpdates } = await import("../services/iepExtractionService");
        const pending = getPendingIepUpdates(input.contactId);
        return { pending };
      }),

    // Apply advocate-confirmed updates to student profile
    applyPendingUpdates: adminProcedure
      .input(z.object({
        contactId: z.number(),
        acceptedFields: z.record(z.string(), z.string()),
        dismissRemaining: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { applyConfirmedIepUpdates } = await import("../services/iepExtractionService");
        return await applyConfirmedIepUpdates({
          contactId: input.contactId,
          acceptedFields: input.acceptedFields,
          dismissRemaining: input.dismissRemaining,
        });
      }),

    // Dismiss pending updates without changing student profile
    dismissPendingUpdates: adminProcedure
      .input(z.object({ contactId: z.number() }))
      .mutation(async ({ input }) => {
        const { dismissIepUpdates } = await import("../services/iepExtractionService");
        dismissIepUpdates(input.contactId);
        return { success: true };
      }),

    // Re-sync student profile from stored document or provided fallback
    reSyncFromStoredIep: adminProcedure
      .input(z.object({
        contactId: z.number(),
        fallbackText: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { syncIepToStudentProfile } = await import("../services/iepExtractionService");
        let text = input.fallbackText || "";
        let docName = "Stored IEP Document";
        if (!text) {
          const { iepDocuments } = await import("../../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          const dbConn = await db.getDb();
          if (dbConn) {
            const doc = await dbConn.select().from(iepDocuments).where(eq(iepDocuments.contactId, input.contactId)).limit(1);
            if (doc[0]?.currentFileName) {
              docName = doc[0].currentFileName;
              text = `Document File: ${doc[0].currentFileName}\n`;
            }
          }
        }
        return await syncIepToStudentProfile({
          contactId: input.contactId,
          extractedText: text,
          sourceDocument: docName,
        });
      }),

    // Query IEP-extracted student demographics (address, dob, gtid, parent details)
    getStudentIepDemographics: protectedProcedure
      .input(z.object({ contactId: z.number() }))
      .query(async ({ input }) => {
        const { iepDocuments, clientFiles, documentVaultAnalyses } = await import("../../drizzle/schema");
        const { eq, desc } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) return null;

        // 1. Check documentVaultAnalyses
        try {
          const analyses = await dbConn
            .select()
            .from(documentVaultAnalyses)
            .where(eq(documentVaultAnalyses.studentContactId, input.contactId))
            .orderBy(desc(documentVaultAnalyses.createdAt))
            .limit(5);

          for (const a of analyses) {
            if (a.rawAnalysisJson) {
              try {
                const parsed = JSON.parse(a.rawAnalysisJson);
                if (parsed.address || parsed.studentAddress || parsed.gtid || parsed.studentGtid) {
                  return {
                    address: (parsed.address || parsed.studentAddress || null) as string | null,
                    city: (parsed.city || parsed.studentCity || null) as string | null,
                    state: (parsed.state || parsed.studentState || null) as string | null,
                    zipCode: (parsed.zipCode || parsed.studentZip || null) as string | null,
                    dob: (parsed.dateOfBirth || parsed.studentDob || null) as string | null,
                    gtid: (parsed.gtid || parsed.studentGtid || null) as string | null,
                    parentName: (parsed.parentName || null) as string | null,
                    parentAddress: (parsed.parentAddress || null) as string | null,
                    parentPhone: (parsed.parentPhone || null) as string | null,
                    parentEmail: (parsed.parentEmail || null) as string | null,
                  };
                }
              } catch {}
            }
            if (a.extractedText) {
              const { extractIepFieldsHeuristic } = await import("../services/iepExtractionService");
              const h = extractIepFieldsHeuristic(a.extractedText);
              if (h.address || h.gtid) {
                return {
                  address: h.address || null,
                  city: h.city || null,
                  state: h.state || null,
                  zipCode: h.zipCode || null,
                  dob: h.dateOfBirth || null,
                  gtid: h.gtid || null,
                  parentName: h.parentName || null,
                  parentAddress: h.parentAddress || null,
                  parentPhone: h.parentPhone || null,
                  parentEmail: h.parentEmail || null,
                };
              }
            }
          }
        } catch (err) {
          console.warn("[getStudentIepDemographics] Error checking vault analyses:", err);
        }

        // 2. Check clientFiles with extractedText
        try {
          const cFiles = await dbConn
            .select()
            .from(clientFiles)
            .where(eq(clientFiles.studentContactId, input.contactId))
            .orderBy(desc(clientFiles.uploadedAt))
            .limit(5);

          for (const cf of cFiles) {
            if (cf.extractedText) {
              const { extractIepFieldsHeuristic } = await import("../services/iepExtractionService");
              const h = extractIepFieldsHeuristic(cf.extractedText);
              if (h.address || h.gtid) {
                return {
                  address: h.address || null,
                  city: h.city || null,
                  state: h.state || null,
                  zipCode: h.zipCode || null,
                  dob: h.dateOfBirth || null,
                  gtid: h.gtid || null,
                  parentName: h.parentName || null,
                  parentAddress: h.parentAddress || null,
                  parentPhone: h.parentPhone || null,
                  parentEmail: h.parentEmail || null,
                };
              }
            }
          }
        } catch (err) {
          console.warn("[getStudentIepDemographics] Error checking clientFiles:", err);
        }

        return null;
      }),
  
});

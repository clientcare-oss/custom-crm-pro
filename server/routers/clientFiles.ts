import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { brainDumpItems, brainDumpImages } from "../../drizzle/schema";

export const clientFilesRouter = router({

    listByClient: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === "admin") {
        return [];
      }
      return await db.getClientFilesByClient(ctx.user.id);
    }),

    listForAdmin: adminProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        return await db.getClientFilesByClient(input.clientId);
      }),

    listByProject: adminProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getClientFilesByProject(input.projectId, ctx.user.id);
      }),

    upload: protectedProcedure
      .input(
        z.object({
          projectId: z.number().optional(),
          fileName: z.string().min(1),
          fileData: z.string(), // base64 encoded file data
          fileSize: z.number().max(1024 * 1024 * 1024), // 1GB max
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Validate PDF
        if (!input.fileName.toLowerCase().endsWith(".pdf")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only PDF files are accepted.",
          });
        }

        // Upload to S3
        const buffer = Buffer.from(input.fileData, "base64");
        const fileKey = `client-files/${ctx.user.id}/${Date.now()}-${input.fileName}`;
        const { key, url } = await storagePut(fileKey, buffer, "application/pdf");

        // Save metadata to database
        return await db.createClientFile({
          clientId: ctx.user.id,
          projectId: input.projectId,
          fileName: input.fileName,
          fileUrl: url,
          fileKey: key,
          fileSize: input.fileSize,
          mimeType: "application/pdf",
        });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return await db.deleteClientFile(input.id, ctx.user.id);
      }),

    saveGeneratedDocument: adminProcedure
      .input(
        z.object({
          clientId: z.number(),
          fileName: z.string().min(1),
          content: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.content, "utf-8");
        const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const fileKey = `formal-escalations/${input.clientId}/${Date.now()}-${safeName}`;
        const { key, url } = await storagePut(fileKey, buffer, "text/plain");

        return await db.createClientFile({
          clientId: input.clientId,
          fileName: input.fileName,
          fileUrl: url,
          fileKey: key,
          fileSize: buffer.length,
          mimeType: "text/plain",
          uploadedBy: ctx.user.id,
        });
      }),
});

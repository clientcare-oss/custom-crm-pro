import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { brainDumpItems, brainDumpImages } from "../../drizzle/schema";

export const notesRouter = router({

    list: adminProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        // Verify project ownership
        const project = await db.getProjectById(input.projectId, ctx.user.id, ctx.user.role);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        return await db.getProjectNotes(input.projectId);
      }),

    listForClient: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        // Client can only see notes marked as visible
        return await db.getProjectNotesForClient(input.projectId);
      }),

    create: adminProcedure
      .input(
        z.object({
          projectId: z.number(),
          title: z.string().min(1),
          content: z.string(),
          isVisibleToClient: z.boolean().default(false),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify project ownership
        const project = await db.getProjectById(input.projectId, ctx.user.id, ctx.user.role);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        return await db.createProjectNote({
          ...input,
          createdBy: ctx.user.id,
        });
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          projectId: z.number(),
          title: z.string().optional(),
          content: z.string().optional(),
          isVisibleToClient: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify project ownership
        const project = await db.getProjectById(input.projectId, ctx.user.id, ctx.user.role);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        
        const note = await db.getProjectNoteById(input.id);
        if (!note) throw new TRPCError({ code: "NOT_FOUND" });
        
        return await db.updateProjectNote(input.id, {
          title: input.title,
          content: input.content,
          isVisibleToClient: input.isVisibleToClient,
        });
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number(), projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Verify project ownership
        const project = await db.getProjectById(input.projectId, ctx.user.id, ctx.user.role);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        
        const note = await db.getProjectNoteById(input.id);
        if (!note) throw new TRPCError({ code: "NOT_FOUND" });
        
        return await db.deleteProjectNote(input.id);
      }),

    getHistory: adminProcedure
      .input(z.object({ noteId: z.number(), projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verify project ownership
        const project = await db.getProjectById(input.projectId, ctx.user.id, ctx.user.role);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        return await db.getProjectNoteHistory(input.noteId);
      }),
  
});

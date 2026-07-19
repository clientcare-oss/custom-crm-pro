import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { brainDumpItems, brainDumpImages } from "../../drizzle/schema";

export const aiConnectionsRouter = router({

    list: adminProcedure.query(async ({ ctx }) => {
      return await db.getAiConnectionsByOwner(ctx.user.id);
    }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        icon: z.string().default("Sparkles"),
        color: z.string().default("blue"),
        location: z.enum(["notes", "compass", "files", "tasks", "details", "any"]).default("notes"),
        outputTarget: z.enum(["note", "compass", "popup"]).default("popup"),
        promptTemplate: z.string().min(1),
        description: z.string().optional(),
        sortOrder: z.number().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createAiConnection(input, ctx.user.id);
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        location: z.enum(["notes", "compass", "files", "tasks", "details", "any"]).optional(),
        outputTarget: z.enum(["note", "compass", "popup"]).optional(),
        promptTemplate: z.string().min(1).optional(),
        description: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const conn = await db.getAiConnectionById(id, ctx.user.id);
        if (!conn) throw new TRPCError({ code: "NOT_FOUND" });
        return await db.updateAiConnection(id, ctx.user.id, data);
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const conn = await db.getAiConnectionById(input.id, ctx.user.id);
        if (!conn) throw new TRPCError({ code: "NOT_FOUND" });
        return await db.deleteAiConnection(input.id, ctx.user.id);
      }),

    run: adminProcedure
      .input(z.object({
        connectionId: z.number(),
        contactId: z.number(),
        projectId: z.number().optional(),
        contextData: z.object({
          studentName: z.string().optional(),
          caseId: z.string().optional(),
          compassContent: z.string().optional(),
          noteContent: z.string().optional(),
          extraContext: z.string().optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const conn = await db.getAiConnectionById(input.connectionId, ctx.user.id);
        if (!conn) throw new TRPCError({ code: "NOT_FOUND" });

        const ctx_data = input.contextData || {};
        let prompt = conn.promptTemplate
          .replace(/\{\{studentName\}\}/g, ctx_data.studentName || "the student")
          .replace(/\{\{caseId\}\}/g, ctx_data.caseId || "N/A")
          .replace(/\{\{compassContent\}\}/g, ctx_data.compassContent || "(no compass data)")
          .replace(/\{\{noteContent\}\}/g, ctx_data.noteContent || "(no note content)")
          .replace(/\{\{extraContext\}\}/g, ctx_data.extraContext || "");

        const { invokeLLM } = await import("../_core/llm");
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a special education advocate assistant. Provide clear, actionable, professional responses. Format your response in plain text with clear sections.",
            },
            { role: "user", content: prompt },
          ],
        });

        const outputText = (response as any)?.choices?.[0]?.message?.content || "No response generated.";

        await db.createAiConnectionRun({
          connectionId: input.connectionId,
          contactId: input.contactId,
          projectId: input.projectId,
          inputSummary: prompt.substring(0, 500),
          outputText,
        });

        return { outputText, connectionName: conn.name };
      }),

    getRuns: adminProcedure
      .input(z.object({ contactId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getAiConnectionRunsByContact(input.contactId);
      }),
  
});

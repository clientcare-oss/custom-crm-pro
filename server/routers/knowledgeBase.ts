import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { brainDumpItems, brainDumpImages } from "../../drizzle/schema";

export const knowledgeBaseRouter = router({

    list: adminProcedure
      .input(z.object({
        category: z.string().optional(),
        search: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { knowledgeBase } = await import("../../drizzle/schema");
        const { like, and: dbAnd, eq: dbEq } = await import("drizzle-orm");
        const conditions: any[] = [dbEq(knowledgeBase.ownerId, ctx.user.id)];
        if (input.category && input.category !== "All") {
          conditions.push(dbEq(knowledgeBase.category, input.category));
        }
        if (input.search) {
          conditions.push(like(knowledgeBase.title, `%${input.search}%`));
        }
        return await database
          .select()
          .from(knowledgeBase)
          .where(dbAnd(...conditions))
          .orderBy(desc(knowledgeBase.createdAt));
      }),

    upload: adminProcedure
      .input(z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        category: z.string().default("Other"),
        fileName: z.string().min(1),
        fileSize: z.number().optional(),
        fileData: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { knowledgeBase } = await import("../../drizzle/schema");
        const fileBuffer = Buffer.from(input.fileData, "base64");
        const fileKey = `kb/${ctx.user.id}/${Date.now()}-${input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { storagePut } = await import("../storage");
        const { url } = await storagePut(fileKey, fileBuffer, "application/pdf");
        const result = await database.insert(knowledgeBase).values({
          ownerId: ctx.user.id,
          title: input.title,
          description: input.description || null,
          category: input.category,
          fileKey,
          fileUrl: url,
          fileName: input.fileName,
          fileSize: input.fileSize || fileBuffer.length,
        });
        return { success: true, id: Number((result as any).lastInsertRowid), url };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { knowledgeBase } = await import("../../drizzle/schema");
        const { eq: dbEq } = await import("drizzle-orm");
        const [doc] = await database.select().from(knowledgeBase).where(dbEq(knowledgeBase.id, input.id));
        if (!doc || doc.ownerId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        await database.delete(knowledgeBase).where(dbEq(knowledgeBase.id, input.id));
        return { success: true };
      }),

    // Dynamic categories from DB
    categories: adminProcedure.query(async ({ ctx }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { kbCategories } = await import("../../drizzle/schema");
      const { eq: dbEq, asc: dbAsc } = await import("drizzle-orm");
      const rows = await database
        .select()
        .from(kbCategories)
        .where(dbEq(kbCategories.ownerId, ctx.user.id))
        .orderBy(dbAsc(kbCategories.name));
      return rows;
    }),

    createCategory: adminProcedure
      .input(z.object({ name: z.string().min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { kbCategories } = await import("../../drizzle/schema");
        const { eq: dbEq } = await import("drizzle-orm");
        // Prevent duplicates
        const allRows = await database
          .select()
          .from(kbCategories)
          .where(dbEq(kbCategories.ownerId, ctx.user.id));
        if (allRows.some(r => r.name.toLowerCase() === input.name.toLowerCase())) {
          throw new TRPCError({ code: "CONFLICT", message: "Category already exists" });
        }
        const result = await database.insert(kbCategories).values({
          ownerId: ctx.user.id,
          name: input.name.trim(),
        });
        return { success: true, id: Number((result as any).lastInsertRowid) };
      }),

    deleteCategory: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { kbCategories } = await import("../../drizzle/schema");
        const { eq: dbEq, and: dbAnd } = await import("drizzle-orm");
        await database
          .delete(kbCategories)
          .where(dbAnd(dbEq(kbCategories.id, input.id), dbEq(kbCategories.ownerId, ctx.user.id)));
        return { success: true };
      }),
  
});

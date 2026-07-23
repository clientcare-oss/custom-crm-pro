import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { emailTemplates, emailTemplateFolders } from "../../drizzle/schema";
import { eq, and, isNull, desc } from "drizzle-orm";

// ─── Folders ──────────────────────────────────────────────────────────────────

const foldersRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return await db
      .select()
      .from(emailTemplateFolders)
      .where(eq(emailTemplateFolders.ownerId, ctx.user.id))
      .orderBy(emailTemplateFolders.name);
  }),

  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      color: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(emailTemplateFolders).values({
        name: input.name,
        color: input.color ?? "blue",
        ownerId: ctx.user.id,
      });
      const [created] = await db
        .select()
        .from(emailTemplateFolders)
        .where(eq(emailTemplateFolders.ownerId, ctx.user.id))
        .orderBy(desc(emailTemplateFolders.createdAt))
        .limit(1);
      return created;
    }),

  rename: adminProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1), color: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .update(emailTemplateFolders)
        .set({ name: input.name, ...(input.color ? { color: input.color } : {}) })
        .where(and(eq(emailTemplateFolders.id, input.id), eq(emailTemplateFolders.ownerId, ctx.user.id)));
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // Move all templates in this folder to unfiled
      await db
        .update(emailTemplates)
        .set({ folderId: null })
        .where(and(eq(emailTemplates.folderId, input.id), eq(emailTemplates.ownerId, ctx.user.id)));
      await db
        .delete(emailTemplateFolders)
        .where(and(eq(emailTemplateFolders.id, input.id), eq(emailTemplateFolders.ownerId, ctx.user.id)));
      return { success: true };
    }),
});

// ─── Templates ────────────────────────────────────────────────────────────────

export const emailTemplatesRouter = router({
  folders: foldersRouter,

  list: adminProcedure
    .input(z.object({
      folderId: z.number().nullable().optional(), // null = unfiled, undefined = all
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [eq(emailTemplates.ownerId, ctx.user.id)];

      if (input?.folderId === null) {
        // Explicitly unfiled
        conditions.push(isNull(emailTemplates.folderId));
      } else if (input?.folderId !== undefined) {
        conditions.push(eq(emailTemplates.folderId, input.folderId));
      }
      // if folderId is undefined (omitted), return all templates

      return await db
        .select()
        .from(emailTemplates)
        .where(and(...conditions))
        .orderBy(desc(emailTemplates.updatedAt));
    }),

  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      subject: z.string().min(1),
      body: z.string(),
      category: z.string().optional(),
      folderId: z.number().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(emailTemplates).values({ ...input, ownerId: ctx.user.id });
      const [created] = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.ownerId, ctx.user.id))
        .orderBy(desc(emailTemplates.createdAt))
        .limit(1);
      return created;
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      subject: z.string().min(1).optional(),
      body: z.string().optional(),
      category: z.string().optional(),
      folderId: z.number().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db
        .update(emailTemplates)
        .set(data)
        .where(and(eq(emailTemplates.id, id), eq(emailTemplates.ownerId, ctx.user.id)));
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .delete(emailTemplates)
        .where(and(eq(emailTemplates.id, input.id), eq(emailTemplates.ownerId, ctx.user.id)));
      return { success: true };
    }),
});

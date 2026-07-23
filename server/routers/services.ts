import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { services, serviceFolders } from "../../drizzle/schema";
import { eq, and, isNull, desc } from "drizzle-orm";

// ─── Folders ──────────────────────────────────────────────────────────────────

const foldersRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return await db
      .select()
      .from(serviceFolders)
      .where(eq(serviceFolders.ownerId, ctx.user.id))
      .orderBy(serviceFolders.name);
  }),

  create: adminProcedure
    .input(z.object({ name: z.string().min(1), color: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(serviceFolders).values({
        name: input.name,
        color: input.color ?? "blue",
        ownerId: ctx.user.id,
      });
      const [created] = await db
        .select()
        .from(serviceFolders)
        .where(eq(serviceFolders.ownerId, ctx.user.id))
        .orderBy(desc(serviceFolders.createdAt))
        .limit(1);
      return created;
    }),

  rename: adminProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1), color: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .update(serviceFolders)
        .set({ name: input.name, ...(input.color ? { color: input.color } : {}) })
        .where(and(eq(serviceFolders.id, input.id), eq(serviceFolders.ownerId, ctx.user.id)));
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // Move services in this folder to unfiled
      await db
        .update(services)
        .set({ folderId: null })
        .where(and(eq(services.folderId, input.id), eq(services.ownerId, ctx.user.id)));
      await db
        .delete(serviceFolders)
        .where(and(eq(serviceFolders.id, input.id), eq(serviceFolders.ownerId, ctx.user.id)));
      return { success: true };
    }),
});

// ─── Services ─────────────────────────────────────────────────────────────────

export const servicesRouter = router({
  folders: foldersRouter,

  list: adminProcedure
    .input(z.object({ folderId: z.number().optional(), unfiled: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [eq(services.ownerId, ctx.user.id)];
      if (input?.folderId) conditions.push(eq(services.folderId, input.folderId));
      if (input?.unfiled) conditions.push(isNull(services.folderId));
      return await db
        .select()
        .from(services)
        .where(and(...conditions))
        .orderBy(services.name);
    }),

  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      price: z.number().optional(),
      duration: z.number().optional(),
      folderId: z.number().nullable().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(services).values({
        ownerId: ctx.user.id,
        name: input.name,
        description: input.description ?? null,
        price: input.price ?? null,
        duration: input.duration ?? null,
        folderId: input.folderId ?? null,
        isActive: input.isActive ?? true,
      });
      return { success: true };
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      price: z.number().optional(),
      duration: z.number().optional(),
      folderId: z.number().nullable().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db
        .update(services)
        .set(data)
        .where(and(eq(services.id, id), eq(services.ownerId, ctx.user.id)));
      return { success: true };
    }),

  move: adminProcedure
    .input(z.object({ id: z.number(), folderId: z.number().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .update(services)
        .set({ folderId: input.folderId })
        .where(and(eq(services.id, input.id), eq(services.ownerId, ctx.user.id)));
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .delete(services)
        .where(and(eq(services.id, input.id), eq(services.ownerId, ctx.user.id)));
      return { success: true };
    }),
});

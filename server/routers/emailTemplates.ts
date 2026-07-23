import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { emailTemplates } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export const emailTemplatesRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.ownerId, ctx.user.id))
      .orderBy(desc(emailTemplates.updatedAt));
  }),

  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      subject: z.string().min(1),
      body: z.string(),
      category: z.string().optional(),
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

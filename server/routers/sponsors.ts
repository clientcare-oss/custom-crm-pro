import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { sponsors } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export const sponsorsRouter = router({
  list: adminProcedure
    .input(z.object({ type: z.enum(["sponsor", "gift"]).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [eq(sponsors.ownerId, ctx.user.id)];
      if (input?.type) conditions.push(eq(sponsors.type, input.type));
      return await db
        .select()
        .from(sponsors)
        .where(and(...conditions))
        .orderBy(desc(sponsors.donatedAt));
    }),

  create: adminProcedure
    .input(z.object({
      type: z.enum(["sponsor", "gift"]),
      donorName: z.string().min(1),
      donorEmail: z.string().optional(),
      donorPhone: z.string().optional(),
      amount: z.number().optional(),
      familyContactId: z.number().optional(),
      familyName: z.string().optional(),
      caseId: z.string().optional(),
      notes: z.string().optional(),
      status: z.string().optional(),
      donatedAt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(sponsors).values({
        ownerId: ctx.user.id,
        type: input.type,
        donorName: input.donorName,
        donorEmail: input.donorEmail ?? null,
        donorPhone: input.donorPhone ?? null,
        amount: input.amount ?? null,
        familyContactId: input.familyContactId ?? null,
        familyName: input.familyName ? `${input.familyName}${input.caseId ? ` [${input.caseId}]` : ""}` : null,
        notes: input.notes ?? null,
        status: input.status ?? "received",
        donatedAt: input.donatedAt ? new Date(input.donatedAt) : new Date(),
      });
      return { success: true };
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      donorName: z.string().optional(),
      donorEmail: z.string().optional(),
      donorPhone: z.string().optional(),
      amount: z.number().optional(),
      familyContactId: z.number().optional(),
      familyName: z.string().optional(),
      caseId: z.string().optional(),
      notes: z.string().optional(),
      status: z.string().optional(),
      donatedAt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, caseId, ...data } = input;
      const updateData: any = { ...data };
      if (data.donatedAt) updateData.donatedAt = new Date(data.donatedAt);
      if (data.familyName && caseId) updateData.familyName = `${data.familyName} [${caseId}]`;
      await db
        .update(sponsors)
        .set(updateData)
        .where(and(eq(sponsors.id, id), eq(sponsors.ownerId, ctx.user.id)));
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .delete(sponsors)
        .where(and(eq(sponsors.id, input.id), eq(sponsors.ownerId, ctx.user.id)));
      return { success: true };
    }),
});

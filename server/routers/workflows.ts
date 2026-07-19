import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { brainDumpItems, brainDumpImages } from "../../drizzle/schema";

export const workflowsRouter = router({

    list: protectedProcedure.query(async () => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { workflows } = await import("../../drizzle/schema");
      return await database.select().from(workflows).orderBy(asc(workflows.createdAt));
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { workflows } = await import("../../drizzle/schema");
        const [wf] = await database.select().from(workflows).where(eq(workflows.id, input.id));
        if (!wf) throw new TRPCError({ code: "NOT_FOUND" });
        return wf;
      }),

    create: adminProcedure
      .input(z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        category: z.string().optional(),
        color: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { workflows } = await import("../../drizzle/schema");
        const result = await database.insert(workflows).values({ ...input, createdBy: ctx.user.id });
        return { id: Number((result as any).lastInsertRowid) };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        color: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { workflows } = await import("../../drizzle/schema");
        const { id, ...data } = input;
        await database.update(workflows).set(data).where(eq(workflows.id, id));
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { workflows } = await import("../../drizzle/schema");
        await database.delete(workflows).where(eq(workflows.id, input.id));
        return { success: true };
      }),

    saveCanvas: adminProcedure
      .input(z.object({
        id: z.number(),
        canvasData: z.string(),
      }))
      .mutation(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { workflows } = await import("../../drizzle/schema");
        await database.update(workflows).set({ canvasData: input.canvasData }).where(eq(workflows.id, input.id));
        return { success: true };
      }),
  
});

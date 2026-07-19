import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { and, eq, desc, asc, gte } from "drizzle-orm";
import * as db from "../db";

export const brainDumpImagesRouter = router({
      upload: protectedProcedure
        .input(z.object({
          brainDumpItemId: z.number(),
          imageUrl: z.string().min(1),
        }))
        .mutation(async ({ ctx, input }) => {
          const { brainDumpItems: bdi, brainDumpImages: bimg } = await import("../../drizzle/schema");
          const { eq: beq } = await import("drizzle-orm");
          const dbConn = await db.getDb();
          if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
          const [item] = await dbConn.select().from(bdi).where(beq(bdi.id, input.brainDumpItemId)).limit(1);
          if (!item || item.ownerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
          await dbConn.insert(bimg).values({
            brainDumpItemId: input.brainDumpItemId,
            imageUrl: input.imageUrl,
          });
          const [inserted] = await dbConn.select().from(bimg)
            .where(beq(bimg.brainDumpItemId, input.brainDumpItemId))
            .orderBy(bimg.id)
            .limit(1);
          return inserted;
        }),
      listByItem: protectedProcedure
        .input(z.object({ brainDumpItemId: z.number() }))
        .query(async ({ ctx, input }) => {
          const { brainDumpItems: bdi, brainDumpImages: bimg } = await import("../../drizzle/schema");
          const { eq: beq, desc: bdesc } = await import("drizzle-orm");
          const dbConn = await db.getDb();
          if (!dbConn) return [];
          const [item] = await dbConn.select().from(bdi).where(beq(bdi.id, input.brainDumpItemId)).limit(1);
          if (!item || item.ownerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
          return dbConn.select().from(bimg)
            .where(beq(bimg.brainDumpItemId, input.brainDumpItemId))
            .orderBy(bdesc(bimg.uploadedAt));
        }),
      delete: protectedProcedure
        .input(z.object({ imageId: z.number() }))
        .mutation(async ({ ctx, input }) => {
          const { brainDumpItems: bdi, brainDumpImages: bimg } = await import("../../drizzle/schema");
          const { eq: beq } = await import("drizzle-orm");
          const dbConn = await db.getDb();
          if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
          const [image] = await dbConn.select().from(bimg).where(beq(bimg.id, input.imageId)).limit(1);
          if (!image) throw new TRPCError({ code: 'NOT_FOUND' });
          const [item] = await dbConn.select().from(bdi).where(beq(bdi.id, image.brainDumpItemId)).limit(1);
          if (!item || item.ownerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
          await dbConn.delete(bimg).where(beq(bimg.id, input.imageId));
          return { success: true };
        }),
  });

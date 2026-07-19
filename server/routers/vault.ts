import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { brainDumpItems, brainDumpImages } from "../../drizzle/schema";

export const vaultRouter = router({

    getSubscription: protectedProcedure.query(async ({ ctx }) => {
      // Admin preview mode returns null (no subscription to show)
      // Client users get their actual subscription
      if (ctx.user.role === "admin") {
        return null;
      }
      return await db.getVaultSubscription(ctx.user.id);
    }),

    // Admin can view all vault subscriptions
    listAll: adminProcedure.query(async () => {
      return await db.getAllVaultSubscriptions();
    }),

    createSubscription: protectedProcedure
      .input(
        z.object({
          tier: z.enum(["basic", "pro", "enterprise"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "client") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const storageLimits: Record<string, number> = {
          basic: 50 * 1024 * 1024 * 1024,
          pro: 500 * 1024 * 1024 * 1024,
          enterprise: 2000 * 1024 * 1024 * 1024,
        };
        return await db.createVaultSubscription({
          clientId: ctx.user.id,
          tier: input.tier,
          storageLimit: storageLimits[input.tier],
          startDate: new Date(),
        });
      }),

    cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "client") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return await db.cancelVaultSubscription(ctx.user.id);
    }),
  
});

import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./trpc";
import * as db from "../db";
import { ENV } from "./env";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  // Returns the owner's business phone number (for the "Save our number" notice on forms)
  getBusinessPhone: publicProcedure.query(async () => {
    const owner = await db.getUserByOpenId(ENV.ownerOpenId);
    return { phone: owner?.phone ?? null };
  }),

  // Sets the owner's business phone number (used in the "Save our number" notice on forms)
  setBusinessPhone: protectedProcedure
    .input(z.object({ phone: z.string().max(50) }))
    .mutation(async ({ input }) => {
      await db.updateOwnerPhone(ENV.ownerOpenId, input.phone);
      return { success: true };
    }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});

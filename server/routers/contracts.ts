import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { brainDumpItems, brainDumpImages } from "../../drizzle/schema";

export const contractsRouter = router({

    list: adminProcedure.query(async ({ ctx }) => {
      return await db.getContractsByOwner(ctx.user.id);
    }),

    get: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getContractById(input.id, ctx.user.id, ctx.user.role);
      }),

    create: adminProcedure
      .input(
        z.object({
          clientId: z.number().optional(),
          projectId: z.number().optional(),
          title: z.string().min(1),
          content: z.string().min(1),
          status: z.enum(["Draft", "Sent", "Signed", "Executed", "Cancelled"]).optional(),
          expiryDate: z.date().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await db.createContract(input, ctx.user.id);
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          clientId: z.number().optional(),
          projectId: z.number().optional(),
          title: z.string().optional(),
          content: z.string().optional(),
          status: z.enum(["Draft", "Sent", "Signed", "Executed", "Cancelled"]).optional(),
          expiryDate: z.date().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return await db.updateContract(id, ctx.user.id, data);
      }),

    sign: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          signatureData: z.string(), // base64 PNG data URL
        })
      )
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new Error("Database not available");

        const schema = await import("../../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");

        // Authorization: verify the contract is assigned to this client
        const [contract] = await dbInstance.select()
          .from(schema.contracts)
          .where(eq(schema.contracts.id, input.id))
          .limit(1);

        if (!contract) throw new TRPCError({ code: "NOT_FOUND", message: "Contract not found" });

        // Only the assigned client or admin can sign
        if (ctx.user.role !== "admin" && contract.clientId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You are not authorized to sign this contract" });
        }

        // Only contracts with status "Sent" can be signed
        if (contract.status !== "Sent") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This contract cannot be signed in its current state" });
        }

        // Store signature in S3
        const { storagePut } = await import("../storage");
        const base64Data = input.signatureData.replace(/^data:image\/png;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const fileKey = `signatures/contract-${input.id}-${Date.now()}.png`;
        const { url } = await storagePut(fileKey, buffer, "image/png");

        // Update contract status to Signed
        await dbInstance.update(schema.contracts)
          .set({
            status: "Signed",
            signedDate: new Date(),
            signatureUrl: url,
            signatureKey: fileKey,
          })
          .where(eq(schema.contracts.id, input.id));

        return { success: true, signatureUrl: url };
      }),

    clientList: protectedProcedure.query(async ({ ctx }) => {
      // Get contracts assigned to this client
      const dbInstance = await db.getDb();
      if (!dbInstance) return [];
      const schema = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      return await dbInstance.select().from(schema.contracts).where(eq(schema.contracts.clientId, ctx.user.id));
    }),
  
});

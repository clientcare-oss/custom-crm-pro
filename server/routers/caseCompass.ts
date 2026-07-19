import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { brainDumpItems, brainDumpImages } from "../../drizzle/schema";

export const caseCompassRouter = router({

    // Admin: list all portal clients (users with role=client)
    portalClients: adminProcedure.query(async () => {
      return await db.getPortalClients();
    }),

    // Admin: get compass for a specific case
    get: adminProcedure
      .input(z.object({ caseId: z.string() }))
      .query(async ({ input }) => {
        return await db.getCaseCompass(input.caseId);
      }),

    // Admin: upsert compass (auto-snapshots old version)
    upsert: adminProcedure
      .input(
        z.object({
          caseId: z.string(),
          currentStatus: z.string().optional(),
          lastMeetingSummary: z.string().optional(),
          nextStep: z.string().optional(),
          whoHasBall: z.string().optional(),
          nextMeetingDate: z.date().optional().nullable(),
        })
      )
      .mutation(async ({ input }) => {
        const { caseId, ...data } = input;
        return await db.upsertCaseCompass(caseId, data);
      }),

    // Admin: get history for a specific case
    history: adminProcedure
      .input(z.object({ caseId: z.string() }))
      .query(async ({ input }) => {
        return await db.getCaseCompassHistory(input.caseId);
      }),

    // Client: get their own compass (looks up by portalUserId → caseId)
    myCompass: protectedProcedure.query(async ({ ctx }) => {
      // Find the contact linked to this portal user to get their caseId
      const contact = await db.getContactByPortalUserId(ctx.user.id);
      if (!contact?.caseId) return null;
      return await db.getCaseCompass(contact.caseId) ?? null;
    }),

    // Client: get their own compass history
    myHistory: protectedProcedure.query(async ({ ctx }) => {
      const contact = await db.getContactByPortalUserId(ctx.user.id);
      if (!contact?.caseId) return [];
      return await db.getCaseCompassHistory(contact.caseId);
    }),
  
});

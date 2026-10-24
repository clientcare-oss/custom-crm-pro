import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { brainDumpItems, brainDumpImages } from "../../drizzle/schema";
import { resolveOrCreateFamilyIdentity } from "../services/familyIdentityService";

const leadStatusEnum = z.enum([
  "New",
  "14 Day Follow-up",
  "30 Day Follow-up",
  "60 Day Follow-up",
  "90 Day Follow-up",
  "Discovery Completed",
  "Approved for Enrollment",
  "Ready for Archive",
  "Won",
  "Lost",
]);

export const leadsRouter = router({

    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getLeadsByOwner(ctx.user.id);
    }),

    get: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getLeadById(input.id, ctx.user.id);
      }),

    create: adminProcedure
      .input(
        z.object({
          contactId: z.number().optional(),
          source: z.string().optional(),
          status: leadStatusEnum.optional(),
          value: z.string().optional(),
          notes: z.string().optional(),
          parentName: z.string().optional(),
          parentPhone: z.string().optional(),
          studentName: z.string().optional(),
          studentAge: z.number().optional(),
          studentGrade: z.string().optional(),
          discoveryCallDate: z.date().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        let contactId = input.contactId;

        // If parentName or parentPhone is provided without contactId, resolve or create the Family Contact anchor
        if (!contactId && (input.parentName || input.parentPhone)) {
          const rawParent = (input.parentName || "").trim();
          const pParts = rawParent.split(/\s+/);
          const parentFirstName = pParts[0] || "Unknown";
          const parentLastName = pParts.slice(1).join(" ") || "Parent";

          let studentInfo: any = undefined;
          if (input.studentName) {
            const sParts = input.studentName.trim().split(/\s+/);
            studentInfo = {
              firstName: sParts[0] || "Student",
              lastName: sParts.slice(1).join(" ") || parentLastName,
              gradeLevel: input.studentGrade,
            };
          }

          const identity = await resolveOrCreateFamilyIdentity({
            parent: {
              firstName: parentFirstName,
              lastName: parentLastName,
              phone: input.parentPhone,
            },
            student: studentInfo,
            leadSource: input.source || "Manual Entry",
            ownerId: ctx.user.id,
          });

          contactId = identity.parentContactId;

          // If an existing open lead was resolved for this family, update it and return it
          if (identity.leadId) {
            await db.updateLead(identity.leadId, ctx.user.id, {
              ...input,
              contactId,
            });
            return { id: identity.leadId };
          }
        }

        return await db.createLead({
          ...input,
          contactId,
        }, ctx.user.id);
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          contactId: z.number().optional(),
          source: z.string().optional(),
          status: leadStatusEnum.optional(),
          value: z.string().optional(),
          notes: z.string().optional(),
          parentName: z.string().optional(),
          parentPhone: z.string().optional(),
          studentName: z.string().optional(),
          studentAge: z.number().optional(),
          studentGrade: z.string().optional(),
          discoveryCallDate: z.date().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return await db.updateLead(id, ctx.user.id, data);
      }),
  
});

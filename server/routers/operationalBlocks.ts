import { z } from "zod";
import { router, protectedProcedure, publicProcedure, adminProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";

export const operationalBlocksRouter = router({
  // 1. List operational blocks
  list: protectedProcedure
    .input(
      z
        .object({
          startDate: z.union([z.date(), z.string()]).optional(),
          endDate: z.union([z.date(), z.string()]).optional(),
          staffName: z.string().optional(),
          scope: z.string().optional(),
          blockType: z.string().optional(),
          schedulingEffect: z.string().optional(),
          includeArchived: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return await db.listOperationalBlocks(input);
    }),

  // 2. Get single operational block
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const block = await db.getOperationalBlockById(input.id);
      if (!block) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Operational block not found" });
      }
      return block;
    }),

  // 3. Create a new operational block
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, "Title is required"),
        blockType: z.string().min(1, "Block type is required"),
        categoryFamily: z.enum(["OPERATIONAL_BLOCK", "INFORMATIONAL_EVENT"]).default("OPERATIONAL_BLOCK"),
        schedulingEffect: z.enum(["HARD_BLOCK", "SOFT_BLOCK", "INFORMATIONAL"]).default("HARD_BLOCK"),
        scope: z.enum(["ENTIRE_COMPANY", "TEAM", "SELECTED_EMPLOYEES", "ONE_EMPLOYEE"]).default("ONE_EMPLOYEE"),
        targetStaffIds: z.string().optional(),
        targetStaffNames: z.string().optional(),
        startTime: z.union([z.date(), z.string()]),
        endTime: z.union([z.date(), z.string()]),
        isAllDay: z.boolean().default(false),
        allDayDate: z.string().optional(),
        allDayEndDate: z.string().optional(),
        recurrenceRule: z.enum(["NONE", "DAILY", "WEEKDAYS", "WEEKLY", "SELECTED_DAYS", "MONTHLY", "ANNUALLY"]).default("NONE"),
        recurrenceDays: z.string().optional(),
        recurrenceEndType: z.enum(["NO_END_DATE", "END_ON_DATE", "END_AFTER_COUNT"]).default("NO_END_DATE"),
        recurrenceEndDate: z.string().optional(),
        recurrenceCount: z.number().optional(),
        reason: z.string().optional(),
        notes: z.string().optional(),
        location: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const start = new Date(input.startTime);
      const end = new Date(input.endTime);

      // Check conflicts
      const conflicts = await db.checkOperationalBlockConflicts({
        startTime: start,
        endTime: end,
        scope: input.scope,
        targetStaffNames: input.targetStaffNames,
        targetStaffIds: input.targetStaffIds,
      });

      const block = await db.createOperationalBlock({
        ...input,
        startTime: start,
        endTime: end,
        createdBy: ctx.user.id,
        createdByName: ctx.user.name || "Waypoint Admin",
        isArchived: false,
      });

      return {
        block,
        conflicts,
      };
    }),

  // 4. Update an operational block
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        blockType: z.string().optional(),
        schedulingEffect: z.enum(["HARD_BLOCK", "SOFT_BLOCK", "INFORMATIONAL"]).optional(),
        scope: z.enum(["ENTIRE_COMPANY", "TEAM", "SELECTED_EMPLOYEES", "ONE_EMPLOYEE"]).optional(),
        targetStaffNames: z.string().optional(),
        startTime: z.union([z.date(), z.string()]).optional(),
        endTime: z.union([z.date(), z.string()]).optional(),
        isAllDay: z.boolean().optional(),
        allDayDate: z.string().optional(),
        allDayEndDate: z.string().optional(),
        reason: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updatePayload: any = { ...data };
      if (data.startTime) updatePayload.startTime = new Date(data.startTime);
      if (data.endTime) updatePayload.endTime = new Date(data.endTime);

      return await db.updateOperationalBlock(id, updatePayload);
    }),

  // 5. Delete an operational block
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await db.deleteOperationalBlock(input.id);
    }),

  // 6. Proactive Conflict Check (preview before saving)
  checkConflicts: protectedProcedure
    .input(
      z.object({
        startTime: z.union([z.date(), z.string()]),
        endTime: z.union([z.date(), z.string()]),
        scope: z.string().optional(),
        targetStaffNames: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return await db.checkOperationalBlockConflicts({
        startTime: new Date(input.startTime),
        endTime: new Date(input.endTime),
        scope: input.scope,
        targetStaffNames: input.targetStaffNames,
      });
    }),

  // 7. Check Operational Availability for an Advocate
  checkAvailability: protectedProcedure
    .input(
      z.object({
        startTime: z.union([z.date(), z.string()]),
        endTime: z.union([z.date(), z.string()]),
        advocateName: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return await db.checkOperationalAvailability({
        startTime: new Date(input.startTime),
        endTime: new Date(input.endTime),
        advocateName: input.advocateName,
      });
    }),
});

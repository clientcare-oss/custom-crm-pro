import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

export const timeTrackingRouter = router({
  // Log manual time entry
  logManualTime: protectedProcedure
    .input(
      z.object({
        workType: z.string().min(1),
        studentContactId: z.number().optional(),
        familyContactId: z.number().optional(),
        entryDate: z.string().default(() => new Date().toISOString().split("T")[0]),
        durationMinutes: z.number().min(1),
        notes: z.string().optional(),
        relatedRecordType: z.string().optional(),
        relatedRecordId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role === "client") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Client users cannot log advocate time." });
      }
      return await db.logTimeEntry({
        userId: ctx.user.id,
        ...input,
      });
    }),

  // Start live timer
  startTimer: protectedProcedure
    .input(
      z.object({
        workType: z.string().min(1),
        studentContactId: z.number().optional(),
        notes: z.string().optional(),
        relatedRecordType: z.string().optional(),
        relatedRecordId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role === "client") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Client users cannot log advocate time." });
      }
      return await db.startLiveTimer({
        userId: ctx.user.id,
        ...input,
      });
    }),

  // Stop active timer
  stopTimer: protectedProcedure
    .input(
      z.object({
        notes: z.string().optional(),
      }).optional()
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role === "client") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Client users cannot log advocate time." });
      }
      return await db.stopActiveTimer(ctx.user.id, input?.notes);
    }),

  // Get active running timer for current advocate
  getActiveTimer: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role === "client") return null;
    return await db.getActiveTimer(ctx.user.id);
  }),

  // List recent time logs
  getTimeEntries: protectedProcedure
    .input(
      z.object({
        studentContactId: z.number().optional(),
        limit: z.number().optional().default(50),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role === "client") return [];
      return await db.getTimeEntries({
        userId: ctx.user.id,
        studentContactId: input?.studentContactId,
        limit: input?.limit,
      });
    }),
});

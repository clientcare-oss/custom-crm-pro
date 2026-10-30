import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as dbAutomations from "../db/automations";
import { router, requireStaffModule } from "../_core/trpc";

export const automationsRouter = router({
  list: requireStaffModule("automations", "view").query(async () => {
    return await dbAutomations.listAutomations();
  }),

  get: requireStaffModule("automations", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await dbAutomations.getAutomationById(input.id);
    }),

  delete: requireStaffModule("automations", "edit")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await dbAutomations.deleteAutomation(input.id);
    }),

  save: requireStaffModule("automations", "edit")
    .input(
      z.object({
        id: z.number().optional(),
        name: z.string().min(1),
        description: z.string().optional(),
        triggerEvent: z.string(),
        isActive: z.boolean(),
        triggerConfig: z.any().optional(),
        steps: z.array(
          z.object({
            type: z.enum(["email", "task", "file"]),
            title: z.string().min(1),
            delayValue: z.number(),
            delayUnit: z.string(),
            delayAnchor: z.string(),
            config: z.any(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      return await dbAutomations.saveAutomation(input);
    }),

  toggleActive: requireStaffModule("automations", "edit")
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const existing = await dbAutomations.getAutomationById(input.id);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Automation workflow not found." });
      }
      return await dbAutomations.saveAutomation({
        id: existing.id,
        name: existing.name,
        description: existing.description,
        triggerEvent: existing.triggerEvent,
        isActive: input.isActive,
        triggerConfig: existing.triggerConfig,
        steps: existing.steps,
      });
    }),

  simulate: requireStaffModule("automations", "edit")
    .input(
      z.object({
        triggerEvent: z.string(),
        contactId: z.number(),
        dryRun: z.boolean().default(true),
        eventContext: z
          .object({
            eventKey: z.string().optional(),
            meetingType: z.string().optional(),
            meetingTitle: z.string().optional(),
            eventDate: z.union([z.string(), z.date()]).optional(),
            stageFrom: z.string().optional(),
            stageTo: z.string().optional(),
            tagAdded: z.string().optional(),
            fileName: z.string().optional(),
            forceDuplicate: z.boolean().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await dbAutomations.triggerAutomationFlow(
        input.triggerEvent,
        input.contactId,
        input.dryRun,
        input.eventContext
      );
    }),

  listRuns: requireStaffModule("automations", "view")
    .input(
      z
        .object({
          automationId: z.number().optional(),
          contactId: z.number().optional(),
          status: z.enum(["completed", "failed", "skipped"]).optional(),
          limit: z.number().min(1).max(250).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return await dbAutomations.listAutomationRuns(input);
    }),

  retryRun: requireStaffModule("automations", "edit")
    .input(
      z.object({
        runId: z.number(),
        clearFailureFlags: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await dbAutomations.retryAutomationRun(input.runId, {
          clearFailureFlags: input.clearFailureFlags,
        });
      } catch (err: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err?.message || "Failed to retry automation run.",
        });
      }
    }),
});

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

  stats: requireStaffModule("automations", "view").query(async () => {
    return await dbAutomations.getAutomationStats();
  }),

  smartFileCatalog: requireStaffModule("automations", "view").query(async () => {
    return await dbAutomations.listAvailableSmartFileTemplatesForAutomations();
  }),

  delete: requireStaffModule("automations", "edit")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await dbAutomations.deleteAutomation(input.id);
    }),

  duplicate: requireStaffModule("automations", "edit")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        return await dbAutomations.duplicateAutomation(input.id);
      } catch (err: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err?.message || "Failed to duplicate automation.",
        });
      }
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
      try {
        return await dbAutomations.saveAutomation(input);
      } catch (err: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err?.message || "Failed to save automation configuration.",
        });
      }
    }),

  toggleActive: requireStaffModule("automations", "edit")
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const existing = await dbAutomations.getAutomationById(input.id);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Automation workflow not found." });
      }
      try {
        return await dbAutomations.saveAutomation({
          id: existing.id,
          name: existing.name,
          description: existing.description,
          triggerEvent: existing.triggerEvent,
          isActive: input.isActive,
          triggerConfig: existing.triggerConfig,
          steps: existing.steps,
        });
      } catch (err: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err?.message || "Cannot activate automation due to missing configuration.",
        });
      }
    }),

  simulate: requireStaffModule("automations", "edit")
    .input(
      z.object({
        automationId: z.number().optional(),
        triggerEvent: z.string().optional(),
        contactId: z.number(),
        dryRun: z.boolean().default(true),
        eventContext: z
          .object({
            eventKey: z.string().optional(),
            appointmentId: z.number().optional(),
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
      try {
        if (input.automationId != null) {
          return await dbAutomations.triggerSpecificAutomation(
            input.automationId,
            input.contactId,
            input.dryRun,
            input.eventContext
          );
        }
        return await dbAutomations.triggerAutomationFlow(
          input.triggerEvent || "manual_trigger",
          input.contactId,
          input.dryRun,
          input.eventContext
        );
      } catch (err: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err?.message || "Simulation failed.",
        });
      }
    }),

  runNow: requireStaffModule("automations", "edit")
    .input(
      z.object({
        automationId: z.number(),
        contactId: z.number(),
        dryRun: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const auto = await dbAutomations.getAutomationById(input.automationId);
      if (!auto) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Automation not found." });
      }
      if (auto.triggerEvent !== "manual_trigger" && !input.dryRun) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Run Now is only available for Manual Trigger automations. Use Test Run (Simulate) to preview event-triggered automations safely.",
        });
      }
      try {
        return await dbAutomations.triggerSpecificAutomation(
          input.automationId,
          input.contactId,
          input.dryRun,
          {
            eventKey: `manual_run:${input.automationId}:${input.contactId}:${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            actorName: ctx.user?.name || "Waypoint Staff",
          }
        );
      } catch (err: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err?.message || "Failed to execute manual automation.",
        });
      }
    }),

  runManualAutomation: requireStaffModule("automations", "edit")
    .input(
      z.object({
        automationId: z.number(),
        contactId: z.number(),
        dryRun: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const auto = await dbAutomations.getAutomationById(input.automationId);
      if (!auto) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Automation not found." });
      }
      if (auto.triggerEvent !== "manual_trigger" && !input.dryRun) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Run Now is only available for Manual Trigger automations. Use Test Run (Simulate) to preview event-triggered automations safely.",
        });
      }
      try {
        return await dbAutomations.triggerSpecificAutomation(
          input.automationId,
          input.contactId,
          input.dryRun,
          {
            eventKey: `manual_run:${input.automationId}:${input.contactId}:${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            actorName: ctx.user?.name || "Waypoint Staff",
          }
        );
      } catch (err: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err?.message || "Failed to execute manual automation.",
        });
      }
    }),

  listRuns: requireStaffModule("automations", "view")
    .input(
      z
        .object({
          automationId: z.number().optional(),
          contactId: z.number().optional(),
          status: z
            .enum([
              "completed",
              "failed",
              "skipped",
              "queued",
              "running",
              "canceled",
              "held_paused",
              "simulated",
            ])
            .optional(),
          limit: z.number().min(1).max(250).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return await dbAutomations.listAutomationRuns(input);
    }),

  listJobs: requireStaffModule("automations", "view")
    .input(
      z
        .object({
          automationId: z.number().optional(),
          runId: z.number().optional(),
          contactId: z.number().optional(),
          status: z
            .enum([
              "queued",
              "processing",
              "completed",
              "failed",
              "skipped",
              "canceled",
              "held_paused",
              "held_overdue",
            ])
            .optional(),
          limit: z.number().min(1).max(250).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return await dbAutomations.listAutomationJobs(input);
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

  cancelRun: requireStaffModule("automations", "edit")
    .input(
      z.object({
        runId: z.number(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await dbAutomations.cancelAutomationRun(input.runId, input.reason);
      } catch (err: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err?.message || "Failed to cancel automation run.",
        });
      }
    }),

  cancelJob: requireStaffModule("automations", "edit")
    .input(
      z.object({
        jobId: z.number(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await dbAutomations.cancelAutomationJob(input.jobId, input.reason);
      } catch (err: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err?.message || "Failed to cancel queued automation step.",
        });
      }
    }),

  resolveHeldJob: requireStaffModule("automations", "edit")
    .input(
      z.object({
        jobId: z.number(),
        action: z.enum(["send_now", "skip", "cancel"]),
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await dbAutomations.resolveHeldAutomationJob(input.jobId, input.action);
      } catch (err: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err?.message || "Failed to resolve held automation step.",
        });
      }
    }),

  processDueJobs: requireStaffModule("automations", "edit")
    .input(
      z
        .object({
          now: z.union([z.string(), z.date()]).optional(),
          limit: z.number().min(1).max(100).optional(),
        })
        .optional()
    )
    .mutation(async ({ input }) => {
      return await dbAutomations.processDueAutomationJobs({
        now: input?.now,
        limit: input?.limit,
      });
    }),

  requestNewTrigger: requireStaffModule("automations", "edit")
    .input(
      z.object({
        description: z.string().optional(),
        requestedTriggerText: z.string().optional(),
        useCaseCategory: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const desc = (input.description || input.requestedTriggerText || "").trim();
      if (desc.length < 3) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Trigger request description must be at least 3 characters.",
        });
      }
      try {
        return await dbAutomations.createAutomationTriggerRequest({
          requestedByUserId: ctx.user?.id ?? null,
          requestedByName: ctx.user?.name || "Waypoint Staff",
          description: desc,
        });
      } catch (err: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err?.message || "Failed to submit trigger request.",
        });
      }
    }),

  listTriggerRequests: requireStaffModule("automations", "view").query(async () => {
    return await dbAutomations.listAutomationTriggerRequests();
  }),
});

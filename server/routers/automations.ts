import { z } from "zod";
import * as dbAutomations from "../db/automations";
import { router, adminProcedure, protectedProcedure } from "../_core/trpc";

export const automationsRouter = router({
  
  list: protectedProcedure.query(async () => {
    return await dbAutomations.listAutomations();
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await dbAutomations.getAutomationById(input.id);
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await dbAutomations.deleteAutomation(input.id);
    }),

  save: adminProcedure
    .input(
      z.object({
        id: z.number().optional(),
        name: z.string().min(1),
        description: z.string().optional(),
        triggerEvent: z.string(),
        isActive: z.boolean(),
        steps: z.array(
          z.object({
            type: z.enum(["email", "task", "file"]),
            title: z.string().min(1),
            delayValue: z.number(),
            delayUnit: z.string(),
            delayAnchor: z.string(),
            config: z.any()
          })
        )
      })
    )
    .mutation(async ({ input }) => {
      return await dbAutomations.saveAutomation(input);
    }),

  simulate: protectedProcedure
    .input(
      z.object({
        triggerEvent: z.string(),
        contactId: z.number(),
        dryRun: z.boolean().default(true)
      })
    )
    .mutation(async ({ input }) => {
      return await dbAutomations.triggerAutomationFlow(input.triggerEvent, input.contactId, input.dryRun);
    })

});

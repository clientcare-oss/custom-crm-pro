import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  deleteMycoSpore,
  listMycoSpores,
  saveMycoConfig,
  type MycoSporeKind,
} from "../db/myco";
import {
  captureCrmSnapshotToMyco,
  getMycoIntegrationOverview,
  processMycoWebhookPayload,
  syncCrmEventToMyco,
} from "../services/mycoService";

const sporeKindSchema = z.enum([
  "architecture",
  "guardrail",
  "decision",
  "discovery",
  "workflow",
  "case_note",
]);

export const mycoRouter = router({
  getStatus: protectedProcedure.query(async () => {
    return await getMycoIntegrationOverview(1);
  }),

  saveConfig: protectedProcedure
    .input(
      z.object({
        enabled: z.boolean().optional(),
        endpointUrl: z.string().max(500).optional(),
        webhookSecret: z.string().max(200).optional(),
        ferpaSanitizeExternal: z.boolean().optional(),
        autoSyncLeads: z.boolean().optional(),
        autoSyncDiscovery: z.boolean().optional(),
        autoSyncCaseCompass: z.boolean().optional(),
        autoSyncMeetings: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await saveMycoConfig(1, input);
    }),

  listSpores: protectedProcedure
    .input(
      z
        .object({
          query: z.string().optional(),
          kind: z.string().optional(),
          limit: z.number().min(1).max(100).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return await listMycoSpores({
        ownerId: 1,
        query: input?.query,
        kind: input?.kind,
        limit: input?.limit ?? 50,
      });
    }),

  createSpore: protectedProcedure
    .input(
      z.object({
        kind: sporeKindSchema.default("discovery"),
        title: z.string().min(2).max(200),
        summary: z.string().min(4).max(4000),
        tags: z.array(z.string()).optional(),
        source: z.string().optional(),
        contactCandidate: z
          .object({
            contactId: z.number().nullable().optional(),
            fullName: z.string().nullable().optional(),
            phone: z.string().nullable().optional(),
            email: z.string().nullable().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const actorName = ctx.user?.name || ctx.user?.email || "Byron Honea";
      return await syncCrmEventToMyco({
        ownerId: 1,
        eventType: `spore.${input.kind}.created`,
        kind: input.kind as MycoSporeKind,
        title: input.title,
        summary: input.summary,
        tags: input.tags && input.tags.length > 0 ? input.tags : ["manual-spore", input.kind],
        author: actorName,
        source: input.source || "PG-014 Myco Console",
        contactCandidate: input.contactCandidate,
      });
    }),

  deleteSpore: protectedProcedure
    .input(z.object({ sporeId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const deleted = await deleteMycoSpore(1, input.sporeId);
      return { ok: deleted };
    }),

  syncCrmSnapshot: protectedProcedure.mutation(async ({ ctx }) => {
    const actorName = ctx.user?.name || ctx.user?.email || "Byron Honea";
    return await captureCrmSnapshotToMyco(1, actorName);
  }),

  simulateWebhook: protectedProcedure
    .input(
      z.object({
        event: z.string().default("spore.created"),
        kind: sporeKindSchema.default("discovery"),
        title: z.string().min(2).max(200),
        summary: z.string().min(4).max(2000),
        tags: z.array(z.string()).optional(),
        contactName: z.string().optional(),
        contactPhone: z.string().optional(),
        contactEmail: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const body = {
        event: input.event,
        spore: {
          kind: input.kind,
          title: input.title,
          summary: input.summary,
          tags: input.tags || ["webhook-test", input.kind],
          source: "myco-webhook-simulator",
          author: "Myco Collective Daemon",
        },
        contact: {
          fullName: input.contactName || undefined,
          phone: input.contactPhone || undefined,
          email: input.contactEmail || undefined,
        },
      };
      const rawBody = JSON.stringify(body);
      return await processMycoWebhookPayload({
        ownerId: 1,
        rawBody,
        body,
        skipAuthCheck: true,
      });
    }),
});


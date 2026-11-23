import { z } from "zod";
import * as db from "../db";
import { eq, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, requireStaffModule } from "../_core/trpc";
import {
  getWorkflowDesignerContextData,
  getCaseWorkflowProgress,
  setCaseGuideStepCompletion,
  submitCaseGateApproval,
  advanceCaseStageWithGates,
} from "../db/workflows";
import { listPipelineStages } from "../db/pipeline";
import {
  buildWorkflowDocumentFromPipelineStages,
  serializeWorkflowDocument,
} from "../../shared/workflowModel";

export const workflowsRouter = router({
  list: requireStaffModule("workflows", "view").query(async () => {
    const database = await db.getDb();
    if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const { workflows } = await import("../../drizzle/schema");
    return await database.select().from(workflows).orderBy(asc(workflows.createdAt));
  }),

  get: requireStaffModule("workflows", "view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { workflows } = await import("../../drizzle/schema");
      const [wf] = await database.select().from(workflows).where(eq(workflows.id, input.id));
      if (!wf) throw new TRPCError({ code: "NOT_FOUND" });
      return wf;
    }),

  create: requireStaffModule("workflows", "edit")
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        category: z.string().optional(),
        color: z.string().optional(),
        canvasData: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { workflows } = await import("../../drizzle/schema");
      const inserted = await database
        .insert(workflows)
        .values({ ...input, createdBy: ctx.user.id })
        .returning({ id: workflows.id });
      const newId = Number(
        inserted?.[0]?.id ??
          (inserted as any)?.lastInsertRowid ??
          (inserted as any)?.meta?.last_row_id
      );
      if (!Number.isFinite(newId)) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to resolve created workflow ID" });
      }
      return { id: newId };
    }),

  /**
   * Creates a new workflow hydrated directly from Waypoint's real configured pipeline stages
   * (zero hardcoded fake clients, zero duplicate pipeline maintenance).
   */
  createFromPipeline: requireStaffModule("workflows", "edit")
    .input(
      z.object({
        title: z.string().min(1).default("Waypoint Advocacy Journey"),
        description: z.string().optional(),
        category: z.string().optional(),
        color: z.string().optional(),
        includeOpportunity: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { workflows } = await import("../../drizzle/schema");
      const pipelineStages = await listPipelineStages();
      const doc = buildWorkflowDocumentFromPipelineStages(pipelineStages, {
        includeOpportunity: input.includeOpportunity,
      });
      const inserted = await database
        .insert(workflows)
        .values({
          title: input.title,
          description:
            input.description ||
            "Unified Waypoint advocacy journey synchronized with live pipeline stages, employee guide steps, approval gates, and automations.",
          category: input.category || "Advocacy Lifecycle",
          color: input.color || "#C9A55A",
          canvasData: serializeWorkflowDocument(doc),
          createdBy: ctx.user.id,
        })
        .returning({ id: workflows.id });
      const newId = Number(
        inserted?.[0]?.id ??
          (inserted as any)?.lastInsertRowid ??
          (inserted as any)?.meta?.last_row_id
      );
      if (!Number.isFinite(newId)) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to resolve created workflow ID" });
      }
      return { id: newId };
    }),

  update: requireStaffModule("workflows", "edit")
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { workflows } = await import("../../drizzle/schema");
      const { id, ...data } = input;
      await database.update(workflows).set(data).where(eq(workflows.id, id));
      return { success: true };
    }),

  delete: requireStaffModule("workflows", "edit")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { workflows } = await import("../../drizzle/schema");
      await database.delete(workflows).where(eq(workflows.id, input.id));
      return { success: true };
    }),

  saveCanvas: requireStaffModule("workflows", "edit")
    .input(
      z.object({
        id: z.number(),
        canvasData: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { workflows } = await import("../../drizzle/schema");
      await database
        .update(workflows)
        .set({ canvasData: input.canvasData })
        .where(eq(workflows.id, input.id));
      return { success: true };
    }),

  /**
   * Read-only contextual CRM data for Monorail & Designer views (zero side effects).
   */
  getContextData: requireStaffModule("workflows", "view").query(async () => {
    return await getWorkflowDesignerContextData();
  }),

  /**
   * Reads saved active case progress (completed guide steps + gate approvals) separately
   * from the reusable workflow definition.
   */
  getCaseProgress: requireStaffModule("workflows", "view")
    .input(z.object({ workflowId: z.number(), contactId: z.number() }))
    .query(async ({ input }) => {
      return await getCaseWorkflowProgress(input.workflowId, input.contactId);
    }),

  /**
   * Marks an employee guide step completed or incomplete for a specific active case.
   */
  toggleCaseGuideStep: requireStaffModule("workflows", "view")
    .input(
      z.object({
        workflowId: z.number(),
        contactId: z.number(),
        stageId: z.string().min(1),
        stepId: z.string().min(1),
        stepTitle: z.string().optional(),
        completed: z.boolean(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await setCaseGuideStepCompletion({
        ...input,
        actorName: ctx.staffAccess?.name || ctx.user.name || "Waypoint Staff",
        actorRole: ctx.staffAccess?.primaryRole || "Advocate",
      });
    }),

  /**
   * Authoritative approval gate sign-off with backend role + required-step enforcement.
   */
  submitGateApproval: requireStaffModule("workflows", "view")
    .input(
      z.object({
        workflowId: z.number(),
        contactId: z.number(),
        gateId: z.string().min(1),
        status: z.enum(["approved", "rejected", "pending"]),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const res = await submitCaseGateApproval({
        ...input,
        actorName: ctx.staffAccess?.name || ctx.user.name || "Waypoint Staff",
        actorRole: ctx.staffAccess?.primaryRole || "Advocate",
        staffAccess: ctx.staffAccess,
      });
      if (!res.success) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: res.error || "Approval gate requirements not met.",
        });
      }
      return res;
    }),

  /**
   * Authoritative backend-enforced stage advancement for a real case.
   * Refuses transition if any approval gate or required step is incomplete.
   */
  advanceCaseStage: requireStaffModule("workflows", "view")
    .input(
      z.object({
        workflowId: z.number(),
        contactId: z.number(),
        fromStageId: z.string().min(1),
        targetStageId: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const res = await advanceCaseStageWithGates({
        ...input,
        actorName: ctx.staffAccess?.name || ctx.user.name || "Waypoint Staff",
        actorRole: ctx.staffAccess?.primaryRole || "Advocate",
      });
      if (!res.allowed) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Transition blocked by approval gate: ${res.blockingReasons.join("; ")}`,
        });
      }
      return res;
    }),
});

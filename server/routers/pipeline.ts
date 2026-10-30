import { z } from "zod";
import { router, staffProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { checkBackendModuleAccess } from "../_core/staffAccess";
import {
  DEFAULT_PIPELINE_STAGES,
  DEFAULT_SAVED_VIEWS,
  listPipelineStages,
  upsertPipelineStage,
  reorderPipelineStages,
  archiveOrDeletePipelineStage,
  listPipelineSavedViews,
  upsertPipelineSavedView,
  deletePipelineSavedView,
  listPipelineCards,
  updatePipelineCardStage,
  assignPipelineCardAdvocate,
  transitionOpportunityToActiveAdvocacy,
} from "../db/pipeline";

function isManagementProfile(profile: any): boolean {
  if (!profile) return false;
  return (
    Boolean(profile.isProtectedOwner) ||
    Boolean(profile.hasAdminAccess) ||
    profile.primaryRole === "management" ||
    (Array.isArray(profile.additionalRoles) &&
      profile.additionalRoles.includes("management"))
  );
}

function assertPipelineViewAccess(profile: any): void {
  if (!profile || !profile.isStaff || profile.accountStatus !== "active") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Staff access is required to view the Advocacy Pipeline.",
    });
  }
  const hasPipeline =
    checkBackendModuleAccess(profile, "advocacy_pipeline") !== "none";
  const hasLeads = checkBackendModuleAccess(profile, "leads") !== "none";
  const hasStudents =
    checkBackendModuleAccess(profile, "students_cases") !== "none";
  const hasContacts = checkBackendModuleAccess(profile, "contacts") !== "none";
  if (
    !hasPipeline &&
    !hasLeads &&
    !hasStudents &&
    !hasContacts &&
    !isManagementProfile(profile)
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to access the Advocacy Pipeline.",
    });
  }
}

function assertPipelineCardEditAccess(profile: any): void {
  assertPipelineViewAccess(profile);
  const canEditPipeline =
    checkBackendModuleAccess(profile, "advocacy_pipeline") === "edit";
  const canEditLeads = checkBackendModuleAccess(profile, "leads") === "edit";
  const canEditStudents =
    checkBackendModuleAccess(profile, "students_cases") === "edit";
  const canEditContacts =
    checkBackendModuleAccess(profile, "contacts") === "edit";
  if (
    !canEditPipeline &&
    !canEditLeads &&
    !canEditStudents &&
    !canEditContacts &&
    !isManagementProfile(profile)
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "You do not have permission to modify pipeline cards or assignments.",
    });
  }
}

function assertManagementStageAccess(profile: any): void {
  if (!isManagementProfile(profile)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Only authorized management can customize pipeline stages or shared team views.",
    });
  }
}

export { DEFAULT_PIPELINE_STAGES, DEFAULT_SAVED_VIEWS };

export const pipelineRouter = router({
  // ── Stages Management ──────────────────────────────────────────────────────
  stages: router({
    list: staffProcedure.query(async ({ ctx }) => {
      assertPipelineViewAccess(ctx.staffAccess);
      return await listPipelineStages();
    }),

    upsert: staffProcedure
      .input(
        z.object({
          id: z.number().optional(),
          name: z.string().min(1),
          order: z.number().optional(),
          accentColor: z.string().optional(),
          iconName: z.string().optional(),
          category: z.string().optional(),
          pipelineGroup: z.enum(["opportunity", "active_project"]).optional(),
          isArchived: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        assertManagementStageAccess(ctx.staffAccess);
        const res = await upsertPipelineStage(input);
        return res.stage;
      }),

    reorder: staffProcedure
      .input(
        z.array(
          z.object({
            id: z.number(),
            order: z.number(),
          })
        )
      )
      .mutation(async ({ ctx, input }) => {
        assertManagementStageAccess(ctx.staffAccess);
        return await reorderPipelineStages(input);
      }),

    archive: staffProcedure
      .input(
        z.object({
          id: z.number(),
          fallbackStageName: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        assertManagementStageAccess(ctx.staffAccess);
        return await archiveOrDeletePipelineStage({
          id: input.id,
          archiveOnly: true,
          fallbackStageName: input.fallbackStageName,
        });
      }),

    delete: staffProcedure
      .input(
        z.object({
          id: z.number(),
          fallbackStageName: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        assertManagementStageAccess(ctx.staffAccess);
        return await archiveOrDeletePipelineStage({
          id: input.id,
          archiveOnly: false,
          fallbackStageName: input.fallbackStageName,
        });
      }),
  }),

  // ── Saved Views Management ─────────────────────────────────────────────────
  views: router({
    list: staffProcedure.query(async ({ ctx }) => {
      assertPipelineViewAccess(ctx.staffAccess);
      return await listPipelineSavedViews(ctx.user.id);
    }),

    upsert: staffProcedure
      .input(
        z.object({
          id: z.number().optional(),
          name: z.string().min(1),
          slug: z.string().optional(),
          filtersJson: z.string(),
          isPinned: z.boolean().optional(),
          isPrivate: z.boolean().optional(),
          order: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        assertPipelineViewAccess(ctx.staffAccess);
        return await upsertPipelineSavedView({
          ...input,
          userId: ctx.user.id,
          userName: ctx.staffAccess?.name || ctx.user.name || "Staff",
        });
      }),

    delete: staffProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        assertPipelineViewAccess(ctx.staffAccess);
        try {
          return await deletePipelineSavedView(
            input.id,
            ctx.user.id,
            isManagementProfile(ctx.staffAccess)
          );
        } catch (err: any) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: err?.message || "Cannot delete this view.",
          });
        }
      }),
  }),

  // ── Kanban & List Cards & Student Workflow ─────────────────────────────────
  cards: router({
    list: staffProcedure
      .input(
        z
          .object({
            advocate: z.string().optional(),
            planTier: z.string().optional(),
            stage: z.string().optional(),
            pipelineGroup: z.enum(["opportunity", "active_project"]).optional(),
            accountStatus: z.string().optional(),
            search: z.string().optional(),
            sortField: z
              .enum(["name", "family", "stage", "lastActivity", "nextDate"])
              .optional(),
            sortDirection: z.enum(["asc", "desc"]).optional(),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        assertPipelineViewAccess(ctx.staffAccess);
        return await listPipelineCards(input);
      }),

    updateStage: staffProcedure
      .input(
        z.object({
          contactId: z.number(),
          stage: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        assertPipelineCardEditAccess(ctx.staffAccess);
        return await updatePipelineCardStage({
          contactId: input.contactId,
          stage: input.stage,
          actorName: ctx.staffAccess?.name || ctx.user.name || "Byron Honea",
          actorRole: ctx.staffAccess?.primaryRole || "Advocate",
        });
      }),

    assignAdvocate: staffProcedure
      .input(
        z.object({
          contactId: z.number(),
          advocateName: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        assertPipelineCardEditAccess(ctx.staffAccess);
        return await assignPipelineCardAdvocate({
          contactId: input.contactId,
          advocateName: input.advocateName,
          actorName: ctx.staffAccess?.name || ctx.user.name || "Byron Honea",
          actorRole: ctx.staffAccess?.primaryRole || "Advocate",
        });
      }),

    transitionToActiveAdvocacy: staffProcedure
      .input(
        z.object({
          contactId: z.number().optional(),
          studentContactId: z.number().optional(),
          parentContactId: z.number().optional(),
          leadId: z.number().optional(),
          targetStage: z.string().optional(),
          assignedAdvocateName: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        assertPipelineCardEditAccess(ctx.staffAccess);
        return await transitionOpportunityToActiveAdvocacy({
          ...input,
          actorName: ctx.staffAccess?.name || ctx.user.name || "Byron Honea",
        });
      }),
  }),
});

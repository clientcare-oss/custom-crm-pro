import { z } from "zod";
import { router, adminProcedure, publicProcedure } from "../_core/trpc";
import {
  listServices,
  getServiceById,
  getServiceByCode,
  createService,
  updateService,
  duplicateService,
  archiveService,
  restoreService,
  deleteServicePermanent,
  reorderServices,
  listServiceFolders,
  createServiceFolder,
  updateServiceFolder,
  archiveServiceFolder,
  restoreServiceFolder,
  reorderServiceFolders,
  listCatalogEvents,
  recordCatalogEvent,
} from "../db/services";
import {
  getPackageAllowances,
  savePackageAllowances,
  getActiveClientsCountForPackage,
  isPackageConfigured,
} from "../db/planMatrix";

// ─── Folders (Categories) Router ──────────────────────────────────────────────

const foldersRouter = router({
  list: adminProcedure
    .input(z.object({ includeArchived: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = (ctx.user as any)?.organizationId ?? 1;
      return await listServiceFolders(orgId, input?.includeArchived ?? false);
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        slug: z.string().optional(),
        description: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx.user as any)?.organizationId ?? 1;
      const actor = ctx.user?.name || ctx.user?.email || "Admin";
      return await createServiceFolder(
        {
          organizationId: orgId,
          ownerId: ctx.user?.id || 1,
          name: input.name,
          slug: input.slug,
          description: input.description,
          icon: input.icon ?? "folder",
          color: input.color ?? "blue",
          sortOrder: input.sortOrder ?? 0,
        },
        actor
      );
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        slug: z.string().optional(),
        description: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const actor = ctx.user?.name || ctx.user?.email || "Admin";
      const { id, ...data } = input;
      return await updateServiceFolder(id, data, actor);
    }),

  rename: adminProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1), color: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const actor = ctx.user?.name || ctx.user?.email || "Admin";
      return await updateServiceFolder(input.id, { name: input.name, color: input.color }, actor);
    }),

  archive: adminProcedure
    .input(
      z.object({
        id: z.number(),
        moveServicesToFolderId: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const actor = ctx.user?.name || ctx.user?.email || "Admin";
      return await archiveServiceFolder(input.id, input.moveServicesToFolderId ?? null, actor);
    }),

  restore: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const actor = ctx.user?.name || ctx.user?.email || "Admin";
      return await restoreServiceFolder(input.id, actor);
    }),

  reorder: adminProcedure
    .input(z.array(z.object({ id: z.number(), sortOrder: z.number() })))
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx.user as any)?.organizationId ?? 1;
      return await reorderServiceFolders(input, orgId);
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number(), moveServicesToFolderId: z.number().nullable().optional() }))
    .mutation(async ({ ctx, input }) => {
      const actor = ctx.user?.name || ctx.user?.email || "Admin";
      return await archiveServiceFolder(input.id, input.moveServicesToFolderId ?? null, actor);
    }),
});

// ─── Services Router ──────────────────────────────────────────────────────────

export const servicesRouter = router({
  folders: foldersRouter,

  // Public/Shared Catalog procedure for Discovery Call and Client Portal checkout
  publicCatalog: publicProcedure.query(async () => {
    const orgId = 1;
    const folders = await listServiceFolders(orgId, false);
    const services = await listServices({
      organizationId: orgId,
      status: "active",
      includeArchived: false,
    });

    return {
      folders,
      services,
    };
  }),

  // List services with comprehensive search and filters
  list: adminProcedure
    .input(
      z
        .object({
          folderId: z.number().nullable().optional(),
          unfiled: z.boolean().optional(),
          status: z.enum(["all", "active", "inactive", "archived"]).optional(),
          search: z.string().optional(),
          billingType: z.string().optional(),
          availableInPortal: z.boolean().optional(),
          availableInDiscoveryCall: z.boolean().optional(),
          availableInSupportOfferPanel: z.boolean().optional(),
          includeArchived: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const orgId = (ctx.user as any)?.organizationId ?? 1;
      const folderFilter = input?.unfiled ? null : input?.folderId;

      return await listServices({
        organizationId: orgId,
        folderId: folderFilter,
        status: input?.status ?? "active",
        search: input?.search,
        billingType: input?.billingType,
        availableInPortal: input?.availableInPortal,
        availableInDiscoveryCall: input?.availableInDiscoveryCall,
        availableInSupportOfferPanel: input?.availableInSupportOfferPanel,
        includeArchived: input?.includeArchived ?? (input?.status === "archived" || input?.status === "all"),
      });
    }),

  // Get service by ID
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const orgId = (ctx.user as any)?.organizationId ?? 1;
      return await getServiceById(input.id, orgId);
    }),

  // Get service by stable service code
  getByCode: publicProcedure
    .input(z.object({ serviceCode: z.string() }))
    .query(async ({ input }) => {
      return await getServiceByCode(input.serviceCode, 1);
    }),

  // Create service
  create: adminProcedure
    .input(
      z.object({
        serviceCode: z.string().optional(),
        internalName: z.string().optional(),
        clientFacingTitle: z.string().optional(),
        name: z.string().optional(),
        shortDescription: z.string().optional(),
        fullDescription: z.string().optional(),
        internalInstructions: z.string().optional(),
        folderId: z.number().nullable().optional(),
        sortOrder: z.number().optional(),
        icon: z.string().optional(),
        accentColor: z.string().optional(),
        standardPrice: z.number().optional(),
        price: z.number().optional(),
        currency: z.string().optional(),
        billingType: z.string().optional(),
        billingInterval: z.string().nullable().optional(),
        customPriceAllowed: z.boolean().optional(),
        sessionDurationMinutes: z.number().nullable().optional(),
        duration: z.number().nullable().optional(),
        deliveryTimeValue: z.number().nullable().optional(),
        deliveryTimeUnit: z.string().optional(),
        deliveryTimeLabel: z.string().optional(),
        isActive: z.boolean().optional(),
        availableInDiscoveryCall: z.boolean().optional(),
        availableInParentPortal: z.boolean().optional(),
        availableInSupportOfferPanel: z.boolean().optional(),
        availableAsStandalone: z.boolean().optional(),
        availableAsAddOn: z.boolean().optional(),
        visibleToEmployees: z.boolean().optional(),
        planEligibility: z.any().optional(),
        includedItems: z.any().optional(),
        allowDocumentUpload: z.boolean().optional(),
        requireDocumentUpload: z.boolean().optional(),
        requireQuestionnaire: z.boolean().optional(),
        requireAgreement: z.boolean().optional(),
        requirePayment: z.boolean().optional(),
        smartFileTemplateId: z.number().nullable().optional(),
        workflowTemplateId: z.number().nullable().optional(),
        taskTemplateId: z.number().nullable().optional(),
        priorityEnabled: z.boolean().optional(),
        priorityPrice: z.number().nullable().optional(),
        priorityDeliveryTimeValue: z.number().nullable().optional(),
        priorityDeliveryTimeUnit: z.string().nullable().optional(),
        priorityDeliveryTimeLabel: z.string().nullable().optional(),
        priorityDescription: z.string().nullable().optional(),
        isAdvocacyPackage: z.boolean().optional(),
        allowancesLocked: z.boolean().optional(),
        allowancesConfig: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx.user as any)?.organizationId ?? 1;
      const actor = ctx.user?.name || ctx.user?.email || "Admin";
      return await createService(
        {
          ...input,
          organizationId: orgId,
          ownerId: ctx.user?.id || 1,
        },
        actor
      );
    }),

  // Update master service
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        serviceCode: z.string().optional(),
        internalName: z.string().optional(),
        clientFacingTitle: z.string().optional(),
        name: z.string().optional(),
        shortDescription: z.string().nullable().optional(),
        fullDescription: z.string().nullable().optional(),
        internalInstructions: z.string().nullable().optional(),
        folderId: z.number().nullable().optional(),
        sortOrder: z.number().optional(),
        icon: z.string().nullable().optional(),
        accentColor: z.string().nullable().optional(),
        standardPrice: z.number().optional(),
        price: z.number().optional(),
        currency: z.string().optional(),
        billingType: z.string().optional(),
        billingInterval: z.string().nullable().optional(),
        customPriceAllowed: z.boolean().optional(),
        sessionDurationMinutes: z.number().nullable().optional(),
        duration: z.number().nullable().optional(),
        deliveryTimeValue: z.number().nullable().optional(),
        deliveryTimeUnit: z.string().optional(),
        deliveryTimeLabel: z.string().optional(),
        isActive: z.boolean().optional(),
        availableInDiscoveryCall: z.boolean().optional(),
        availableInParentPortal: z.boolean().optional(),
        availableInSupportOfferPanel: z.boolean().optional(),
        availableAsStandalone: z.boolean().optional(),
        availableAsAddOn: z.boolean().optional(),
        visibleToEmployees: z.boolean().optional(),
        planEligibility: z.any().optional(),
        includedItems: z.any().optional(),
        allowDocumentUpload: z.boolean().optional(),
        requireDocumentUpload: z.boolean().optional(),
        requireQuestionnaire: z.boolean().optional(),
        requireAgreement: z.boolean().optional(),
        requirePayment: z.boolean().optional(),
        smartFileTemplateId: z.number().nullable().optional(),
        workflowTemplateId: z.number().nullable().optional(),
        taskTemplateId: z.number().nullable().optional(),
        priorityEnabled: z.boolean().optional(),
        priorityPrice: z.number().nullable().optional(),
        priorityDeliveryTimeValue: z.number().nullable().optional(),
        priorityDeliveryTimeUnit: z.string().nullable().optional(),
        priorityDeliveryTimeLabel: z.string().nullable().optional(),
        priorityDescription: z.string().nullable().optional(),
        isAdvocacyPackage: z.boolean().optional(),
        allowancesLocked: z.boolean().optional(),
        allowancesConfig: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx.user as any)?.organizationId ?? 1;
      const actor = ctx.user?.name || ctx.user?.email || "Admin";
      const { id, ...data } = input;
      return await updateService(id, { ...data, organizationId: orgId }, actor);
    }),

  // Duplicate service
  duplicate: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const actor = ctx.user?.name || ctx.user?.email || "Admin";
      return await duplicateService(input.id, actor);
    }),

  // Move service to folder
  move: adminProcedure
    .input(z.object({ id: z.number(), folderId: z.number().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx.user as any)?.organizationId ?? 1;
      const actor = ctx.user?.name || ctx.user?.email || "Admin";
      return await updateService(input.id, { folderId: input.folderId, organizationId: orgId }, actor);
    }),

  // Soft Archive service
  archive: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const actor = ctx.user?.name || ctx.user?.email || "Admin";
      return await archiveService(input.id, actor);
    }),

  // Restore archived service
  restore: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const actor = ctx.user?.name || ctx.user?.email || "Admin";
      return await restoreService(input.id, actor);
    }),

  // Permanent Delete service (guarded)
  deletePermanent: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const actor = ctx.user?.name || ctx.user?.email || "Admin";
      return await deleteServicePermanent(input.id, actor);
    }),

  // Legacy delete action defaults to safe archive
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const actor = ctx.user?.name || ctx.user?.email || "Admin";
      return await archiveService(input.id, actor);
    }),

  // Reorder services
  reorder: adminProcedure
    .input(z.array(z.object({ id: z.number(), sortOrder: z.number() })))
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx.user as any)?.organizationId ?? 1;
      return await reorderServices(input, orgId);
    }),

  // Audit Events list
  events: adminProcedure
    .input(
      z
        .object({
          serviceId: z.number().optional(),
          folderId: z.number().optional(),
          limit: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return await listCatalogEvents(input?.serviceId, input?.folderId, input?.limit ?? 50);
    }),

  // Seed or Review Default Services (Organization-level idempotent)
  seedDefaults: adminProcedure.mutation(async ({ ctx }) => {
    // Already seeded by migration, verify or record
    const actor = ctx.user?.name || ctx.user?.email || "Admin";
    await recordCatalogEvent({
      organizationId: (ctx.user as any)?.organizationId ?? 1,
      eventType: "defaults_reviewed",
      actor,
      newValues: JSON.stringify({ action: "Review Default Services" }),
    });
    return { success: true, message: "Standard Waypoint services verified." };
  }),

  // Get master package allowances for PG-035 Advocacy Package Editor
  getPackageAllowances: adminProcedure
    .input(
      z.object({
        serviceId: z.number().optional(),
        planKey: z.string().min(1),
        planName: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const res = await getPackageAllowances(input.planKey, input.planName);
      const activeClientsCount = await getActiveClientsCountForPackage(input.planKey);
      return {
        ...res,
        activeClientsCount,
      };
    }),

  // Update master package allowances from PG-035 Advocacy Package Editor
  updatePackageAllowances: adminProcedure
    .input(
      z.object({
        serviceId: z.number().optional(),
        planKey: z.string().min(1),
        planName: z.string().optional(),
        isLocked: z.boolean().default(false),
        applyToActiveClients: z.boolean().default(false),
        allowances: z.array(
          z.object({
            serviceKey: z.string().min(1),
            serviceName: z.string().min(1),
            category: z.enum(["meeting", "advocacy", "review", "document"]).optional(),
            allowanceType: z.enum(["limited", "unlimited", "not_included"]),
            baseAllowance: z.number().int().min(0).default(0),
            trackingMethod: z.enum(["calendar", "timeline", "manual", "connected_tool"]).optional(),
            reserveOnOpen: z.boolean().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const actor = ctx.user?.name || ctx.user?.email || "Admin";
      const result = await savePackageAllowances({
        planKey: input.planKey,
        planName: input.planName,
        isLocked: input.isLocked,
        allowances: input.allowances as any,
        applyToActiveClients: input.applyToActiveClients,
        actor,
      });
      return result;
    }),

  // Get count of active clients for a package (for the Apply Changes modal)
  getActiveClientsCount: adminProcedure
    .input(z.object({ planKey: z.string().min(1) }))
    .query(async ({ input }) => {
      return { count: await getActiveClientsCountForPackage(input.planKey) };
    }),
});

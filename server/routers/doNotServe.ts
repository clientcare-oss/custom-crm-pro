import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, staffProcedure } from "../_core/trpc";
import {
  formatDoNotServeTimestamp,
  normalizeEmailForMatch,
  normalizeFullNameForMatch,
  normalizePhoneForMatch,
  type DoNotServeIdentifierType,
  type DoNotServeSupportingLink,
} from "../../shared/doNotServe";
import {
  getDoNotServeEntryByIdDb,
  listDoNotServeEntriesDb,
} from "../db/doNotServe";
import {
  createDoNotServeEntryDb,
  findDuplicateActiveDoNotServeEntryDb,
} from "../db/doNotServeMutations";
import { addDoNotServeNoteDb } from "../db/doNotServeNotesAndResolutions";
import {
  DO_NOT_SERVE_CHANNEL_CAPABILITIES,
  inspectActiveServicesForContact,
  resolveCrmTimeZone,
  resolveDoNotServePermissions,
  resolvePracticeOrgOwnerId,
  resolveServerEmployeeStamp,
} from "../services/doNotServeService";
import {
  collectContactScopeIdentifiers,
  getActiveContactRestrictionMap,
} from "../services/doNotServeSync";
import {
  doNotServeActionProcedures,
  manualIdentifierInputSchema,
  supportingLinkSchema,
} from "./doNotServeActions";

export const doNotServeRouter = router({
  getContextInfo: staffProcedure.query(({ ctx }) => {
    const permissions = resolveDoNotServePermissions(ctx.staffAccess);
    const stamp = resolveServerEmployeeStamp(ctx);
    const nowIso = new Date().toISOString();
    return {
      permissions,
      crmTimeZone: stamp.timeZone,
      employeeStamp: {
        name: stamp.actorName,
        employeeId: stamp.actorEmployeeId,
        timeZone: stamp.timeZone,
      },
      employeeStampPreview: {
        employeeName: stamp.actorName,
        employeeId: stamp.actorEmployeeId,
        timeZone: stamp.timeZone,
        formattedNow: formatDoNotServeTimestamp(nowIso, stamp.timeZone),
      },
      channels: DO_NOT_SERVE_CHANNEL_CAPABILITIES,
    };
  }),

  getActiveContactFlags: staffProcedure.query(async ({ ctx }) => {
    const ownerId = resolvePracticeOrgOwnerId(ctx);
    return await getActiveContactRestrictionMap(ownerId);
  }),

  list: staffProcedure
    .input(
      z
        .object({
          status: z.enum(["active", "lifted", "all"]).optional().default("active"),
          search: z.string().max(200).optional().default(""),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const perms = resolveDoNotServePermissions(ctx.staffAccess);
      if (!perms.canAccessRegister) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view the Do Not Serve register.",
        });
      }
      const ownerId = resolvePracticeOrgOwnerId(ctx);
      const timeZone = resolveCrmTimeZone(ctx);
      const rows = await listDoNotServeEntriesDb({
        ownerId,
        status: input?.status ?? "active",
        search: input?.search ?? "",
      });
      return {
        rows,
        timeZone,
        permissions: perms,
      };
    }),

  getDetail: staffProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const perms = resolveDoNotServePermissions(ctx.staffAccess);
      if (!perms.canAccessRegister) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to inspect restriction records.",
        });
      }
      const ownerId = resolvePracticeOrgOwnerId(ctx);
      const stamp = resolveServerEmployeeStamp(ctx);
      const timeZone = stamp.timeZone;
      const employeeStamp = {
        name: stamp.actorName,
        employeeId: stamp.actorEmployeeId,
        timeZone,
      };
      const detail = await getDoNotServeEntryByIdDb(input.id, ownerId);
      if (!detail) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Restriction record not found." });
      }

      const activeServices = detail.entry.linkedContactId
        ? await inspectActiveServicesForContact(detail.entry.linkedContactId)
        : {
            hasActiveServices: false,
            upcomingAppointmentsCount: 0,
            activeAgreementsCount: 0,
            portalAccessEnabled: false,
            activeBillingStatus: null,
          };

      if (!perms.canViewSensitiveDetails) {
        return {
          entry: {
            ...detail.entry,
            reasonSummary: "Restricted detail — authorized management or advocate access required.",
            originalReasonSummary:
              "Restricted detail — authorized management or advocate access required.",
            additionalNotes: null,
            supportingLinks: [],
          },
          identifiers: detail.identifiers,
          notes: [],
          auditLog: detail.auditLog.map((a) => ({
            ...a,
            reason: null,
            previousValueJson: null,
            newValueJson: null,
          })),
          resolutions: detail.resolutions.map((r) => ({ ...r, reason: null })),
          activeServices,
          permissions: perms,
          timeZone,
          crmTimeZone: timeZone,
          employeeStamp,
          redactedSensitiveFields: true,
        };
      }

      return {
        ...detail,
        activeServices,
        permissions: perms,
        timeZone,
        crmTimeZone: timeZone,
        employeeStamp,
        redactedSensitiveFields: false,
      };
    }),

  inspectContactBeforeBlacklist: staffProcedure
    .input(
      z.object({
        contactId: z.number().int().positive(),
        appliesTo: z.enum(["individual", "household"]).optional().default("individual"),
      })
    )
    .query(async ({ ctx, input }) => {
      const perms = resolveDoNotServePermissions(ctx.staffAccess);
      if (!perms.canAccessRegister) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied." });
      }
      const ownerId = resolvePracticeOrgOwnerId(ctx);
      const scopePreview = await collectContactScopeIdentifiers(input.contactId, "individual");
      const householdPreview = await collectContactScopeIdentifiers(input.contactId, "household");
      const duplicate = await findDuplicateActiveDoNotServeEntryDb({
        ownerId,
        linkedContactId: input.contactId,
        householdAnchorId: scopePreview.householdAnchorId,
        appliesTo: input.appliesTo ?? "individual",
      });
      const activeServices = await inspectActiveServicesForContact(input.contactId);
      const householdContactCount = householdPreview.identifiers.filter(
        (i) => i.identifierType === "household_contact_id"
      ).length;
      return {
        displayName: scopePreview.displayName,
        primaryPhone: scopePreview.primaryPhone,
        primaryEmail: scopePreview.primaryEmail,
        householdAnchorId: scopePreview.householdAnchorId,
        householdIdentifierCount: householdPreview.identifiers.length,
        householdMemberCount: Math.max(
          householdContactCount,
          householdPreview.identifiers.length > scopePreview.identifiers.length ? 1 : 0
        ),
        existingActiveEntryId: duplicate?.id ?? null,
        existingActiveEntry: duplicate
          ? {
              id: duplicate.id,
              displayName: duplicate.displayName,
              appliesTo: duplicate.appliesTo,
            }
          : null,
        activeServices,
      };
    }),

  createFromArchive: staffProcedure
    .input(
      z.object({
        contactId: z.number().int().positive(),
        reasonSummary: z.string().trim().min(3, "Reason for restriction is required.").max(500),
        additionalNotes: z.string().max(10000).optional().nullable(),
        appliesTo: z.enum(["individual", "household"]).default("individual"),
        manualAliases: z.array(manualIdentifierInputSchema).max(20).optional().default([]),
        supportingLinks: z.array(supportingLinkSchema).max(20).optional().default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const perms = resolveDoNotServePermissions(ctx.staffAccess);
      if (!perms.canManageRestrictions) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to add Do Not Serve restrictions.",
        });
      }
      const ownerId = resolvePracticeOrgOwnerId(ctx);
      const stamp = resolveServerEmployeeStamp(ctx);
      const scopeData = await collectContactScopeIdentifiers(input.contactId, input.appliesTo);

      const duplicate = await findDuplicateActiveDoNotServeEntryDb({
        ownerId,
        linkedContactId: input.contactId,
        householdAnchorId: scopeData.householdAnchorId,
        appliesTo: input.appliesTo,
      });
      if (duplicate) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `An active restriction already exists for ${duplicate.displayName}. Open that record to review or update it.`,
        });
      }

      const identifiers = [...scopeData.identifiers];
      for (const extra of input.manualAliases) {
        const norm =
          extra.identifierType === "phone"
            ? normalizePhoneForMatch(extra.rawValue)
            : extra.identifierType === "email"
              ? normalizeEmailForMatch(extra.rawValue)
              : normalizeFullNameForMatch(extra.rawValue);
        if (norm) {
          identifiers.push({
            identifierType: extra.identifierType,
            rawValue: extra.rawValue,
            normalizedValue: norm,
            label: extra.label ?? null,
            isAutoSynced: false,
          });
        }
      }

      const nowIso = new Date().toISOString();
      const stampedLinks: DoNotServeSupportingLink[] = input.supportingLinks.map((l, idx) => ({
        id: l.id || `lnk_${Date.now()}_${idx}`,
        label: l.label,
        url: l.url,
        addedByName: stamp.actorName,
        addedAt: nowIso,
      }));

      const cleanNotes = input.additionalNotes?.trim() || null;
      const entryId = await createDoNotServeEntryDb({
        ownerId,
        appliesTo: input.appliesTo,
        sourceType: "archive",
        linkedContactId: input.contactId,
        householdAnchorId: scopeData.householdAnchorId,
        displayName: scopeData.displayName,
        normalizedFullName: normalizeFullNameForMatch(scopeData.displayName),
        primaryPhone: scopeData.primaryPhone,
        normalizedPrimaryPhone: normalizePhoneForMatch(scopeData.primaryPhone),
        primaryEmail: scopeData.primaryEmail,
        normalizedPrimaryEmail: normalizeEmailForMatch(scopeData.primaryEmail),
        reasonSummary: input.reasonSummary.trim(),
        additionalNotes: cleanNotes,
        supportingLinks: stampedLinks,
        identifiers,
        actor: stamp,
        nowIso,
      });

      if (cleanNotes) {
        await addDoNotServeNoteDb({
          entryId,
          ownerId,
          body: cleanNotes,
          actor: stamp,
        });
      }

      const activeServices = await inspectActiveServicesForContact(input.contactId);
      const detail = await getDoNotServeEntryByIdDb(entryId, ownerId);
      return {
        entryId,
        entry: detail?.entry ?? null,
        activeServices,
        stampedAtFormatted: formatDoNotServeTimestamp(nowIso, stamp.timeZone),
      };
    }),

  createManual: staffProcedure
    .input(
      z.object({
        displayName: z.string().trim().min(2, "Name is required.").max(200),
        primaryPhone: z.string().trim().max(60).optional().nullable(),
        primaryEmail: z.string().trim().max(200).optional().nullable(),
        reasonSummary: z.string().trim().min(3, "Reason for restriction is required.").max(500),
        additionalNotes: z.string().max(10000).optional().nullable(),
        appliesTo: z.enum(["individual", "household"]).default("individual"),
        manualAliases: z.array(manualIdentifierInputSchema).max(20).optional().default([]),
        supportingLinks: z.array(supportingLinkSchema).max(20).optional().default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const perms = resolveDoNotServePermissions(ctx.staffAccess);
      if (!perms.canManageRestrictions) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to add Do Not Serve restrictions.",
        });
      }
      const ownerId = resolvePracticeOrgOwnerId(ctx);
      const stamp = resolveServerEmployeeStamp(ctx);

      const cleanPhone = input.primaryPhone?.trim() || null;
      const cleanEmail = input.primaryEmail?.trim() || null;
      const normPhone = normalizePhoneForMatch(cleanPhone);
      const normEmail = normalizeEmailForMatch(cleanEmail);
      const normName = normalizeFullNameForMatch(input.displayName);

      if (cleanPhone && !normPhone) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Enter a valid full phone number (at least 7 digits).",
        });
      }
      if (cleanEmail && !normEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Enter a valid email address.",
        });
      }
      if (!normPhone && !normEmail && !normName) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Provide at least one useful matching identifier (a full first and last name, a full phone number, or an email address).",
        });
      }

      const duplicate = await findDuplicateActiveDoNotServeEntryDb({
        ownerId,
        appliesTo: input.appliesTo,
        normalizedPhone: normPhone,
        normalizedEmail: normEmail,
        normalizedFullName: normName,
      });
      if (duplicate) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `An active restriction already exists for ${duplicate.displayName}. Open that record to review or update it.`,
        });
      }

      const identifiers: Array<{
        identifierType: DoNotServeIdentifierType;
        rawValue: string;
        normalizedValue: string;
        label: string | null;
        isAutoSynced: boolean;
      }> = [];

      if (normPhone && cleanPhone) {
        identifiers.push({
          identifierType: "phone",
          rawValue: cleanPhone,
          normalizedValue: normPhone,
          label: "Primary phone",
          isAutoSynced: false,
        });
      }
      if (normEmail && cleanEmail) {
        identifiers.push({
          identifierType: "email",
          rawValue: cleanEmail,
          normalizedValue: normEmail,
          label: "Primary email",
          isAutoSynced: false,
        });
      }
      if (normName) {
        identifiers.push({
          identifierType: "full_name",
          rawValue: input.displayName.trim(),
          normalizedValue: normName,
          label: "Full name",
          isAutoSynced: false,
        });
      }
      for (const extra of input.manualAliases) {
        const norm =
          extra.identifierType === "phone"
            ? normalizePhoneForMatch(extra.rawValue)
            : extra.identifierType === "email"
              ? normalizeEmailForMatch(extra.rawValue)
              : normalizeFullNameForMatch(extra.rawValue);
        if (norm) {
          identifiers.push({
            identifierType: extra.identifierType,
            rawValue: extra.rawValue,
            normalizedValue: norm,
            label: extra.label ?? null,
            isAutoSynced: false,
          });
        }
      }

      const nowIso = new Date().toISOString();
      const stampedLinks: DoNotServeSupportingLink[] = input.supportingLinks.map((l, idx) => ({
        id: l.id || `lnk_${Date.now()}_${idx}`,
        label: l.label,
        url: l.url,
        addedByName: stamp.actorName,
        addedAt: nowIso,
      }));
      const cleanNotes = input.additionalNotes?.trim() || null;

      const entryId = await createDoNotServeEntryDb({
        ownerId,
        appliesTo: input.appliesTo,
        sourceType: "manual",
        linkedContactId: null,
        householdAnchorId: null,
        displayName: input.displayName.trim(),
        normalizedFullName: normName,
        primaryPhone: cleanPhone,
        normalizedPrimaryPhone: normPhone,
        primaryEmail: cleanEmail,
        normalizedPrimaryEmail: normEmail,
        reasonSummary: input.reasonSummary.trim(),
        additionalNotes: cleanNotes,
        supportingLinks: stampedLinks,
        identifiers,
        actor: stamp,
        nowIso,
      });

      if (cleanNotes) {
        await addDoNotServeNoteDb({
          entryId,
          ownerId,
          body: cleanNotes,
          actor: stamp,
        });
      }

      const detail = await getDoNotServeEntryByIdDb(entryId, ownerId);
      return {
        entryId,
        entry: detail?.entry ?? null,
        stampedAtFormatted: formatDoNotServeTimestamp(nowIso, stamp.timeZone),
      };
    }),

  ...doNotServeActionProcedures,
});

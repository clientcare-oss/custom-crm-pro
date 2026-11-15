import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { staffProcedure } from "../_core/trpc";
import {
  normalizeEmailForMatch,
  normalizeFullNameForMatch,
  normalizePhoneForMatch,
} from "../../shared/doNotServe";
import { getDoNotServeEntryByIdDb } from "../db/doNotServe";
import {
  liftDoNotServeEntryDb,
  reactivateDoNotServeEntryDb,
  updateDoNotServeEntryDb,
} from "../db/doNotServeMutations";
import {
  addDoNotServeNoteDb,
  correctDoNotServeNoteDb,
  markDoNotServeAlertSeenDb,
  recordDoNotServeResolutionDb,
} from "../db/doNotServeNotesAndResolutions";
import {
  evaluateDoNotServeBatch,
  evaluateDoNotServeCandidate,
  resolveDoNotServePermissions,
  resolvePracticeOrgOwnerId,
  resolveServerEmployeeStamp,
} from "../services/doNotServeService";
import { mergeContactsPreservingDoNotServe } from "../services/doNotServeSync";

export const supportingLinkSchema = z.object({
  id: z.string().max(80).optional().default(""),
  label: z.string().trim().min(1).max(160),
  url: z.string().trim().min(1).max(600),
  addedByName: z.string().optional().default(""),
  addedBy: z.string().optional(),
  addedAt: z.string().optional().default(""),
});

export const manualIdentifierInputSchema = z.object({
  identifierType: z.enum(["phone", "email", "alias_name"]),
  rawValue: z.string().trim().min(1).max(200),
  label: z.string().trim().max(100).nullable().optional(),
});

export const doNotServeActionProcedures = {
  undoCreate: staffProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        expectedVersion: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const perms = resolveDoNotServePermissions(ctx.staffAccess);
      const ownerId = resolvePracticeOrgOwnerId(ctx);
      const stamp = resolveServerEmployeeStamp(ctx);

      const existing = await getDoNotServeEntryByIdDb(input.id, ownerId);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Restriction record not found." });
      }
      const isCreatorRecent =
        existing.entry.createdByUserId === stamp.actorUserId &&
        Date.now() - new Date(existing.entry.createdAt).getTime() <= 15 * 60 * 1000;

      if (!perms.canLiftOrOverride && !(perms.canManageRestrictions && isCreatorRecent)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to reverse this restriction.",
        });
      }

      const updated = await liftDoNotServeEntryDb({
        id: input.id,
        ownerId,
        reason: "Added in error",
        isUndo: true,
        expectedVersion: input.expectedVersion,
        actor: stamp,
      });
      return { entry: updated };
    }),

  updateEntry: staffProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        expectedVersion: z.number().int().positive().optional(),
        displayName: z.string().trim().min(2).max(200).optional(),
        primaryPhone: z.string().trim().max(60).nullable().optional(),
        primaryEmail: z.string().trim().max(200).nullable().optional(),
        reasonSummary: z.string().trim().min(3).max(500).optional(),
        appliesTo: z.enum(["individual", "household"]).optional(),
        supportingLinks: z.array(supportingLinkSchema).max(20).optional(),
        manualAliases: z.array(manualIdentifierInputSchema).max(20).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const perms = resolveDoNotServePermissions(ctx.staffAccess);
      if (!perms.canManageRestrictions) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to edit Do Not Serve records.",
        });
      }
      const ownerId = resolvePracticeOrgOwnerId(ctx);
      const stamp = resolveServerEmployeeStamp(ctx);
      const nowIso = new Date().toISOString();

      let manualIdentifiers:
        | Array<{
            identifierType: "phone" | "email" | "alias_name";
            rawValue: string;
            normalizedValue: string;
            label: string | null;
          }>
        | undefined;

      if (input.manualAliases !== undefined) {
        manualIdentifiers = [];
        for (const extra of input.manualAliases) {
          const norm =
            extra.identifierType === "phone"
              ? normalizePhoneForMatch(extra.rawValue)
              : extra.identifierType === "email"
                ? normalizeEmailForMatch(extra.rawValue)
                : normalizeFullNameForMatch(extra.rawValue);
          if (norm) {
            manualIdentifiers.push({
              identifierType: extra.identifierType,
              rawValue: extra.rawValue,
              normalizedValue: norm,
              label: extra.label ?? null,
            });
          }
        }
      }

      const stampedLinks = input.supportingLinks?.map((l, idx) => ({
        id: l.id || `lnk_${Date.now()}_${idx}`,
        label: l.label,
        url: l.url,
        addedByName: l.addedByName || l.addedBy || stamp.actorName,
        addedAt: l.addedAt || nowIso,
      }));

      const updated = await updateDoNotServeEntryDb({
        id: input.id,
        ownerId,
        expectedVersion: input.expectedVersion,
        displayName: input.displayName,
        primaryPhone: input.primaryPhone,
        primaryEmail: input.primaryEmail,
        reasonSummary: input.reasonSummary,
        appliesTo: input.appliesTo,
        supportingLinks: stampedLinks,
        manualIdentifiers,
        actor: stamp,
      });

      if (input.appliesTo && updated.linkedContactId) {
        const { syncContactWithDoNotServe } = await import("../services/doNotServeSync");
        await syncContactWithDoNotServe({
          contactId: updated.linkedContactId,
          ownerId,
          actor: stamp,
        });
      }

      return { entry: updated };
    }),

  addNote: staffProcedure
    .input(
      z.object({
        entryId: z.number().int().positive(),
        body: z.string().trim().min(1, "Note cannot be empty.").max(10000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const perms = resolveDoNotServePermissions(ctx.staffAccess);
      if (!perms.canManageRestrictions) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to add notes to Do Not Serve records.",
        });
      }
      const ownerId = resolvePracticeOrgOwnerId(ctx);
      const stamp = resolveServerEmployeeStamp(ctx);
      const noteId = await addDoNotServeNoteDb({
        entryId: input.entryId,
        ownerId,
        body: input.body,
        actor: stamp,
      });
      return { noteId };
    }),

  correctNote: staffProcedure
    .input(
      z.object({
        entryId: z.number().int().positive(),
        noteId: z.number().int().positive(),
        body: z.string().trim().min(1).max(10000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const perms = resolveDoNotServePermissions(ctx.staffAccess);
      if (!perms.canManageRestrictions) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to edit notes.",
        });
      }
      const ownerId = resolvePracticeOrgOwnerId(ctx);
      const stamp = resolveServerEmployeeStamp(ctx);
      await correctDoNotServeNoteDb({
        entryId: input.entryId,
        noteId: input.noteId,
        ownerId,
        body: input.body,
        actor: stamp,
      });
      return { success: true };
    }),

  lift: staffProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        reason: z.string().trim().min(3, "Reversal reason is required.").max(1000),
        expectedVersion: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const perms = resolveDoNotServePermissions(ctx.staffAccess);
      if (!perms.canLiftOrOverride) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Only practice owners or authorized administrators can lift a Do Not Serve restriction.",
        });
      }
      const ownerId = resolvePracticeOrgOwnerId(ctx);
      const stamp = resolveServerEmployeeStamp(ctx);
      const updated = await liftDoNotServeEntryDb({
        id: input.id,
        ownerId,
        reason: input.reason,
        expectedVersion: input.expectedVersion,
        actor: stamp,
      });
      return { entry: updated };
    }),

  reactivate: staffProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        reason: z.string().trim().min(3, "Reactivation reason is required.").max(1000),
        expectedVersion: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const perms = resolveDoNotServePermissions(ctx.staffAccess);
      if (!perms.canLiftOrOverride) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Only practice owners or authorized administrators can reactivate a Do Not Serve restriction.",
        });
      }
      const ownerId = resolvePracticeOrgOwnerId(ctx);
      const stamp = resolveServerEmployeeStamp(ctx);
      const updated = await reactivateDoNotServeEntryDb({
        id: input.id,
        ownerId,
        reason: input.reason,
        expectedVersion: input.expectedVersion,
        actor: stamp,
      });
      return { entry: updated };
    }),

  evaluateCandidate: staffProcedure
    .input(
      z.object({
        contactId: z.number().int().positive().nullable().optional(),
        contactIds: z.array(z.number().int().positive()).optional().default([]),
        phone: z.string().nullable().optional(),
        phones: z.array(z.string()).optional().default([]),
        email: z.string().nullable().optional(),
        emails: z.array(z.string()).optional().default([]),
        fullName: z.string().nullable().optional(),
        names: z.array(z.string()).optional().default([]),
        aliases: z.array(z.string()).optional().default([]),
        channel: z.string().max(60).optional(),
        targetEntityType: z.string().max(60).optional(),
        targetEntityId: z.string().max(120).optional(),
        eventScopeKey: z.string().max(200).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const ownerId = resolvePracticeOrgOwnerId(ctx);
      const mergedContactIds = [
        ...(input.contactId && input.contactId > 0 ? [input.contactId] : []),
        ...input.contactIds,
      ];
      const mergedPhones = [...(input.phone ? [input.phone] : []), ...input.phones];
      const mergedEmails = [...(input.email ? [input.email] : []), ...input.emails];
      const mergedNames = [
        ...(input.fullName ? [input.fullName] : []),
        ...input.names,
        ...input.aliases,
      ];
      return await evaluateDoNotServeCandidate({
        contactIds: mergedContactIds,
        phones: mergedPhones,
        emails: mergedEmails,
        names: mergedNames,
        targetEntityType: input.targetEntityType || input.channel,
        targetEntityId: input.targetEntityId,
        eventScopeKey: input.eventScopeKey,
        ownerId,
        staffUserId: ctx.user?.id,
      });
    }),

  evaluateBatch: staffProcedure
    .input(
      z.object({
        items: z
          .array(
            z.object({
              key: z.string().min(1).max(120),
              contactIds: z.array(z.number().int().positive()).optional(),
              phones: z.array(z.string()).optional(),
              emails: z.array(z.string()).optional(),
              names: z.array(z.string()).optional(),
              targetEntityType: z.string().optional(),
              targetEntityId: z.string().optional(),
            })
          )
          .max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ownerId = resolvePracticeOrgOwnerId(ctx);
      return await evaluateDoNotServeBatch(
        input.items.map((i) => ({ ...i, staffUserId: ctx.user?.id })),
        ownerId
      );
    }),

  acknowledgeAlert: staffProcedure
    .input(
      z.object({
        eventKey: z.string().min(1).max(300),
        entryId: z.number().int().positive().optional(),
        entryIds: z.array(z.number().int().positive()).optional().default([]),
        targetEntityType: z.string().max(60).optional().default("inquiry"),
        targetEntityId: z.string().max(120).optional().default("unknown"),
        identifierFingerprint: z.string().max(500).optional().default(""),
        channel: z.string().max(60).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ids = Array.from(
        new Set([...(input.entryId ? [input.entryId] : []), ...input.entryIds])
      );
      if (ids.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "At least one entry ID is required." });
      }
      const ownerId = resolvePracticeOrgOwnerId(ctx);
      const stamp = resolveServerEmployeeStamp(ctx);
      for (const entryId of ids) {
        await markDoNotServeAlertSeenDb({
          ownerId,
          staffUserId: stamp.actorUserId,
          eventKey: input.eventKey,
          entryId,
          dismissedAction: "acknowledged",
        });
        await recordDoNotServeResolutionDb({
          entryId,
          ownerId,
          targetEntityType: input.targetEntityType,
          targetEntityId: input.targetEntityId,
          resolutionType: "acknowledged",
          identifierFingerprint: input.identifierFingerprint,
          channel: input.channel ?? null,
          actor: stamp,
        });
      }
      return { acknowledged: true };
    }),

  resolveDifferentPerson: staffProcedure
    .input(
      z.object({
        entryId: z.number().int().positive().optional(),
        entryIds: z.array(z.number().int().positive()).optional().default([]),
        targetEntityType: z.string().min(1).max(60),
        targetEntityId: z.string().min(1).max(120),
        identifierFingerprint: z.string().min(1).max(500),
        eventKey: z.string().max(300).optional(),
        reason: z
          .string()
          .trim()
          .min(3, "Briefly explain how you verified this is a different person.")
          .max(1000),
        channel: z.string().max(60).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ids = Array.from(
        new Set([...(input.entryId ? [input.entryId] : []), ...input.entryIds])
      );
      if (ids.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "At least one entry ID is required." });
      }
      const ownerId = resolvePracticeOrgOwnerId(ctx);
      const stamp = resolveServerEmployeeStamp(ctx);
      for (const entryId of ids) {
        await recordDoNotServeResolutionDb({
          entryId,
          ownerId,
          targetEntityType: input.targetEntityType,
          targetEntityId: input.targetEntityId,
          resolutionType: "different_person",
          identifierFingerprint: input.identifierFingerprint,
          reason: input.reason,
          channel: input.channel ?? null,
          actor: stamp,
        });
        if (input.eventKey) {
          await markDoNotServeAlertSeenDb({
            ownerId,
            staffUserId: stamp.actorUserId,
            eventKey: input.eventKey,
            entryId,
            dismissedAction: "different_person",
          });
        }
      }
      return { resolved: true };
    }),

  recordServiceOverride: staffProcedure
    .input(
      z.object({
        entryIds: z.array(z.number().int().positive()).min(1),
        targetEntityType: z.string().min(1).max(60),
        targetEntityId: z.string().min(1).max(120),
        identifierFingerprint: z.string().min(1).max(500),
        reason: z
          .string()
          .trim()
          .min(5, "Explicit authorization reason is required to override a restriction.")
          .max(1000),
        channel: z.string().max(60).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const perms = resolveDoNotServePermissions(ctx.staffAccess);
      if (!perms.canLiftOrOverride) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Only practice owners or authorized administrators can authorize a service override.",
        });
      }
      const ownerId = resolvePracticeOrgOwnerId(ctx);
      const stamp = resolveServerEmployeeStamp(ctx);
      for (const entryId of input.entryIds) {
        await recordDoNotServeResolutionDb({
          entryId,
          ownerId,
          targetEntityType: input.targetEntityType,
          targetEntityId: input.targetEntityId,
          resolutionType: "service_override",
          identifierFingerprint: input.identifierFingerprint,
          reason: input.reason,
          channel: input.channel ?? null,
          actor: stamp,
        });
      }
      return { overridden: true };
    }),

  mergeContacts: staffProcedure
    .input(
      z.object({
        sourceContactId: z.number().int().positive(),
        targetContactId: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const perms = resolveDoNotServePermissions(ctx.staffAccess);
      if (!perms.canManageRestrictions) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to merge contact records.",
        });
      }
      const ownerId = resolvePracticeOrgOwnerId(ctx);
      const stamp = resolveServerEmployeeStamp(ctx);
      return await mergeContactsPreservingDoNotServe({
        sourceContactId: input.sourceContactId,
        targetContactId: input.targetContactId,
        ownerId,
        actor: stamp,
      });
    }),

  filterMarketingRecipients: staffProcedure
    .input(
      z.object({
        recipients: z
          .array(
            z.object({
              key: z.string().max(120).optional(),
              contactId: z.number().int().positive().nullable().optional(),
              contactIds: z.array(z.number().int().positive()).optional(),
              email: z.string().nullable().optional(),
              phone: z.string().nullable().optional(),
              fullName: z.string().nullable().optional(),
            })
          )
          .max(1000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const perms = resolveDoNotServePermissions(ctx.staffAccess);
      if (!perms.canAccessRegister) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to evaluate Do Not Serve marketing recipients.",
        });
      }
      const ownerId = resolvePracticeOrgOwnerId(ctx);
      const { filterMarketingRecipients } = await import("../services/doNotServeMarketing");
      return await filterMarketingRecipients(input.recipients, ownerId);
    }),
};


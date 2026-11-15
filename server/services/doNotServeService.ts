import { TRPCError } from "@trpc/server";
import {
  buildIdentifierFingerprint,
  normalizeEmailForMatch,
  normalizeFullNameForMatch,
  normalizePhoneForMatch,
  type DoNotServeIdentifierType,
  type DoNotServeMatchedEntrySummary,
  type DoNotServeMatchEvaluation,
  type DoNotServeMatchTier,
} from "../../shared/doNotServe";
import {
  checkBackendActionPermission,
  checkBackendModuleAccess,
  type StaffAccessProfile,
} from "../_core/staffAccess";
import {
  _execDnsSelectInternal,
  getActiveDoNotServeIdentifiersDb,
  type ActiveIdentifierJoinRow,
} from "../db/doNotServe";
import {
  insertDoNotServeAuditDb,
  type DoNotServeActorStamp,
} from "../db/doNotServeMutations";
import {
  getResolutionsForTargetDb,
  hasStaffSeenAlertDb,
} from "../db/doNotServeNotesAndResolutions";
import { loadContactByIdSafe } from "./doNotServeSync";

export interface DoNotServePermissions {
  canAccessRegister: boolean;
  canViewSensitiveDetails: boolean;
  canManageRestrictions: boolean;
  canEdit: boolean;
  canLiftOrOverride: boolean;
  canAcknowledgeOrResolveCandidate: boolean;
}

export const DO_NOT_SERVE_CHANNEL_CAPABILITIES = {
  connectedChannels: [
    {
      id: "call_center",
      label: "Call Center & Quo Webhooks",
      detail:
        "Inbound/outbound call logs and Call Center dialer/workspace in Waypoint CRM (retains call records and flags matches).",
    },
    {
      id: "sms_messages",
      label: "Texts & Client Messages",
      detail:
        "Inbound/outbound Quo SMS logs, Gmail hub threads, and CRM conversation views.",
    },
    {
      id: "lead_forms",
      label: "Lead & Intake Forms",
      detail:
        "Public Lead Forms, Dynamic Intake Forms, and Lead Center inquiries (submissions retained internally; public responses never reveal restriction).",
    },
    {
      id: "marketing_automations",
      label: "Marketing Emails, Automations & Queued Sends",
      detail:
        "Marketing emails, campaigns, review requests, resource outreach, and Waypoint Automation sequences are automatically suppressed/held on active Do Not Serve or blacklisted matches and rechecked immediately before send.",
    },
    {
      id: "contacts_imports",
      label: "Contacts, Imports & Merges",
      detail:
        "Contact creation, CSV/CRM batch imports, Quo contact imports, and duplicate contact merges.",
    },
    {
      id: "service_workflows",
      label: "Booking, Agreements & Enrollment",
      detail:
        "Discovery/appointment booking, agreements/contracts, support offers, and client onboarding conversion.",
    },
  ],
  providerLimitations: [
    "External Quo (OpenPhone) native desktop/mobile apps and direct carrier phone dialers outside Waypoint CRM cannot display Waypoint pop-ups until the call/text webhook reaches Waypoint or staff view/initiate communication inside the CRM.",
    "External third-party email/newsletter tools not routed through Waypoint Automations or CRM Gmail SMTP are not automatically suppressed outside Waypoint.",
  ],
};

export function resolvePracticeOrgOwnerId(ctx?: { user?: any } | number | null): number {
  if (typeof ctx === "number" && ctx > 0) return ctx;
  const explicitOrgId = Number((ctx as any)?.user?.organizationOwnerId || 0);
  if (explicitOrgId > 0) return explicitOrgId;
  return 1;
}

export function resolveCrmTimeZone(ctx?: { user?: any } | null): string {
  const userTz = String(ctx?.user?.timezone || "").trim();
  if (userTz) {
    try {
      Intl.DateTimeFormat("en-US", { timeZone: userTz });
      return userTz;
    } catch {
      // Fallback to practice default
    }
  }
  return "America/New_York";
}

export function resolveServerEmployeeStamp(ctx: {
  user?: any;
  staffAccess?: StaffAccessProfile | null;
}): DoNotServeActorStamp & { timeZone: string } {
  const user = ctx.user;
  const access = ctx.staffAccess;
  if (!user || !access || !access.isStaff || access.accountStatus === "inactive") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Authorized staff authentication is required.",
    });
  }
  const actorName =
    String(access.name || user.name || user.email || `Staff #${user.id}`).trim() ||
    `Staff #${user.id}`;
  return {
    actorUserId: Number(access.userId || user.id),
    actorEmployeeId: access.employeeId || null,
    actorName,
    timeZone: resolveCrmTimeZone(ctx),
  };
}

export function resolveDoNotServePermissions(
  staffAccess?: StaffAccessProfile | null
): DoNotServePermissions {
  if (
    !staffAccess ||
    !staffAccess.isStaff ||
    staffAccess.accountStatus === "inactive" ||
    staffAccess.primaryRole === "none"
  ) {
    return {
      canAccessRegister: false,
      canViewSensitiveDetails: false,
      canManageRestrictions: false,
      canEdit: false,
      canLiftOrOverride: false,
      canAcknowledgeOrResolveCandidate: false,
    };
  }

  const isAdminOrOwner = Boolean(
    staffAccess.isProtectedOwner ||
    staffAccess.hasAdminAccess ||
    staffAccess.primaryRole === "management" ||
    staffAccess.additionalRoles.includes("management")
  );

  const modAccess = checkBackendModuleAccess(staffAccess, "do_not_serve");
  const canAccessRegister = isAdminOrOwner || modAccess !== "none";

  const canViewSensitiveDetails =
    isAdminOrOwner ||
    modAccess === "edit" ||
    checkBackendActionPermission(staffAccess, "view_sensitive_admin");

  const canManageRestrictions =
    isAdminOrOwner ||
    (modAccess === "edit" && checkBackendActionPermission(staffAccess, "edit_clients"));

  const canLiftOrOverride =
    isAdminOrOwner ||
    checkBackendActionPermission(staffAccess, "delete_records") ||
    checkBackendActionPermission(staffAccess, "access_admin_settings");

  return {
    canAccessRegister,
    canViewSensitiveDetails,
    canManageRestrictions,
    canEdit: canManageRestrictions,
    canLiftOrOverride,
    canAcknowledgeOrResolveCandidate: true,
  };
}

export async function inspectActiveServicesForContact(contactId: number): Promise<{
  hasActiveServices: boolean;
  upcomingAppointmentsCount: number;
  activeAgreementsCount: number;
  portalAccessEnabled: boolean;
  activeBillingStatus: string | null;
}> {
  if (!contactId || contactId <= 0) {
    return {
      hasActiveServices: false,
      upcomingAppointmentsCount: 0,
      activeAgreementsCount: 0,
      portalAccessEnabled: false,
      activeBillingStatus: null,
    };
  }

  const contact = await loadContactByIdSafe(contactId);
  const nowSec = Math.floor(Date.now() / 1000);
  const nowIso = new Date().toISOString();

  const [apptRows, contractRows, agreementRows] = await Promise.all([
    _execDnsSelectInternal(
      `SELECT COUNT(*) AS cnt FROM appointments
       WHERE contactId = ? AND COALESCE(status, 'scheduled') NOT IN ('cancelled', 'canceled', 'completed')
         AND (startTime >= ? OR startTime >= ?)`,
      [contactId, nowSec, nowIso]
    ).catch(() => []),
    _execDnsSelectInternal(
      `SELECT COUNT(*) AS cnt FROM contracts
       WHERE contactId = ? AND COALESCE(status, 'draft') IN ('sent', 'signed', 'active')`,
      [contactId]
    ).catch(() => []),
    _execDnsSelectInternal(
      `SELECT COUNT(*) AS cnt FROM client_agreements
       WHERE (parentContactId = ? OR studentContactId = ?)
         AND COALESCE(status, 'draft') IN ('sent', 'partially_signed', 'signed', 'active')`,
      [contactId, contactId]
    ).catch(() => []),
  ]);

  const upcomingAppointmentsCount = Number(apptRows[0]?.cnt || 0);
  const activeAgreementsCount =
    Number(contractRows[0]?.cnt || 0) + Number(agreementRows[0]?.cnt || 0);
  const portalAccessEnabled = Boolean(
    contact &&
    (Number(contact.portalAccess) === 1 ||
      contact.portalAccess === true ||
      Boolean(contact.portalUserId))
  );
  const rawBilling = contact?.billingStatus ? String(contact.billingStatus) : null;
  const activeBillingStatus =
    rawBilling && !["closed", "inactive", "none", "cancelled"].includes(rawBilling.toLowerCase())
      ? rawBilling
      : null;

  const hasActiveServices =
    upcomingAppointmentsCount > 0 ||
    activeAgreementsCount > 0 ||
    portalAccessEnabled ||
    Boolean(activeBillingStatus);

  return {
    hasActiveServices,
    upcomingAppointmentsCount,
    activeAgreementsCount,
    portalAccessEnabled,
    activeBillingStatus,
  };
}

export interface MatchCandidateInput {
  contactIds?: Array<number | null | undefined>;
  phones?: Array<string | null | undefined>;
  emails?: Array<string | null | undefined>;
  names?: Array<string | null | undefined>;
  targetEntityType?: string;
  targetEntityId?: string;
  eventScopeKey?: string;
  staffUserId?: number | null;
  ownerId?: number;
}

function matchCandidateAgainstActiveRows(
  candidate: MatchCandidateInput,
  activeRows: ActiveIdentifierJoinRow[]
): {
  matches: DoNotServeMatchedEntrySummary[];
  identifierFingerprint: string;
} {
  const cIdSet = new Set(
    (candidate.contactIds || [])
      .map((n) => Number(n || 0))
      .filter((n) => Number.isFinite(n) && n > 0)
  );
  const phoneMap = new Map<string, string>();
  for (const p of candidate.phones || []) {
    const norm = normalizePhoneForMatch(p);
    if (norm && p) phoneMap.set(norm, String(p).trim());
  }
  const emailMap = new Map<string, string>();
  for (const e of candidate.emails || []) {
    const norm = normalizeEmailForMatch(e);
    if (norm && e) emailMap.set(norm, String(e).trim());
  }
  const nameMap = new Map<string, string>();
  for (const n of candidate.names || []) {
    const norm = normalizeFullNameForMatch(n);
    if (norm && n) nameMap.set(norm, String(n).trim());
  }

  const identifierFingerprint = buildIdentifierFingerprint({
    contactIds: Array.from(cIdSet),
    phones: Array.from(phoneMap.keys()),
    emails: Array.from(emailMap.keys()),
    names: Array.from(nameMap.keys()),
  });

  const grouped = new Map<number, DoNotServeMatchedEntrySummary>();

  for (const row of activeRows) {
    let matchedValue: string | null = null;
    let tier: DoNotServeMatchTier | null = null;
    let matchLabel = row.label || row.identifierType;

    if (row.identifierType === "contact_id") {
      const idNum = Number(row.normalizedValue);
      if (cIdSet.has(idNum)) {
        matchedValue = `Contact #${idNum}`;
        tier = "hard_match";
        matchLabel = "Linked client record";
      }
    } else if (row.identifierType === "household_contact_id" && row.appliesTo === "household") {
      const idNum = Number(row.normalizedValue);
      if (cIdSet.has(idNum)) {
        matchedValue = `Household member #${idNum}`;
        tier = "hard_match";
        matchLabel = row.label || "Household member";
      }
    } else if (row.identifierType === "phone") {
      if (phoneMap.has(row.normalizedValue)) {
        matchedValue = phoneMap.get(row.normalizedValue) || row.rawValue;
        tier = "hard_match";
        matchLabel = "Phone number";
      }
    } else if (row.identifierType === "email") {
      if (emailMap.has(row.normalizedValue)) {
        matchedValue = emailMap.get(row.normalizedValue) || row.rawValue;
        tier = "hard_match";
        matchLabel = "Email address";
      }
    } else if (row.identifierType === "full_name" || row.identifierType === "alias_name") {
      if (nameMap.has(row.normalizedValue)) {
        // Respect Individual scope: if candidate is a known OTHER CRM contact (e.g. child/sibling/co-parent)
        // with no shared contact_id/phone/email, do not treat a different contact's name match as the restricted individual
        const isKnownDifferentLinkedContact =
          row.appliesTo === "individual" &&
          row.linkedContactId != null &&
          cIdSet.size > 0 &&
          !cIdSet.has(row.linkedContactId);

        if (!isKnownDifferentLinkedContact) {
          matchedValue = nameMap.get(row.normalizedValue) || row.rawValue;
          tier = "possible_name_match";
          matchLabel = row.identifierType === "alias_name" ? "Recorded alias" : "Full name";
        }
      }
    }

    if (!matchedValue || !tier) continue;

    const existing = grouped.get(row.entryId);
    if (!existing) {
      grouped.set(row.entryId, {
        entryId: row.entryId,
        displayName: row.displayName,
        appliesTo: row.appliesTo,
        sourceType: row.sourceType,
        linkedContactId: row.linkedContactId,
        matchTier: tier,
        matchedOn: [{ type: row.identifierType, matchedValue, label: matchLabel }],
        createdAt: row.createdAt,
        createdByName: row.createdByName,
      });
    } else {
      if (tier === "hard_match") {
        existing.matchTier = "hard_match";
      }
      if (!existing.matchedOn.some((m) => m.type === row.identifierType && m.matchedValue === matchedValue)) {
        existing.matchedOn.push({ type: row.identifierType, matchedValue, label: matchLabel });
      }
    }
  }

  const matches = Array.from(grouped.values()).sort((a, b) => {
    if (a.matchTier !== b.matchTier) return a.matchTier === "hard_match" ? -1 : 1;
    return b.entryId - a.entryId;
  });

  return { matches, identifierFingerprint };
}

export async function evaluateDoNotServeCandidate(
  candidate: MatchCandidateInput,
  preloadedActiveRows?: ActiveIdentifierJoinRow[]
): Promise<DoNotServeMatchEvaluation> {
  const ownerId = candidate.ownerId || 1;
  const activeRows = preloadedActiveRows ?? (await getActiveDoNotServeIdentifiersDb(ownerId));

  // Auto-enrich contact phone/email/name/parentContactId when contactIds are supplied
  const enrichedIds = new Set<number>(
    (candidate.contactIds || []).map((n) => Number(n || 0)).filter((n) => n > 0)
  );
  const extraPhones: string[] = [...(candidate.phones || []).filter((x): x is string => Boolean(x))];
  const extraEmails: string[] = [...(candidate.emails || []).filter((x): x is string => Boolean(x))];
  const extraNames: string[] = [...(candidate.names || []).filter((x): x is string => Boolean(x))];

  for (const cId of Array.from(enrichedIds)) {
    const c = await loadContactByIdSafe(cId);
    if (!c) continue;
    if (c.phone) extraPhones.push(String(c.phone));
    if (c.email) extraEmails.push(String(c.email));
    const cName = `${c.firstName || ""} ${c.lastName || ""}`.trim();
    if (cName) extraNames.push(cName);
    // If this contact is a student under a parentContactId, include parentContactId ONLY so Household restrictions on the parent match the student
    // (Individual restrictions on the parent will NOT match because only Household restrictions index household_contact_id, wait:
    // if parent has Individual restriction, parent's contact_id IS in activeRows! So we must NOT add parentContactId to cIdSet directly;
    // instead, Household restrictions already store the student's ID in `household_contact_id`!)
  }

  const { matches, identifierFingerprint } = matchCandidateAgainstActiveRows(
    {
      ...candidate,
      contactIds: Array.from(enrichedIds),
      phones: extraPhones,
      emails: extraEmails,
      names: extraNames,
    },
    activeRows
  );

  const targetType = candidate.targetEntityType || "transient";
  const targetId = candidate.targetEntityId || identifierFingerprint;

  if (matches.length === 0) {
    return {
      hasActiveMatch: false,
      highestTier: null,
      holdsAutomatedSends: false,
      requiresServiceReview: false,
      serviceOverrideActive: false,
      differentPersonResolved: false,
      acknowledgedForCurrentEvent: false,
      shouldShowPopup: false,
      eventKey: `${targetType}:${targetId}:none`,
      identifierFingerprint,
      matches: [],
    };
  }

  const resolutions =
    candidate.targetEntityType && candidate.targetEntityId
      ? await getResolutionsForTargetDb({
        ownerId,
        targetEntityType: candidate.targetEntityType,
        targetEntityId: candidate.targetEntityId,
      })
      : [];

  // Filter out entries resolved as "different_person" ONLY when identifierFingerprint still matches
  const differentPersonEntryIds = new Set(
    resolutions
      .filter(
        (r) =>
          r.resolutionType === "different_person" &&
          r.identifierFingerprint === identifierFingerprint
      )
      .map((r) => r.entryId)
  );

  const unresolvedMatches = matches.filter((m) => !differentPersonEntryIds.has(m.entryId));
  if (unresolvedMatches.length === 0) {
    return {
      hasActiveMatch: false,
      highestTier: null,
      holdsAutomatedSends: false,
      requiresServiceReview: false,
      serviceOverrideActive: false,
      differentPersonResolved: true,
      acknowledgedForCurrentEvent: true,
      shouldShowPopup: false,
      eventKey: `${targetType}:${targetId}:resolved:${identifierFingerprint}`,
      identifierFingerprint,
      matches: [],
    };
  }

  const highestTier: DoNotServeMatchTier = unresolvedMatches.some(
    (m) => m.matchTier === "hard_match"
  )
    ? "hard_match"
    : "possible_name_match";

  const overriddenEntryIds = new Set(
    resolutions
      .filter(
        (r) =>
          r.resolutionType === "service_override" &&
          r.identifierFingerprint === identifierFingerprint
      )
      .map((r) => r.entryId)
  );

  const hardMatches = unresolvedMatches.filter((m) => m.matchTier === "hard_match");
  const allHardMatchesOverridden =
    hardMatches.length > 0 && hardMatches.every((m) => overriddenEntryIds.has(m.entryId));

  const entryIdsKey = unresolvedMatches.map((m) => m.entryId).sort((a, b) => a - b).join(",");
  const scopePart = candidate.eventScopeKey || `${targetType}:${targetId}`;
  const eventKey = `${scopePart}|entries:${entryIdsKey}|fp:${identifierFingerprint}`;

  const acknowledgedForCurrentEvent = candidate.staffUserId
    ? await hasStaffSeenAlertDb(candidate.staffUserId, eventKey)
    : false;

  return {
    hasActiveMatch: true,
    highestTier,
    holdsAutomatedSends: highestTier === "hard_match" && !allHardMatchesOverridden,
    requiresServiceReview: highestTier === "hard_match" && !allHardMatchesOverridden,
    serviceOverrideActive: allHardMatchesOverridden,
    differentPersonResolved: false,
    acknowledgedForCurrentEvent,
    shouldShowPopup: !acknowledgedForCurrentEvent,
    eventKey,
    identifierFingerprint,
    matches: unresolvedMatches,
  };
}

export async function evaluateDoNotServeBatch<T extends { key: string } & MatchCandidateInput>(
  items: T[],
  ownerId: number = 1
): Promise<Record<string, DoNotServeMatchEvaluation>> {
  const activeRows = await getActiveDoNotServeIdentifiersDb(ownerId);
  const out: Record<string, DoNotServeMatchEvaluation> = {};
  for (const item of items) {
    out[item.key] = await evaluateDoNotServeCandidate({ ...item, ownerId }, activeRows);
  }
  return out;
}

export async function checkAndHoldAutomatedSend(params: {
  ownerId?: number;
  channel: string;
  targetEntityType: string;
  targetEntityId: string;
  contactIds?: Array<number | null | undefined>;
  phones?: Array<string | null | undefined>;
  emails?: Array<string | null | undefined>;
  names?: Array<string | null | undefined>;
  description?: string;
}): Promise<{
  hold: boolean;
  evaluation: DoNotServeMatchEvaluation;
}> {
  const ownerId = params.ownerId || 1;
  const evaluation = await evaluateDoNotServeCandidate({
    ownerId,
    contactIds: params.contactIds,
    phones: params.phones,
    emails: params.emails,
    names: params.names,
    targetEntityType: params.targetEntityType,
    targetEntityId: params.targetEntityId,
  });

  if (evaluation.holdsAutomatedSends) {
    for (const m of evaluation.matches.filter((x) => x.matchTier === "hard_match")) {
      await insertDoNotServeAuditDb({
        entryId: m.entryId,
        ownerId,
        action: "automated_send_held",
        summary:
          params.description ||
          `Held automated ${params.channel} send for ${m.displayName} pending authorized review.`,
        channel: params.channel,
        targetEntityType: params.targetEntityType,
        targetEntityId: params.targetEntityId,
        actorName: "Waypoint Matching Guard (Automatic)",
      });
    }
    return { hold: true, evaluation };
  }

  return { hold: false, evaluation };
}

export async function assertAuthorizedServiceProceedOrOverride(params: {
  ctx: { user?: any; staffAccess?: StaffAccessProfile | null };
  channel: string;
  targetEntityType: string;
  targetEntityId: string;
  contactIds?: Array<number | null | undefined>;
  phones?: Array<string | null | undefined>;
  emails?: Array<string | null | undefined>;
  names?: Array<string | null | undefined>;
  overrideReason?: string | null;
}): Promise<DoNotServeMatchEvaluation> {
  const ownerId = resolvePracticeOrgOwnerId(params.ctx);
  const evaluation = await evaluateDoNotServeCandidate({
    ownerId,
    contactIds: params.contactIds,
    phones: params.phones,
    emails: params.emails,
    names: params.names,
    targetEntityType: params.targetEntityType,
    targetEntityId: params.targetEntityId,
    staffUserId: params.ctx.user?.id,
  });

  if (!evaluation.requiresServiceReview) {
    return evaluation;
  }

  const trimmedOverride = (params.overrideReason || "").trim();
  if (!trimmedOverride) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "DO_NOT_SERVE_REVIEW_REQUIRED: This record matches an active Do Not Serve restriction. Authorized review and an explicit override reason are required before proceeding.",
    });
  }

  const perms = resolveDoNotServePermissions(params.ctx.staffAccess);
  if (!perms.canLiftOrOverride) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Only practice owners or authorized administrators can override an active Do Not Serve restriction on service workflows.",
    });
  }

  const stamp = resolveServerEmployeeStamp(params.ctx);
  const { recordDoNotServeResolutionDb } = await import("../db/doNotServeNotesAndResolutions");
  for (const m of evaluation.matches.filter((x) => x.matchTier === "hard_match")) {
    await recordDoNotServeResolutionDb({
      entryId: m.entryId,
      ownerId,
      targetEntityType: params.targetEntityType,
      targetEntityId: params.targetEntityId,
      resolutionType: "service_override",
      identifierFingerprint: evaluation.identifierFingerprint,
      reason: trimmedOverride,
      channel: params.channel,
      actor: stamp,
    });
  }

  return await evaluateDoNotServeCandidate({
    ownerId,
    contactIds: params.contactIds,
    phones: params.phones,
    emails: params.emails,
    names: params.names,
    targetEntityType: params.targetEntityType,
    targetEntityId: params.targetEntityId,
    staffUserId: params.ctx.user?.id,
  });
}

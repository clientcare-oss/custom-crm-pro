import { TRPCError } from "@trpc/server";
import {
  normalizeEmailForMatch,
  normalizeFullNameForMatch,
  normalizePhoneForMatch,
  type DoNotServeAuditAction,
  type DoNotServeIdentifierType,
  type DoNotServeResolutionType,
  type DoNotServeScope,
  type DoNotServeSourceType,
  type DoNotServeSupportingLink,
} from "../../shared/doNotServe";
import {
  _execDnsRunInternal,
  _execDnsSelectInternal,
  _mapDnsEntryRowInternal,
  type DoNotServeEntryRecord,
  type DoNotServeResolutionRecord,
} from "./doNotServe";

export interface DoNotServeActorStamp {
  actorUserId: number;
  actorEmployeeId: string | null;
  actorName: string;
}

export async function findDuplicateActiveDoNotServeEntryDb(params: {
  ownerId: number;
  linkedContactId?: number | null;
  householdAnchorId?: number | null;
  appliesTo: DoNotServeScope;
  normalizedPhone?: string | null;
  normalizedEmail?: string | null;
  normalizedFullName?: string | null;
}): Promise<DoNotServeEntryRecord | null> {
  if (params.linkedContactId) {
    const byContact = await _execDnsSelectInternal(
      `SELECT * FROM do_not_serve_entries
       WHERE owner_id = ? AND status = 'active' AND linked_contact_id = ? LIMIT 1`,
      [params.ownerId, params.linkedContactId]
    );
    if (byContact.length > 0) return _mapDnsEntryRowInternal(byContact[0]);
  }
  if (params.appliesTo === "household" && params.householdAnchorId) {
    const byHousehold = await _execDnsSelectInternal(
      `SELECT * FROM do_not_serve_entries
       WHERE owner_id = ? AND status = 'active' AND applies_to = 'household' AND household_anchor_id = ? LIMIT 1`,
      [params.ownerId, params.householdAnchorId]
    );
    if (byHousehold.length > 0) return _mapDnsEntryRowInternal(byHousehold[0]);
  }
  if (!params.linkedContactId && params.normalizedFullName) {
    if (params.normalizedPhone) {
      const byPhoneAndName = await _execDnsSelectInternal(
        `SELECT * FROM do_not_serve_entries
         WHERE owner_id = ? AND status = 'active' AND normalized_full_name = ? AND normalized_primary_phone = ? LIMIT 1`,
        [params.ownerId, params.normalizedFullName, params.normalizedPhone]
      );
      if (byPhoneAndName.length > 0) return _mapDnsEntryRowInternal(byPhoneAndName[0]);
    }
    if (params.normalizedEmail) {
      const byEmailAndName = await _execDnsSelectInternal(
        `SELECT * FROM do_not_serve_entries
         WHERE owner_id = ? AND status = 'active' AND normalized_full_name = ? AND normalized_primary_email = ? LIMIT 1`,
        [params.ownerId, params.normalizedFullName, params.normalizedEmail]
      );
      if (byEmailAndName.length > 0) return _mapDnsEntryRowInternal(byEmailAndName[0]);
    }
    if (!params.normalizedPhone && !params.normalizedEmail) {
      const byNameOnly = await _execDnsSelectInternal(
        `SELECT * FROM do_not_serve_entries
         WHERE owner_id = ? AND status = 'active' AND linked_contact_id IS NULL
           AND normalized_primary_phone IS NULL AND normalized_primary_email IS NULL
           AND normalized_full_name = ? LIMIT 1`,
        [params.ownerId, params.normalizedFullName]
      );
      if (byNameOnly.length > 0) return _mapDnsEntryRowInternal(byNameOnly[0]);
    }
  }
  return null;
}

export async function insertDoNotServeAuditDb(params: {
  entryId: number;
  ownerId: number;
  action: DoNotServeAuditAction;
  summary: string;
  reason?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  channel?: string | null;
  targetEntityType?: string | null;
  targetEntityId?: string | null;
  actorUserId?: number | null;
  actorEmployeeId?: string | null;
  actorName: string;
  createdAt?: string;
}): Promise<void> {
  const nowIso = params.createdAt || new Date().toISOString();
  await _execDnsRunInternal(
    `INSERT INTO do_not_serve_audit_log
      (entry_id, owner_id, action, summary, reason, previous_value_json, new_value_json, channel, target_entity_type, target_entity_id, actor_user_id, actor_employee_id, actor_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      params.entryId,
      params.ownerId,
      params.action,
      params.summary,
      params.reason ?? null,
      params.previousValue !== undefined ? JSON.stringify(params.previousValue) : null,
      params.newValue !== undefined ? JSON.stringify(params.newValue) : null,
      params.channel ?? null,
      params.targetEntityType ?? null,
      params.targetEntityId ?? null,
      params.actorUserId ?? null,
      params.actorEmployeeId ?? null,
      params.actorName,
      nowIso,
    ]
  );
}

export async function createDoNotServeEntryDb(params: {
  ownerId: number;
  appliesTo: DoNotServeScope;
  sourceType: DoNotServeSourceType;
  linkedContactId: number | null;
  householdAnchorId: number | null;
  displayName: string;
  normalizedFullName: string | null;
  primaryPhone: string | null;
  normalizedPrimaryPhone: string | null;
  primaryEmail: string | null;
  normalizedPrimaryEmail: string | null;
  reasonSummary: string;
  additionalNotes: string | null;
  supportingLinks: DoNotServeSupportingLink[];
  identifiers: Array<{
    identifierType: DoNotServeIdentifierType;
    rawValue: string;
    normalizedValue: string;
    label: string | null;
    isAutoSynced: boolean;
  }>;
  actor: DoNotServeActorStamp;
  nowIso?: string;
}): Promise<number> {
  const nowIso = params.nowIso || new Date().toISOString();
  const res = await _execDnsRunInternal(
    `INSERT INTO do_not_serve_entries
      (owner_id, status, applies_to, source_type, linked_contact_id, household_anchor_id,
       display_name, normalized_full_name, primary_phone, normalized_primary_phone,
       primary_email, normalized_primary_email, reason_summary, original_reason_summary,
       additional_notes, supporting_links_json, created_by_user_id, created_by_employee_id,
       created_by_name, created_at, version, updated_at)
     VALUES (?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      params.ownerId,
      params.appliesTo,
      params.sourceType,
      params.linkedContactId,
      params.householdAnchorId,
      params.displayName,
      params.normalizedFullName,
      params.primaryPhone,
      params.normalizedPrimaryPhone,
      params.primaryEmail,
      params.normalizedPrimaryEmail,
      params.reasonSummary,
      params.reasonSummary,
      params.additionalNotes,
      params.supportingLinks.length > 0 ? JSON.stringify(params.supportingLinks) : null,
      params.actor.actorUserId,
      params.actor.actorEmployeeId,
      params.actor.actorName,
      nowIso,
      nowIso,
    ]
  );

  let entryId = res.insertId;
  if (!entryId) {
    const latest = await _execDnsSelectInternal(
      `SELECT id FROM do_not_serve_entries WHERE owner_id = ? AND created_at = ? ORDER BY id DESC LIMIT 1`,
      [params.ownerId, nowIso]
    );
    entryId = Number(latest[0]?.id || 0);
  }

  const seen = new Set<string>();
  for (const ident of params.identifiers) {
    const key = `${ident.identifierType}::${ident.normalizedValue}`;
    if (!ident.normalizedValue || seen.has(key)) continue;
    seen.add(key);
    await _execDnsRunInternal(
      `INSERT INTO do_not_serve_identifiers
        (entry_id, owner_id, identifier_type, raw_value, normalized_value, label, is_auto_synced, created_at, created_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entryId,
        params.ownerId,
        ident.identifierType,
        ident.rawValue,
        ident.normalizedValue,
        ident.label,
        ident.isAutoSynced ? 1 : 0,
        nowIso,
        params.actor.actorName,
      ]
    );
  }

  await insertDoNotServeAuditDb({
    entryId,
    ownerId: params.ownerId,
    action: "created",
    summary: `Added ${params.displayName} (${params.appliesTo === "household" ? "Household" : "Individual"}) to Do Not Serve.`,
    reason: params.reasonSummary,
    newValue: {
      appliesTo: params.appliesTo,
      sourceType: params.sourceType,
      linkedContactId: params.linkedContactId,
      primaryPhone: params.primaryPhone,
      primaryEmail: params.primaryEmail,
      reasonSummary: params.reasonSummary,
    },
    actorUserId: params.actor.actorUserId,
    actorEmployeeId: params.actor.actorEmployeeId,
    actorName: params.actor.actorName,
    createdAt: nowIso,
  });

  return entryId;
}

async function requireCurrentEntry(
  id: number,
  ownerId: number,
  expectedVersion?: number
): Promise<DoNotServeEntryRecord> {
  const rows = await _execDnsSelectInternal(
    `SELECT * FROM do_not_serve_entries WHERE id = ? AND owner_id = ? LIMIT 1`,
    [id, ownerId]
  );
  if (rows.length === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Restriction record not found." });
  }
  const current = _mapDnsEntryRowInternal(rows[0]);
  if (expectedVersion !== undefined && current.version !== expectedVersion) {
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "This restriction record was updated by another action. Refresh and review the latest status before saving.",
    });
  }
  return current;
}

export async function updateDoNotServeEntryDb(params: {
  id: number;
  ownerId: number;
  expectedVersion?: number;
  displayName?: string;
  primaryPhone?: string | null;
  primaryEmail?: string | null;
  reasonSummary?: string;
  appliesTo?: DoNotServeScope;
  householdAnchorId?: number | null;
  supportingLinks?: DoNotServeSupportingLink[];
  manualIdentifiers?: Array<{
    identifierType: "phone" | "email" | "alias_name";
    rawValue: string;
    normalizedValue: string;
    label: string | null;
  }>;
  actor: DoNotServeActorStamp;
}): Promise<DoNotServeEntryRecord> {
  const current = await requireCurrentEntry(params.id, params.ownerId, params.expectedVersion);
  const nowIso = new Date().toISOString();

  const nextName = params.displayName !== undefined ? params.displayName.trim() : current.displayName;
  const nextNormName = normalizeFullNameForMatch(nextName);
  const nextPhone = params.primaryPhone !== undefined ? (params.primaryPhone?.trim() || null) : current.primaryPhone;
  const nextNormPhone = normalizePhoneForMatch(nextPhone);
  const nextEmail = params.primaryEmail !== undefined ? (params.primaryEmail?.trim() || null) : current.primaryEmail;
  const nextNormEmail = normalizeEmailForMatch(nextEmail);
  const nextReason = params.reasonSummary !== undefined ? params.reasonSummary.trim() : current.reasonSummary;
  const nextScope = params.appliesTo !== undefined ? params.appliesTo : current.appliesTo;
  const nextHouseholdAnchor =
    params.householdAnchorId !== undefined ? params.householdAnchorId : current.householdAnchorId;
  const nextLinks = params.supportingLinks !== undefined ? params.supportingLinks : current.supportingLinks;

  const upd = await _execDnsRunInternal(
    `UPDATE do_not_serve_entries
     SET display_name = ?, normalized_full_name = ?,
         primary_phone = ?, normalized_primary_phone = ?,
         primary_email = ?, normalized_primary_email = ?,
         reason_summary = ?, applies_to = ?, household_anchor_id = ?,
         supporting_links_json = ?, version = version + 1, updated_at = ?
     WHERE id = ? AND owner_id = ? AND version = ?`,
    [
      nextName,
      nextNormName,
      nextPhone,
      nextNormPhone,
      nextEmail,
      nextNormEmail,
      nextReason,
      nextScope,
      nextHouseholdAnchor,
      nextLinks.length > 0 ? JSON.stringify(nextLinks) : null,
      nowIso,
      current.id,
      params.ownerId,
      current.version,
    ]
  );
  if (upd.rowsAffected === 0) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Concurrent modification detected. Refresh before saving changes.",
    });
  }

  if (nextReason !== current.reasonSummary) {
    await insertDoNotServeAuditDb({
      entryId: current.id,
      ownerId: params.ownerId,
      action: "reason_updated",
      summary: `Updated summary reason (original reason preserved).`,
      reason: nextReason,
      previousValue: { reasonSummary: current.reasonSummary },
      newValue: { reasonSummary: nextReason, originalReasonSummary: current.originalReasonSummary },
      actorUserId: params.actor.actorUserId,
      actorEmployeeId: params.actor.actorEmployeeId,
      actorName: params.actor.actorName,
      createdAt: nowIso,
    });
  }
  if (nextScope !== current.appliesTo) {
    await insertDoNotServeAuditDb({
      entryId: current.id,
      ownerId: params.ownerId,
      action: "scope_updated",
      summary: `Changed restriction scope from ${current.appliesTo} to ${nextScope}.`,
      previousValue: { appliesTo: current.appliesTo },
      newValue: { appliesTo: nextScope },
      actorUserId: params.actor.actorUserId,
      actorEmployeeId: params.actor.actorEmployeeId,
      actorName: params.actor.actorName,
      createdAt: nowIso,
    });
  }

  if (
    params.displayName !== undefined ||
    params.primaryPhone !== undefined ||
    params.primaryEmail !== undefined ||
    params.manualIdentifiers !== undefined
  ) {
    await _execDnsRunInternal(
      `DELETE FROM do_not_serve_identifiers WHERE entry_id = ? AND is_auto_synced = 0`,
      [current.id]
    );
    const manualToInsert: Array<{
      identifierType: DoNotServeIdentifierType;
      rawValue: string;
      normalizedValue: string;
      label: string | null;
    }> = [];
    if (!current.linkedContactId) {
      if (nextNormPhone && nextPhone) {
        manualToInsert.push({ identifierType: "phone", rawValue: nextPhone, normalizedValue: nextNormPhone, label: "Primary phone" });
      }
      if (nextNormEmail && nextEmail) {
        manualToInsert.push({ identifierType: "email", rawValue: nextEmail, normalizedValue: nextNormEmail, label: "Primary email" });
      }
      if (nextNormName && nextName) {
        manualToInsert.push({ identifierType: "full_name", rawValue: nextName, normalizedValue: nextNormName, label: "Full name" });
      }
    }
    for (const m of params.manualIdentifiers || []) {
      manualToInsert.push(m);
    }
    const seen = new Set<string>();
    for (const ident of manualToInsert) {
      const k = `${ident.identifierType}::${ident.normalizedValue}`;
      if (!ident.normalizedValue || seen.has(k)) continue;
      seen.add(k);
      await _execDnsRunInternal(
        `INSERT INTO do_not_serve_identifiers
          (entry_id, owner_id, identifier_type, raw_value, normalized_value, label, is_auto_synced, created_at, created_by_name)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [current.id, params.ownerId, ident.identifierType, ident.rawValue, ident.normalizedValue, ident.label, nowIso, params.actor.actorName]
      );
    }
    await insertDoNotServeAuditDb({
      entryId: current.id,
      ownerId: params.ownerId,
      action: "identifiers_updated",
      summary: `Updated matching identifiers for ${nextName}.`,
      previousValue: { displayName: current.displayName, primaryPhone: current.primaryPhone, primaryEmail: current.primaryEmail },
      newValue: { displayName: nextName, primaryPhone: nextPhone, primaryEmail: nextEmail },
      actorUserId: params.actor.actorUserId,
      actorEmployeeId: params.actor.actorEmployeeId,
      actorName: params.actor.actorName,
      createdAt: nowIso,
    });
  }

  if (params.supportingLinks !== undefined) {
    await insertDoNotServeAuditDb({
      entryId: current.id,
      ownerId: params.ownerId,
      action: "supporting_links_updated",
      summary: `Updated internal supporting references (${nextLinks.length} item${nextLinks.length === 1 ? "" : "s"}).`,
      previousValue: current.supportingLinks,
      newValue: nextLinks,
      actorUserId: params.actor.actorUserId,
      actorEmployeeId: params.actor.actorEmployeeId,
      actorName: params.actor.actorName,
      createdAt: nowIso,
    });
  }

  return await requireCurrentEntry(current.id, params.ownerId);
}

export async function liftDoNotServeEntryDb(params: {
  id: number;
  ownerId: number;
  reason: string;
  isUndo?: boolean;
  expectedVersion?: number;
  actor: DoNotServeActorStamp;
}): Promise<DoNotServeEntryRecord> {
  const current = await requireCurrentEntry(params.id, params.ownerId, params.expectedVersion);
  if (current.status === "lifted") {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This restriction is already lifted.",
    });
  }
  const nowIso = new Date().toISOString();
  const effectiveReason = params.isUndo ? "Added in error" : params.reason.trim();
  const upd = await _execDnsRunInternal(
    `UPDATE do_not_serve_entries
     SET status = 'lifted', lifted_at = ?, lifted_by_user_id = ?, lifted_by_employee_id = ?,
         lifted_by_name = ?, lifted_reason = ?, version = version + 1, updated_at = ?
     WHERE id = ? AND owner_id = ? AND status = 'active' AND version = ?`,
    [
      nowIso,
      params.actor.actorUserId,
      params.actor.actorEmployeeId,
      params.actor.actorName,
      effectiveReason,
      nowIso,
      current.id,
      params.ownerId,
      current.version,
    ]
  );
  if (upd.rowsAffected === 0) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Restriction status changed concurrently. Refresh and try again.",
    });
  }

  await insertDoNotServeAuditDb({
    entryId: current.id,
    ownerId: params.ownerId,
    action: params.isUndo ? "undone" : "lifted",
    summary: params.isUndo
      ? `Undid new restriction for ${current.displayName} (Added in error).`
      : `Lifted restriction for ${current.displayName}.`,
    reason: effectiveReason,
    previousValue: { status: "active" },
    newValue: { status: "lifted", liftedReason: effectiveReason },
    actorUserId: params.actor.actorUserId,
    actorEmployeeId: params.actor.actorEmployeeId,
    actorName: params.actor.actorName,
    createdAt: nowIso,
  });

  return await requireCurrentEntry(current.id, params.ownerId);
}

export async function reactivateDoNotServeEntryDb(params: {
  id: number;
  ownerId: number;
  reason: string;
  expectedVersion?: number;
  actor: DoNotServeActorStamp;
}): Promise<DoNotServeEntryRecord> {
  const current = await requireCurrentEntry(params.id, params.ownerId, params.expectedVersion);
  if (current.status === "active") {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This restriction is already active.",
    });
  }
  const nowIso = new Date().toISOString();
  const cleanReason = params.reason.trim();
  const upd = await _execDnsRunInternal(
    `UPDATE do_not_serve_entries
     SET status = 'active', reactivated_at = ?, reactivated_by_user_id = ?,
         reactivated_by_employee_id = ?, reactivated_by_name = ?, reactivated_reason = ?,
         version = version + 1, updated_at = ?
     WHERE id = ? AND owner_id = ? AND status = 'lifted' AND version = ?`,
    [
      nowIso,
      params.actor.actorUserId,
      params.actor.actorEmployeeId,
      params.actor.actorName,
      cleanReason,
      nowIso,
      current.id,
      params.ownerId,
      current.version,
    ]
  );
  if (upd.rowsAffected === 0) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Restriction status changed concurrently. Refresh and try again.",
    });
  }

  await insertDoNotServeAuditDb({
    entryId: current.id,
    ownerId: params.ownerId,
    action: "reactivated",
    summary: `Reactivated restriction for ${current.displayName}.`,
    reason: cleanReason,
    previousValue: { status: "lifted", liftedReason: current.liftedReason },
    newValue: { status: "active", reactivatedReason: cleanReason },
    actorUserId: params.actor.actorUserId,
    actorEmployeeId: params.actor.actorEmployeeId,
    actorName: params.actor.actorName,
    createdAt: nowIso,
  });

  return await requireCurrentEntry(current.id, params.ownerId);
}


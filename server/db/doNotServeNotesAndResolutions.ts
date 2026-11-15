import { TRPCError } from "@trpc/server";
import type {
  DoNotServeIdentifierType,
  DoNotServeResolutionType,
} from "../../shared/doNotServe";
import {
  _execDnsRunInternal,
  _execDnsSelectInternal,
  type DoNotServeResolutionRecord,
} from "./doNotServe";
import { insertDoNotServeAuditDb, type DoNotServeActorStamp } from "./doNotServeMutations";

export async function addDoNotServeNoteDb(params: {
  entryId: number;
  ownerId: number;
  body: string;
  actor: DoNotServeActorStamp;
}): Promise<number> {
  const rows = await _execDnsSelectInternal(
    `SELECT id, display_name FROM do_not_serve_entries WHERE id = ? AND owner_id = ? LIMIT 1`,
    [params.entryId, params.ownerId]
  );
  if (rows.length === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Restriction record not found." });
  }
  const nowIso = new Date().toISOString();
  const cleanBody = params.body.trim();
  const res = await _execDnsRunInternal(
    `INSERT INTO do_not_serve_notes
      (entry_id, owner_id, body, author_user_id, author_employee_id, author_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      params.entryId,
      params.ownerId,
      cleanBody,
      params.actor.actorUserId,
      params.actor.actorEmployeeId,
      params.actor.actorName,
      nowIso,
    ]
  );
  await _execDnsRunInternal(
    `UPDATE do_not_serve_entries SET updated_at = ? WHERE id = ? AND owner_id = ?`,
    [nowIso, params.entryId, params.ownerId]
  );
  await insertDoNotServeAuditDb({
    entryId: params.entryId,
    ownerId: params.ownerId,
    action: "note_added",
    summary: `Added dated staff note.`,
    newValue: { body: cleanBody },
    actorUserId: params.actor.actorUserId,
    actorEmployeeId: params.actor.actorEmployeeId,
    actorName: params.actor.actorName,
    createdAt: nowIso,
  });
  return res.insertId;
}

export async function correctDoNotServeNoteDb(params: {
  noteId: number;
  entryId: number;
  ownerId: number;
  body: string;
  actor: DoNotServeActorStamp;
}): Promise<void> {
  const rows = await _execDnsSelectInternal(
    `SELECT * FROM do_not_serve_notes WHERE id = ? AND entry_id = ? AND owner_id = ? LIMIT 1`,
    [params.noteId, params.entryId, params.ownerId]
  );
  if (rows.length === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Note not found." });
  }
  const existing = rows[0];
  const nowIso = new Date().toISOString();
  const cleanBody = params.body.trim();

  await _execDnsRunInternal(
    `UPDATE do_not_serve_notes
     SET previous_body = ?, body = ?, updated_at = ?, updated_by_name = ?
     WHERE id = ? AND entry_id = ? AND owner_id = ?`,
    [
      String(existing.body || ""),
      cleanBody,
      nowIso,
      params.actor.actorName,
      params.noteId,
      params.entryId,
      params.ownerId,
    ]
  );

  await insertDoNotServeAuditDb({
    entryId: params.entryId,
    ownerId: params.ownerId,
    action: "note_corrected",
    summary: `Corrected staff note #${params.noteId} (previous text preserved).`,
    previousValue: { noteId: params.noteId, body: String(existing.body || "") },
    newValue: { noteId: params.noteId, body: cleanBody },
    actorUserId: params.actor.actorUserId,
    actorEmployeeId: params.actor.actorEmployeeId,
    actorName: params.actor.actorName,
    createdAt: nowIso,
  });
}

export async function recordDoNotServeResolutionDb(params: {
  entryId: number;
  ownerId: number;
  targetEntityType: string;
  targetEntityId: string;
  resolutionType: DoNotServeResolutionType;
  identifierFingerprint: string;
  reason?: string | null;
  channel?: string | null;
  actor: DoNotServeActorStamp;
}): Promise<void> {
  const nowIso = new Date().toISOString();
  await _execDnsRunInternal(
    `INSERT INTO do_not_serve_resolutions
      (entry_id, owner_id, target_entity_type, target_entity_id, resolution_type, identifier_fingerprint, reason, actor_user_id, actor_employee_id, actor_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      params.entryId,
      params.ownerId,
      params.targetEntityType,
      params.targetEntityId,
      params.resolutionType,
      params.identifierFingerprint,
      params.reason ?? null,
      params.actor.actorUserId,
      params.actor.actorEmployeeId,
      params.actor.actorName,
      nowIso,
    ]
  );

  const auditAction =
    params.resolutionType === "different_person"
      ? "different_person"
      : params.resolutionType === "service_override"
        ? "service_override"
        : "match_acknowledged";

  const summary =
    params.resolutionType === "different_person"
      ? `Resolved inquiry (${params.targetEntityType}:${params.targetEntityId}) as a different person.`
      : params.resolutionType === "service_override"
        ? `Authorized service workflow override on ${params.targetEntityType}:${params.targetEntityId}.`
        : `Acknowledged match alert on ${params.targetEntityType}:${params.targetEntityId}.`;

  await insertDoNotServeAuditDb({
    entryId: params.entryId,
    ownerId: params.ownerId,
    action: auditAction,
    summary,
    reason: params.reason ?? null,
    channel: params.channel ?? null,
    targetEntityType: params.targetEntityType,
    targetEntityId: params.targetEntityId,
    newValue: { identifierFingerprint: params.identifierFingerprint },
    actorUserId: params.actor.actorUserId,
    actorEmployeeId: params.actor.actorEmployeeId,
    actorName: params.actor.actorName,
    createdAt: nowIso,
  });
}

export async function getResolutionsForTargetDb(params: {
  ownerId: number;
  targetEntityType: string;
  targetEntityId: string;
}): Promise<DoNotServeResolutionRecord[]> {
  const rows = await _execDnsSelectInternal(
    `SELECT * FROM do_not_serve_resolutions
     WHERE owner_id = ? AND target_entity_type = ? AND target_entity_id = ?
     ORDER BY created_at DESC, id DESC`,
    [params.ownerId, params.targetEntityType, params.targetEntityId]
  );
  return rows.map((r) => ({
    id: Number(r.id),
    entryId: Number(r.entry_id),
    ownerId: Number(r.owner_id ?? 1),
    targetEntityType: String(r.target_entity_type || ""),
    targetEntityId: String(r.target_entity_id || ""),
    resolutionType: String(r.resolution_type) as DoNotServeResolutionType,
    identifierFingerprint: String(r.identifier_fingerprint || ""),
    reason: r.reason ? String(r.reason) : null,
    actorUserId: Number(r.actor_user_id || 0),
    actorEmployeeId: r.actor_employee_id ? String(r.actor_employee_id) : null,
    actorName: String(r.actor_name || ""),
    createdAt: String(r.created_at || ""),
  }));
}

export async function markDoNotServeAlertSeenDb(params: {
  ownerId: number;
  staffUserId: number;
  eventKey: string;
  entryId: number;
  dismissedAction: string;
}): Promise<void> {
  const nowIso = new Date().toISOString();
  await _execDnsRunInternal(
    `INSERT OR IGNORE INTO do_not_serve_alert_seen
      (owner_id, staff_user_id, event_key, entry_id, dismissed_action, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      params.ownerId,
      params.staffUserId,
      params.eventKey,
      params.entryId,
      params.dismissedAction,
      nowIso,
    ]
  );
}

export async function hasStaffSeenAlertDb(
  staffUserId: number,
  eventKey: string
): Promise<boolean> {
  if (!staffUserId || !eventKey) return false;
  const rows = await _execDnsSelectInternal(
    `SELECT 1 FROM do_not_serve_alert_seen WHERE staff_user_id = ? AND event_key = ? LIMIT 1`,
    [staffUserId, eventKey]
  );
  return rows.length > 0;
}

export async function replaceAutoSyncedIdentifiersDb(params: {
  entryId: number;
  ownerId: number;
  displayName?: string;
  normalizedFullName?: string | null;
  primaryPhone?: string | null;
  normalizedPrimaryPhone?: string | null;
  primaryEmail?: string | null;
  normalizedPrimaryEmail?: string | null;
  identifiers: Array<{
    identifierType: DoNotServeIdentifierType;
    rawValue: string;
    normalizedValue: string;
    label: string | null;
  }>;
  actor: DoNotServeActorStamp;
}): Promise<void> {
  const nowIso = new Date().toISOString();
  if (params.displayName !== undefined) {
    await _execDnsRunInternal(
      `UPDATE do_not_serve_entries
       SET display_name = ?, normalized_full_name = ?,
           primary_phone = ?, normalized_primary_phone = ?,
           primary_email = ?, normalized_primary_email = ?,
           updated_at = ?
       WHERE id = ? AND owner_id = ?`,
      [
        params.displayName,
        params.normalizedFullName ?? null,
        params.primaryPhone ?? null,
        params.normalizedPrimaryPhone ?? null,
        params.primaryEmail ?? null,
        params.normalizedPrimaryEmail ?? null,
        nowIso,
        params.entryId,
        params.ownerId,
      ]
    );
  }

  await _execDnsRunInternal(
    `DELETE FROM do_not_serve_identifiers WHERE entry_id = ? AND is_auto_synced = 1`,
    [params.entryId]
  );

  const seen = new Set<string>();
  for (const ident of params.identifiers) {
    const key = `${ident.identifierType}::${ident.normalizedValue}`;
    if (!ident.normalizedValue || seen.has(key)) continue;
    seen.add(key);
    await _execDnsRunInternal(
      `INSERT INTO do_not_serve_identifiers
        (entry_id, owner_id, identifier_type, raw_value, normalized_value, label, is_auto_synced, created_at, created_by_name)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        params.entryId,
        params.ownerId,
        ident.identifierType,
        ident.rawValue,
        ident.normalizedValue,
        ident.label,
        nowIso,
        params.actor.actorName,
      ]
    );
  }
}

export async function findEntriesAffectingContactDb(
  ownerId: number,
  contactIds: number[]
): Promise<number[]> {
  const cleanIds = Array.from(new Set(contactIds.filter((n) => Number.isFinite(n) && n > 0)));
  if (cleanIds.length === 0) return [];
  const placeholders = cleanIds.map(() => "?").join(",");
  const rows = await _execDnsSelectInternal(
    `SELECT DISTINCT id FROM do_not_serve_entries
     WHERE owner_id = ? AND (
       linked_contact_id IN (${placeholders})
       OR household_anchor_id IN (${placeholders})
       OR id IN (
         SELECT entry_id FROM do_not_serve_identifiers
         WHERE owner_id = ? AND identifier_type IN ('contact_id', 'household_contact_id')
           AND normalized_value IN (${cleanIds.map(() => "?").join(",")})
       )
     )`,
    [ownerId, ...cleanIds, ...cleanIds, ownerId, ...cleanIds.map(String)]
  );
  return rows.map((r) => Number(r.id));
}


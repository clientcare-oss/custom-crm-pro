import { getLocalDbClient, queryCloudflareD1 } from "../_core/d1Client";
import {
  normalizeEmailForMatch,
  normalizeFullNameForMatch,
  normalizePhoneForMatch,
  type DoNotServeAuditAction,
  type DoNotServeAuditRecord,
  type DoNotServeIdentifierRecord,
  type DoNotServeIdentifierType,
  type DoNotServeListRow,
  type DoNotServeNoteRecord,
  type DoNotServeResolutionType,
  type DoNotServeScope,
  type DoNotServeSourceType,
  type DoNotServeStatus,
  type DoNotServeSupportingLink,
} from "../../shared/doNotServe";

export interface DoNotServeEntryRecord {
  id: number;
  ownerId: number;
  status: DoNotServeStatus;
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
  originalReasonSummary: string;
  additionalNotes: string | null;
  supportingLinks: DoNotServeSupportingLink[];
  createdByUserId: number;
  createdByEmployeeId: string | null;
  createdByName: string;
  createdAt: string;
  liftedAt: string | null;
  liftedByUserId: number | null;
  liftedByEmployeeId: string | null;
  liftedByName: string | null;
  liftedReason: string | null;
  reactivatedAt: string | null;
  reactivatedByUserId: number | null;
  reactivatedByEmployeeId: string | null;
  reactivatedByName: string | null;
  reactivatedReason: string | null;
  version: number;
  updatedAt: string;
}

export interface DoNotServeResolutionRecord {
  id: number;
  entryId: number;
  ownerId: number;
  targetEntityType: string;
  targetEntityId: string;
  resolutionType: DoNotServeResolutionType;
  identifierFingerprint: string;
  reason: string | null;
  actorUserId: number;
  actorEmployeeId: string | null;
  actorName: string;
  createdAt: string;
}

export interface ActiveIdentifierJoinRow {
  identifierId: number;
  entryId: number;
  ownerId: number;
  identifierType: DoNotServeIdentifierType;
  rawValue: string;
  normalizedValue: string;
  label: string | null;
  displayName: string;
  appliesTo: DoNotServeScope;
  sourceType: DoNotServeSourceType;
  linkedContactId: number | null;
  householdAnchorId: number | null;
  createdAt: string;
  createdByName: string;
}

const DNS_DDL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS do_not_serve_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active',
    applies_to TEXT NOT NULL DEFAULT 'individual',
    source_type TEXT NOT NULL DEFAULT 'archive',
    linked_contact_id INTEGER,
    household_anchor_id INTEGER,
    display_name TEXT NOT NULL,
    normalized_full_name TEXT,
    primary_phone TEXT,
    normalized_primary_phone TEXT,
    primary_email TEXT,
    normalized_primary_email TEXT,
    reason_summary TEXT NOT NULL,
    original_reason_summary TEXT NOT NULL,
    additional_notes TEXT,
    supporting_links_json TEXT,
    created_by_user_id INTEGER NOT NULL,
    created_by_employee_id TEXT,
    created_by_name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    lifted_at TEXT,
    lifted_by_user_id INTEGER,
    lifted_by_employee_id TEXT,
    lifted_by_name TEXT,
    lifted_reason TEXT,
    reactivated_at TEXT,
    reactivated_by_user_id INTEGER,
    reactivated_by_employee_id TEXT,
    reactivated_by_name TEXT,
    reactivated_reason TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS dns_entries_owner_status_idx ON do_not_serve_entries (owner_id, status)`,
  `CREATE INDEX IF NOT EXISTS dns_entries_linked_contact_idx ON do_not_serve_entries (linked_contact_id)`,
  `CREATE INDEX IF NOT EXISTS dns_entries_household_anchor_idx ON do_not_serve_entries (household_anchor_id)`,
  `CREATE TABLE IF NOT EXISTS do_not_serve_identifiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL,
    owner_id INTEGER NOT NULL DEFAULT 1,
    identifier_type TEXT NOT NULL,
    raw_value TEXT NOT NULL,
    normalized_value TEXT NOT NULL,
    label TEXT,
    is_auto_synced INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    created_by_name TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS dns_identifiers_entry_idx ON do_not_serve_identifiers (entry_id)`,
  `CREATE INDEX IF NOT EXISTS dns_identifiers_lookup_idx ON do_not_serve_identifiers (owner_id, identifier_type, normalized_value)`,
  `CREATE TABLE IF NOT EXISTS do_not_serve_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL,
    owner_id INTEGER NOT NULL DEFAULT 1,
    body TEXT NOT NULL,
    previous_body TEXT,
    author_user_id INTEGER NOT NULL,
    author_employee_id TEXT,
    author_name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    updated_by_name TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS dns_notes_entry_idx ON do_not_serve_notes (entry_id)`,
  `CREATE TABLE IF NOT EXISTS do_not_serve_resolutions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL,
    owner_id INTEGER NOT NULL DEFAULT 1,
    target_entity_type TEXT NOT NULL,
    target_entity_id TEXT NOT NULL,
    resolution_type TEXT NOT NULL,
    identifier_fingerprint TEXT NOT NULL,
    reason TEXT,
    actor_user_id INTEGER NOT NULL,
    actor_employee_id TEXT,
    actor_name TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS dns_resolutions_target_idx ON do_not_serve_resolutions (owner_id, target_entity_type, target_entity_id)`,
  `CREATE INDEX IF NOT EXISTS dns_resolutions_entry_idx ON do_not_serve_resolutions (entry_id)`,
  `CREATE TABLE IF NOT EXISTS do_not_serve_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL,
    owner_id INTEGER NOT NULL DEFAULT 1,
    action TEXT NOT NULL,
    summary TEXT NOT NULL,
    reason TEXT,
    previous_value_json TEXT,
    new_value_json TEXT,
    channel TEXT,
    target_entity_type TEXT,
    target_entity_id TEXT,
    actor_user_id INTEGER,
    actor_employee_id TEXT,
    actor_name TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS dns_audit_entry_idx ON do_not_serve_audit_log (entry_id)`,
  `CREATE TABLE IF NOT EXISTS do_not_serve_alert_seen (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL DEFAULT 1,
    staff_user_id INTEGER NOT NULL,
    event_key TEXT NOT NULL,
    entry_id INTEGER NOT NULL,
    dismissed_action TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS dns_alert_seen_staff_event_uidx ON do_not_serve_alert_seen (staff_user_id, event_key)`,
];

let tablesEnsuredForBinding: unknown = null;
let localTablesEnsured = false;

export async function ensureDoNotServeTables(): Promise<void> {
  const cfDb = (globalThis as Record<string, any>).__CF_ENV_DB__;
  if (cfDb) {
    if (tablesEnsuredForBinding === cfDb) return;
    for (const stmt of DNS_DDL_STATEMENTS) {
      try {
        await cfDb.prepare(stmt).run();
      } catch {
        // Ignore if already created
      }
    }
    tablesEnsuredForBinding = cfDb;
    return;
  }

  if (localTablesEnsured) return;
  for (const stmt of DNS_DDL_STATEMENTS) {
    try {
      await getLocalDbClient().execute(stmt);
    } catch {
      // Ignore if already created
    }
  }
  localTablesEnsured = true;
}

let busyTimeoutSet = false;
async function executeLocalWithRetry(sql: string, args: any[] = []): Promise<any> {
  const client = getLocalDbClient();
  if (!busyTimeoutSet) {
    busyTimeoutSet = true;
    try {
      await client.execute("PRAGMA busy_timeout = 5000");
    } catch {
      // ignore
    }
  }
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      return await client.execute({ sql, args });
    } catch (err: any) {
      if (attempt < 5 && String(err?.code || err?.message || "").includes("SQLITE_BUSY")) {
        await new Promise((r) => setTimeout(r, 80 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
}

export async function _execDnsSelectInternal(sql: string, params: unknown[] = []): Promise<any[]> {
  await ensureDoNotServeTables();
  const cfDb = (globalThis as Record<string, any>).__CF_ENV_DB__;
  if (cfDb) {
    const stmt = params.length > 0 ? cfDb.prepare(sql).bind(...params) : cfDb.prepare(sql);
    const res = await stmt.all();
    return Array.isArray(res?.results) ? res.results : [];
  }
  const useDirectLocal =
    process.env.LOCAL_DB_ONLY === "true" ||
    process.env.ALLOW_REMOTE_D1 !== "true" ||
    process.env.NODE_ENV === "test" ||
    Boolean(process.env.VITEST);
  if (useDirectLocal) {
    const res = await executeLocalWithRetry(sql, params as any[]);
    return res.rows ? [...res.rows] : [];
  }
  const rows = await queryCloudflareD1(sql, params as any[]);
  return Array.isArray(rows) ? rows : [];
}

export async function _execDnsRunInternal(
  sql: string,
  params: unknown[] = []
): Promise<{ insertId: number; rowsAffected: number }> {
  await ensureDoNotServeTables();
  const cfDb = (globalThis as Record<string, any>).__CF_ENV_DB__;
  if (cfDb) {
    const stmt = params.length > 0 ? cfDb.prepare(sql).bind(...params) : cfDb.prepare(sql);
    const res = await stmt.run();
    return {
      insertId: Number(res?.meta?.last_row_id || 0),
      rowsAffected: Number(res?.meta?.changes ?? 0),
    };
  }
  const useDirectLocal =
    process.env.LOCAL_DB_ONLY === "true" ||
    process.env.ALLOW_REMOTE_D1 !== "true" ||
    process.env.NODE_ENV === "test" ||
    Boolean(process.env.VITEST);
  if (useDirectLocal) {
    const res = await executeLocalWithRetry(sql, params as any[]);
    return {
      insertId: Number(res.lastInsertRowid || 0),
      rowsAffected: Number(res.rowsAffected ?? 0),
    };
  }
  const res: any = await queryCloudflareD1(sql, params as any[]);
  return {
    insertId: Number(res?.insertId || res?.lastInsertRowid || 0),
    rowsAffected: 1,
  };
}

export function _mapDnsEntryRowInternal(r: any): DoNotServeEntryRecord {
  let supportingLinks: DoNotServeSupportingLink[] = [];
  if (r.supporting_links_json) {
    try {
      const parsed = JSON.parse(String(r.supporting_links_json));
      if (Array.isArray(parsed)) supportingLinks = parsed;
    } catch { }
  }
  return {
    id: Number(r.id),
    ownerId: Number(r.owner_id ?? 1),
    status: (r.status === "lifted" ? "lifted" : "active") as DoNotServeStatus,
    appliesTo: (r.applies_to === "household" ? "household" : "individual") as DoNotServeScope,
    sourceType: (r.source_type === "manual" ? "manual" : "archive") as DoNotServeSourceType,
    linkedContactId: r.linked_contact_id != null ? Number(r.linked_contact_id) : null,
    householdAnchorId: r.household_anchor_id != null ? Number(r.household_anchor_id) : null,
    displayName: String(r.display_name || ""),
    normalizedFullName: r.normalized_full_name ? String(r.normalized_full_name) : null,
    primaryPhone: r.primary_phone ? String(r.primary_phone) : null,
    normalizedPrimaryPhone: r.normalized_primary_phone ? String(r.normalized_primary_phone) : null,
    primaryEmail: r.primary_email ? String(r.primary_email) : null,
    normalizedPrimaryEmail: r.normalized_primary_email ? String(r.normalized_primary_email) : null,
    reasonSummary: String(r.reason_summary || ""),
    originalReasonSummary: String(r.original_reason_summary || r.reason_summary || ""),
    additionalNotes: r.additional_notes ? String(r.additional_notes) : null,
    supportingLinks,
    createdByUserId: Number(r.created_by_user_id || 0),
    createdByEmployeeId: r.created_by_employee_id ? String(r.created_by_employee_id) : null,
    createdByName: String(r.created_by_name || "Authorized Staff"),
    createdAt: String(r.created_at || ""),
    liftedAt: r.lifted_at ? String(r.lifted_at) : null,
    liftedByUserId: r.lifted_by_user_id != null ? Number(r.lifted_by_user_id) : null,
    liftedByEmployeeId: r.lifted_by_employee_id ? String(r.lifted_by_employee_id) : null,
    liftedByName: r.lifted_by_name ? String(r.lifted_by_name) : null,
    liftedReason: r.lifted_reason ? String(r.lifted_reason) : null,
    reactivatedAt: r.reactivated_at ? String(r.reactivated_at) : null,
    reactivatedByUserId: r.reactivated_by_user_id != null ? Number(r.reactivated_by_user_id) : null,
    reactivatedByEmployeeId: r.reactivated_by_employee_id ? String(r.reactivated_by_employee_id) : null,
    reactivatedByName: r.reactivated_by_name ? String(r.reactivated_by_name) : null,
    reactivatedReason: r.reactivated_reason ? String(r.reactivated_reason) : null,
    version: Number(r.version ?? 1),
    updatedAt: String(r.updated_at || r.created_at || ""),
  };
}

export async function listDoNotServeEntriesDb(params: {
  ownerId?: number;
  status?: "active" | "lifted" | "all";
  search?: string;
}): Promise<DoNotServeListRow[]> {
  const clauses: string[] = [];
  const bind: unknown[] = [];

  if (params.ownerId) {
    clauses.push("e.owner_id = ?");
    bind.push(params.ownerId);
  }
  if (params.status && params.status !== "all") {
    clauses.push("e.status = ?");
    bind.push(params.status);
  }

  const rawSearch = (params.search || "").trim();
  if (rawSearch) {
    const likeTerm = `%${rawSearch.toLowerCase()}%`;
    const normPhone = normalizePhoneForMatch(rawSearch);
    const normEmail = normalizeEmailForMatch(rawSearch);
    const normName = normalizeFullNameForMatch(rawSearch);
    const digitsOnly = rawSearch.replace(/\D/g, "");

    const orParts: string[] = [
      "LOWER(e.display_name) LIKE ?",
      "LOWER(COALESCE(e.primary_phone, '')) LIKE ?",
      "LOWER(COALESCE(e.primary_email, '')) LIKE ?",
      "EXISTS (SELECT 1 FROM do_not_serve_identifiers i WHERE i.entry_id = e.id AND (LOWER(i.raw_value) LIKE ? OR LOWER(i.normalized_value) LIKE ?))",
    ];
    bind.push(likeTerm, likeTerm, likeTerm, likeTerm, likeTerm);

    if (normPhone) {
      orParts.push("e.normalized_primary_phone = ?");
      orParts.push("EXISTS (SELECT 1 FROM do_not_serve_identifiers i WHERE i.entry_id = e.id AND i.identifier_type = 'phone' AND i.normalized_value = ?)");
      bind.push(normPhone, normPhone);
    } else if (digitsOnly.length >= 3) {
      orParts.push("COALESCE(e.normalized_primary_phone, '') LIKE ?");
      orParts.push("EXISTS (SELECT 1 FROM do_not_serve_identifiers i WHERE i.entry_id = e.id AND i.identifier_type = 'phone' AND i.normalized_value LIKE ?)");
      bind.push(`%${digitsOnly}%`, `%${digitsOnly}%`);
    }
    if (normEmail) {
      orParts.push("e.normalized_primary_email = ?");
      bind.push(normEmail);
    }
    if (normName) {
      orParts.push("e.normalized_full_name LIKE ?");
      bind.push(`%${normName}%`);
    }
    clauses.push(`(${orParts.join(" OR ")})`);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = await _execDnsSelectInternal(
    `SELECT e.id, e.status, e.applies_to, e.source_type, e.linked_contact_id, e.household_anchor_id,
            e.display_name, e.primary_phone, e.primary_email, e.created_by_name, e.created_at, e.lifted_at, e.version
     FROM do_not_serve_entries e
     ${whereSql}
     ORDER BY CASE WHEN e.status = 'active' THEN 0 ELSE 1 END, e.updated_at DESC, e.id DESC`,
    bind
  );

  return rows.map((r) => ({
    id: Number(r.id),
    status: (r.status === "lifted" ? "lifted" : "active") as DoNotServeStatus,
    appliesTo: (r.applies_to === "household" ? "household" : "individual") as DoNotServeScope,
    sourceType: (r.source_type === "manual" ? "manual" : "archive") as DoNotServeSourceType,
    linkedContactId: r.linked_contact_id != null ? Number(r.linked_contact_id) : null,
    householdAnchorId: r.household_anchor_id != null ? Number(r.household_anchor_id) : null,
    displayName: String(r.display_name || ""),
    primaryPhone: r.primary_phone ? String(r.primary_phone) : null,
    primaryEmail: r.primary_email ? String(r.primary_email) : null,
    createdByName: String(r.created_by_name || ""),
    createdAt: String(r.created_at || ""),
    liftedAt: r.lifted_at ? String(r.lifted_at) : null,
    version: Number(r.version ?? 1),
  }));
}

export async function getDoNotServeEntryByIdDb(
  id: number,
  ownerId?: number
): Promise<{
  entry: DoNotServeEntryRecord;
  identifiers: DoNotServeIdentifierRecord[];
  notes: DoNotServeNoteRecord[];
  auditLog: DoNotServeAuditRecord[];
  resolutions: DoNotServeResolutionRecord[];
} | null> {
  const rows = ownerId
    ? await _execDnsSelectInternal(
      `SELECT * FROM do_not_serve_entries WHERE id = ? AND owner_id = ? LIMIT 1`,
      [id, ownerId]
    )
    : await _execDnsSelectInternal(`SELECT * FROM do_not_serve_entries WHERE id = ? LIMIT 1`, [id]);
  if (rows.length === 0) return null;
  const entry = _mapDnsEntryRowInternal(rows[0]);

  const [idRows, noteRows, auditRows, resRows] = await Promise.all([
    _execDnsSelectInternal(`SELECT * FROM do_not_serve_identifiers WHERE entry_id = ? ORDER BY id ASC`, [id]),
    _execDnsSelectInternal(`SELECT * FROM do_not_serve_notes WHERE entry_id = ? ORDER BY created_at DESC, id DESC`, [id]),
    _execDnsSelectInternal(`SELECT * FROM do_not_serve_audit_log WHERE entry_id = ? ORDER BY created_at DESC, id DESC`, [id]),
    _execDnsSelectInternal(`SELECT * FROM do_not_serve_resolutions WHERE entry_id = ? ORDER BY created_at DESC, id DESC`, [id]),
  ]);

  return {
    entry,
    identifiers: idRows.map((r) => ({
      id: Number(r.id),
      entryId: Number(r.entry_id),
      identifierType: String(r.identifier_type) as DoNotServeIdentifierType,
      rawValue: String(r.raw_value || ""),
      normalizedValue: String(r.normalized_value || ""),
      label: r.label ? String(r.label) : null,
      isAutoSynced: Number(r.is_auto_synced || 0) === 1,
      createdAt: String(r.created_at || ""),
      createdByName: String(r.created_by_name || ""),
    })),
    notes: noteRows.map((r) => ({
      id: Number(r.id),
      entryId: Number(r.entry_id),
      body: String(r.body || ""),
      previousBody: r.previous_body ? String(r.previous_body) : null,
      authorUserId: Number(r.author_user_id || 0),
      authorEmployeeId: r.author_employee_id ? String(r.author_employee_id) : null,
      authorName: String(r.author_name || ""),
      createdAt: String(r.created_at || ""),
      updatedAt: r.updated_at ? String(r.updated_at) : null,
      updatedByName: r.updated_by_name ? String(r.updated_by_name) : null,
    })),
    auditLog: auditRows.map((r) => ({
      id: Number(r.id),
      entryId: Number(r.entry_id),
      action: String(r.action) as DoNotServeAuditAction,
      summary: String(r.summary || ""),
      reason: r.reason ? String(r.reason) : null,
      previousValueJson: r.previous_value_json ? String(r.previous_value_json) : null,
      newValueJson: r.new_value_json ? String(r.new_value_json) : null,
      channel: r.channel ? String(r.channel) : null,
      targetEntityType: r.target_entity_type ? String(r.target_entity_type) : null,
      targetEntityId: r.target_entity_id ? String(r.target_entity_id) : null,
      actorUserId: r.actor_user_id != null ? Number(r.actor_user_id) : null,
      actorEmployeeId: r.actor_employee_id ? String(r.actor_employee_id) : null,
      actorName: String(r.actor_name || ""),
      createdAt: String(r.created_at || ""),
    })),
    resolutions: resRows.map((r) => ({
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
    })),
  };
}

export async function getActiveDoNotServeIdentifiersDb(ownerId?: number): Promise<ActiveIdentifierJoinRow[]> {
  const whereOwner = ownerId ? `AND e.owner_id = ?` : "";
  const bind = ownerId ? [ownerId] : [];
  const rows = await _execDnsSelectInternal(
    `SELECT i.id AS identifier_id, i.entry_id, i.owner_id, i.identifier_type, i.raw_value, i.normalized_value, i.label,
            e.display_name, e.applies_to, e.source_type, e.linked_contact_id, e.household_anchor_id, e.created_at, e.created_by_name
     FROM do_not_serve_identifiers i
     INNER JOIN do_not_serve_entries e ON e.id = i.entry_id
     WHERE e.status = 'active' ${whereOwner}`,
    bind
  );
  return rows.map((r) => ({
    identifierId: Number(r.identifier_id),
    entryId: Number(r.entry_id),
    ownerId: Number(r.owner_id ?? 1),
    identifierType: String(r.identifier_type) as DoNotServeIdentifierType,
    rawValue: String(r.raw_value || ""),
    normalizedValue: String(r.normalized_value || ""),
    label: r.label ? String(r.label) : null,
    displayName: String(r.display_name || ""),
    appliesTo: (r.applies_to === "household" ? "household" : "individual") as DoNotServeScope,
    sourceType: (r.source_type === "manual" ? "manual" : "archive") as DoNotServeSourceType,
    linkedContactId: r.linked_contact_id != null ? Number(r.linked_contact_id) : null,
    householdAnchorId: r.household_anchor_id != null ? Number(r.household_anchor_id) : null,
    createdAt: String(r.created_at || ""),
    createdByName: String(r.created_by_name || ""),
  }));
}

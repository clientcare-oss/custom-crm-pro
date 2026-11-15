import { _execDnsRunInternal, _execDnsSelectInternal } from "./doNotServe";
import { getLocalDbClient } from "../_core/d1Client";

export type MycoSporeKind =
  | "architecture"
  | "guardrail"
  | "decision"
  | "discovery"
  | "workflow"
  | "case_note";

export interface MycoConfigRecord {
  ownerId: number;
  enabled: boolean;
  endpointUrl: string;
  webhookSecret: string;
  ferpaSanitizeExternal: boolean;
  autoSyncLeads: boolean;
  autoSyncDiscovery: boolean;
  autoSyncCaseCompass: boolean;
  autoSyncMeetings: boolean;
  updatedAt: string;
}

export interface MycoSporeRecord {
  id: string;
  ownerId: number;
  kind: MycoSporeKind;
  title: string;
  summary: string;
  tags: string[];
  source: string;
  author: string;
  ferpaSanitized: boolean;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
}

export interface MycoSyncLogRecord {
  id: number;
  ownerId: number;
  direction: "inbound" | "outbound";
  eventType: string;
  status: "delivered" | "stored_locally" | "blocked_do_not_serve" | "rejected_signature" | "error";
  summary: string;
  doNotServeMatched: boolean;
  ferpaSanitized: boolean;
  payloadPreview: string | null;
  createdAt: string;
}

const MYCO_DDL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS myco_config (
    owner_id INTEGER PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 1,
    endpoint_url TEXT NOT NULL DEFAULT '',
    webhook_secret TEXT NOT NULL DEFAULT 'whsec_waypoint_myco_local',
    ferpa_sanitize_external INTEGER NOT NULL DEFAULT 1,
    auto_sync_leads INTEGER NOT NULL DEFAULT 1,
    auto_sync_discovery INTEGER NOT NULL DEFAULT 1,
    auto_sync_case_compass INTEGER NOT NULL DEFAULT 1,
    auto_sync_meetings INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS myco_spores (
    spore_id TEXT PRIMARY KEY,
    owner_id INTEGER NOT NULL DEFAULT 1,
    kind TEXT NOT NULL DEFAULT 'discovery',
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    tags_json TEXT NOT NULL DEFAULT '[]',
    source TEXT NOT NULL DEFAULT 'waypoint-crm',
    author TEXT NOT NULL DEFAULT 'Waypoint Staff',
    ferpa_sanitized INTEGER NOT NULL DEFAULT 1,
    entity_type TEXT,
    entity_id TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS myco_spores_owner_kind_idx ON myco_spores (owner_id, kind, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS myco_sync_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL DEFAULT 1,
    direction TEXT NOT NULL,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL,
    summary TEXT NOT NULL,
    do_not_serve_matched INTEGER NOT NULL DEFAULT 0,
    ferpa_sanitized INTEGER NOT NULL DEFAULT 1,
    payload_preview TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS myco_sync_logs_owner_idx ON myco_sync_logs (owner_id, id DESC)`,
];

let mycoTablesEnsuredBinding: unknown = null;
let mycoLocalTablesEnsured = false;

export async function ensureMycoTables(): Promise<void> {
  const cfDb = (globalThis as Record<string, any>).__CF_ENV_DB__;
  if (cfDb) {
    if (mycoTablesEnsuredBinding === cfDb) return;
    for (const stmt of MYCO_DDL_STATEMENTS) {
      try {
        await cfDb.prepare(stmt).run();
      } catch {
        // ignore if already exists
      }
    }
    mycoTablesEnsuredBinding = cfDb;
    return;
  }

  if (mycoLocalTablesEnsured) return;
  for (const stmt of MYCO_DDL_STATEMENTS) {
    try {
      await getLocalDbClient().execute(stmt);
    } catch {
      // ignore if already exists
    }
  }
  mycoLocalTablesEnsured = true;
  await syncFileSporesIntoDatabase(1);
}

async function readLocalSporesFile(): Promise<MycoSporeRecord[]> {
  try {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const filePath = path.resolve(process.cwd(), ".myco", "spores.json");
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.spores)) return [];
    return parsed.spores.map((item: Record<string, any>) => ({
      id: String(item.id || `spore-${Date.now()}`),
      ownerId: 1,
      kind: (item.kind || "discovery") as MycoSporeKind,
      title: String(item.title || ""),
      summary: String(item.summary || ""),
      tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
      source: String(item.source || "AGENTS.md"),
      author: String(item.author || "Waypoint Engineering"),
      ferpaSanitized: item.ferpaSanitized !== false,
      entityType: item.entityType ? String(item.entityType) : null,
      entityId: item.entityId ? String(item.entityId) : null,
      createdAt: String(item.createdAt || new Date().toISOString()),
    }));
  } catch {
    return [];
  }
}

async function writeSporeToLocalFile(spore: MycoSporeRecord): Promise<void> {
  try {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const filePath = path.resolve(process.cwd(), ".myco", "spores.json");
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    let store: Record<string, any> = {
      version: "1.0.0",
      project: "custom-crm-pro",
      practice: "Waypoint Advocates",
      updatedAt: new Date().toISOString(),
      spores: [],
    };
    if (fs.existsSync(filePath)) {
      try {
        store = JSON.parse(fs.readFileSync(filePath, "utf8"));
      } catch {
        // use default
      }
    }
    const existing = Array.isArray(store.spores) ? store.spores : [];
    const filtered = existing.filter((s: Record<string, any>) => s.id !== spore.id);
    filtered.unshift({
      id: spore.id,
      kind: spore.kind,
      title: spore.title,
      summary: spore.summary,
      tags: spore.tags,
      source: spore.source,
      author: spore.author,
      ferpaSanitized: spore.ferpaSanitized,
      entityType: spore.entityType,
      entityId: spore.entityId,
      createdAt: spore.createdAt,
    });
    store.spores = filtered;
    store.updatedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(store, null, 2), "utf8");
  } catch {
    // non-fatal on serverless Workers
  }
}

async function removeSporeFromLocalFile(sporeId: string): Promise<void> {
  try {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const filePath = path.resolve(process.cwd(), ".myco", "spores.json");
    if (!fs.existsSync(filePath)) return;
    const store = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!Array.isArray(store.spores)) return;
    store.spores = store.spores.filter((s: Record<string, any>) => s.id !== sporeId);
    store.updatedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(store, null, 2), "utf8");
  } catch {
    // non-fatal on serverless Workers
  }
}

export async function syncFileSporesIntoDatabase(ownerId = 1): Promise<void> {
  const fileSpores = await readLocalSporesFile();
  for (const spore of fileSpores) {
    if (!spore.title || !spore.summary) continue;
    await _execDnsRunInternal(
      `INSERT OR IGNORE INTO myco_spores (
        spore_id, owner_id, kind, title, summary, tags_json, source, author, ferpa_sanitized, entity_type, entity_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        spore.id,
        ownerId,
        spore.kind,
        spore.title,
        spore.summary,
        JSON.stringify(spore.tags),
        spore.source,
        spore.author,
        spore.ferpaSanitized ? 1 : 0,
        spore.entityType,
        spore.entityId,
        spore.createdAt,
      ]
    );
  }
}

export async function getMycoConfig(ownerId = 1): Promise<MycoConfigRecord> {
  await ensureMycoTables();
  const rows = await _execDnsSelectInternal(
    `SELECT * FROM myco_config WHERE owner_id = ? LIMIT 1`,
    [ownerId]
  );

  if (rows.length === 0) {
    const now = new Date().toISOString();
    const defaultSecret = "whsec_waypoint_myco_local";
    await _execDnsRunInternal(
      `INSERT OR IGNORE INTO myco_config (
        owner_id, enabled, endpoint_url, webhook_secret, ferpa_sanitize_external,
        auto_sync_leads, auto_sync_discovery, auto_sync_case_compass, auto_sync_meetings, updated_at
      ) VALUES (?, 1, '', ?, 1, 1, 1, 1, 1, ?)`,
      [ownerId, defaultSecret, now]
    );
    return {
      ownerId,
      enabled: true,
      endpointUrl: "",
      webhookSecret: defaultSecret,
      ferpaSanitizeExternal: true,
      autoSyncLeads: true,
      autoSyncDiscovery: true,
      autoSyncCaseCompass: true,
      autoSyncMeetings: true,
      updatedAt: now,
    };
  }

  const row = rows[0];
  return {
    ownerId: Number(row.owner_id ?? ownerId),
    enabled: Number(row.enabled ?? 1) === 1,
    endpointUrl: String(row.endpoint_url ?? ""),
    webhookSecret: String(row.webhook_secret ?? "whsec_waypoint_myco_local"),
    ferpaSanitizeExternal: Number(row.ferpa_sanitize_external ?? 1) === 1,
    autoSyncLeads: Number(row.auto_sync_leads ?? 1) === 1,
    autoSyncDiscovery: Number(row.auto_sync_discovery ?? 1) === 1,
    autoSyncCaseCompass: Number(row.auto_sync_case_compass ?? 1) === 1,
    autoSyncMeetings: Number(row.auto_sync_meetings ?? 1) === 1,
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

export async function saveMycoConfig(
  ownerId: number,
  input: Partial<Omit<MycoConfigRecord, "ownerId" | "updatedAt">>
): Promise<MycoConfigRecord> {
  await ensureMycoTables();
  const current = await getMycoConfig(ownerId);
  const next: MycoConfigRecord = {
    ownerId,
    enabled: input.enabled ?? current.enabled,
    endpointUrl: (input.endpointUrl ?? current.endpointUrl).trim(),
    webhookSecret: (input.webhookSecret ?? current.webhookSecret).trim() || "whsec_waypoint_myco_local",
    ferpaSanitizeExternal: input.ferpaSanitizeExternal ?? current.ferpaSanitizeExternal,
    autoSyncLeads: input.autoSyncLeads ?? current.autoSyncLeads,
    autoSyncDiscovery: input.autoSyncDiscovery ?? current.autoSyncDiscovery,
    autoSyncCaseCompass: input.autoSyncCaseCompass ?? current.autoSyncCaseCompass,
    autoSyncMeetings: input.autoSyncMeetings ?? current.autoSyncMeetings,
    updatedAt: new Date().toISOString(),
  };

  await _execDnsRunInternal(
    `INSERT INTO myco_config (
      owner_id, enabled, endpoint_url, webhook_secret, ferpa_sanitize_external,
      auto_sync_leads, auto_sync_discovery, auto_sync_case_compass, auto_sync_meetings, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(owner_id) DO UPDATE SET
      enabled = excluded.enabled,
      endpoint_url = excluded.endpoint_url,
      webhook_secret = excluded.webhook_secret,
      ferpa_sanitize_external = excluded.ferpa_sanitize_external,
      auto_sync_leads = excluded.auto_sync_leads,
      auto_sync_discovery = excluded.auto_sync_discovery,
      auto_sync_case_compass = excluded.auto_sync_case_compass,
      auto_sync_meetings = excluded.auto_sync_meetings,
      updated_at = excluded.updated_at`,
    [
      ownerId,
      next.enabled ? 1 : 0,
      next.endpointUrl,
      next.webhookSecret,
      next.ferpaSanitizeExternal ? 1 : 0,
      next.autoSyncLeads ? 1 : 0,
      next.autoSyncDiscovery ? 1 : 0,
      next.autoSyncCaseCompass ? 1 : 0,
      next.autoSyncMeetings ? 1 : 0,
      next.updatedAt,
    ]
  );

  return next;
}

function mapSporeRow(row: Record<string, any>): MycoSporeRecord {
  let tags: string[] = [];
  try {
    const parsed = JSON.parse(String(row.tags_json || "[]"));
    if (Array.isArray(parsed)) tags = parsed.map(String);
  } catch {
    tags = [];
  }

  return {
    id: String(row.spore_id),
    ownerId: Number(row.owner_id ?? 1),
    kind: (row.kind || "discovery") as MycoSporeKind,
    title: String(row.title || ""),
    summary: String(row.summary || ""),
    tags,
    source: String(row.source || "waypoint-crm"),
    author: String(row.author || "Waypoint Staff"),
    ferpaSanitized: Number(row.ferpa_sanitized ?? 1) === 1,
    entityType: row.entity_type ? String(row.entity_type) : null,
    entityId: row.entity_id ? String(row.entity_id) : null,
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

export async function listMycoSpores(params: {
  ownerId?: number;
  query?: string;
  kind?: string;
  limit?: number;
} = {}): Promise<MycoSporeRecord[]> {
  await ensureMycoTables();
  const ownerId = params.ownerId ?? 1;
  const limit = Math.max(1, Math.min(100, params.limit ?? 50));

  const rows = await _execDnsSelectInternal(
    `SELECT * FROM myco_spores WHERE owner_id = ? ORDER BY created_at DESC LIMIT ?`,
    [ownerId, limit]
  );
  const all = rows.map(mapSporeRow);

  const q = (params.query || "").trim().toLowerCase();
  const k = (params.kind || "").trim().toLowerCase();

  return all.filter((spore) => {
    if (k && k !== "all" && spore.kind !== k) return false;
    if (!q) return true;
    const text = [spore.id, spore.title, spore.summary, spore.source, spore.author, ...spore.tags]
      .join(" ")
      .toLowerCase();
    return text.includes(q);
  });
}

export async function upsertMycoSpore(input: {
  id?: string;
  ownerId?: number;
  kind: MycoSporeKind;
  title: string;
  summary: string;
  tags?: string[];
  source?: string;
  author?: string;
  ferpaSanitized?: boolean;
  entityType?: string | null;
  entityId?: string | null;
}): Promise<MycoSporeRecord> {
  await ensureMycoTables();
  const id =
    input.id?.trim() ||
    `spore-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const ownerId = input.ownerId ?? 1;
  const now = new Date().toISOString();
  const tags = (input.tags || []).map((t) => t.trim()).filter(Boolean);

  const record: MycoSporeRecord = {
    id,
    ownerId,
    kind: input.kind,
    title: input.title.trim(),
    summary: input.summary.trim(),
    tags,
    source: (input.source || "waypoint-crm").trim(),
    author: (input.author || "Waypoint Staff").trim(),
    ferpaSanitized: input.ferpaSanitized ?? true,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    createdAt: now,
  };

  await _execDnsRunInternal(
    `INSERT INTO myco_spores (
      spore_id, owner_id, kind, title, summary, tags_json, source, author, ferpa_sanitized, entity_type, entity_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(spore_id) DO UPDATE SET
      kind = excluded.kind,
      title = excluded.title,
      summary = excluded.summary,
      tags_json = excluded.tags_json,
      source = excluded.source,
      author = excluded.author,
      ferpa_sanitized = excluded.ferpa_sanitized,
      entity_type = excluded.entity_type,
      entity_id = excluded.entity_id`,
    [
      record.id,
      record.ownerId,
      record.kind,
      record.title,
      record.summary,
      JSON.stringify(record.tags),
      record.source,
      record.author,
      record.ferpaSanitized ? 1 : 0,
      record.entityType,
      record.entityId,
      record.createdAt,
    ]
  );

  await writeSporeToLocalFile(record);
  return record;
}

export async function deleteMycoSpore(ownerId: number, sporeId: string): Promise<boolean> {
  await ensureMycoTables();
  await _execDnsRunInternal(
    `DELETE FROM myco_spores WHERE owner_id = ? AND spore_id = ?`,
    [ownerId, sporeId]
  );
  await removeSporeFromLocalFile(sporeId);
  return true;
}

export async function recordMycoSyncLog(input: {
  ownerId?: number;
  direction: "inbound" | "outbound";
  eventType: string;
  status: MycoSyncLogRecord["status"];
  summary: string;
  doNotServeMatched?: boolean;
  ferpaSanitized?: boolean;
  payloadPreview?: string | null;
}): Promise<MycoSyncLogRecord> {
  await ensureMycoTables();
  const ownerId = input.ownerId ?? 1;
  const now = new Date().toISOString();

  await _execDnsRunInternal(
    `INSERT INTO myco_sync_logs (
      owner_id, direction, event_type, status, summary, do_not_serve_matched, ferpa_sanitized, payload_preview, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ownerId,
      input.direction,
      input.eventType,
      input.status,
      input.summary,
      input.doNotServeMatched ? 1 : 0,
      input.ferpaSanitized !== false ? 1 : 0,
      input.payloadPreview ? input.payloadPreview.slice(0, 600) : null,
      now,
    ]
  );

  const rows = await _execDnsSelectInternal(
    `SELECT * FROM myco_sync_logs WHERE owner_id = ? ORDER BY id DESC LIMIT 1`,
    [ownerId]
  );
  const row = rows[0] || {};
  return {
    id: Number(row.id ?? 1),
    ownerId,
    direction: input.direction,
    eventType: input.eventType,
    status: input.status,
    summary: input.summary,
    doNotServeMatched: Boolean(input.doNotServeMatched),
    ferpaSanitized: input.ferpaSanitized !== false,
    payloadPreview: input.payloadPreview ?? null,
    createdAt: String(row.created_at ?? now),
  };
}

export async function listMycoSyncLogs(ownerId = 1, limit = 15): Promise<MycoSyncLogRecord[]> {
  await ensureMycoTables();
  const rows = await _execDnsSelectInternal(
    `SELECT * FROM myco_sync_logs WHERE owner_id = ? ORDER BY id DESC LIMIT ?`,
    [ownerId, Math.max(1, Math.min(100, limit))]
  );
  return rows.map((row) => ({
    id: Number(row.id),
    ownerId: Number(row.owner_id ?? ownerId),
    direction: (row.direction === "inbound" ? "inbound" : "outbound") as "inbound" | "outbound",
    eventType: String(row.event_type || ""),
    status: (row.status || "stored_locally") as MycoSyncLogRecord["status"],
    summary: String(row.summary || ""),
    doNotServeMatched: Number(row.do_not_serve_matched ?? 0) === 1,
    ferpaSanitized: Number(row.ferpa_sanitized ?? 1) === 1,
    payloadPreview: row.payload_preview ? String(row.payload_preview) : null,
    createdAt: String(row.created_at || new Date().toISOString()),
  }));
}


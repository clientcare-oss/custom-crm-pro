import crypto from "crypto";
import { sql } from "drizzle-orm";
import { getDb } from "./connection";
import {
  checkBackendModuleAccess,
  type StaffAccessProfile,
} from "../_core/staffAccess";

export type IdleTimeoutMinutes = 2 | 5 | 10 | 15;
export const SUPPORTED_IDLE_TIMEOUT_MINUTES: IdleTimeoutMinutes[] = [2, 5, 10, 15];
export const DEFAULT_IDLE_TIMEOUT_MINUTES: IdleTimeoutMinutes = 5;
export const MAX_SHORTCUTS = 6;

export interface StartScreenShortcutDefinition {
  id: string;
  label: string;
  description: string;
  path: string;
  iconKey:
    | "new_client"
    | "dashboard"
    | "students"
    | "calendar"
    | "cases"
    | "tasks"
    | "contacts"
    | "meeting_workspace"
    | "leads"
    | "call_center"
    | "document_vault"
    | "crew_quarters"
    | "tools"
    | "knowledge_base"
    | "templates"
    | "invoices"
    | "automations"
    | "metrics"
    | "team"
    | "settings";
  /** Module ID in staffAccess.ts if restricted by role permissions; null if available to all authenticated staff */
  requiredModuleId: string | null;
}

export const START_SCREEN_SHORTCUT_CATALOG: StartScreenShortcutDefinition[] = [
  {
    id: "new_client",
    label: "New Client",
    description: "Create a new client or family intake record",
    path: "/leads?newClient=1",
    iconKey: "new_client",
    requiredModuleId: null,
  },
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Personal employee dashboard & Crew Quarters (PG-038)",
    path: "/",
    iconKey: "dashboard",
    requiredModuleId: "crew_quarters",
  },
  {
    id: "students",
    label: "Students",
    description: "Student roster and IEP advocacy case files",
    path: "/students",
    iconKey: "students",
    requiredModuleId: "students_cases",
  },
  {
    id: "calendar",
    label: "Calendar",
    description: "Appointments, team dispatch, and schedule",
    path: "/calendar",
    iconKey: "calendar",
    requiredModuleId: "calendar",
  },
  {
    id: "cases",
    label: "Cases",
    description: "Interactive advocacy case pipeline & stages",
    path: "/advocacy-pipeline",
    iconKey: "cases",
    requiredModuleId: "advocacy_pipeline",
  },
  {
    id: "my_tasks",
    label: "My Tasks",
    description: "Personal action items, IEP reviews, and to-dos",
    path: "/tasks",
    iconKey: "tasks",
    requiredModuleId: "tasks",
  },
  {
    id: "contacts",
    label: "Contacts",
    description: "Parents, clients, educators, and professionals",
    path: "/contacts",
    iconKey: "contacts",
    requiredModuleId: null,
  },
  {
    id: "meeting_workspace",
    label: "Meeting Workspace",
    description: "Assemble, blueprint, and live IEP meeting console",
    path: "/meeting-workspace",
    iconKey: "meeting_workspace",
    requiredModuleId: "meeting_workspace",
  },
  {
    id: "lead_center",
    label: "Lead Center",
    description: "Prospective family inquiries & discovery calls",
    path: "/leads",
    iconKey: "leads",
    requiredModuleId: "leads",
  },
  {
    id: "call_center",
    label: "Call Center",
    description: "Inbound family calls, voicemail, and Quo dialer",
    path: "/call-center",
    iconKey: "call_center",
    requiredModuleId: "call_center",
  },
  {
    id: "document_vault",
    label: "Document Vault",
    description: "Agreements, e-signatures, and smart files",
    path: "/agreements",
    iconKey: "document_vault",
    requiredModuleId: "contracts",
  },
  {
    id: "crew_quarters",
    label: "Crew Quarters",
    description: "Personal employee station, messages, and timesheet",
    path: "/crew-quarters",
    iconKey: "crew_quarters",
    requiredModuleId: "crew_quarters",
  },
  {
    id: "tools_hub",
    label: "Advocate Tools",
    description: "PWN Decoder, IEP Comparator, and Voyage Recorder",
    path: "/tools",
    iconKey: "tools",
    requiredModuleId: "tools_hub",
  },
  {
    id: "knowledge_base",
    label: "Knowledge Base",
    description: "State law library, SOP walkthroughs, and guides",
    path: "/knowledge-base",
    iconKey: "knowledge_base",
    requiredModuleId: "knowledge_base",
  },
  {
    id: "templates",
    label: "Templates",
    description: "Email, document, and letter templates",
    path: "/templates",
    iconKey: "templates",
    requiredModuleId: "templates",
  },
  {
    id: "billing",
    label: "Billing & Invoices",
    description: "Client invoices, retainers, and Bill Guardian",
    path: "/invoices",
    iconKey: "invoices",
    requiredModuleId: "invoices",
  },
  {
    id: "automations",
    label: "Automations",
    description: "Trigger-based workflows and scheduled jobs",
    path: "/automations",
    iconKey: "automations",
    requiredModuleId: "automations",
  },
  {
    id: "metrics",
    label: "Waypoint Metrics",
    description: "Practice KPIs, revenue, and retention analytics",
    path: "/metrics",
    iconKey: "metrics",
    requiredModuleId: "settings",
  },
  {
    id: "team",
    label: "Team Management",
    description: "Staff directory, roles, and access permissions",
    path: "/team",
    iconKey: "team",
    requiredModuleId: "team",
  },
  {
    id: "settings",
    label: "Settings",
    description: "Practice profile, integrations, and configuration",
    path: "/settings",
    iconKey: "settings",
    requiredModuleId: "settings",
  },
];

export const DEFAULT_SHORTCUT_IDS: string[] = [
  "new_client",
  "dashboard",
  "students",
  "calendar",
];

export interface EmployeeWorkspaceLockRecord {
  employeeKey: string;
  userId: number;
  openId: string;
  shortcutIds: string[];
  pinSalt: string | null;
  pinHash: string | null;
  isLocked: boolean;
  previousPath: string;
  failedAttempts: number;
  lockedUntilMs: number | null;
  requiresReauth: boolean;
  idleTimeoutMinutes: IdleTimeoutMinutes;
  updatedAtMs: number;
}

const memoryStore = new Map<string, EmployeeWorkspaceLockRecord>();
let globalIdleTimeoutMinutes: IdleTimeoutMinutes = DEFAULT_IDLE_TIMEOUT_MINUTES;
let tableInitialized = false;

export function resolveEmployeeStorageKey(user: {
  id?: number | string | null;
  openId?: string | null;
  email?: string | null;
}): string {
  const openId = String(user?.openId || "").trim();
  if (openId) return `openid:${openId}`;
  const id = String(user?.id || "").trim();
  if (id) return `id:${id}`;
  const email = String(user?.email || "").trim().toLowerCase();
  if (email) return `email:${email}`;
  return "anonymous-staff";
}

async function ensureWorkspaceLockTable(): Promise<void> {
  if (tableInitialized) return;
  const db = await getDb();
  if (!db) return;
  try {
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS employee_workspace_lock (
        employee_key TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL DEFAULT 0,
        open_id TEXT NOT NULL DEFAULT '',
        shortcut_ids_json TEXT NOT NULL,
        pin_salt TEXT,
        pin_hash TEXT,
        is_locked INTEGER NOT NULL DEFAULT 0,
        previous_path TEXT NOT NULL DEFAULT '/',
        failed_attempts INTEGER NOT NULL DEFAULT 0,
        locked_until_ms INTEGER,
        requires_reauth INTEGER NOT NULL DEFAULT 0,
        idle_timeout_minutes INTEGER NOT NULL DEFAULT 5,
        updated_at_ms INTEGER NOT NULL
      )
    `);
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS workspace_security_policy (
        policy_key TEXT PRIMARY KEY,
        idle_timeout_minutes INTEGER NOT NULL DEFAULT 5,
        updated_at_ms INTEGER NOT NULL
      )
    `);
    const policyRows: any[] = await db.all(
      sql`SELECT idle_timeout_minutes FROM workspace_security_policy WHERE policy_key = 'default' LIMIT 1`
    );
    if (policyRows.length > 0) {
      const rawPolicyVal = Array.isArray(policyRows[0])
        ? policyRows[0][0]
        : policyRows[0]?.idle_timeout_minutes;
      const val = Number(rawPolicyVal);
      if (SUPPORTED_IDLE_TIMEOUT_MINUTES.includes(val as IdleTimeoutMinutes)) {
        globalIdleTimeoutMinutes = val as IdleTimeoutMinutes;
      }
    }
    tableInitialized = true;
  } catch (err) {
    console.warn("[WorkspaceLock] Table init warning:", err);
  }
}

export function isShortcutPermittedForStaff(
  shortcut: StartScreenShortcutDefinition,
  staffAccess?: StaffAccessProfile | null
): boolean {
  if (!staffAccess) return true;
  if (staffAccess.accountStatus === "inactive" || !staffAccess.isStaff) {
    return false;
  }
  if (staffAccess.hasAdminAccess || staffAccess.isProtectedOwner) {
    return true;
  }
  if (!shortcut.requiredModuleId) {
    return true;
  }
  const access = checkBackendModuleAccess(staffAccess, shortcut.requiredModuleId);
  return access !== "none";
}

export function getPermittedShortcutsForStaff(
  staffAccess?: StaffAccessProfile | null
): StartScreenShortcutDefinition[] {
  return START_SCREEN_SHORTCUT_CATALOG.filter((item) =>
    isShortcutPermittedForStaff(item, staffAccess)
  );
}

export function sanitizeShortcutIdsForStaff(
  shortcutIds: string[],
  staffAccess?: StaffAccessProfile | null
): string[] {
  const permittedMap = new Map(
    getPermittedShortcutsForStaff(staffAccess).map((s) => [s.id, s])
  );
  const seen = new Set<string>();
  const sanitized: string[] = [];

  for (const rawId of shortcutIds) {
    const id = String(rawId || "").trim();
    if (!id || seen.has(id)) continue;
    if (!permittedMap.has(id)) continue;
    seen.add(id);
    sanitized.push(id);
    if (sanitized.length >= MAX_SHORTCUTS) break;
  }

  return sanitized;
}

export function hashWorkspacePin(pin: string, saltHex?: string): { salt: string; hash: string } {
  const salt = saltHex || crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(pin, salt, 64).toString("hex");
  return { salt, hash: derived };
}

export function verifyWorkspacePinHash(pin: string, salt: string, expectedHash: string): boolean {
  try {
    const { hash } = hashWorkspacePin(pin, salt);
    const a = Buffer.from(hash, "hex");
    const b = Buffer.from(expectedHash, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function persistRecord(record: EmployeeWorkspaceLockRecord): Promise<void> {
  memoryStore.set(record.employeeKey, record);
  await ensureWorkspaceLockTable();
  const db = await getDb();
  if (!db) return;
  try {
    const shortcutsJson = JSON.stringify(record.shortcutIds);
    const isLockedInt = record.isLocked ? 1 : 0;
    const requiresReauthInt = record.requiresReauth ? 1 : 0;
    await db.run(sql`
      INSERT INTO employee_workspace_lock (
        employee_key,
        user_id,
        open_id,
        shortcut_ids_json,
        pin_salt,
        pin_hash,
        is_locked,
        previous_path,
        failed_attempts,
        locked_until_ms,
        requires_reauth,
        idle_timeout_minutes,
        updated_at_ms
      ) VALUES (
        ${record.employeeKey},
        ${record.userId},
        ${record.openId},
        ${shortcutsJson},
        ${record.pinSalt},
        ${record.pinHash},
        ${isLockedInt},
        ${record.previousPath},
        ${record.failedAttempts},
        ${record.lockedUntilMs},
        ${requiresReauthInt},
        ${record.idleTimeoutMinutes},
        ${record.updatedAtMs}
      )
      ON CONFLICT(employee_key) DO UPDATE SET
        user_id = excluded.user_id,
        open_id = excluded.open_id,
        shortcut_ids_json = excluded.shortcut_ids_json,
        pin_salt = excluded.pin_salt,
        pin_hash = excluded.pin_hash,
        is_locked = excluded.is_locked,
        previous_path = excluded.previous_path,
        failed_attempts = excluded.failed_attempts,
        locked_until_ms = excluded.locked_until_ms,
        requires_reauth = excluded.requires_reauth,
        idle_timeout_minutes = excluded.idle_timeout_minutes,
        updated_at_ms = excluded.updated_at_ms
    `);
  } catch (err) {
    console.warn("[WorkspaceLock] Failed to persist record to DB:", err);
  }
}

export async function getOrCreateEmployeeWorkspaceRecord(
  user: { id?: number | null; openId?: string | null; email?: string | null },
  staffAccess?: StaffAccessProfile | null
): Promise<EmployeeWorkspaceLockRecord> {
  const employeeKey = resolveEmployeeStorageKey(user);

  // If we already have an authoritative in-memory record in this process, return it directly
  const existingMem = memoryStore.get(employeeKey);
  if (existingMem) {
    existingMem.shortcutIds = sanitizeShortcutIdsForStaff(
      existingMem.shortcutIds,
      staffAccess
    );
    return existingMem;
  }

  await ensureWorkspaceLockTable();

  const db = await getDb();
  if (db) {
    try {
      const rows: any[] = await db.all(
        sql`SELECT
          employee_key,
          user_id,
          open_id,
          shortcut_ids_json,
          pin_salt,
          pin_hash,
          is_locked,
          previous_path,
          failed_attempts,
          locked_until_ms,
          requires_reauth,
          idle_timeout_minutes,
          updated_at_ms
        FROM employee_workspace_lock
        WHERE employee_key = ${employeeKey}
        LIMIT 1`
      );
      if (rows.length > 0) {
        const r = rows[0];
        const isArr = Array.isArray(r);
        const colUserId = isArr ? r[1] : r.user_id;
        const colOpenId = isArr ? r[2] : r.open_id;
        const colShortcutsJson = isArr ? r[3] : r.shortcut_ids_json;
        const colPinSalt = isArr ? r[4] : r.pin_salt;
        const colPinHash = isArr ? r[5] : r.pin_hash;
        const colIsLocked = isArr ? r[6] : r.is_locked;
        const colPreviousPath = isArr ? r[7] : r.previous_path;
        const colFailedAttempts = isArr ? r[8] : r.failed_attempts;
        const colLockedUntilMs = isArr ? r[9] : r.locked_until_ms;
        const colRequiresReauth = isArr ? r[10] : r.requires_reauth;
        const colIdleTimeout = isArr ? r[11] : r.idle_timeout_minutes;
        const colUpdatedAtMs = isArr ? r[12] : r.updated_at_ms;

        let parsedShortcuts: string[] = DEFAULT_SHORTCUT_IDS;
        try {
          if (colShortcutsJson != null && String(colShortcutsJson).trim() !== "") {
            const parsed = JSON.parse(String(colShortcutsJson));
            if (Array.isArray(parsed)) {
              parsedShortcuts = parsed;
            }
          }
        } catch {}

        const rawTimeout = Number(colIdleTimeout || globalIdleTimeoutMinutes);
        const validTimeout: IdleTimeoutMinutes = SUPPORTED_IDLE_TIMEOUT_MINUTES.includes(
          rawTimeout as IdleTimeoutMinutes
        )
          ? (rawTimeout as IdleTimeoutMinutes)
          : globalIdleTimeoutMinutes;

        const loaded: EmployeeWorkspaceLockRecord = {
          employeeKey,
          userId: Number(colUserId || user.id || 0),
          openId: String(colOpenId || user.openId || ""),
          shortcutIds: sanitizeShortcutIdsForStaff(parsedShortcuts, staffAccess),
          pinSalt: colPinSalt ? String(colPinSalt) : null,
          pinHash: colPinHash ? String(colPinHash) : null,
          isLocked: Boolean(Number(colIsLocked)),
          previousPath:
            colPreviousPath && String(colPreviousPath) !== "/dashboard"
              ? String(colPreviousPath)
              : "/",
          failedAttempts: Number(colFailedAttempts || 0),
          lockedUntilMs: colLockedUntilMs ? Number(colLockedUntilMs) : null,
          requiresReauth: Boolean(Number(colRequiresReauth)),
          idleTimeoutMinutes: validTimeout,
          updatedAtMs: Number(colUpdatedAtMs || Date.now()),
        };
        memoryStore.set(employeeKey, loaded);
        return loaded;
      }
    } catch (err) {
      console.warn("[WorkspaceLock] DB read fallback to memory:", err);
    }
  }

  const initialShortcuts = sanitizeShortcutIdsForStaff(
    DEFAULT_SHORTCUT_IDS,
    staffAccess
  );
  const created: EmployeeWorkspaceLockRecord = {
    employeeKey,
    userId: Number(user.id || 0),
    openId: String(user.openId || ""),
    shortcutIds: initialShortcuts,
    pinSalt: null,
    pinHash: null,
    isLocked: false,
    previousPath: "/",
    failedAttempts: 0,
    lockedUntilMs: null,
    requiresReauth: false,
    idleTimeoutMinutes: globalIdleTimeoutMinutes,
    updatedAtMs: Date.now(),
  };

  await persistRecord(created);
  return created;
}

export async function isEmployeeWorkspaceLocked(user: {
  id?: number | null;
  openId?: string | null;
  email?: string | null;
}): Promise<boolean> {
  const employeeKey = resolveEmployeeStorageKey(user);
  const mem = memoryStore.get(employeeKey);
  if (mem) {
    return mem.isLocked;
  }
  await ensureWorkspaceLockTable();
  const db = await getDb();
  if (!db) return false;
  try {
    const rows: any[] = await db.all(
      sql`SELECT is_locked FROM employee_workspace_lock WHERE employee_key = ${employeeKey} LIMIT 1`
    );
    if (rows.length > 0) {
      const rawLocked = Array.isArray(rows[0]) ? rows[0][0] : rows[0]?.is_locked;
      return Boolean(Number(rawLocked));
    }
  } catch {}
  return false;
}

export async function updateEmployeeShortcuts(
  user: { id?: number | null; openId?: string | null; email?: string | null },
  shortcutIds: string[],
  staffAccess?: StaffAccessProfile | null
): Promise<EmployeeWorkspaceLockRecord> {
  const record = await getOrCreateEmployeeWorkspaceRecord(user, staffAccess);
  if (record.isLocked) {
    throw new Error("Cannot modify Start Screen shortcuts while the workspace is locked.");
  }

  // Enforce max 6 shortcuts and no duplicates
  const trimmedIds = shortcutIds.map((s) => String(s).trim()).filter(Boolean);
  const uniqueIds = Array.from(new Set(trimmedIds));
  if (uniqueIds.length !== trimmedIds.length) {
    throw new Error("Duplicate shortcuts are not allowed.");
  }
  if (uniqueIds.length > MAX_SHORTCUTS) {
    throw new Error(`Maximum of ${MAX_SHORTCUTS} shortcuts allowed.`);
  }

  // Verify every requested shortcut exists and is permitted for this employee
  const permittedSet = new Set(
    getPermittedShortcutsForStaff(staffAccess).map((s) => s.id)
  );
  for (const id of uniqueIds) {
    if (!permittedSet.has(id)) {
      throw new Error(`Shortcut '${id}' is not permitted for your role.`);
    }
  }

  record.shortcutIds = uniqueIds;
  record.updatedAtMs = Date.now();
  await persistRecord(record);
  return record;
}

export async function setupEmployeePin(
  user: { id?: number | null; openId?: string | null; email?: string | null },
  pin: string,
  confirmPin: string,
  currentPin?: string,
  staffAccess?: StaffAccessProfile | null
): Promise<EmployeeWorkspaceLockRecord> {
  if (!/^\d{4}$/.test(pin)) {
    throw new Error("PIN must be exactly 4 digits (0-9).");
  }
  if (pin !== confirmPin) {
    throw new Error("PIN confirmation does not match.");
  }

  const record = await getOrCreateEmployeeWorkspaceRecord(user, staffAccess);
  if (record.pinSalt && record.pinHash && record.isLocked) {
    if (!currentPin) {
      throw new Error("Current PIN is required to change an existing PIN while locked.");
    }
    const validCurrent = verifyWorkspacePinHash(currentPin, record.pinSalt, record.pinHash);
    if (!validCurrent) {
      throw new Error("Current PIN is incorrect.");
    }
  }

  const { salt, hash } = hashWorkspacePin(pin);
  record.pinSalt = salt;
  record.pinHash = hash;
  record.failedAttempts = 0;
  record.lockedUntilMs = null;
  record.requiresReauth = false;
  record.updatedAtMs = Date.now();
  await persistRecord(record);
  return record;
}

export async function lockEmployeeWorkspace(
  user: { id?: number | null; openId?: string | null; email?: string | null },
  previousPath?: string,
  staffAccess?: StaffAccessProfile | null
): Promise<EmployeeWorkspaceLockRecord> {
  const record = await getOrCreateEmployeeWorkspaceRecord(user, staffAccess);
  if (!record.pinSalt || !record.pinHash) {
    throw new Error("PIN_SETUP_REQUIRED: Please establish a 4-digit PIN before locking the workspace.");
  }
  record.isLocked = true;
  if (
    previousPath &&
    previousPath.startsWith("/") &&
    !previousPath.startsWith("/start")
  ) {
    record.previousPath = previousPath;
  }
  record.updatedAtMs = Date.now();
  await persistRecord(record);
  return record;
}

export async function verifyAndUnlockEmployeeWorkspace(
  user: { id?: number | null; openId?: string | null; email?: string | null },
  pin: string,
  targetDestinationPath?: string,
  staffAccess?: StaffAccessProfile | null
): Promise<{
  unlocked: boolean;
  redirectToPath: string;
  failedAttempts: number;
  lockedUntilMs: number | null;
  requiresReauth: boolean;
  errorMessage?: string;
}> {
  const record = await getOrCreateEmployeeWorkspaceRecord(user, staffAccess);
  const now = Date.now();

  if (record.requiresReauth) {
    return {
      unlocked: false,
      redirectToPath: record.previousPath,
      failedAttempts: record.failedAttempts,
      lockedUntilMs: record.lockedUntilMs,
      requiresReauth: true,
      errorMessage:
        "Too many failed PIN attempts. Full account reauthentication is required to reset your PIN.",
    };
  }

  if (record.lockedUntilMs && record.lockedUntilMs > now) {
    const remainingSec = Math.ceil((record.lockedUntilMs - now) / 1000);
    return {
      unlocked: false,
      redirectToPath: record.previousPath,
      failedAttempts: record.failedAttempts,
      lockedUntilMs: record.lockedUntilMs,
      requiresReauth: false,
      errorMessage: `PIN entry temporarily locked. Please wait ${remainingSec}s before trying again.`,
    };
  }

  if (!record.pinSalt || !record.pinHash) {
    return {
      unlocked: false,
      redirectToPath: record.previousPath,
      failedAttempts: 0,
      lockedUntilMs: null,
      requiresReauth: false,
      errorMessage: "No PIN is configured for this account.",
    };
  }

  const isValid = /^\d{4}$/.test(pin) && verifyWorkspacePinHash(pin, record.pinSalt, record.pinHash);

  if (!isValid) {
    record.failedAttempts += 1;
    if (record.failedAttempts >= 5) {
      record.requiresReauth = true;
      record.lockedUntilMs = now + 5 * 60 * 1000;
    } else if (record.failedAttempts >= 3) {
      record.lockedUntilMs = now + 30 * 1000;
    }
    record.updatedAtMs = now;
    await persistRecord(record);

    const remainingBeforeReauth = Math.max(0, 5 - record.failedAttempts);
    const errorMessage = record.requiresReauth
      ? "Maximum PIN attempts exceeded. Please reauthenticate your account to reset your PIN."
      : record.lockedUntilMs && record.lockedUntilMs > now
      ? `Incorrect PIN. Temporarily locked for 30 seconds (${remainingBeforeReauth} attempt${remainingBeforeReauth === 1 ? "" : "s"} remaining before account reauthentication).`
      : `Incorrect PIN. ${remainingBeforeReauth} attempt${remainingBeforeReauth === 1 ? "" : "s"} remaining.`;

    return {
      unlocked: false,
      redirectToPath: record.previousPath,
      failedAttempts: record.failedAttempts,
      lockedUntilMs: record.lockedUntilMs,
      requiresReauth: record.requiresReauth,
      errorMessage,
    };
  }

  // Valid PIN — unlock workspace!
  record.isLocked = false;
  record.failedAttempts = 0;
  record.lockedUntilMs = null;
  record.requiresReauth = false;
  record.updatedAtMs = now;

  // Validate targetDestinationPath against permitted shortcuts if provided
  let destination =
    record.previousPath && record.previousPath !== "/dashboard"
      ? record.previousPath
      : "/";
  if (targetDestinationPath && targetDestinationPath.startsWith("/")) {
    const matchingShortcut = START_SCREEN_SHORTCUT_CATALOG.find(
      (s) => s.path === targetDestinationPath
    );
    if (matchingShortcut) {
      if (isShortcutPermittedForStaff(matchingShortcut, staffAccess)) {
        destination = targetDestinationPath;
      }
    } else {
      destination = targetDestinationPath;
    }
  }

  record.previousPath = destination;
  await persistRecord(record);

  return {
    unlocked: true,
    redirectToPath: destination,
    failedAttempts: 0,
    lockedUntilMs: null,
    requiresReauth: false,
  };
}

export async function resetEmployeePinWithReauth(
  user: { id?: number | null; openId?: string | null; email?: string | null; name?: string | null },
  confirmedEmail: string,
  newPin: string,
  confirmNewPin: string,
  staffAccess?: StaffAccessProfile | null
): Promise<EmployeeWorkspaceLockRecord> {
  if (!/^\d{4}$/.test(newPin)) {
    throw new Error("New PIN must be exactly 4 digits (0-9).");
  }
  if (newPin !== confirmNewPin) {
    throw new Error("New PIN confirmation does not match.");
  }

  const expectedEmail = (staffAccess?.email || user?.email || "").trim().toLowerCase();
  const suppliedEmail = confirmedEmail.trim().toLowerCase();
  if (!expectedEmail || suppliedEmail !== expectedEmail) {
    throw new Error("Account reauthentication failed: email address does not match your authenticated session.");
  }

  const record = await getOrCreateEmployeeWorkspaceRecord(user, staffAccess);
  const { salt, hash } = hashWorkspacePin(newPin);
  record.pinSalt = salt;
  record.pinHash = hash;
  record.isLocked = false;
  record.failedAttempts = 0;
  record.lockedUntilMs = null;
  record.requiresReauth = false;
  record.updatedAtMs = Date.now();
  await persistRecord(record);
  return record;
}

export async function updateIdleTimeoutPolicy(
  minutes: IdleTimeoutMinutes,
  user: { id?: number | null; openId?: string | null; email?: string | null },
  applyOrganizationWide: boolean,
  staffAccess?: StaffAccessProfile | null
): Promise<{ idleTimeoutMinutes: IdleTimeoutMinutes; organizationDefaultMinutes: IdleTimeoutMinutes }> {
  if (!SUPPORTED_IDLE_TIMEOUT_MINUTES.includes(minutes)) {
    throw new Error("Unsupported inactivity interval. Choose 2, 5, 10, or 15 minutes.");
  }

  if (applyOrganizationWide) {
    if (!staffAccess?.hasAdminAccess && !staffAccess?.isProtectedOwner) {
      throw new Error("Only administrators may change the organization-wide idle lock timeout.");
    }
    globalIdleTimeoutMinutes = minutes;
    await ensureWorkspaceLockTable();
    const db = await getDb();
    if (db) {
      try {
        await db.run(sql`
          INSERT INTO workspace_security_policy (policy_key, idle_timeout_minutes, updated_at_ms)
          VALUES ('default', ${minutes}, ${Date.now()})
          ON CONFLICT(policy_key) DO UPDATE SET
            idle_timeout_minutes = excluded.idle_timeout_minutes,
            updated_at_ms = excluded.updated_at_ms
        `);
      } catch {}
    }
  }

  const record = await getOrCreateEmployeeWorkspaceRecord(user, staffAccess);
  record.idleTimeoutMinutes = minutes;
  record.updatedAtMs = Date.now();
  await persistRecord(record);

  return {
    idleTimeoutMinutes: record.idleTimeoutMinutes,
    organizationDefaultMinutes: globalIdleTimeoutMinutes,
  };
}

export function getOrganizationIdleTimeoutMinutes(): IdleTimeoutMinutes {
  return globalIdleTimeoutMinutes;
}

export function __resetWorkspaceLockMemoryForTests(): void {
  memoryStore.clear();
  globalIdleTimeoutMinutes = DEFAULT_IDLE_TIMEOUT_MINUTES;
}

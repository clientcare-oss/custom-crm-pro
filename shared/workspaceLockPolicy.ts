/**
 * Shared pure policy helpers for Waypoint Start Screen & Automatic Idle Lock.
 * Meeting Workspace (PG-043) is exempt from automatic inactivity locking so live
 * IEP sessions, Blueprint reviews, and Prep workflows are never interrupted.
 */

export const AUTO_LOCK_EXEMPT_TAB_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

export function normalizeWorkspacePathname(rawPath: string): string {
  const withoutQueryOrHash = (rawPath || "").split(/[?#]/)[0].trim();
  if (!withoutQueryOrHash || withoutQueryOrHash === "/") {
    return "/";
  }
  const withLeadingSlash = withoutQueryOrHash.startsWith("/")
    ? withoutQueryOrHash
    : `/${withoutQueryOrHash}`;
  return withLeadingSlash.replace(/\/+$/, "") || "/";
}

export function isPublicOrPortalWorkspacePath(rawPath: string): boolean {
  const pathname = normalizeWorkspacePathname(rawPath);
  return (
    pathname === "/portal" ||
    pathname === "/client-portal" ||
    pathname === "/portal/book" ||
    pathname === "/book" ||
    pathname === "/intake" ||
    pathname === "/get-started" ||
    pathname === "/give" ||
    pathname.startsWith("/give/") ||
    pathname.startsWith("/form/") ||
    pathname.startsWith("/receipt/") ||
    pathname.startsWith("/portal/receipt/") ||
    pathname.startsWith("/smart-files/response/") ||
    pathname === "/first-mate/popout" ||
    pathname.startsWith("/first-mate/popout/")
  );
}

/**
 * Returns true when the given path is inside Meeting Workspace (PG-043,
 * PG-043-ASM, PG-043-BLP, PG-043-MTG), which must never auto-lock on idle.
 */
export function isAutoLockExemptPath(rawPath: string): boolean {
  const pathname = normalizeWorkspacePathname(rawPath);
  return (
    pathname === "/meeting-workspace" ||
    pathname.startsWith("/meeting-workspace/")
  );
}

function parseExemptTabsMap(
  rawStorageJson: string | null | undefined,
  nowMs: number
): Record<string, number> {
  if (!rawStorageJson) return {};
  try {
    const parsed = JSON.parse(rawStorageJson);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const cleaned: Record<string, number> = {};
    for (const [tabId, ts] of Object.entries(parsed as Record<string, unknown>)) {
      if (
        tabId &&
        typeof ts === "number" &&
        Number.isFinite(ts) &&
        nowMs - ts < AUTO_LOCK_EXEMPT_TAB_TTL_MS
      ) {
        cleaned[tabId] = ts;
      }
    }
    return cleaned;
  } catch {
    return {};
  }
}

export function hasActiveAutoLockExemptTab(
  rawStorageJson: string | null | undefined,
  nowMs: number
): boolean {
  const active = parseExemptTabsMap(rawStorageJson, nowMs);
  return Object.keys(active).length > 0;
}

export function upsertAutoLockExemptTab(
  rawStorageJson: string | null | undefined,
  tabId: string,
  nowMs: number
): string {
  const active = parseExemptTabsMap(rawStorageJson, nowMs);
  if (tabId) {
    active[tabId] = nowMs;
  }
  return JSON.stringify(active);
}

export function removeAutoLockExemptTab(
  rawStorageJson: string | null | undefined,
  tabId: string,
  nowMs: number
): string {
  const active = parseExemptTabsMap(rawStorageJson, nowMs);
  delete active[tabId];
  return JSON.stringify(active);
}

export interface EvaluateWorkspaceAutoLockInput {
  isStaffAuthenticated: boolean;
  isLocked: boolean;
  idleLockInFlight: boolean;
  pathname: string;
  hasOtherExemptTab?: boolean;
  nowMs: number;
  lastActivityMs: number;
  storedActivityMs?: number;
  idleTimeoutMinutes?: number | null;
}

export interface EvaluateWorkspaceAutoLockResult {
  shouldAutoLock: boolean;
  refreshedActivityMs: number | null;
  effectiveLastActivityMs: number;
}

export function evaluateWorkspaceAutoLock(
  input: EvaluateWorkspaceAutoLockInput
): EvaluateWorkspaceAutoLockResult {
  const storedMs =
    typeof input.storedActivityMs === "number" && Number.isFinite(input.storedActivityMs)
      ? input.storedActivityMs
      : 0;
  const effectiveLastActivityMs = Math.max(input.lastActivityMs, storedMs);

  if (
    !input.isStaffAuthenticated ||
    input.isLocked ||
    input.idleLockInFlight ||
    isPublicOrPortalWorkspacePath(input.pathname)
  ) {
    return {
      shouldAutoLock: false,
      refreshedActivityMs: null,
      effectiveLastActivityMs,
    };
  }

  if (isAutoLockExemptPath(input.pathname) || Boolean(input.hasOtherExemptTab)) {
    return {
      shouldAutoLock: false,
      refreshedActivityMs: input.nowMs,
      effectiveLastActivityMs: input.nowMs,
    };
  }

  const timeoutMs = (input.idleTimeoutMinutes || 5) * 60 * 1000;
  const elapsed = input.nowMs - effectiveLastActivityMs;

  return {
    shouldAutoLock: elapsed >= timeoutMs,
    refreshedActivityMs: null,
    effectiveLastActivityMs,
  };
}


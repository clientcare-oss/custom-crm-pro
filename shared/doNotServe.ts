/**
 * Shared Do Not Serve normalization, types, and formatting utilities.
 * Internal staff-only module — never expose these types or values in Parent Portal or public responses.
 */

export type DoNotServeStatus = "active" | "lifted";
export type DoNotServeScope = "individual" | "household";
export type DoNotServeSourceType = "archive" | "manual";

export type DoNotServeIdentifierType =
  | "contact_id"
  | "household_contact_id"
  | "phone"
  | "email"
  | "full_name"
  | "alias_name";

export type DoNotServeMatchTier = "hard_match" | "possible_name_match";

export type DoNotServeResolutionType =
  | "different_person"
  | "acknowledged"
  | "service_override";

export type DoNotServeAuditAction =
  | "created"
  | "undone"
  | "reason_updated"
  | "scope_updated"
  | "identifiers_updated"
  | "supporting_links_updated"
  | "note_added"
  | "note_corrected"
  | "lifted"
  | "reactivated"
  | "match_acknowledged"
  | "different_person"
  | "service_override"
  | "automated_send_held"
  | "contact_synced"
  | "contact_merged";

export interface DoNotServeSupportingLink {
  id: string;
  label: string;
  url: string;
  addedByName: string;
  addedAt: string;
}

export interface DoNotServeIdentifierRecord {
  id: number;
  entryId: number;
  identifierType: DoNotServeIdentifierType;
  rawValue: string;
  normalizedValue: string;
  label: string | null;
  isAutoSynced: boolean;
  createdAt: string;
  createdByName: string;
}

export interface DoNotServeNoteRecord {
  id: number;
  entryId: number;
  body: string;
  previousBody: string | null;
  authorUserId: number;
  authorEmployeeId: string | null;
  authorName: string;
  createdAt: string;
  updatedAt: string | null;
  updatedByName: string | null;
}

export interface DoNotServeAuditRecord {
  id: number;
  entryId: number;
  action: DoNotServeAuditAction;
  summary: string;
  reason: string | null;
  previousValueJson: string | null;
  newValueJson: string | null;
  channel: string | null;
  targetEntityType: string | null;
  targetEntityId: string | null;
  actorUserId: number | null;
  actorEmployeeId: string | null;
  actorName: string;
  createdAt: string;
}

export interface DoNotServeListRow {
  id: number;
  status: DoNotServeStatus;
  appliesTo: DoNotServeScope;
  sourceType: DoNotServeSourceType;
  linkedContactId: number | null;
  householdAnchorId: number | null;
  displayName: string;
  primaryPhone: string | null;
  primaryEmail: string | null;
  createdByName: string;
  createdAt: string;
  liftedAt: string | null;
  version: number;
}

export interface DoNotServeMatchedEntrySummary {
  entryId: number;
  displayName: string;
  appliesTo: DoNotServeScope;
  sourceType: DoNotServeSourceType;
  linkedContactId: number | null;
  matchTier: DoNotServeMatchTier;
  matchedOn: Array<{
    type: DoNotServeIdentifierType;
    matchedValue: string;
    label: string;
  }>;
  createdAt: string;
  createdByName: string;
}

export interface DoNotServeMatchEvaluation {
  hasActiveMatch: boolean;
  highestTier: DoNotServeMatchTier | null;
  holdsAutomatedSends: boolean;
  requiresServiceReview: boolean;
  serviceOverrideActive: boolean;
  differentPersonResolved: boolean;
  acknowledgedForCurrentEvent: boolean;
  shouldShowPopup: boolean;
  eventKey: string;
  identifierFingerprint: string;
  matches: DoNotServeMatchedEntrySummary[];
}

const GENERIC_NON_MATCHABLE_NAMES = new Set([
  "unknown caller",
  "unknown contact",
  "new client",
  "new student",
  "new parent",
  "parent client",
  "test client",
  "test parent",
  "test student",
  "client",
  "student",
  "parent",
  "anonymous",
]);

const HONORIFIC_PREFIXES = new Set([
  "mr",
  "mrs",
  "ms",
  "miss",
  "mx",
  "dr",
  "prof",
  "rev",
]);

const NAME_SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "esq", "phd", "md"]);

/**
 * Normalizes a full phone number for Do Not Serve matching.
 * - Strips spaces, parentheses, dashes, dots, and extensions ("ext 123", "x123").
 * - Handles equivalent US/Canada 10-digit and +1 / 1 / 001 11-digit formats -> "+1XXXXXXXXXX".
 * - Preserves international country codes (e.g. "+447911123456" / "0044 7911 123456" -> "+447911123456").
 * - Never matches on partial last-4 digits; requires at least 7 full digits.
 */
export function normalizePhoneForMatch(raw?: string | null): string | null {
  if (!raw) return null;
  let cleaned = String(raw).trim();
  if (!cleaned) return null;

  // Strip trailing extension markers (e.g., "ext. 204", "x99")
  cleaned = cleaned.replace(/\s*(?:ext\.?|extension|x|#)\s*\d+\s*$/i, "").trim();

  // Convert international "00" dialing prefix to "+"
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  }

  const hasExplicitPlus = cleaned.startsWith("+");
  const digits = cleaned.replace(/\D/g, "");

  if (digits.length < 7 || digits.length > 15) {
    return null;
  }

  // US/Canada 10-digit -> canonical +1XXXXXXXXXX
  if (!hasExplicitPlus && digits.length === 10) {
    return `+1${digits}`;
  }

  // US/Canada 11-digit starting with 1 (with or without +) -> canonical +1XXXXXXXXXX
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  // International with explicit +
  if (hasExplicitPlus) {
    return `+${digits}`;
  }

  // International 11-15 digits without + (not starting with 1)
  if (digits.length > 10) {
    return `+${digits}`;
  }

  // Full 7-9 digit local number
  return digits;
}

/**
 * Normalizes an email address for Do Not Serve matching.
 */
export function normalizeEmailForMatch(raw?: string | null): string | null {
  if (!raw) return null;
  let cleaned = String(raw).trim();
  if (!cleaned) return null;

  // Extract from "Display Name <user@domain.com>" if present
  const angleMatch = cleaned.match(/<([^<>@\s]+@[^<>@\s]+)>/);
  if (angleMatch?.[1]) {
    cleaned = angleMatch[1];
  }

  cleaned = cleaned.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
    return null;
  }
  return cleaned;
}

/**
 * Normalizes a person's full name conservatively for Do Not Serve candidate matching.
 * - Case-insensitive, punctuation-tolerant, whitespace-collapsed.
 * - Requires at least two meaningful tokens (first + last name) so single first names,
 *   common surnames alone, or short initials never trigger false-positive matches.
 */
export function normalizeFullNameForMatch(raw?: string | null): string | null {
  if (!raw) return null;
  let cleaned = String(raw)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return null;

  let tokens = cleaned.split(" ").filter(Boolean);

  // Strip leading honorifics
  while (tokens.length > 0 && HONORIFIC_PREFIXES.has(tokens[0])) {
    tokens.shift();
  }
  // Strip trailing generational/professional suffixes if 3+ tokens exist
  while (tokens.length >= 3 && NAME_SUFFIXES.has(tokens[tokens.length - 1])) {
    tokens.pop();
  }

  // Conservative rule: must have at least 2 tokens (e.g. first + last), and at least one token >= 2 chars
  if (tokens.length < 2) {
    return null;
  }
  if (tokens.every((t) => t.length < 2)) {
    return null;
  }

  const joined = tokens.join(" ");
  if (GENERIC_NON_MATCHABLE_NAMES.has(joined)) {
    return null;
  }
  return joined;
}

/**
 * Builds a deterministic fingerprint of candidate identifiers so "Different person"
 * resolutions automatically recheck if phone, email, or name changes later.
 */
export function buildIdentifierFingerprint(input: {
  contactIds?: number[];
  phones?: Array<string | null | undefined>;
  emails?: Array<string | null | undefined>;
  names?: Array<string | null | undefined>;
}): string {
  const cIds = Array.from(
    new Set((input.contactIds || []).filter((n) => Number.isFinite(n) && n > 0))
  ).sort((a, b) => a - b);

  const phones = Array.from(
    new Set(
      (input.phones || [])
        .map((p) => normalizePhoneForMatch(p))
        .filter((p): p is string => Boolean(p))
    )
  ).sort();

  const emails = Array.from(
    new Set(
      (input.emails || [])
        .map((e) => normalizeEmailForMatch(e))
        .filter((e): e is string => Boolean(e))
    )
  ).sort();

  const names = Array.from(
    new Set(
      (input.names || [])
        .map((n) => normalizeFullNameForMatch(n))
        .filter((n): n is string => Boolean(n))
    )
  ).sort();

  return `c:${cIds.join(",")}|p:${phones.join(",")}|e:${emails.join(",")}|n:${names.join(",")}`;
}

const SHORT_TZ_ABBREV: Record<string, string> = {
  "America/New_York": "ET",
  "America/Chicago": "CT",
  "America/Denver": "MT",
  "America/Phoenix": "MST",
  "America/Los_Angeles": "PT",
  "America/Anchorage": "AKT",
  "Pacific/Honolulu": "HT",
};

/**
 * Formats a server timestamp in the CRM's configured timezone with clear timezone suffix
 * (e.g. "Nov 14, 2026 · 9:30 AM ET").
 */
export function formatDoNotServeTimestamp(
  dateInput: Date | string | number | null | undefined,
  timeZone: string = "America/New_York"
): string {
  if (!dateInput) return "—";
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return "—";

  const effectiveTz = timeZone || "America/New_York";
  try {
    const datePart = new Intl.DateTimeFormat("en-US", {
      timeZone: effectiveTz,
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
    const timePart = new Intl.DateTimeFormat("en-US", {
      timeZone: effectiveTz,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
    const tzLabel =
      SHORT_TZ_ABBREV[effectiveTz] ||
      new Intl.DateTimeFormat("en-US", {
        timeZone: effectiveTz,
        timeZoneName: "short",
      })
        .formatToParts(d)
        .find((p) => p.type === "timeZoneName")?.value ||
      "ET";

    return `${datePart} · ${timePart} ${tzLabel}`;
  } catch {
    return d.toISOString();
  }
}


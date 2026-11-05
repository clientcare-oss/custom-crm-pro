/**
 * Shared utility for Appointment Client-Facing Messages, Automatic Meeting-Link Status,
 * and Private Internal Advocate Notes separation.
 */

export const DEFAULT_PENDING_LINK_MESSAGE =
  "Meeting link pending. Please forward the virtual meeting link to Waypoint Advocates as soon as the school sends it to you. Please do not assume the school will send it directly to us.";

export const READY_LINK_HEADLINE = "Your meeting link is ready!";

export const READY_LINK_SUPPORTING_MESSAGE =
  "We’ve received your meeting link, and Waypoint is ready to join you. Use the button below when it’s time for your meeting.";

export const PENDING_LINK_HEADLINE = "Meeting link pending";

const INTERNAL_NOTES_DELIMITER = "\n---[WAYPOINT_PRIVATE_INTERNAL_NOTES]---\n";
const CLIENT_DIRECTIONS_PREFIX = "[CLIENT_DIRECTIONS]:";

export interface ParsedAppointmentContent {
  /** Custom client-facing message/directions (if customized by advocate) */
  customClientMessage: string;
  /** Strictly private internal advocate notes (never shown to clients) */
  internalNotes: string;
}

/**
 * Checks whether a meeting link string is a valid virtual meeting URL.
 */
export function isValidMeetingLink(link?: string | null): boolean {
  if (!link) return false;
  const trimmed = link.trim();
  if (!trimmed) return false;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    return Boolean(parsed.hostname && parsed.hostname.includes("."));
  } catch {
    return false;
  }
}

/**
 * Normalizes a meeting URL so it always has http:// or https:// for anchor hrefs.
 */
export function normalizeMeetingLink(link?: string | null): string | null {
  if (!isValidMeetingLink(link)) return null;
  const trimmed = link!.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * Parses the stored appointment `description` field into:
 * - `customClientMessage`: Client-facing directions/message
 * - `internalNotes`: Private internal advocate notes
 *
 * Backward-compatible with existing plain-text descriptions:
 * - If delimiter `---[WAYPOINT_PRIVATE_INTERNAL_NOTES]---` is present, splits cleanly.
 * - If no delimiter is present, treats legacy plain text without `[CLIENT_DIRECTIONS]:` as `internalNotes`
 *   unless it starts with `[CLIENT_DIRECTIONS]:` or matches the pending message.
 */
export function parseAppointmentDescription(rawDescription?: string | null): ParsedAppointmentContent {
  if (!rawDescription) {
    return {
      customClientMessage: "",
      internalNotes: "",
    };
  }

  if (rawDescription.includes(INTERNAL_NOTES_DELIMITER)) {
    const [clientPart, ...internalParts] = rawDescription.split(INTERNAL_NOTES_DELIMITER);
    const cleanedClient = clientPart.startsWith(CLIENT_DIRECTIONS_PREFIX)
      ? clientPart.slice(CLIENT_DIRECTIONS_PREFIX.length).trim()
      : clientPart.trim();
    return {
      customClientMessage: cleanedClient,
      internalNotes: internalParts.join(INTERNAL_NOTES_DELIMITER).trim(),
    };
  }

  const trimmed = rawDescription.trim();
  if (trimmed.startsWith(CLIENT_DIRECTIONS_PREFIX)) {
    return {
      customClientMessage: trimmed.slice(CLIENT_DIRECTIONS_PREFIX.length).trim(),
      internalNotes: "",
    };
  }

  // Legacy plain-text descriptions are kept private as internal advocate notes by default
  return {
    customClientMessage: "",
    internalNotes: trimmed,
  };
}

/**
 * Serializes `customClientMessage` and `internalNotes` into a single `description` string
 * for database persistence while keeping internal notes clearly separated.
 */
export function serializeAppointmentDescription(
  customClientMessage?: string | null,
  internalNotes?: string | null
): string {
  const clientClean = (customClientMessage || "").trim();
  const internalClean = (internalNotes || "").trim();

  // If the client message is identical to the default pending message, we store it so custom edits are preserved,
  // or if both are empty, return empty string.
  if (!clientClean && !internalClean) {
    return "";
  }

  if (clientClean && !internalClean) {
    return `${CLIENT_DIRECTIONS_PREFIX}${clientClean}`;
  }

  return `${CLIENT_DIRECTIONS_PREFIX}${clientClean}${INTERNAL_NOTES_DELIMITER}${internalClean}`;
}

/**
 * Strips any private internal advocate notes from a raw description before sending or rendering to a client.
 */
export function stripPrivateInternalNotes(rawDescription?: string | null): string {
  const { customClientMessage } = parseAppointmentDescription(rawDescription);
  return customClientMessage;
}

export interface ClientFacingMeetingView {
  hasValidLink: boolean;
  isLinkReady: boolean;
  meetingUrl: string | null;
  normalizedLink: string | undefined;
  statusHeadline: string;
  headline: string;
  primaryMessage: string;
  supportingMessage: string;
  additionalCustomDirections: string | null;
  additionalDirections: string | null;
  joinButtonLabel: string;
}

/**
 * Computes the exact client-facing meeting status, message, and join button state
 * for both the "Client Preview" in the calendar drawer and the actual Client Portal.
 */
export function resolveClientFacingMeetingView(params: {
  videoLink?: string | null;
  clientMeetingLink?: string | null;
  location?: string | null;
  description?: string | null;
  customClientMessageOverride?: string;
}): ClientFacingMeetingView {
  const rawLink =
    params.videoLink ||
    params.clientMeetingLink ||
    (params.location && /^https?:\/\//i.test(params.location.trim()) ? params.location : null) ||
    null;
  const normalizedUrl = normalizeMeetingLink(rawLink);
  const hasValidLink = Boolean(normalizedUrl);

  const parsed = parseAppointmentDescription(params.description);
  const rawCustom =
    params.customClientMessageOverride !== undefined
      ? params.customClientMessageOverride.trim()
      : parsed.customClientMessage.trim();

  // Determine whether the custom text is just the default pending text or has custom directions
  const isDefaultPendingText =
    !rawCustom ||
    rawCustom === DEFAULT_PENDING_LINK_MESSAGE ||
    rawCustom.toLowerCase() === DEFAULT_PENDING_LINK_MESSAGE.toLowerCase();

  // If the user appended extra directions onto the default pending message, extract the extra part when link becomes ready
  let extraDirectionsWhenReady: string | null = null;
  if (!isDefaultPendingText) {
    if (rawCustom.startsWith(DEFAULT_PENDING_LINK_MESSAGE)) {
      const remainder = rawCustom.slice(DEFAULT_PENDING_LINK_MESSAGE.length).trim();
      extraDirectionsWhenReady = remainder || null;
    } else {
      extraDirectionsWhenReady = rawCustom;
    }
  }

  if (hasValidLink && normalizedUrl) {
    return {
      hasValidLink: true,
      isLinkReady: true,
      meetingUrl: normalizedUrl,
      normalizedLink: normalizedUrl,
      statusHeadline: READY_LINK_HEADLINE,
      headline: READY_LINK_HEADLINE,
      primaryMessage: READY_LINK_SUPPORTING_MESSAGE,
      supportingMessage: READY_LINK_SUPPORTING_MESSAGE,
      additionalCustomDirections: extraDirectionsWhenReady,
      additionalDirections: extraDirectionsWhenReady,
      joinButtonLabel: "Join Meeting",
    };
  }

  const pendingPrimaryMessage = isDefaultPendingText ? DEFAULT_PENDING_LINK_MESSAGE : rawCustom;
  return {
    hasValidLink: false,
    isLinkReady: false,
    meetingUrl: null,
    normalizedLink: undefined,
    statusHeadline: PENDING_LINK_HEADLINE,
    headline: PENDING_LINK_HEADLINE,
    primaryMessage: pendingPrimaryMessage,
    supportingMessage: pendingPrimaryMessage,
    additionalCustomDirections: null,
    additionalDirections: null,
    joinButtonLabel: "Join Meeting",
  };
}


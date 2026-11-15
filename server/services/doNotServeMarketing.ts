import type {
  DoNotServeMatchedEntrySummary,
  DoNotServeMatchEvaluation,
} from "../../shared/doNotServe";
import { getActiveDoNotServeIdentifiersDb } from "../db/doNotServe";
import { insertDoNotServeAuditDb } from "../db/doNotServeMutations";
import { evaluateDoNotServeCandidate } from "./doNotServeService";

export interface MarketingEmailContextInput {
  isMarketing?: boolean;
  category?: string | null;
  templateName?: string | null;
  automationName?: string | null;
  triggerEvent?: string | null;
  subject?: string | null;
}

const MARKETING_CATEGORY_PATTERN =
  /\b(marketing|newsletter|newsletters|campaign|campaigns|promotion|promotional|broadcast|outreach|nurture|drip|follow-ups\s*&\s*reviews|reviews|resources|announcements?)\b/i;

const MARKETING_SIGNAL_PATTERN =
  /\b(marketing|newsletter|campaign|promot(?:e|ion|ional)|special\s+offer|broadcast|nurture|drip|re-?engagement|review\s+request|leave\s+a\s+review|honest\s+review|google\s+review|testimonial|resource\s+recommendation|monthly\s+update|seasonal\s+update|event\s+invite|webinar|mailing\s+list|supporter\s+update|donor\s+update)\b/i;

/**
 * Determines whether an outbound email context represents a marketing, promotional,
 * newsletter, review-solicitation, resource-outreach, or nurture broadcast.
 */
export function isMarketingEmailContext(input: MarketingEmailContextInput): boolean {
  if (input.isMarketing === true) return true;
  if (input.isMarketing === false) return false;

  if (input.category && MARKETING_CATEGORY_PATTERN.test(input.category.trim())) {
    return true;
  }

  const combinedText = [
    input.templateName || "",
    input.automationName || "",
    input.triggerEvent || "",
    input.subject || "",
  ]
    .filter(Boolean)
    .join(" ");

  if (combinedText && MARKETING_SIGNAL_PATTERN.test(combinedText)) {
    return true;
  }

  return false;
}

export interface MarketingSuppressionResult {
  suppressed: boolean;
  reason?: string;
  matchedEntries: DoNotServeMatchedEntrySummary[];
  evaluation: DoNotServeMatchEvaluation;
}

/**
 * Evaluates whether a recipient is on the active Do Not Serve / Blacklist register
 * and must be suppressed from receiving any marketing email.
 *
 * Per Do Not Serve matching rules:
 * - Suppresses on active `hard_match` (linked contact_id, household_contact_id under
 *   Household scope, normalized email, or normalized phone) — even if a one-time
 *   service override existed elsewhere, unless resolved as `different_person` for
 *   this exact target + identifier fingerprint.
 * - Does NOT automatically suppress solely due to a common/name-only match
 *   (`possible_name_match`).
 */
export async function checkMarketingEmailSuppression(params: {
  ownerId?: number;
  contactIds?: Array<number | null | undefined>;
  emails?: Array<string | null | undefined>;
  phones?: Array<string | null | undefined>;
  names?: Array<string | null | undefined>;
  channel: string;
  targetEntityType?: string;
  targetEntityId?: string;
  subject?: string | null;
  recordAudit?: boolean;
}): Promise<MarketingSuppressionResult> {
  const ownerId = params.ownerId || 1;
  const evaluation = await evaluateDoNotServeCandidate({
    ownerId,
    contactIds: params.contactIds,
    emails: params.emails,
    phones: params.phones,
    names: params.names,
    targetEntityType: params.targetEntityType || "marketing_email",
    targetEntityId: params.targetEntityId || (params.emails || []).filter(Boolean).join(",") || "unknown",
  });

  const hardMatches = evaluation.matches.filter((m) => m.matchTier === "hard_match");
  if (!evaluation.hasActiveMatch || evaluation.highestTier !== "hard_match" || hardMatches.length === 0) {
    return {
      suppressed: false,
      matchedEntries: [],
      evaluation,
    };
  }

  const namesList = hardMatches.map((m) => m.displayName).join(", ");
  const reason = `Recipient (${namesList}) is listed under Do Not Serve / Blacklist — marketing emails are suppressed.`;

  if (params.recordAudit !== false) {
    for (const match of hardMatches) {
      await insertDoNotServeAuditDb({
        entryId: match.entryId,
        ownerId,
        action: "automated_send_held",
        summary: `Suppressed marketing email${params.subject ? ` ("${params.subject}")` : ""} for ${match.displayName} via ${params.channel}.`,
        channel: params.channel,
        targetEntityType: params.targetEntityType || "marketing_email",
        targetEntityId:
          params.targetEntityId || (params.emails || []).filter(Boolean).join(",") || String(match.entryId),
        actorName: "Waypoint Marketing Suppression Guard (Automatic)",
      });
    }
  }

  return {
    suppressed: true,
    reason,
    matchedEntries: hardMatches,
    evaluation,
  };
}

export interface MarketingRecipientCandidate {
  key?: string;
  contactId?: number | null;
  contactIds?: number[];
  email?: string | null;
  phone?: string | null;
  fullName?: string | null;
}

/**
 * Filters a batch of marketing/campaign recipients against the active Do Not Serve register,
 * excluding all active hard-matched (blacklisted / Do Not Serve) contacts or emails/phones
 * while allowing unrestricted and name-only non-linked recipients.
 */
export async function filterMarketingRecipients<T extends MarketingRecipientCandidate>(
  recipients: T[],
  ownerId: number = 1
): Promise<{
  allowed: T[];
  suppressed: Array<{
    recipient: T;
    reason: string;
    matchedEntries: DoNotServeMatchedEntrySummary[];
  }>;
}> {
  const activeRows = await getActiveDoNotServeIdentifiersDb(ownerId);
  const allowed: T[] = [];
  const suppressed: Array<{
    recipient: T;
    reason: string;
    matchedEntries: DoNotServeMatchedEntrySummary[];
  }> = [];

  for (let idx = 0; idx < recipients.length; idx++) {
    const rec = recipients[idx];
    const contactIds = [
      ...(rec.contactId && rec.contactId > 0 ? [rec.contactId] : []),
      ...(rec.contactIds || []),
    ];
    const evaluation = await evaluateDoNotServeCandidate(
      {
        ownerId,
        contactIds,
        emails: rec.email ? [rec.email] : [],
        phones: rec.phone ? [rec.phone] : [],
        names: rec.fullName ? [rec.fullName] : [],
        targetEntityType: "marketing_recipient",
        targetEntityId: rec.key || rec.email || String(rec.contactId || idx),
      },
      activeRows
    );

    const hardMatches = evaluation.matches.filter((m) => m.matchTier === "hard_match");
    if (evaluation.hasActiveMatch && evaluation.highestTier === "hard_match" && hardMatches.length > 0) {
      suppressed.push({
        recipient: rec,
        reason: `Suppressed: active Do Not Serve restriction (${hardMatches
          .map((m) => m.displayName)
          .join(", ")}).`,
        matchedEntries: hardMatches,
      });
    } else {
      allowed.push(rec);
    }
  }

  return { allowed, suppressed };
}


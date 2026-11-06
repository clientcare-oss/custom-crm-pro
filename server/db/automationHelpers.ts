import { eq } from "drizzle-orm";
import {
  contacts,
  contracts,
  emailTemplates,
  smartFileTemplates,
} from "../../drizzle/schema";
import { getDb } from "./connection";
import { parseContactCustomTags } from "./contacts";
import {
  mergeDbTemplatesWithOverlay,
  markTemplateUsed,
} from "../services/emailTemplateCategories";

export const DEFAULT_BUSINESS_TIMEZONE = "America/New_York";

export interface BuiltinSmartFileCatalogItem {
  id: number;
  legacyKey: string;
  name: string;
  category: string;
  status: "published" | "draft" | "archived";
  description: string;
}

export const BUILTIN_SMART_FILE_TEMPLATES: BuiltinSmartFileCatalogItem[] = [
  {
    id: 101,
    legacyKey: "file_ferpa",
    name: "FERPA Release Authorization & School Notification Form",
    category: "Onboarding & Legal Authorization",
    status: "published",
    description:
      "Authorizes Waypoint Advocates to review educational records and communicate with the school district.",
  },
  {
    id: 102,
    legacyKey: "file_intake",
    name: "Comprehensive Parent Intake & IEP History Questionnaire",
    category: "Intake & Discovery",
    status: "published",
    description:
      "Collects parent concerns, current IEP/504 services, evaluation history, and student strengths.",
  },
  {
    id: 103,
    legacyKey: "file_records",
    name: "Educational & Psychological Records Upload Checklist",
    category: "Records Review",
    status: "published",
    description:
      "Guided portal packet for uploading prior IEPs, psychoeducational evaluations, PWNs, and progress reports.",
  },
  {
    id: 104,
    legacyKey: "file_prep",
    name: "Pre-IEP Meeting Parent Vision & Priorities Worksheet",
    category: "Meeting Preparation",
    status: "published",
    description:
      "Helps families articulate their top 3 meeting goals and parent input statement prior to an IEP/504 session.",
  },
];

const deletedSmartFileTemplateIdsForTests = new Set<string>();

export function __markSmartFileTemplateDeletedForTests(idOrKey: string | number, deleted = true): void {
  const key = String(idOrKey).trim();
  if (deleted) {
    deletedSmartFileTemplateIdsForTests.add(key);
  } else {
    deletedSmartFileTemplateIdsForTests.delete(key);
  }
}

export function __resetSmartFileTemplateTestState(): void {
  deletedSmartFileTemplateIdsForTests.clear();
}

export async function listAvailableSmartFileTemplatesForAutomations(): Promise<
  Array<{
    id: number;
    fileId: string;
    legacyKey?: string;
    name: string;
    category: string;
    status: string;
    description: string;
  }>
> {
  const results: Array<{
    id: number;
    fileId: string;
    legacyKey?: string;
    name: string;
    category: string;
    status: string;
    description: string;
  }> = [];

  const seenIds = new Set<number>();

  try {
    const db = await getDb();
    if (db) {
      const dbRows = await db.select().from(smartFileTemplates);
      for (const row of dbRows) {
        const numericId = Number(row.id);
        if (!Number.isFinite(numericId) || numericId <= 0) continue;
        if (deletedSmartFileTemplateIdsForTests.has(String(numericId))) continue;
        if (String(row.status || "").toLowerCase() === "archived") continue;
        seenIds.add(numericId);
        results.push({
          id: numericId,
          fileId: String(numericId),
          name: row.name || `Smart File #${numericId}`,
          category: row.category || "General",
          status: row.status || "published",
          description: row.description || "",
        });
      }
    }
  } catch {
    // Fallback to built-in catalog when DB table is unavailable
  }

  for (const item of BUILTIN_SMART_FILE_TEMPLATES) {
    if (
      deletedSmartFileTemplateIdsForTests.has(String(item.id)) ||
      deletedSmartFileTemplateIdsForTests.has(item.legacyKey)
    ) {
      continue;
    }
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      results.push({
        id: item.id,
        fileId: String(item.id),
        legacyKey: item.legacyKey,
        name: item.name,
        category: item.category,
        status: item.status,
        description: item.description,
      });
    }
  }

  return results;
}

export async function resolveValidatedSmartFileTemplate(
  rawFileId: unknown,
  rawFileName?: unknown
): Promise<{
  templateId: number;
  fileId: string;
  fileName: string;
  category: string;
}> {
  const requestedId = String(rawFileId ?? "").trim();
  if (!requestedId) {
    throw new Error(
      "Smart File step is missing a selected template. Please choose a valid Smart File template in the step builder."
    );
  }

  if (deletedSmartFileTemplateIdsForTests.has(requestedId)) {
    throw new Error(
      `Smart File template "${requestedId}" has been deleted or archived. Please select an active Smart File template.`
    );
  }

  const available = await listAvailableSmartFileTemplatesForAutomations();
  const matched = available.find(
    (t) =>
      String(t.id) === requestedId ||
      t.fileId === requestedId ||
      (t.legacyKey && t.legacyKey === requestedId)
  );

  if (!matched) {
    throw new Error(
      `Smart File template "${requestedId}" (${String(rawFileName || "Unknown Template")}) was not found or is inactive. Please update this automation step with a valid Smart File template.`
    );
  }

  return {
    templateId: matched.id,
    fileId: String(matched.id),
    fileName: matched.name,
    category: matched.category,
  };
}

export const BUILTIN_AUTOMATION_EMAIL_TEMPLATES: Record<
  string,
  { name: string; subject: string; body: string }
> = {
  tpl_intake_welcome: {
    name: "Lead Inquiry Welcome & Discovery Guide",
    subject: "Welcome to Waypoint Advocates! Next Steps for {{student_name}}",
    body: `<p>Hi {{parent_name}},</p><p>Thank you for reaching out to Waypoint Advocates regarding <strong>{{student_name}}</strong>. Please save our main number <strong>1-833-696-4377</strong> so you never miss our call.</p><p>We look forward to learning more about {{student_first_name}}'s educational journey!</p><p>Warm regards,<br/>{{advocate_name}}<br/>Waypoint Advocates</p>`,
  },
  tpl_prep_checklist: {
    name: "IEP Meeting Prep Checklist",
    subject: "Meeting Preparation Checklist for {{student_name}}",
    body: `<p>Hi {{parent_name}},</p><p>Your upcoming session for <strong>{{student_name}}</strong> is confirmed. Before we meet, please upload any latest draft IEPs, 504 plans, or school evaluations to your Family Portal.</p><p>Warm regards,<br/>{{advocate_name}}<br/>Waypoint Advocates</p>`,
  },
  tpl_post_session: {
    name: "Post-Meeting Action Items",
    subject: "Post-Meeting Action Items & Case Compass Update — {{student_name}}",
    body: `<p>Hi {{parent_name}},</p><p>Thank you for meeting with us today regarding <strong>{{student_name}}</strong> ({{case_id}}). Your updated Waypoint Case Compass and next-step action items have been posted to your portal.</p><p>Warm regards,<br/>{{advocate_name}}<br/>Waypoint Advocates</p>`,
  },
  tpl_contract_thanks: {
    name: "Signed Contract Confirmation",
    subject: "Welcome Aboard! Signed Agreement Confirmation for {{student_name}}",
    body: `<p>Hi {{parent_name}},</p><p>We have received your signed advocacy agreement for <strong>{{student_name}}</strong>! Your onboarding checklist and FERPA release authorization are now ready in your Family Portal.</p><p>Warm regards,<br/>{{advocate_name}}<br/>Waypoint Advocates</p>`,
  },
  tpl_review_request: {
    name: "Google Review & Testimonial Request",
    subject: "How did your meeting go for {{student_name}}? Share your experience",
    body: `<p>Hi {{parent_name}},</p><p>It was an honor advocating alongside your family for <strong>{{student_name}}</strong>! If you found our support helpful, would you consider sharing an honest review to help other families find advocacy support?</p><p><a href="{{google_review_url}}">Leave a Google Review</a> | <a href="{{testimonial_url}}">Share a Testimonial</a></p><p>With gratitude,<br/>{{advocate_name}}<br/>Waypoint Advocates</p>`,
  },
};

export async function resolveAutomationEmailTemplateWithOverrides(
  config: Record<string, any>
): Promise<{
  id: string | number;
  name: string;
  subject: string;
  body: string;
  usedCustomSubject: boolean;
  usedCustomBody: boolean;
}> {
  const requestedId = String(config?.templateId || "").trim();
  const requestedName = String(config?.templateName || "").trim();
  const customSubject =
    typeof config?.emailSubject === "string" && config.emailSubject.trim().length > 0
      ? config.emailSubject.trim()
      : null;
  const customBody =
    typeof config?.emailBody === "string" && config.emailBody.trim().length > 0
      ? config.emailBody.trim()
      : null;

  let baseTemplate: { id: string | number; name: string; subject: string; body: string } | null =
    null;

  // 1. Check built-in starter templates first
  if (requestedId && BUILTIN_AUTOMATION_EMAIL_TEMPLATES[requestedId]) {
    const b = BUILTIN_AUTOMATION_EMAIL_TEMPLATES[requestedId];
    baseTemplate = { id: requestedId, name: b.name, subject: b.subject, body: b.body };
  }

  // 2. Check saved CRM email templates (DB + Category Overlay)
  if (!baseTemplate) {
    try {
      const db = await getDb();
      let dbRows: any[] = [];
      if (db) {
        try {
          dbRows = await db.select().from(emailTemplates);
        } catch {}
      }
      const allTemplates = mergeDbTemplatesWithOverlay(dbRows);

      const numericId = Number(requestedId);
      if (!isNaN(numericId) && numericId > 0) {
        const byId = allTemplates.find((t) => Number(t.id) === numericId);
        if (byId) {
          await markTemplateUsed(byId.id);
          baseTemplate = {
            id: byId.id,
            name: byId.name,
            subject: byId.subject,
            body: byId.body,
          };
        }
      }

      if (!baseTemplate && requestedName) {
        const lowerName = requestedName.toLowerCase();
        const byName = allTemplates.find(
          (t) =>
            t.name.toLowerCase() === lowerName ||
            t.name.toLowerCase().includes(lowerName) ||
            lowerName.includes(t.name.toLowerCase())
        );
        if (byName) {
          await markTemplateUsed(byName.id);
          baseTemplate = {
            id: byName.id,
            name: byName.name,
            subject: byName.subject,
            body: byName.body,
          };
        }
      }
    } catch {}
  }

  // 3. Fallback starter template if none matched
  if (!baseTemplate) {
    baseTemplate = {
      id: requestedId || "tpl_default",
      name: requestedName || "Waypoint Client Update",
      subject: `${requestedName || "Waypoint Advocates Update"} — {{student_name}}`,
      body: `<p>Hi {{parent_name}},</p><p>Here is an automated update from Waypoint Advocates regarding <strong>{{student_name}}</strong>: ${requestedName || "Next Steps"}.</p>`,
    };
  }

  return {
    id: baseTemplate.id,
    name: baseTemplate.name,
    subject: customSubject ?? baseTemplate.subject,
    body: customBody ?? baseTemplate.body,
    usedCustomSubject: Boolean(customSubject),
    usedCustomBody: Boolean(customBody),
  };
}

/**
 * Formats a UTC Date into a human-readable string in the configured business timezone
 * (handling Daylight Saving Time transitions automatically via Intl.DateTimeFormat).
 */
export function formatInBusinessTimeZone(
  dateInput: Date | string,
  timeZone: string = DEFAULT_BUSINESS_TIMEZONE
): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return "Invalid Date";
  const safeTz = isValidTimeZone(timeZone) ? timeZone : DEFAULT_BUSINESS_TIMEZONE;
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: safeTz,
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

export function isValidTimeZone(tz?: string | null): boolean {
  if (!tz || typeof tz !== "string") return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Adds a duration to a base timestamp, honoring calendar day / week boundaries
 * across Daylight Saving Time transitions in the configured business time zone.
 */
export function addDelayInTimeZone(
  baseDate: Date,
  delayValue: number,
  delayUnit: string,
  direction: "add" | "subtract" = "add",
  timeZone: string = DEFAULT_BUSINESS_TIMEZONE
): Date {
  const val = Math.max(0, Number(delayValue || 0));
  if (val === 0) return new Date(baseDate.getTime());

  const mult = direction === "subtract" ? -1 : 1;
  const unit = (delayUnit || "days").toLowerCase();

  if (unit === "minutes") {
    return new Date(baseDate.getTime() + mult * val * 60 * 1000);
  }
  if (unit === "hours") {
    return new Date(baseDate.getTime() + mult * val * 60 * 60 * 1000);
  }

  const daysToAdd = unit === "weeks" ? val * 7 : val;
  const safeTz = isValidTimeZone(timeZone) ? timeZone : DEFAULT_BUSINESS_TIMEZONE;

  try {
    // Get wall-clock parts in the target timezone before adding calendar days
    const parts = getWallClockPartsInTimeZone(baseDate, safeTz);
    // Construct a UTC date for that local wall-clock and shift by calendar days
    const targetApproxUtc = new Date(
      Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day + mult * daysToAdd,
        parts.hour,
        parts.minute,
        parts.second,
        baseDate.getUTCMilliseconds()
      )
    );
    // Measure the timezone offset at the destination date (handles DST spring-forward / fall-back)
    const destOffsetMs = getTimeZoneOffsetMs(targetApproxUtc, safeTz);
    return new Date(targetApproxUtc.getTime() - destOffsetMs);
  } catch {
    return new Date(baseDate.getTime() + mult * daysToAdd * 24 * 60 * 60 * 1000);
  }
}

function getWallClockPartsInTimeZone(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const formatted = dtf.formatToParts(date);
  const map: Record<string, number> = {};
  for (const part of formatted) {
    if (part.type !== "literal") {
      map[part.type] = parseInt(part.value, 10);
    }
  }
  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour: map.hour === 24 ? 0 : map.hour,
    minute: map.minute,
    second: map.second,
  };
}

function getTimeZoneOffsetMs(utcDate: Date, timeZone: string): number {
  const parts = getWallClockPartsInTimeZone(utcDate, timeZone);
  const asUTC = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  const truncatedUtc = Date.UTC(
    utcDate.getUTCFullYear(),
    utcDate.getUTCMonth(),
    utcDate.getUTCDate(),
    utcDate.getUTCHours(),
    utcDate.getUTCMinutes(),
    utcDate.getUTCSeconds()
  );
  return asUTC - truncatedUtc;
}

/**
 * Resolves field values for step-level condition evaluation.
 * Strictly distinguishes custom student tags (`student_tag`) from structured clinical/IEP fields
 * (`student_diagnosis`, `iep_eligibility`, `plan_type`).
 */
export async function resolveFieldConditionValueDistinct(
  field: string,
  student: any,
  parent: any,
  eventContext?: {
    stageTo?: string;
    tagAdded?: string;
  }
): Promise<string> {
  const db = await getDb();

  if (field === "contact_status") {
    const parts = [
      student?.portalAccess,
      student?.accountStatus,
      student?.lifecycleStage,
      student?.pipelineStage,
      parent?.portalAccess,
      parent?.accountStatus,
      eventContext?.stageTo,
    ]
      .filter(Boolean)
      .map((s) => String(s).trim());
    return parts.length > 0 ? parts.join(" | ") : "lead";
  }

  if (field === "student_tag") {
    const persistedTags = parseContactCustomTags(student?.tags);
    const parentTags = parseContactCustomTags(parent?.tags);
    const allCustomTags = [...persistedTags, ...parentTags];
    if (eventContext?.tagAdded && String(eventContext.tagAdded).trim()) {
      allCustomTags.push(String(eventContext.tagAdded).trim());
    }
    const deduped = parseContactCustomTags(allCustomTags);
    return deduped.join(" | ");
  }

  if (field === "student_diagnosis") {
    return [student?.diagnosis, student?.medicalDiagnoses]
      .filter(Boolean)
      .map((s) => String(s).trim())
      .join(" | ");
  }

  if (field === "iep_eligibility") {
    return String(student?.iepEligibility || "").trim();
  }

  if (field === "plan_type") {
    return [student?.planType, student?.planTier]
      .filter(Boolean)
      .map((s) => String(s).trim())
      .join(" | ");
  }

  if (field === "contract_status") {
    const explicitStatus = student?.contractStatus || parent?.contractStatus;
    if (explicitStatus) {
      const lower = String(explicitStatus).toLowerCase();
      if (lower === "signed" || lower === "active" || lower === "renewed") {
        return `${explicitStatus} | signed`;
      }
      return String(explicitStatus);
    }
    if (db) {
      try {
        const rows = await db
          .select()
          .from(contracts)
          .where(eq(contracts.clientId, parent?.id || student?.id));
        const hasSigned = rows.some(
          (c: any) =>
            String(c.status || "").toLowerCase() === "signed" || Boolean(c.clientSignedAt)
        );
        if (hasSigned) return "signed";
        if (rows.length > 0) return String(rows[0].status || "pending").toLowerCase();
      } catch {}
    }
    return "unsigned";
  }

  return "";
}


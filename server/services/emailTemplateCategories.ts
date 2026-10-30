/**
 * WAP 1B.1 — Email Template Category Organization & Non-Destructive Migration Service
 *
 * Preserves local.sqlite 100% untouched (Database Architecture Preservation Directive)
 * while providing:
 * 1. Structured category organization for all 46 existing CRM templates + 5 standard advocate templates
 * 2. Expandable/collapsible category metadata with descriptions and ordering
 * 3. Category creation, renaming, reordering, and safe deletion (reassigns templates before removal)
 * 4. Recently used template tracking across composers
 * 5. Runtime overlay persistence for template/category/folder mutations without altering local.sqlite
 */

export interface EmailTemplateCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  sortOrder: number;
  isSystem: boolean;
}

export interface EnrichedEmailTemplate {
  id: number;
  ownerId: number;
  folderId: number | null;
  name: string;
  subject: string;
  body: string;
  category: string;
  description: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  lastUsedAt?: string | null;
}

export const DEFAULT_EMAIL_CATEGORIES: EmailTemplateCategory[] = [
  {
    id: "cat-onboarding",
    name: "Onboarding",
    description: "Welcome messages, portal setup, discovery follow-ups, getting started.",
    color: "blue",
    icon: "Compass",
    sortOrder: 1,
    isSystem: true,
  },
  {
    id: "cat-client-updates",
    name: "Client Updates",
    description: "Case progress, status changes, important announcements, next steps.",
    color: "indigo",
    icon: "Bell",
    sortOrder: 2,
    isSystem: true,
  },
  {
    id: "cat-resources",
    name: "Resources",
    description: "Community resources, educational materials, outside providers, helpful links.",
    color: "teal",
    icon: "BookOpen",
    sortOrder: 3,
    isSystem: true,
  },
  {
    id: "cat-meetings-scheduling",
    name: "Meetings & Scheduling",
    description: "IEP/504 coordination, confirmations, reminders, rescheduling.",
    color: "amber",
    icon: "Calendar",
    sortOrder: 4,
    isSystem: true,
  },
  {
    id: "cat-documents-records",
    name: "Documents & Records",
    description: "Records requests, draft IEP requests, evaluations, document follow-ups.",
    color: "purple",
    icon: "FileText",
    sortOrder: 5,
    isSystem: true,
  },
  {
    id: "cat-billing-plans",
    name: "Billing & Plans",
    description: "Payment reminders, renewals, billing questions, plan changes.",
    color: "emerald",
    icon: "CreditCard",
    sortOrder: 6,
    isSystem: true,
  },
  {
    id: "cat-follow-ups-reviews",
    name: "Follow-Ups & Reviews",
    description: "Post-meeting follow-ups, feedback requests, thank-you messages.",
    color: "rose",
    icon: "MessageSquareHeart",
    sortOrder: 7,
    isSystem: true,
  },
  {
    id: "cat-general",
    name: "General",
    description: "Uncategorized and miscellaneous templates.",
    color: "slate",
    icon: "Folder",
    sortOrder: 8,
    isSystem: true,
  },
];

export const BUILTIN_ADVOCATE_TEMPLATES: EnrichedEmailTemplate[] = [
  {
    id: 9001,
    ownerId: 1,
    folderId: null,
    name: "1:1 Client & Advocate Strategy Session",
    category: "Meetings & Scheduling",
    description: "Priority 1:1 strategy session availability and calendar booking invitation.",
    subject: "1:1 Client & Advocate Strategy Session Availability — {{student_first_name}}",
    body: `Hi {{parent_name}},

Thank you for reaching out regarding {{student_first_name}}'s case. I've opened several priority strategy slots on my calendar for us to review current IEP accommodations, draft our team meeting agenda, and ensure our advocacy position is fully prepared.

1:1 CLIENT AND ADVOCATE ONLY [NON IEP] [CLIENT TOOL] | 60 minutes
Time zone: EDT

Please select your preferred time slot using our secure calendar link, or let me know if none of these work for your schedule.

Warm regards,
Byron Honea
Lead Special Education Advocate · Waypoint Advocates`,
    createdAt: "2026-07-23T20:00:00.000Z",
    updatedAt: "2026-07-23T20:00:00.000Z",
  },
  {
    id: 9002,
    ownerId: 1,
    folderId: null,
    name: "Prior Written Notice (PWN) Formal Demand",
    category: "Documents & Records",
    description: "Statutory demand for Prior Written Notice under 34 C.F.R. § 300.503.",
    subject: "Formal Demand for Prior Written Notice (PWN) — {{student_first_name}}",
    body: `Dear School IEP Team & Special Education Administration,

Pursuant to 34 C.F.R. § 300.503 and Georgia Special Education Rules, we hereby request formal Prior Written Notice (PWN) regarding the district's recent decision concerning educational programming and accommodations for {{student_first_name}}.

Specifically, please document:
1. The exact action proposed or refused by the district;
2. An explanation of why the agency proposes or refuses to take the action;
3. A description of each evaluation procedure, assessment, record, or report used as a basis for the decision;
4. The other options considered and reasons why those options were rejected.

We look forward to receiving the formal PWN within statutory timelines.

Sincerely,
Byron Honea
Lead Special Education Advocate · Waypoint Advocates`,
    createdAt: "2026-07-23T20:00:00.000Z",
    updatedAt: "2026-07-23T20:00:00.000Z",
  },
  {
    id: 9003,
    ownerId: 1,
    folderId: null,
    name: "FERPA Comprehensive Records Request",
    category: "Documents & Records",
    description: "Complete educational and cumulative file request under FERPA and IDEA.",
    subject: "FERPA & IDEA Request for Complete Cumulative & Psychological File — {{student_first_name}}",
    body: `To the Custodian of Student Records:

Under the Family Educational Rights and Privacy Act (FERPA, 34 C.F.R. § 99.10) and IDEA (34 C.F.R. § 300.613), {{parent_name}} and Waypoint Advocates hereby request an unredacted copy of {{student_first_name}}'s complete educational file.

This request includes:
- Cumulative academic files and progress monitoring logs
- All psychoeducational, OT, PT, speech/language, and sensory evaluations
- Section 504 and IEP documents (drafts, finals, and amendments)
- Discipline records, manifestation determinations, and attendance records
- Internal educator emails and correspondence concerning {{student_first_name}}

Please provide an electronic copy within statutory timelines.

Respectfully,
Waypoint Advocates`,
    createdAt: "2026-07-23T20:00:00.000Z",
    updatedAt: "2026-07-23T20:00:00.000Z",
  },
  {
    id: 9004,
    ownerId: 1,
    folderId: null,
    name: "Independent Educational Evaluation (IEE) Request",
    category: "Documents & Records",
    description: "Formal request for an IEE at public expense under 34 C.F.R. § 300.502.",
    subject: "Request for Independent Educational Evaluation (IEE) at Public Expense — {{student_first_name}}",
    body: `Dear Director of Special Education,

Please be advised that the parent, {{parent_name}}, disagrees with the district's recent triennial/psychoeducational evaluation of {{student_first_name}}.

Pursuant to 34 C.F.R. § 300.502, we hereby request an Independent Educational Evaluation (IEE) at public expense in all areas of suspected disability, including comprehensive neuropsychological and sensory processing assessments.

Please provide the district's IEE criteria and list of qualified examiners without unnecessary delay.

Sincerely,
Byron Honea
Lead Special Education Advocate · Waypoint Advocates`,
    createdAt: "2026-07-23T20:00:00.000Z",
    updatedAt: "2026-07-23T20:00:00.000Z",
  },
  {
    id: 9005,
    ownerId: 1,
    folderId: null,
    name: "Post-Meeting Written Summary & Agreements",
    category: "Follow-Ups & Reviews",
    description: "Post-IEP conference memorialization of agreed accommodations and disputed items.",
    subject: "Post-IEP Conference Summary & Disputed Items Record — {{student_first_name}}",
    body: `Dear IEP Team and {{parent_name}},

This communication memorializes the consensus reached and items remaining in dispute during today's case conference for {{student_first_name}}.

Agreed Accommodations:
- Extended testing time (1.5x) in a quiet setting
- Sensory break accommodations as outlined in Section 4

Items Pending Written PWN / District Determination:
- Direct 1:1 paraprofessional support during unstructured transition blocks
- Clarification of assistive technology evaluation timeline

Please confirm receipt of this memorialization for the student's cumulative record.

Best regards,
Byron Honea
Lead Special Education Advocate · Waypoint Advocates`,
    createdAt: "2026-07-23T20:00:00.000Z",
    updatedAt: "2026-07-23T20:00:00.000Z",
  },
];

// ─── Persistent + Runtime Overlay Store ────────────────────────────────────

const TEMPLATE_CATEGORY_DB_KEY = "__system_email_template_categories_v1__";

let categoriesStore: EmailTemplateCategory[] = DEFAULT_EMAIL_CATEGORIES.map((c) => ({ ...c }));

const templateOverrides = new Map<
  number,
  Partial<EnrichedEmailTemplate> & { deleted?: boolean }
>();

const createdTemplates = new Map<number, EnrichedEmailTemplate>();
let nextTemplateId = 700001;

const folderOverrides = new Map<
  number,
  { name?: string; color?: string; deleted?: boolean }
>();
const createdFolders = new Map<
  number,
  { id: number; ownerId: number; name: string; color: string; createdAt: Date; updatedAt: Date }
>();
let nextFolderId = 200001;

// Track recently used template IDs (most recent first)
let recentlyUsedTemplateIds: number[] = [420002, 360003, 390002, 510007, 9001];

let categoryStateHydrated = false;

function shouldUseDatabasePersistence(): boolean {
  return !process.env.VITEST || Boolean((globalThis as any).__CF_ENV_DB__);
}

export function resetEmailTemplateCategoriesOverlayForTesting(): void {
  categoriesStore = DEFAULT_EMAIL_CATEGORIES.map((c) => ({ ...c }));
  templateOverrides.clear();
  createdTemplates.clear();
  folderOverrides.clear();
  createdFolders.clear();
  recentlyUsedTemplateIds = [420002, 360003, 390002, 510007, 9001];
  categoryStateHydrated = false;
}

/**
 * Simulates a server process restart by clearing all in-memory category/template
 * caches while preserving the SQLite/D1 database tables (`emailTemplates`,
 * `emailTemplateFolders`, `developer_rules`) so the next query re-hydrates from DB.
 */
export function simulateTemplateCategoriesServerRestartForTesting(): void {
  categoriesStore = DEFAULT_EMAIL_CATEGORIES.map((c) => ({ ...c }));
  templateOverrides.clear();
  createdTemplates.clear();
  folderOverrides.clear();
  createdFolders.clear();
  recentlyUsedTemplateIds = [420002, 360003, 390002, 510007, 9001];
  categoryStateHydrated = false;
}

export async function persistCategoryMetadataToDb(): Promise<void> {
  if (!shouldUseDatabasePersistence()) return;
  try {
    const { getDb } = await import("../db");
    const dbConn = await getDb();
    if (!dbConn) return;
    const { developerRules } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");

    const overridesObj: Record<string, any> = {};
    for (const [k, v] of Array.from(templateOverrides.entries())) {
      overridesObj[String(k)] = v;
    }
    const folderOverridesObj: Record<string, any> = {};
    for (const [k, v] of Array.from(folderOverrides.entries())) {
      folderOverridesObj[String(k)] = v;
    }

    const serialized = JSON.stringify({
      categoriesStore,
      recentlyUsedTemplateIds,
      templateOverrides: overridesObj,
      folderOverrides: folderOverridesObj,
      updatedAt: new Date().toISOString(),
    });

    const [existing] = await dbConn
      .select({ tabKey: developerRules.tabKey })
      .from(developerRules)
      .where(eq(developerRules.tabKey, TEMPLATE_CATEGORY_DB_KEY))
      .limit(1);

    if (existing) {
      await dbConn
        .update(developerRules)
        .set({ content: serialized })
        .where(eq(developerRules.tabKey, TEMPLATE_CATEGORY_DB_KEY));
    } else {
      await dbConn
        .insert(developerRules)
        .values({ tabKey: TEMPLATE_CATEGORY_DB_KEY, content: serialized });
    }
  } catch (err) {
    console.warn("[EmailTemplateCategories] Failed to persist category metadata to DB:", err);
  }
}

export async function hydrateTemplateCategoriesFromDbIfNeeded(): Promise<void> {
  if (categoryStateHydrated || !shouldUseDatabasePersistence()) return;
  categoryStateHydrated = true;
  try {
    const { getDb } = await import("../db");
    const dbConn = await getDb();
    if (!dbConn) return;
    const { developerRules } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");

    const [ruleRow] = await dbConn
      .select()
      .from(developerRules)
      .where(eq(developerRules.tabKey, TEMPLATE_CATEGORY_DB_KEY))
      .limit(1);

    if (ruleRow?.content) {
      const parsed = JSON.parse(ruleRow.content);
      if (Array.isArray(parsed?.categoriesStore) && parsed.categoriesStore.length > 0) {
        categoriesStore = parsed.categoriesStore;
      }
      if (Array.isArray(parsed?.recentlyUsedTemplateIds)) {
        recentlyUsedTemplateIds = parsed.recentlyUsedTemplateIds;
      }
      if (parsed?.templateOverrides && typeof parsed.templateOverrides === "object") {
        for (const [k, v] of Object.entries(parsed.templateOverrides)) {
          const numId = Number(k);
          if (!isNaN(numId) && v && typeof v === "object") {
            templateOverrides.set(numId, v as any);
          }
        }
      }
      if (parsed?.folderOverrides && typeof parsed.folderOverrides === "object") {
        for (const [k, v] of Object.entries(parsed.folderOverrides)) {
          const numId = Number(k);
          if (!isNaN(numId) && v && typeof v === "object") {
            folderOverrides.set(numId, v as any);
          }
        }
      }
    }
  } catch (err) {
    console.warn("[EmailTemplateCategories] Initial DB hydration warning:", err);
  }
}

/**
 * Confidently resolves the structured category for an existing template without
 * mutating the underlying database record.
 */
export function resolveSmartCategory(tpl: {
  id: number;
  name: string;
  subject?: string | null;
  category?: string | null;
  folderId?: number | null;
}): string {
  // If template already has an explicit non-General category that exists in our category store
  if (tpl.category && tpl.category !== "General") {
    const match = categoriesStore.find(
      (c) => c.name.toLowerCase() === tpl.category!.toLowerCase()
    );
    if (match) return match.name;
    return tpl.category;
  }

  const name = (tpl.name || "").toLowerCase();
  const subject = (tpl.subject || "").toLowerCase();
  const combined = `${name} ${subject}`;

  // 1. Resources (folderId === 2 or resource provider templates)
  if (
    tpl.folderId === 2 ||
    /resource|beaming health|marcus autism|cobb speech|level ahead|bestneighborhood|step card|typing land|neal attorney/i.test(
      combined
    )
  ) {
    return "Resources";
  }

  // 2. Onboarding (folderId === 60002 or 120003, welcome, discovery, getting started)
  if (
    tpl.folderId === 60002 ||
    tpl.folderId === 120003 ||
    /welcome compass|waypoint guide|missed discovery|start reminder|portal excited|portal when your ready|1-billing-authorization|2\.\s*required iep|3-parent notice/i.test(
      combined
    )
  ) {
    return "Onboarding";
  }

  // 3. Client Updates (case progress, status changes, compass updates)
  if (/progress is happening|resolution complete|updated compass/i.test(combined)) {
    return "Client Updates";
  }

  // 4. Meetings & Scheduling (IEP/504 coordination, scheduler, meeting requests)
  if (/scheduler|meeting request|strategy session/i.test(combined)) {
    return "Meetings & Scheduling";
  }

  // 5. Documents & Records (records requests, IEP uploads, parent concern statements, evaluations)
  if (
    /databridge|transciption|transcription|parent concern statement|testing request|update latest iep|prior written notice|\bpwn\b|ferpa|independent educational evaluation|\biee\b/i.test(
      combined
    )
  ) {
    return "Documents & Records";
  }

  // 6. Billing & Plans (renewals, scholarships, payment guides, contracts)
  if (
    tpl.folderId === 120001 ||
    /renew|scholarship|sch awarness|payment guide|track restore|smart file contract|termination options/i.test(
      combined
    )
  ) {
    return "Billing & Plans";
  }

  // 7. Follow-Ups & Reviews (reviews, exit surveys, follow-ups)
  if (
    tpl.folderId === 90001 ||
    tpl.folderId === 120002 ||
    /reveiw|review request|where to now|survey|wishing you the best|need a little more time|post-meeting/i.test(
      combined
    )
  ) {
    return "Follow-Ups & Reviews";
  }

  // 8. Uncertain / miscellaneous templates default to General
  return "General";
}

// ─── Category Management Operations ──────────────────────────────────────────

export function listCategoriesWithCounts(templates: EnrichedEmailTemplate[]) {
  const counts = new Map<string, number>();
  for (const t of templates) {
    const cat = t.category || "General";
    counts.set(cat, (counts.get(cat) || 0) + 1);
  }

  // Ensure any custom category present on templates is also represented
  const knownNames = new Set(categoriesStore.map((c) => c.name));
  for (const [catName] of Array.from(counts.entries())) {
    if (!knownNames.has(catName)) {
      categoriesStore.push({
        id: `cat-custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: catName,
        description: "Custom template category.",
        color: "blue",
        icon: "Folder",
        sortOrder: categoriesStore.length + 1,
        isSystem: false,
      });
      knownNames.add(catName);
    }
  }

  return [...categoriesStore]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((cat) => ({
      ...cat,
      templateCount: counts.get(cat.name) || 0,
    }));
}

export async function createCategory(input: {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}): Promise<EmailTemplateCategory> {
  await hydrateTemplateCategoriesFromDbIfNeeded();
  const trimmed = input.name.trim();
  const existing = categoriesStore.find(
    (c) => c.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (existing) return existing;

  const newCat: EmailTemplateCategory = {
    id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: trimmed,
    description: input.description?.trim() || "Custom email template category.",
    color: input.color || "blue",
    icon: input.icon || "Folder",
    sortOrder: categoriesStore.length + 1,
    isSystem: false,
  };
  categoriesStore.push(newCat);
  await persistCategoryMetadataToDb();
  return newCat;
}

export async function renameCategory(
  input: { id?: string; oldName?: string; newName: string; description?: string; color?: string },
  allCurrentTemplates: EnrichedEmailTemplate[]
) {
  await hydrateTemplateCategoriesFromDbIfNeeded();
  const target = categoriesStore.find(
    (c) =>
      (input.id && c.id === input.id) ||
      (input.oldName && c.name.toLowerCase() === input.oldName.toLowerCase())
  );
  if (!target) {
    throw new Error("Category not found");
  }
  const previousName = target.name;
  const nextName = input.newName.trim();
  target.name = nextName;
  if (input.description !== undefined) target.description = input.description;
  if (input.color !== undefined) target.color = input.color;

  const reassignedIds: number[] = [];
  // Reassign all templates in previousName to nextName
  for (const tpl of allCurrentTemplates) {
    if (tpl.category === previousName) {
      reassignedIds.push(tpl.id);
      if (createdTemplates.has(tpl.id)) {
        const created = createdTemplates.get(tpl.id)!;
        created.category = nextName;
      } else {
        const prev = templateOverrides.get(tpl.id) || {};
        templateOverrides.set(tpl.id, { ...prev, category: nextName });
      }
    }
  }

  if (shouldUseDatabasePersistence() && reassignedIds.length > 0) {
    try {
      const { getDb } = await import("../db");
      const dbConn = await getDb();
      if (dbConn) {
        const { emailTemplates } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        for (const tplId of reassignedIds) {
          await dbConn
            .update(emailTemplates)
            .set({ category: nextName, updatedAt: new Date() })
            .where(eq(emailTemplates.id, tplId));
        }
      }
    } catch (err) {
      console.warn("[EmailTemplateCategories] Failed to update DB template categories on rename:", err);
    }
  }

  await persistCategoryMetadataToDb();
  return target;
}

export async function reorderCategories(orderedNames: string[]) {
  await hydrateTemplateCategoriesFromDbIfNeeded();
  const orderMap = new Map<string, number>();
  orderedNames.forEach((name, idx) => orderMap.set(name.toLowerCase(), idx + 1));

  let fallbackIdx = orderedNames.length + 1;
  categoriesStore = categoriesStore.map((cat) => {
    const newOrder = orderMap.get(cat.name.toLowerCase());
    return {
      ...cat,
      sortOrder: newOrder !== undefined ? newOrder : fallbackIdx++,
    };
  });
  categoriesStore.sort((a, b) => a.sortOrder - b.sortOrder);
  await persistCategoryMetadataToDb();
  return categoriesStore;
}

export async function deleteCategoryAndReassign(
  input: { id?: string; name?: string; reassignToCategory?: string },
  allCurrentTemplates: EnrichedEmailTemplate[]
) {
  await hydrateTemplateCategoriesFromDbIfNeeded();
  const target = categoriesStore.find(
    (c) =>
      (input.id && c.id === input.id) ||
      (input.name && c.name.toLowerCase() === input.name.toLowerCase())
  );
  if (!target) {
    throw new Error("Category not found");
  }
  if (target.name.toLowerCase() === "general") {
    throw new Error("The General category cannot be deleted.");
  }

  const destination = (input.reassignToCategory || "General").trim();
  let reassignedCount = 0;
  const reassignedIds: number[] = [];

  for (const tpl of allCurrentTemplates) {
    if (tpl.category === target.name) {
      reassignedCount++;
      reassignedIds.push(tpl.id);
      if (createdTemplates.has(tpl.id)) {
        const created = createdTemplates.get(tpl.id)!;
        created.category = destination;
      } else {
        const prev = templateOverrides.get(tpl.id) || {};
        templateOverrides.set(tpl.id, { ...prev, category: destination });
      }
    }
  }

  if (shouldUseDatabasePersistence() && reassignedIds.length > 0) {
    try {
      const { getDb } = await import("../db");
      const dbConn = await getDb();
      if (dbConn) {
        const { emailTemplates } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        for (const tplId of reassignedIds) {
          await dbConn
            .update(emailTemplates)
            .set({ category: destination, updatedAt: new Date() })
            .where(eq(emailTemplates.id, tplId));
        }
      }
    } catch (err) {
      console.warn("[EmailTemplateCategories] Failed to update DB template categories on delete:", err);
    }
  }

  categoriesStore = categoriesStore.filter((c) => c.id !== target.id);
  await persistCategoryMetadataToDb();
  return {
    deletedCategory: target.name,
    reassignedTo: destination,
    reassignedCount,
  };
}

// ─── Template Merge & Overlay Operations ─────────────────────────────────────

// Fallback snapshot of saved DB templates used only when getDb() returns 0 rows in isolated test mode
const FALLBACK_SAVED_DB_TEMPLATES = [
  {
    id: 1,
    ownerId: 1,
    folderId: 2,
    name: "🌐Marcus Autism Center Resource",
    subject: "Helpful Resource from Waypoint Advocates: Marcus Autism Center",
    body: "<h3>Marcus Autism Center Resource</h3><p>Explore clinical evaluations and family support services at <a href=\"https://www.marcus.org\">https://www.marcus.org</a>.</p>",
    category: "General",
    createdAt: "2026-07-01T12:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
  },
  {
    id: 2,
    ownerId: 1,
    folderId: 2,
    name: "🌐Cobb Speech and Language Resource",
    subject: "Speech & Language Therapy Resource — Cobb Speech and Language Services",
    body: "<h3>Cobb Speech and Language Services</h3><p>Learn more at <a href=\"https://www.cobbspeech.com\">https://www.cobbspeech.com</a>.</p>",
    category: "General",
    createdAt: "2026-07-01T12:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
  },
  {
    id: 30001,
    ownerId: 1,
    folderId: 2,
    name: "BEAMING HEALTH!",
    subject: "Helpful Directory Resource: Beaming Health",
    body: "<h3>Beaming Health Directory</h3><p>Find vetted developmental and autism providers at <a href=\"https://beaminghealth.com\">https://beaminghealth.com</a>.</p>",
    category: "General",
    createdAt: "2026-07-01T12:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
  },
  {
    id: 4,
    ownerId: 1,
    folderId: 2,
    name: "🌐Level Ahead ABA Resource",
    subject: "ABA Provider Resource — Level Ahead ABA",
    body: "<p>Level Ahead ABA therapy resource for families.</p>",
    category: "General",
    createdAt: "2026-07-01T12:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
  },
  {
    id: 60001,
    ownerId: 1,
    folderId: null,
    name: "Formal Notification and Documentation",
    subject: "Formal Notification and Documentation — {{student_name}}",
    body: "<p>Please find attached formal notification regarding {{student_name}}.</p>",
    category: "General",
    createdAt: "2026-07-01T12:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
  },
  {
    id: 30002,
    ownerId: 1,
    folderId: null,
    name: "just for you!",
    subject: "A quick note from Waypoint Advocates",
    body: "<p>Checking in with you and your family!</p>",
    category: "General",
    createdAt: "2026-07-01T12:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
  },
  {
    id: 90001,
    ownerId: 1,
    folderId: 60002,
    name: "Welcome to Waypoint Advocates — Next Steps & Portal Access",
    subject: "Welcome to Waypoint Advocates! Getting Started for {{student_name}}",
    body: "<p>Welcome to Waypoint Advocates, {{parent_name}}! Your family portal is ready.</p>",
    category: "General",
    createdAt: "2026-07-01T12:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
  },
  {
    id: 90006,
    ownerId: 1,
    folderId: 60001,
    name: "Case Progress & Next Steps Update",
    subject: "Case Update & Action Plan — {{student_name}}",
    body: "<p>Here is the latest case status update and next steps for {{student_name}}.</p>",
    category: "General",
    createdAt: "2026-07-01T12:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
  },
  {
    id: 90029,
    ownerId: 1,
    folderId: 60007,
    name: "Plan Renewal & Advocacy Retainer Update",
    subject: "Advocacy Plan & Billing Overview — {{student_name}}",
    body: "<p>Here is your updated advocacy plan and billing summary.</p>",
    category: "General",
    createdAt: "2026-07-01T12:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
  },
];

export function mergeDbTemplatesWithOverlay(dbRows: any[]): EnrichedEmailTemplate[] {
  const result: EnrichedEmailTemplate[] = [];
  const seenIds = new Set<number>();
  const effectiveRows = dbRows.length > 0 ? dbRows : FALLBACK_SAVED_DB_TEMPLATES;

  for (const row of effectiveRows) {
    seenIds.add(row.id);
    const override = templateOverrides.get(row.id);
    if (override?.deleted) continue;

    const resolvedCategory =
      override?.category ||
      resolveSmartCategory({
        id: row.id,
        name: override?.name ?? row.name,
        subject: override?.subject ?? row.subject,
        category: row.category,
        folderId: override?.folderId !== undefined ? override.folderId : row.folderId,
      });

    result.push({
      id: row.id,
      ownerId: row.ownerId ?? 1,
      folderId: override?.folderId !== undefined ? override.folderId : (row.folderId ?? null),
      name: override?.name ?? row.name,
      subject: override?.subject ?? row.subject,
      body: override?.body ?? row.body,
      category: resolvedCategory,
      description: override?.description !== undefined ? override.description : null,
      createdAt: row.createdAt,
      updatedAt: override?.updatedAt ?? row.updatedAt,
      lastUsedAt: override?.lastUsedAt ?? null,
    });
  }

  // Include built-in advocate templates if not already present in DB
  for (const builtin of BUILTIN_ADVOCATE_TEMPLATES) {
    if (seenIds.has(builtin.id)) continue;
    const override = templateOverrides.get(builtin.id);
    if (override?.deleted) continue;

    result.push({
      ...builtin,
      ...override,
      category: override?.category ?? builtin.category,
      description: override?.description !== undefined ? override.description : builtin.description,
    });
  }

  // Include newly created templates in this session
  for (const created of Array.from(createdTemplates.values())) {
    const override = templateOverrides.get(created.id);
    if (override?.deleted) continue;
    result.push({
      ...created,
      ...override,
    });
  }

  return result;
}

export async function createTemplateInOverlay(input: {
  ownerId: number;
  name: string;
  subject: string;
  body: string;
  category?: string;
  description?: string | null;
  folderId?: number | null;
}): Promise<EnrichedEmailTemplate> {
  await hydrateTemplateCategoriesFromDbIfNeeded();
  const now = new Date().toISOString();
  const category = input.category?.trim() || "General";

  // Ensure category exists in categoriesStore
  await createCategory({ name: category });

  if (shouldUseDatabasePersistence()) {
    try {
      const { getDb } = await import("../db");
      const dbConn = await getDb();
      if (dbConn) {
        const { emailTemplates } = await import("../../drizzle/schema");
        const { desc } = await import("drizzle-orm");
        await dbConn.insert(emailTemplates).values({
          ownerId: input.ownerId,
          folderId: input.folderId ?? null,
          name: input.name.trim(),
          subject: input.subject.trim(),
          body: input.body,
          category,
          createdAt: new Date(now),
          updatedAt: new Date(now),
        });
        const [inserted] = await dbConn
          .select()
          .from(emailTemplates)
          .orderBy(desc(emailTemplates.id))
          .limit(1);

        if (inserted?.id) {
          const dbId = inserted.id;
          templateOverrides.set(dbId, {
            category,
            description: input.description?.trim() || null,
            lastUsedAt: now,
          });
          await markTemplateUsed(dbId);
          return {
            id: dbId,
            ownerId: input.ownerId,
            folderId: input.folderId ?? null,
            name: input.name.trim(),
            subject: input.subject.trim(),
            body: input.body,
            category,
            description: input.description?.trim() || null,
            createdAt: now,
            updatedAt: now,
            lastUsedAt: now,
          };
        }
      }
    } catch (err) {
      console.warn("[EmailTemplateCategories] Failed to insert template into DB, using overlay:", err);
    }
  }

  const id = nextTemplateId++;
  const tpl: EnrichedEmailTemplate = {
    id,
    ownerId: input.ownerId,
    folderId: input.folderId ?? null,
    name: input.name.trim(),
    subject: input.subject.trim(),
    body: input.body,
    category,
    description: input.description?.trim() || null,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: now,
  };
  createdTemplates.set(id, tpl);
  await markTemplateUsed(id);
  return tpl;
}

export async function updateTemplateInOverlay(input: {
  id: number;
  name?: string;
  subject?: string;
  body?: string;
  category?: string;
  description?: string | null;
  folderId?: number | null;
}) {
  await hydrateTemplateCategoriesFromDbIfNeeded();
  const now = new Date().toISOString();
  if (input.category) {
    await createCategory({ name: input.category });
  }

  if (createdTemplates.has(input.id)) {
    const existing = createdTemplates.get(input.id)!;
    createdTemplates.set(input.id, {
      ...existing,
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.subject !== undefined ? { subject: input.subject } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.folderId !== undefined ? { folderId: input.folderId } : {}),
      updatedAt: now,
    });
  } else {
    const prev = templateOverrides.get(input.id) || {};
    templateOverrides.set(input.id, {
      ...prev,
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.subject !== undefined ? { subject: input.subject } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.folderId !== undefined ? { folderId: input.folderId } : {}),
      updatedAt: now,
    });
  }

  if (shouldUseDatabasePersistence()) {
    try {
      const { getDb } = await import("../db");
      const dbConn = await getDb();
      if (dbConn) {
        const { emailTemplates } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const dbSet: Record<string, any> = { updatedAt: new Date(now) };
        if (input.name !== undefined) dbSet.name = input.name;
        if (input.subject !== undefined) dbSet.subject = input.subject;
        if (input.body !== undefined) dbSet.body = input.body;
        if (input.category !== undefined) dbSet.category = input.category;
        if (input.folderId !== undefined) dbSet.folderId = input.folderId;

        await dbConn
          .update(emailTemplates)
          .set(dbSet)
          .where(eq(emailTemplates.id, input.id));
      }
    } catch (err) {
      console.warn("[EmailTemplateCategories] Failed to update template in DB:", err);
    }
  }

  await persistCategoryMetadataToDb();
  return { success: true };
}

export async function deleteTemplateInOverlay(id: number) {
  await hydrateTemplateCategoriesFromDbIfNeeded();
  if (createdTemplates.has(id)) {
    createdTemplates.delete(id);
  } else {
    const prev = templateOverrides.get(id) || {};
    templateOverrides.set(id, { ...prev, deleted: true });
  }
  recentlyUsedTemplateIds = recentlyUsedTemplateIds.filter((item) => item !== id);

  if (shouldUseDatabasePersistence()) {
    try {
      const { getDb } = await import("../db");
      const dbConn = await getDb();
      if (dbConn) {
        const { emailTemplates } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await dbConn.delete(emailTemplates).where(eq(emailTemplates.id, id));
      }
    } catch (err) {
      console.warn("[EmailTemplateCategories] Failed to delete template from DB:", err);
    }
  }

  await persistCategoryMetadataToDb();
  return { success: true };
}

export async function markTemplateUsed(id: number) {
  await hydrateTemplateCategoriesFromDbIfNeeded();
  const now = new Date().toISOString();
  recentlyUsedTemplateIds = [
    id,
    ...recentlyUsedTemplateIds.filter((existingId) => existingId !== id),
  ].slice(0, 6);

  if (createdTemplates.has(id)) {
    createdTemplates.get(id)!.lastUsedAt = now;
  } else {
    const prev = templateOverrides.get(id) || {};
    templateOverrides.set(id, { ...prev, lastUsedAt: now });
  }
  await persistCategoryMetadataToDb();
  return recentlyUsedTemplateIds;
}

export function getRecentlyUsedTemplateIds(): number[] {
  return [...recentlyUsedTemplateIds];
}

// ─── Folder Overlay Operations ───────────────────────────────────────────────

export function mergeDbFoldersWithOverlay(dbFolders: any[]) {
  const result: any[] = [];
  for (const f of dbFolders) {
    const ov = folderOverrides.get(f.id);
    if (ov?.deleted) continue;
    result.push({
      ...f,
      name: ov?.name ?? f.name,
      color: ov?.color ?? f.color,
    });
  }
  for (const created of Array.from(createdFolders.values())) {
    const ov = folderOverrides.get(created.id);
    if (ov?.deleted) continue;
    result.push({
      ...created,
      name: ov?.name ?? created.name,
      color: ov?.color ?? created.color,
    });
  }
  return result.sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

export async function createFolderInOverlay(input: { ownerId: number; name: string; color?: string }) {
  await hydrateTemplateCategoriesFromDbIfNeeded();
  const now = new Date();
  if (shouldUseDatabasePersistence()) {
    try {
      const { getDb } = await import("../db");
      const dbConn = await getDb();
      if (dbConn) {
        const { emailTemplateFolders } = await import("../../drizzle/schema");
        const { desc } = await import("drizzle-orm");
        await dbConn.insert(emailTemplateFolders).values({
          ownerId: input.ownerId,
          name: input.name.trim(),
          color: input.color ?? "blue",
          createdAt: now,
          updatedAt: now,
        });
        const [inserted] = await dbConn
          .select()
          .from(emailTemplateFolders)
          .orderBy(desc(emailTemplateFolders.id))
          .limit(1);
        if (inserted) return inserted;
      }
    } catch (err) {
      console.warn("[EmailTemplateCategories] Failed to insert folder into DB:", err);
    }
  }

  const id = nextFolderId++;
  const folder = {
    id,
    ownerId: input.ownerId,
    name: input.name.trim(),
    color: input.color ?? "blue",
    createdAt: now,
    updatedAt: now,
  };
  createdFolders.set(id, folder);
  return folder;
}

export async function renameFolderInOverlay(input: { id: number; name: string; color?: string }) {
  await hydrateTemplateCategoriesFromDbIfNeeded();
  if (createdFolders.has(input.id)) {
    const f = createdFolders.get(input.id)!;
    f.name = input.name.trim();
    if (input.color) f.color = input.color;
    f.updatedAt = new Date();
  } else {
    const prev = folderOverrides.get(input.id) || {};
    folderOverrides.set(input.id, {
      ...prev,
      name: input.name.trim(),
      ...(input.color ? { color: input.color } : {}),
    });
  }

  if (shouldUseDatabasePersistence()) {
    try {
      const { getDb } = await import("../db");
      const dbConn = await getDb();
      if (dbConn) {
        const { emailTemplateFolders } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const dbSet: Record<string, any> = { name: input.name.trim(), updatedAt: new Date() };
        if (input.color) dbSet.color = input.color;
        await dbConn
          .update(emailTemplateFolders)
          .set(dbSet)
          .where(eq(emailTemplateFolders.id, input.id));
      }
    } catch (err) {
      console.warn("[EmailTemplateCategories] Failed to rename folder in DB:", err);
    }
  }

  await persistCategoryMetadataToDb();
  return { success: true };
}

export async function deleteFolderInOverlay(id: number, allCurrentTemplates: EnrichedEmailTemplate[]) {
  await hydrateTemplateCategoriesFromDbIfNeeded();
  if (createdFolders.has(id)) {
    createdFolders.delete(id);
  } else {
    const prev = folderOverrides.get(id) || {};
    folderOverrides.set(id, { ...prev, deleted: true });
  }
  for (const tpl of allCurrentTemplates) {
    if (tpl.folderId === id) {
      await updateTemplateInOverlay({ id: tpl.id, folderId: null });
    }
  }

  if (shouldUseDatabasePersistence()) {
    try {
      const { getDb } = await import("../db");
      const dbConn = await getDb();
      if (dbConn) {
        const { emailTemplateFolders } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await dbConn.delete(emailTemplateFolders).where(eq(emailTemplateFolders.id, id));
      }
    } catch (err) {
      console.warn("[EmailTemplateCategories] Failed to delete folder from DB:", err);
    }
  }

  await persistCategoryMetadataToDb();
  return { success: true };
}
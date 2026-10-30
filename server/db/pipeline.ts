import { eq, asc, desc, or } from "drizzle-orm";
import {
  contacts,
  leads,
  discoveryCalls,
  appointments,
  projectTasks,
  internalTasks,
  projects,
  caseCompass,
  familyEnrollmentOffers,
  developerRules,
  pipelineStages,
  pipelineSavedViews,
} from "../../drizzle/schema";
import { getDb } from "./connection";
import { inMemoryContacts } from "./contacts";
import { createCaseActivityItem, getCaseActivityByStudent } from "./caseActivity";
import { getCaseCompass } from "./compass";

const PIPELINE_STAGES_DB_KEY = "advocacy_pipeline_stages_v1";
const PIPELINE_VIEWS_DB_KEY = "advocacy_pipeline_views_v1";

export type PipelineGroupType = "opportunity" | "active_project";

export interface PipelineStageRecord {
  id: number;
  name: string;
  slug: string;
  order: number;
  accentColor: string;
  iconName: string;
  category: string;
  pipelineGroup: PipelineGroupType;
  isArchived: boolean;
  isDefault: boolean;
  caseCount?: number;
}

export interface PipelineSavedViewRecord {
  id: number;
  name: string;
  slug: string;
  filtersJson: string;
  isPinned: boolean;
  isDefault: boolean;
  isPrivate: boolean;
  createdBy?: number | null;
  createdByName?: string | null;
  order: number;
}

export interface PipelineCardRecord {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  parentContactId: number | null;
  parentName: string;
  parentEmail: string | null;
  parentPhone: string | null;
  siblingCount: number;
  siblingNames: string[];
  schoolName: string;
  countyDistrict: string;
  gradeLevel: string | null;
  planType: string;
  planTier: string; // Display / canonical plan label ("Navigator", "Anchor", "Family", "Scholarship", "Pay Per Use", "On Hold", "Tools Only")
  rawPlanTier: string; // Underlying stored value ("$55", "$105", "Navigator", etc.)
  servicePlanLabel: string;
  isScholarship: boolean;
  scholarshipStatus: string | null;
  pipelineStage: string;
  pipelineGroup: PipelineGroupType;
  stageGroup: PipelineGroupType;
  isOpportunity: boolean;
  journeyType: "opportunity" | "active_advocacy";
  lifecycleStage: string;
  accountStatus: string;
  billingStatus: string;
  contractStatus: string;
  assignedAdvocateName: string;
  assignedAdvocateInitials: string;
  caseId: string;
  leadId: number | null;
  discoveryStatus: string | null;
  needsAttention: boolean;
  attentionReason?: string;
  openTaskCount: number;
  primaryTask: string;
  primaryTaskIcon: "clock" | "check" | "calendar" | "alert" | "mail";
  secondaryTask?: string;
  secondaryTaskIcon?: "clock" | "check" | "calendar" | "alert" | "mail";
  nextDate?: string;
  meetingDate?: string;
  lastActivityAt: string;
  lastActivitySummary: string;
  lastActivityText: string;
  compassRiskLevel: string | null;
  compassWhoHasBall: string | null;
  compassNextStep: string | null;
  activeWorkstreams: string[];
  updatedAt: string;
}

// ── 16 Unified Default Pipeline Stages (HoneyBook Opportunities + Waypoint Active Projects) ──
export const DEFAULT_PIPELINE_STAGES: PipelineStageRecord[] = [
  // Group 1: Opportunities (Prospective Families, Discovery, Proposals & Follow-Ups)
  {
    id: 1,
    name: "Discovery",
    slug: "discovery",
    order: 1,
    accentColor: "#38BDF8", // Sky Cyan
    iconName: "Compass",
    category: "opportunity",
    pipelineGroup: "opportunity",
    isArchived: false,
    isDefault: true,
  },
  {
    id: 9,
    name: "Free Session",
    slug: "free-session",
    order: 2,
    accentColor: "#A78BFA", // Violet
    iconName: "Sparkles",
    category: "opportunity",
    pipelineGroup: "opportunity",
    isArchived: false,
    isDefault: true,
  },
  {
    id: 10,
    name: "Proposal (14-Day Exp)",
    slug: "proposal-14-day",
    order: 3,
    accentColor: "#C084FC", // Purple
    iconName: "FileSignature",
    category: "opportunity",
    pipelineGroup: "opportunity",
    isArchived: false,
    isDefault: true,
  },
  {
    id: 11,
    name: "2-Week Follow-Up",
    slug: "2-week-follow-up",
    order: 4,
    accentColor: "#60A5FA", // Blue
    iconName: "Clock",
    category: "opportunity",
    pipelineGroup: "opportunity",
    isArchived: false,
    isDefault: true,
  },
  {
    id: 12,
    name: "30-Day Follow-Up",
    slug: "30-day-follow-up",
    order: 5,
    accentColor: "#818CF8", // Indigo
    iconName: "CalendarClock",
    category: "opportunity",
    pipelineGroup: "opportunity",
    isArchived: false,
    isDefault: true,
  },
  {
    id: 13,
    name: "3-Month Follow-Up",
    slug: "3-month-follow-up",
    order: 6,
    accentColor: "#FBBF24", // Amber Gold
    iconName: "History",
    category: "opportunity",
    pipelineGroup: "opportunity",
    isArchived: false,
    isDefault: true,
  },
  {
    id: 14,
    name: "Reconnect Review",
    slug: "reconnect-review",
    order: 7,
    accentColor: "#F472B6", // Pink Rose
    iconName: "RefreshCw",
    category: "opportunity",
    pipelineGroup: "opportunity",
    isArchived: false,
    isDefault: true,
  },

  // Group 2: Active Advocacy / Projects (Client Onboarding & Case Execution)
  {
    id: 2,
    name: "Intake / Onboarding",
    slug: "intake-onboarding",
    order: 8,
    accentColor: "#34D399", // Emerald
    iconName: "FileText",
    category: "active",
    pipelineGroup: "active_project",
    isArchived: false,
    isDefault: true,
  },
  {
    id: 15,
    name: "Billing & Authorization",
    slug: "billing-authorization",
    order: 9,
    accentColor: "#10B981", // Green
    iconName: "CreditCard",
    category: "active",
    pipelineGroup: "active_project",
    isArchived: false,
    isDefault: true,
  },
  {
    id: 16,
    name: "Client Upload Tasks",
    slug: "client-upload-tasks",
    order: 10,
    accentColor: "#22D3EE", // Cyan
    iconName: "Upload",
    category: "waiting",
    pipelineGroup: "active_project",
    isArchived: false,
    isDefault: true,
  },
  {
    id: 3,
    name: "Records Review",
    slug: "records-review",
    order: 11,
    accentColor: "#F59E0B", // Amber
    iconName: "FileSearch",
    category: "active",
    pipelineGroup: "active_project",
    isArchived: false,
    isDefault: true,
  },
  {
    id: 4,
    name: "School Contact",
    slug: "school-contact",
    order: 12,
    accentColor: "#F5B544", // Brass Gold
    iconName: "School",
    category: "active",
    pipelineGroup: "active_project",
    isArchived: false,
    isDefault: true,
  },
  {
    id: 5,
    name: "Meeting Scheduled",
    slug: "meeting-scheduled",
    order: 13,
    accentColor: "#818CF8", // Indigo
    iconName: "Calendar",
    category: "active",
    pipelineGroup: "active_project",
    isArchived: false,
    isDefault: true,
  },
  {
    id: 6,
    name: "State Complaint",
    slug: "state-complaint",
    order: 14,
    accentColor: "#F87171", // Coral Red
    iconName: "Scale",
    category: "escalation",
    pipelineGroup: "active_project",
    isArchived: false,
    isDefault: true,
  },
  {
    id: 7,
    name: "Monitoring",
    slug: "monitoring",
    order: 15,
    accentColor: "#2DD4BF", // Teal
    iconName: "Activity",
    category: "active",
    pipelineGroup: "active_project",
    isArchived: false,
    isDefault: true,
  },
  {
    id: 8,
    name: "Closed",
    slug: "closed",
    order: 16,
    accentColor: "#94A3B8", // Slate
    iconName: "CheckCircle2",
    category: "completed",
    pipelineGroup: "active_project",
    isArchived: false,
    isDefault: true,
  },
];

// ── Default Saved Views (HoneyBook Main/Scholarship/Leads/Renewals + Waypoint Service Plans) ──
export const DEFAULT_SAVED_VIEWS: PipelineSavedViewRecord[] = [
  {
    id: 1,
    name: "Main View",
    slug: "all-clients",
    filtersJson: JSON.stringify({}),
    isPinned: true,
    isDefault: true,
    isPrivate: false,
    order: 1,
  },
  {
    id: 2,
    name: "My Work",
    slug: "my-work",
    filtersJson: JSON.stringify({ isMyWork: true }),
    isPinned: true,
    isDefault: true,
    isPrivate: false,
    order: 2,
  },
  {
    id: 3,
    name: "Leads",
    slug: "leads",
    filtersJson: JSON.stringify({ stageGroup: "opportunity" }),
    isPinned: true,
    isDefault: true,
    isPrivate: false,
    order: 3,
  },
  {
    id: 4,
    name: "Active Projects",
    slug: "active-projects",
    filtersJson: JSON.stringify({ stageGroup: "active_project" }),
    isPinned: true,
    isDefault: true,
    isPrivate: false,
    order: 4,
  },
  {
    id: 5,
    name: "Scholarship",
    slug: "scholarship",
    filtersJson: JSON.stringify({ planTier: "Scholarship" }),
    isPinned: true,
    isDefault: true,
    isPrivate: false,
    order: 5,
  },
  {
    id: 6,
    name: "Renewals",
    slug: "renewals",
    filtersJson: JSON.stringify({ accountStatus: "Renewal Needed" }),
    isPinned: true,
    isDefault: true,
    isPrivate: false,
    order: 6,
  },
  {
    id: 7,
    name: "Navigator ($55)",
    slug: "plan-55",
    filtersJson: JSON.stringify({ planTier: "Navigator" }),
    isPinned: false,
    isDefault: true,
    isPrivate: false,
    order: 7,
  },
  {
    id: 8,
    name: "Anchor ($105)",
    slug: "plan-105",
    filtersJson: JSON.stringify({ planTier: "Anchor" }),
    isPinned: false,
    isDefault: true,
    isPrivate: false,
    order: 8,
  },
  {
    id: 9,
    name: "Family Plan",
    slug: "family-plan",
    filtersJson: JSON.stringify({ planTier: "Family" }),
    isPinned: false,
    isDefault: true,
    isPrivate: false,
    order: 9,
  },
  {
    id: 10,
    name: "Pay Per Use",
    slug: "pay-per-use",
    filtersJson: JSON.stringify({ planTier: "Pay Per Use" }),
    isPinned: false,
    isDefault: true,
    isPrivate: false,
    order: 10,
  },
  {
    id: 11,
    name: "On Hold",
    slug: "on-hold",
    filtersJson: JSON.stringify({ accountStatus: "On Hold" }),
    isPinned: false,
    isDefault: true,
    isPrivate: false,
    order: 11,
  },
  {
    id: 12,
    name: "Nonpay",
    slug: "nonpay",
    filtersJson: JSON.stringify({ billingStatus: "Payment Failed" }),
    isPinned: false,
    isDefault: true,
    isPrivate: false,
    order: 12,
  },
  {
    id: 13,
    name: "Tools Only",
    slug: "tools-only",
    filtersJson: JSON.stringify({ planTier: "Tools Only" }),
    isPinned: false,
    isDefault: true,
    isPrivate: false,
    order: 13,
  },
];

// ── Runtime State & DB Hydration ─────────────────────────────────────────────

let stagesHydrated = false;
let viewsHydrated = false;
let nextStageId = 100;
let nextViewId = 100;

const inMemoryStages = new Map<number, PipelineStageRecord>();
const inMemoryViews = new Map<number, PipelineSavedViewRecord>();

function shouldUseDatabasePersistence(): boolean {
  return !process.env.VITEST || Boolean((globalThis as any).__CF_ENV_DB__);
}

function seedDefaultStagesIfEmpty(): void {
  if (inMemoryStages.size === 0) {
    for (const st of DEFAULT_PIPELINE_STAGES) {
      inMemoryStages.set(st.id, { ...st });
      if (st.id >= nextStageId) nextStageId = st.id + 1;
    }
  }
}

function seedDefaultViewsIfEmpty(): void {
  for (const vw of DEFAULT_SAVED_VIEWS) {
    if (!inMemoryViews.has(vw.id)) {
      inMemoryViews.set(vw.id, { ...vw });
      if (vw.id >= nextViewId) nextViewId = vw.id + 1;
    }
  }
}

export function inferPipelineGroup(
  stageName: string,
  category?: string,
  explicitGroup?: string
): PipelineGroupType {
  if (explicitGroup === "opportunity" || explicitGroup === "active_project") {
    return explicitGroup;
  }
  if (category === "opportunity") return "opportunity";
  const lower = (stageName || "").trim().toLowerCase();
  if (
    lower === "discovery" ||
    lower === "discovery call" ||
    lower === "free session" ||
    lower.includes("proposal") ||
    lower.includes("follow-up") ||
    lower.includes("follow up") ||
    lower.includes("reconnect") ||
    lower === "lead" ||
    lower === "new"
  ) {
    return "opportunity";
  }
  return "active_project";
}

export function normalizeStageName(
  rawStage: string | null | undefined,
  configuredStages: PipelineStageRecord[],
  lifecycleStage?: string | null
): string {
  const activeStages = configuredStages.filter((s) => !s.isArchived);
  const raw = (rawStage || "").trim();
  if (!raw) {
    return "Discovery";
  }

  // 1. Exact case-insensitive match with any configured stage
  const exact = activeStages.find((s) => s.name.toLowerCase() === raw.toLowerCase());
  if (exact) return exact.name;

  // 2. Slug match
  const slugCandidate = raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const bySlug = activeStages.find((s) => s.slug === slugCandidate);
  if (bySlug) return bySlug.name;

  // 3. HoneyBook & Legacy Waypoint aliases
  const lower = raw.toLowerCase();
  if (lower === "discovery call" || lower === "new" || lower === "contacted") {
    return activeStages.find((s) => s.slug === "discovery")?.name || "Discovery";
  }
  if (lower.includes("free session")) {
    return activeStages.find((s) => s.slug === "free-session")?.name || "Free Session";
  }
  if (lower.includes("proposal")) {
    return activeStages.find((s) => s.slug === "proposal-14-day")?.name || "Proposal (14-Day Exp)";
  }
  if (lower === "14 day follow-up" || lower.includes("2 week") || lower.includes("2-week")) {
    return activeStages.find((s) => s.slug === "2-week-follow-up")?.name || "2-Week Follow-Up";
  }
  if (lower === "30 day follow-up" || lower.includes("30 day") || lower.includes("30-day")) {
    return activeStages.find((s) => s.slug === "30-day-follow-up")?.name || "30-Day Follow-Up";
  }
  if (
    lower === "60 day follow-up" ||
    lower === "90 day follow-up" ||
    lower.includes("3 month") ||
    lower.includes("3-month")
  ) {
    return activeStages.find((s) => s.slug === "3-month-follow-up")?.name || "3-Month Follow-Up";
  }
  if (lower.includes("reconnect")) {
    return activeStages.find((s) => s.slug === "reconnect-review")?.name || "Reconnect Review";
  }
  if (lower.includes("billing") || lower.includes("authorization") || lower === "approved for enrollment") {
    return (
      activeStages.find((s) => s.slug === "billing-authorization")?.name ||
      "Billing & Authorization"
    );
  }
  if (lower.includes("upload")) {
    return (
      activeStages.find((s) => s.slug === "client-upload-tasks")?.name || "Client Upload Tasks"
    );
  }
  if (lower === "onboarding" || lower.includes("intake")) {
    return (
      activeStages.find((s) => s.slug === "intake-onboarding")?.name || "Intake / Onboarding"
    );
  }
  if (lower === "active") {
    if ((lifecycleStage || "").toLowerCase() === "onboarding") {
      return (
        activeStages.find((s) => s.slug === "intake-onboarding")?.name || "Intake / Onboarding"
      );
    }
    return activeStages.find((s) => s.slug === "records-review")?.name || "Records Review";
  }

  // If the card belongs to an archived stage, check if it exists in configuredStages
  const inArchived = configuredStages.find((s) => s.name.toLowerCase() === lower);
  if (inArchived) {
    const fallback = activeStages.find((s) => s.pipelineGroup === inArchived.pipelineGroup);
    return fallback?.name || activeStages[0]?.name || "Discovery";
  }

  return raw;
}

export function normalizeServicePlanLabel(
  rawPlanTier?: string | null,
  accountStatus?: string | null,
  operationalState?: string | null,
  managerApprovalStatus?: string | null
): {
  displayPlan: string;
  rawPlan: string;
  isScholarship: boolean;
} {
  const raw = (rawPlanTier || "").trim();
  const lower = raw.toLowerCase();
  const isScholarship =
    lower === "scholarship" ||
    (operationalState || "").toLowerCase().includes("scholarship") ||
    (managerApprovalStatus || "").toLowerCase() === "approved";

  if (isScholarship && (!raw || lower === "scholarship" || lower === "$55")) {
    return {
      displayPlan: "Scholarship",
      rawPlan: raw || "Scholarship",
      isScholarship: true,
    };
  }

  if ((accountStatus || "").toLowerCase() === "on hold" || lower === "on hold") {
    return {
      displayPlan: raw && lower !== "on hold" ? raw : "On Hold",
      rawPlan: raw || "On Hold",
      isScholarship,
    };
  }

  if (lower === "$55" || lower === "navigator" || lower === "$55 plan") {
    return { displayPlan: "Navigator", rawPlan: raw || "$55", isScholarship };
  }
  if (
    lower === "$105" ||
    lower === "anchor" ||
    lower === "$105 plan" ||
    lower === "core advocacy"
  ) {
    return { displayPlan: "Anchor", rawPlan: raw || "$105", isScholarship };
  }
  if (lower === "family" || lower === "family plan") {
    return { displayPlan: "Family", rawPlan: raw || "Family", isScholarship };
  }
  if (lower === "pay per use" || lower === "pay_per_use" || lower === "standalone") {
    return { displayPlan: "Pay Per Use", rawPlan: raw || "Pay Per Use", isScholarship };
  }
  if (lower.includes("tools") || lower.includes("vault")) {
    return { displayPlan: "Tools Only", rawPlan: raw || "Tools Only", isScholarship };
  }
  if (lower === "renewal") {
    return { displayPlan: "Navigator", rawPlan: "Renewal", isScholarship };
  }
  if (lower === "nonpay") {
    return { displayPlan: "Navigator", rawPlan: "Nonpay", isScholarship };
  }

  return {
    displayPlan: raw || "Navigator",
    rawPlan: raw || "$55",
    isScholarship,
  };
}

export function doesCardMatchPlanFilter(
  card: Pick<PipelineCardRecord, "planTier" | "rawPlanTier" | "isScholarship" | "accountStatus">,
  filterPlan: string
): boolean {
  const f = (filterPlan || "").trim().toLowerCase();
  if (!f) return true;

  const pTier = (card.planTier || "").toLowerCase();
  const rTier = (card.rawPlanTier || "").toLowerCase();
  const acc = (card.accountStatus || "").toLowerCase();

  if (f === "scholarship") {
    return card.isScholarship || pTier === "scholarship" || rTier === "scholarship";
  }
  if (f === "navigator" || f === "$55" || f === "$55 plan") {
    return pTier === "navigator" || rTier === "$55" || rTier === "navigator";
  }
  if (f === "anchor" || f === "$105" || f === "$105 plan" || f === "core advocacy") {
    return (
      pTier === "anchor" ||
      rTier === "$105" ||
      rTier === "anchor" ||
      rTier === "core advocacy"
    );
  }
  if (f === "family" || f === "family plan") {
    return pTier === "family" || rTier === "family" || rTier === "family plan";
  }
  if (f === "pay per use" || f === "pay_per_use") {
    return pTier === "pay per use" || rTier === "pay per use" || rTier === "pay_per_use";
  }
  if (f === "on hold") {
    return pTier === "on hold" || rTier === "on hold" || acc === "on hold";
  }
  if (f === "tools only" || f === "vault") {
    return (
      pTier.includes("tools") ||
      pTier.includes("vault") ||
      rTier.includes("tools") ||
      rTier.includes("vault")
    );
  }

  return pTier === f || rTier === f;
}

async function persistStagesToDb(): Promise<void> {
  if (!shouldUseDatabasePersistence()) return;
  try {
    const db = await getDb();
    if (!db) return;
    const allStages = Array.from(inMemoryStages.values()).sort((a, b) => a.order - b.order);
    const payload = JSON.stringify(allStages);

    const [existing] = await db
      .select({ tabKey: developerRules.tabKey })
      .from(developerRules)
      .where(eq(developerRules.tabKey, PIPELINE_STAGES_DB_KEY))
      .limit(1);

    if (existing) {
      await db
        .update(developerRules)
        .set({ content: payload })
        .where(eq(developerRules.tabKey, PIPELINE_STAGES_DB_KEY));
    } else {
      await db
        .insert(developerRules)
        .values({ tabKey: PIPELINE_STAGES_DB_KEY, content: payload });
    }
  } catch (err) {
    console.warn("[Pipeline DB] Failed to persist stages:", err);
  }
}

async function persistViewsToDb(): Promise<void> {
  if (!shouldUseDatabasePersistence()) return;
  try {
    const db = await getDb();
    if (!db) return;
    const allViews = Array.from(inMemoryViews.values()).sort((a, b) => a.order - b.order);
    const payload = JSON.stringify(allViews);

    const [existing] = await db
      .select({ tabKey: developerRules.tabKey })
      .from(developerRules)
      .where(eq(developerRules.tabKey, PIPELINE_VIEWS_DB_KEY))
      .limit(1);

    if (existing) {
      await db
        .update(developerRules)
        .set({ content: payload })
        .where(eq(developerRules.tabKey, PIPELINE_VIEWS_DB_KEY));
    } else {
      await db
        .insert(developerRules)
        .values({ tabKey: PIPELINE_VIEWS_DB_KEY, content: payload });
    }
  } catch (err) {
    console.warn("[Pipeline DB] Failed to persist views:", err);
  }
}

async function hydrateStagesIfNeeded(): Promise<void> {
  if (stagesHydrated) {
    seedDefaultStagesIfEmpty();
    return;
  }
  stagesHydrated = true;
  seedDefaultStagesIfEmpty();

  if (!shouldUseDatabasePersistence()) return;

  try {
    const db = await getDb();
    if (!db) return;

    // 1. Check developer_rules JSON store
    const [ruleRow] = await db
      .select()
      .from(developerRules)
      .where(eq(developerRules.tabKey, PIPELINE_STAGES_DB_KEY))
      .limit(1);

    if (ruleRow?.content) {
      const parsed = JSON.parse(ruleRow.content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryStages.clear();
        for (const item of parsed) {
          const id = Number(item.id);
          if (id >= nextStageId) nextStageId = id + 1;
          inMemoryStages.set(id, {
            id,
            name: item.name,
            slug:
              item.slug ||
              item.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, ""),
            order: Number(item.order || 1),
            accentColor: item.accentColor || "#38BDF8",
            iconName: item.iconName || "Compass",
            category: item.category || "active",
            pipelineGroup: inferPipelineGroup(item.name, item.category, item.pipelineGroup),
            isArchived: Boolean(item.isArchived),
            isDefault: Boolean(item.isDefault),
          });
        }
        // Ensure all default stages exist unless explicitly archived/custom-configured
        for (const def of DEFAULT_PIPELINE_STAGES) {
          if (!inMemoryStages.has(def.id)) {
            inMemoryStages.set(def.id, { ...def });
          }
        }
        return;
      }
    }

    // 2. Fallback check on pipeline_stages table if present
    try {
      const rows = await db.select().from(pipelineStages).orderBy(asc(pipelineStages.order));
      if (rows.length > 0) {
        for (const r of rows) {
          const id = Number(r.id);
          if (id >= nextStageId) nextStageId = id + 1;
          inMemoryStages.set(id, {
            id,
            name: r.name,
            slug: r.slug,
            order: Number(r.order || 1),
            accentColor: r.accentColor || "#38BDF8",
            iconName: r.iconName || "Compass",
            category: r.category || "active",
            pipelineGroup: inferPipelineGroup(r.name, r.category),
            isArchived: Boolean(r.isArchived),
            isDefault: Boolean(r.isDefault),
          });
        }
      }
    } catch {}
  } catch {}
}

async function hydrateViewsIfNeeded(): Promise<void> {
  if (viewsHydrated) {
    seedDefaultViewsIfEmpty();
    return;
  }
  viewsHydrated = true;
  seedDefaultViewsIfEmpty();

  if (!shouldUseDatabasePersistence()) return;

  try {
    const db = await getDb();
    if (!db) return;

    const [ruleRow] = await db
      .select()
      .from(developerRules)
      .where(eq(developerRules.tabKey, PIPELINE_VIEWS_DB_KEY))
      .limit(1);

    if (ruleRow?.content) {
      const parsed = JSON.parse(ruleRow.content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        for (const item of parsed) {
          const id = Number(item.id);
          if (id >= nextViewId) nextViewId = id + 1;
          inMemoryViews.set(id, {
            id,
            name: item.name,
            slug: item.slug,
            filtersJson: item.filtersJson || "{}",
            isPinned: Boolean(item.isPinned),
            isDefault: Boolean(item.isDefault),
            isPrivate: Boolean(item.isPrivate),
            createdBy: item.createdBy ?? null,
            createdByName: item.createdByName ?? null,
            order: Number(item.order ?? 99),
          });
        }
        return;
      }
    }

    try {
      const rows = await db
        .select()
        .from(pipelineSavedViews)
        .orderBy(asc(pipelineSavedViews.order));
      for (const r of rows) {
        const id = Number(r.id);
        if (id >= nextViewId) nextViewId = id + 1;
        inMemoryViews.set(id, {
          id,
          name: r.name,
          slug: r.slug,
          filtersJson: r.filtersJson || "{}",
          isPinned: Boolean(r.isPinned),
          isDefault: Boolean(r.isDefault),
          isPrivate: false,
          createdBy: null,
          createdByName: null,
          order: Number(r.order ?? 99),
        });
      }
    } catch {}
  } catch {}
}

// ── Public Pipeline Stage Operations ─────────────────────────────────────────

export async function listPipelineStages(): Promise<PipelineStageRecord[]> {
  await hydrateStagesIfNeeded();
  const cards = await listPipelineCards();
  const countsByStage = new Map<string, number>();
  for (const c of cards) {
    const key = (c.pipelineStage || "Discovery").toLowerCase();
    countsByStage.set(key, (countsByStage.get(key) || 0) + 1);
  }

  return Array.from(inMemoryStages.values())
    .sort((a, b) => a.order - b.order)
    .map((stage) => ({
      ...stage,
      caseCount: countsByStage.get(stage.name.toLowerCase()) || 0,
    }));
}

export async function upsertPipelineStage(input: {
  id?: number;
  name: string;
  order?: number;
  accentColor?: string;
  iconName?: string;
  category?: string;
  pipelineGroup?: PipelineGroupType;
  isArchived?: boolean;
}): Promise<{ success: boolean; id: number; stage: PipelineStageRecord }> {
  await hydrateStagesIfNeeded();

  const cleanName = input.name.trim();
  const slug = cleanName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const group = inferPipelineGroup(cleanName, input.category, input.pipelineGroup);

  if (input.id && inMemoryStages.has(input.id)) {
    const existing = inMemoryStages.get(input.id)!;
    const oldName = existing.name;
    const updated: PipelineStageRecord = {
      ...existing,
      name: cleanName,
      slug,
      order: input.order ?? existing.order,
      accentColor: input.accentColor ?? existing.accentColor,
      iconName: input.iconName ?? existing.iconName,
      category: input.category ?? existing.category,
      pipelineGroup: input.pipelineGroup ?? existing.pipelineGroup ?? group,
      isArchived: input.isArchived ?? existing.isArchived,
    };
    inMemoryStages.set(input.id, updated);

    // If stage was renamed, preserve card assignments by updating cards referencing oldName
    if (oldName.toLowerCase() !== cleanName.toLowerCase()) {
      await migrateCardsFromStage(oldName, cleanName);
    }

    await persistStagesToDb();
    return { success: true, id: input.id, stage: updated };
  }

  // Check if a stage with the same name/slug already exists when no id was passed
  const existingBySlug = Array.from(inMemoryStages.values()).find(
    (s) => s.slug === slug || s.name.toLowerCase() === cleanName.toLowerCase()
  );
  if (existingBySlug && !input.id) {
    const updated: PipelineStageRecord = {
      ...existingBySlug,
      name: cleanName,
      order: input.order ?? existingBySlug.order,
      accentColor: input.accentColor ?? existingBySlug.accentColor,
      iconName: input.iconName ?? existingBySlug.iconName,
      category: input.category ?? existingBySlug.category,
      pipelineGroup: input.pipelineGroup ?? existingBySlug.pipelineGroup ?? group,
      isArchived: input.isArchived ?? existingBySlug.isArchived,
    };
    inMemoryStages.set(existingBySlug.id, updated);
    await persistStagesToDb();
    return { success: true, id: existingBySlug.id, stage: updated };
  }

  const newId = input.id || nextStageId++;
  if (newId >= nextStageId) nextStageId = newId + 1;
  const maxOrder = Array.from(inMemoryStages.values()).reduce(
    (max, s) => Math.max(max, s.order),
    0
  );
  const created: PipelineStageRecord = {
    id: newId,
    name: cleanName,
    slug,
    order: input.order ?? maxOrder + 1,
    accentColor: input.accentColor || "#38BDF8",
    iconName: input.iconName || "Compass",
    category: input.category || (group === "opportunity" ? "opportunity" : "active"),
    pipelineGroup: group,
    isArchived: Boolean(input.isArchived),
    isDefault: false,
  };
  inMemoryStages.set(newId, created);
  await persistStagesToDb();

  return { success: true, id: newId, stage: created };
}

export async function reorderPipelineStages(
  items: { id: number; order: number }[]
): Promise<PipelineStageRecord[]> {
  await hydrateStagesIfNeeded();
  for (const item of items) {
    const existing = inMemoryStages.get(item.id);
    if (existing) {
      existing.order = item.order;
      inMemoryStages.set(item.id, existing);
    }
  }
  await persistStagesToDb();
  return Array.from(inMemoryStages.values()).sort((a, b) => a.order - b.order);
}

export async function archiveOrDeletePipelineStage(params: {
  id: number;
  archiveOnly?: boolean;
  mode?: "archive" | "delete";
  fallbackStageName?: string;
}): Promise<{ success: boolean; reassignedTo: string }> {
  await hydrateStagesIfNeeded();
  const target = inMemoryStages.get(params.id);
  if (!target) {
    return { success: true, reassignedTo: "Discovery" };
  }

  const defaultFallback =
    target.pipelineGroup === "opportunity" ? "Discovery" : "Intake / Onboarding";
  const fallbackStage = params.fallbackStageName || defaultFallback;

  // Safely migrate any cards in this stage so no cases are orphaned or lost
  await migrateCardsFromStage(target.name, fallbackStage);

  const shouldArchiveOnly =
    params.archiveOnly !== undefined
      ? params.archiveOnly
      : params.mode === "archive";

  if (shouldArchiveOnly || target.isDefault) {
    target.isArchived = true;
    inMemoryStages.set(params.id, target);
  } else {
    inMemoryStages.delete(params.id);
  }

  await persistStagesToDb();
  return { success: true, reassignedTo: fallbackStage };
}

async function migrateCardsFromStage(oldStageName: string, newStageName: string): Promise<void> {
  const lowerOld = oldStageName.trim().toLowerCase();
  for (const [cid, c] of Array.from(inMemoryContacts.entries())) {
    if ((c.pipelineStage || "").trim().toLowerCase() === lowerOld) {
      c.pipelineStage = newStageName;
      inMemoryContacts.set(cid, c);
    }
  }
  if (shouldUseDatabasePersistence()) {
    try {
      const db = await getDb();
      if (db) {
        const allContacts = await db.select().from(contacts);
        for (const c of allContacts) {
          if ((c.pipelineStage || "").trim().toLowerCase() === lowerOld) {
            await db
              .update(contacts)
              .set({ pipelineStage: newStageName, updatedAt: new Date() })
              .where(eq(contacts.id, c.id));
          }
        }
      }
    } catch {}
  }
}

// ── Public Saved Views Operations ────────────────────────────────────────────

export async function listPipelineSavedViews(userId?: number): Promise<PipelineSavedViewRecord[]> {
  await hydrateViewsIfNeeded();
  return Array.from(inMemoryViews.values())
    .filter((v) => {
      // Personal views are only visible to their creator; shared and default views are visible to all authorized staff
      if (v.isPrivate && v.createdBy && userId && Number(v.createdBy) !== Number(userId)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.order - b.order);
}

export async function upsertPipelineSavedView(input: {
  id?: number;
  name: string;
  filtersJson: string;
  isPinned?: boolean;
  isPrivate?: boolean;
  order?: number;
  userId?: number;
  userName?: string;
}): Promise<{ success: boolean; id: number; view: PipelineSavedViewRecord }> {
  await hydrateViewsIfNeeded();
  const cleanName = input.name.trim();
  const slug = cleanName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  if (input.id && inMemoryViews.has(input.id)) {
    const existing = inMemoryViews.get(input.id)!;
    const updated: PipelineSavedViewRecord = {
      ...existing,
      name: cleanName,
      slug: existing.isDefault ? existing.slug : slug,
      filtersJson: input.filtersJson,
      isPinned: input.isPinned ?? existing.isPinned,
      isPrivate: input.isPrivate ?? existing.isPrivate,
      order: input.order ?? existing.order,
    };
    inMemoryViews.set(input.id, updated);
    await persistViewsToDb();
    return { success: true, id: input.id, view: updated };
  }

  const newId = nextViewId++;
  const maxOrder = Array.from(inMemoryViews.values()).reduce(
    (max, v) => Math.max(max, v.order),
    0
  );
  const created: PipelineSavedViewRecord = {
    id: newId,
    name: cleanName,
    slug: `${slug}-${newId}`,
    filtersJson: input.filtersJson || "{}",
    isPinned: input.isPinned ?? true,
    isDefault: false,
    isPrivate: input.isPrivate ?? true,
    createdBy: input.userId ?? null,
    createdByName: input.userName ?? null,
    order: input.order ?? maxOrder + 1,
  };
  inMemoryViews.set(newId, created);
  await persistViewsToDb();
  return { success: true, id: newId, view: created };
}

export async function deletePipelineSavedView(
  id: number,
  userId?: number,
  isManagement?: boolean
): Promise<{ success: boolean }> {
  await hydrateViewsIfNeeded();
  const existing = inMemoryViews.get(id);
  if (!existing || existing.isDefault) {
    return { success: false };
  }
  if (!isManagement && existing.createdBy && Number(existing.createdBy) !== Number(userId)) {
    throw new Error("You can only delete your own personal views.");
  }
  inMemoryViews.delete(id);
  await persistViewsToDb();
  return { success: true };
}

// ── Pipeline Cards Aggregation & Mutations ───────────────────────────────────

export async function listPipelineCards(filters?: {
  advocate?: string;
  planTier?: string;
  stage?: string;
  pipelineGroup?: PipelineGroupType;
  accountStatus?: string;
  search?: string;
  sortField?: "name" | "family" | "stage" | "lastActivity" | "nextDate";
  sortDirection?: "asc" | "desc";
}): Promise<PipelineCardRecord[]> {
  await hydrateStagesIfNeeded();
  const configuredStages = Array.from(inMemoryStages.values()).sort((a, b) => a.order - b.order);

  const db = await getDb();
  const contactMap = new Map<number, any>();

  // 1. Load DB contacts if available
  if (db) {
    try {
      const dbContacts = await db.select().from(contacts).orderBy(desc(contacts.updatedAt));
      for (const c of dbContacts) {
        contactMap.set(Number(c.id), { ...c });
      }
    } catch {}
  }

  // 2. Overlay inMemoryContacts (authoritative for isolated test runs & instant mutations)
  for (const [cid, c] of Array.from(inMemoryContacts.entries())) {
    const existing = contactMap.get(Number(cid)) || {};
    contactMap.set(Number(cid), { ...existing, ...c });
  }

  // 3. Load supplementary tables (leads, discoveryCalls, appointments, tasks, offers)
  let allLeads: any[] = [];
  let allDiscoveryCalls: any[] = [];
  let allAppointments: any[] = [];
  let allTasks: any[] = [];
  let allOffers: any[] = [];

  if (db) {
    try {
      allLeads = await db.select().from(leads).orderBy(desc(leads.updatedAt));
    } catch {}
    try {
      allDiscoveryCalls = await db
        .select()
        .from(discoveryCalls)
        .orderBy(desc(discoveryCalls.updatedAt));
    } catch {}
    try {
      allAppointments = await db
        .select()
        .from(appointments)
        .orderBy(asc(appointments.startTime));
    } catch {}
    try {
      const pTasks = await db.select().from(projectTasks);
      const iTasks = await db.select().from(internalTasks);
      allTasks = [...pTasks, ...iTasks];
    } catch {}
    try {
      allOffers = await db.select().from(familyEnrollmentOffers);
    } catch {}
  }

  const allContactsList = Array.from(contactMap.values());

  // Identify student contacts:
  // - jobTitle === "Student" or type === "student"
  // - OR parentContactId is set
  // - OR legacy student rows (id 102..119 where jobTitle is null and planType is set and not a parent)
  const parentIdsReferenced = new Set<number>();
  for (const c of allContactsList) {
    if (c.parentContactId) {
      parentIdsReferenced.add(Number(c.parentContactId));
    }
  }

  const studentContacts = allContactsList.filter((c) => {
    if (c.archivedAt) return false;
    const jt = (c.jobTitle || c.type || c.contactType || "").toLowerCase();
    if (jt === "student") return true;
    if (jt.includes("parent")) return false;
    if (c.parentContactId) return true;
    if (parentIdsReferenced.has(Number(c.id))) return false;
    // Legacy seeded student rows without jobTitle
    if (
      !c.jobTitle &&
      (c.planType === "IEP" || c.planType === "504" || c.schoolName || (c.id >= 101 && c.id <= 125))
    ) {
      return true;
    }
    return false;
  });

  // Group siblings by parentContactId for multi-student family tracking
  const siblingsByParent = new Map<number, any[]>();
  for (const s of studentContacts) {
    if (s.parentContactId) {
      const pid = Number(s.parentContactId);
      const list = siblingsByParent.get(pid) || [];
      list.push(s);
      siblingsByParent.set(pid, list);
    }
  }

  const cards: PipelineCardRecord[] = [];

  for (const s of studentContacts) {
    const studentId = Number(s.id);
    const parentId = s.parentContactId ? Number(s.parentContactId) : null;
    const parent = parentId ? contactMap.get(parentId) : null;

    const studentFullName =
      `${s.firstName || ""} ${s.lastName || ""}`.trim() || `Student #${studentId}`;
    const parentFullName = parent
      ? `${parent.firstName || ""} ${parent.lastName || ""}`.trim()
      : s.parentName || `${s.lastName || studentFullName} Family`;

    const siblings = parentId ? siblingsByParent.get(parentId) || [s] : [s];
    const siblingNames = siblings
      .filter((sib) => Number(sib.id) !== studentId)
      .map((sib) => `${sib.firstName || ""} ${sib.lastName || ""}`.trim());

    // Check matching family enrollment offer for authoritative service plan if present
    const matchingOffer = allOffers.find(
      (o) =>
        Number(o.studentContactId) === studentId ||
        (parentId && Number(o.parentContactId) === parentId && o.status === "active")
    );

    const rawPlanValue =
      s.planTier ||
      parent?.planTier ||
      matchingOffer?.selectedPlanName ||
      matchingOffer?.selectedPlanKey ||
      "$55";
    const accountStatus = s.accountStatus || parent?.accountStatus || "Active";
    const operationalState = s.operationalState || parent?.operationalState || "Normal";
    const managerApprovalStatus =
      s.managerApprovalStatus || parent?.managerApprovalStatus || null;

    const { displayPlan, rawPlan, isScholarship } = normalizeServicePlanLabel(
      rawPlanValue,
      accountStatus,
      operationalState,
      managerApprovalStatus
    );

    const normalizedStage = normalizeStageName(
      s.pipelineStage,
      configuredStages,
      s.lifecycleStage
    );
    const matchedStageObj = configuredStages.find(
      (st) => st.name.toLowerCase() === normalizedStage.toLowerCase()
    );
    const stageGroup: PipelineGroupType =
      matchedStageObj?.pipelineGroup || inferPipelineGroup(normalizedStage, matchedStageObj?.category);

    const journeyType: "opportunity" | "active_advocacy" =
      stageGroup === "opportunity" ? "opportunity" : "active_advocacy";

    const advocateName =
      s.assignedAdvocateName || parent?.assignedAdvocateName || "Byron Honea";
    const initials = advocateName
      .split(/\s+/)
      .filter(Boolean)
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "BH";

    // Matching Lead & Discovery Call
    const matchedLead = allLeads.find(
      (l) =>
        (parentId && Number(l.contactId) === parentId) ||
        Number(l.contactId) === studentId ||
        (l.studentName && l.studentName.toLowerCase() === studentFullName.toLowerCase())
    );
    const matchedDiscovery = allDiscoveryCalls.find(
      (dc) =>
        Number(dc.studentContactId) === studentId ||
        (parentId && Number(dc.contactId) === parentId) ||
        (matchedLead && Number(dc.leadId) === Number(matchedLead.id))
    );

    // Upcoming appointment / meeting
    const studentAppointments = allAppointments.filter(
      (apt) =>
        (Number(apt.contactId) === studentId ||
          (parentId && Number(apt.contactId) === parentId)) &&
        apt.status !== "Cancelled"
    );
    const nextAppt = studentAppointments[0];
    const meetingDateStr = nextAppt?.startTime
      ? new Date(nextAppt.startTime).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : matchedDiscovery?.scheduledAt
        ? new Date(matchedDiscovery.scheduledAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : s.meetingDate || undefined;

    // Outstanding Tasks
    const studentOpenTasks = allTasks.filter(
      (t) =>
        (Number(t.linkedStudentId) === studentId || Number(t.assignedTo) === studentId) &&
        t.status !== "Done" &&
        t.status !== "completed"
    );
    const openTaskCount = studentOpenTasks.length;

    const defaultStageTask =
      normalizedStage === "Records Review"
        ? "Review IEP & evaluation records"
        : normalizedStage === "Billing & Authorization"
          ? "Verify billing & signed agreement"
          : normalizedStage === "Client Upload Tasks"
            ? "Awaiting parent document uploads"
            : normalizedStage === "School Contact"
              ? "Notify school & request draft IEP"
              : normalizedStage === "State Complaint"
                ? "Draft state complaint filing"
                : normalizedStage === "Meeting Scheduled"
                  ? "Prepare pre-meeting strategy brief"
                  : normalizedStage === "Intake / Onboarding"
                    ? "Portal setup & welcome checklist"
                    : normalizedStage === "Proposal (14-Day Exp)"
                      ? "14-day enrollment proposal active"
                      : normalizedStage.includes("Follow-Up")
                        ? `Scheduled ${normalizedStage.toLowerCase()} check-in`
                        : "Discovery call & intake review";

    const primaryTask =
      s.currentPrimaryAction ||
      studentOpenTasks[0]?.title ||
      s.primaryTask ||
      defaultStageTask;

    // Case Activity Timeline & Case Compass (read-only enrichment)
    let lastActivityAt = s.updatedAt
      ? new Date(s.updatedAt).toISOString()
      : new Date().toISOString();
    let lastActivitySummary = `Stage: ${normalizedStage}`;
    try {
      const activities = await getCaseActivityByStudent(studentId);
      if (activities.length > 0) {
        lastActivityAt = new Date(activities[0].eventDate).toISOString();
        lastActivitySummary = activities[0].title;
      }
    } catch {}

    let compassRiskLevel: string | null = null;
    let compassWhoHasBall: string | null = null;
    let compassNextStep: string | null = null;
    try {
      const compass = await getCaseCompass(s.caseId || `WP-${studentId}`, studentId);
      if (compass) {
        compassRiskLevel = compass.ideaRiskLevel || null;
        compassWhoHasBall = compass.whoHasBall || null;
        compassNextStep = compass.nextStep || null;
      }
    } catch {}

    const billingStatus = s.billingStatus || parent?.billingStatus || "Current";
    const contractStatus = s.contractStatus || parent?.contractStatus || "Active";
    const needsAttention =
      Boolean(s.needsAttention) ||
      billingStatus === "Payment Failed" ||
      accountStatus === "Renewal Needed" ||
      compassRiskLevel === "Critical" ||
      compassRiskLevel === "High";

    let activeWorkstreams: string[] = [];
    if (Array.isArray(s.activeWorkstreams)) {
      activeWorkstreams = s.activeWorkstreams;
    } else if (typeof s.activeWorkstreams === "string" && s.activeWorkstreams.trim()) {
      try {
        activeWorkstreams = JSON.parse(s.activeWorkstreams);
      } catch {
        activeWorkstreams = [s.activeWorkstreams];
      }
    }

    cards.push({
      id: studentId,
      firstName: s.firstName || "Student",
      lastName: s.lastName || "",
      fullName: studentFullName,
      parentContactId: parentId,
      parentName: parentFullName,
      parentEmail: parent?.email || s.email || null,
      parentPhone: parent?.phone || s.phone || null,
      siblingCount: siblings.length,
      siblingNames,
      schoolName: s.schoolName || s.goingToSchool || "School Not Set",
      countyDistrict: s.countyDistrict || parent?.city || "General District",
      gradeLevel: s.gradeLevel || null,
      planType: s.planType || "No IEP/504 Yet",
      planTier: displayPlan,
      rawPlanTier: rawPlan,
      servicePlanLabel:
        displayPlan === "Navigator"
          ? "Navigator ($55)"
          : displayPlan === "Anchor"
          ? "Anchor ($105)"
          : displayPlan === "Family"
          ? "Family Plan"
          : displayPlan,
      isScholarship,
      scholarshipStatus: managerApprovalStatus,
      pipelineStage: normalizedStage,
      pipelineGroup: stageGroup,
      stageGroup,
      isOpportunity: stageGroup === "opportunity",
      journeyType,
      lifecycleStage: s.lifecycleStage || (journeyType === "opportunity" ? "Discovery" : "Active"),
      accountStatus,
      billingStatus,
      contractStatus,
      assignedAdvocateName: advocateName,
      assignedAdvocateInitials: initials,
      caseId: s.caseId || parent?.caseId || `WP-2026-${String(studentId).padStart(4, "0")}`,
      leadId: matchedLead ? Number(matchedLead.id) : null,
      discoveryStatus: matchedDiscovery?.status || matchedLead?.status || null,
      needsAttention,
      attentionReason:
        s.attentionReason ||
        (billingStatus === "Payment Failed"
          ? "Payment Failed / Past Due"
          : accountStatus === "Renewal Needed"
            ? "Agreement Renewal Needed"
            : compassRiskLevel === "Critical" || compassRiskLevel === "High"
              ? `IDEA Risk: ${compassRiskLevel}`
              : undefined),
      openTaskCount,
      primaryTask,
      primaryTaskIcon:
        normalizedStage === "Meeting Scheduled"
          ? "calendar"
          : openTaskCount > 0
            ? "clock"
            : "check",
      secondaryTask:
        s.secondaryTask ||
        (compassNextStep
          ? `Compass: ${compassNextStep}`
          : meetingDateStr
            ? `Next: ${meetingDateStr}`
            : lastActivitySummary),
      secondaryTaskIcon: meetingDateStr ? "calendar" : "clock",
      nextDate: meetingDateStr || s.nextDate || "Scheduled",
      meetingDate: meetingDateStr,
      lastActivityAt,
      lastActivitySummary,
      lastActivityText: lastActivitySummary,
      compassRiskLevel,
      compassWhoHasBall,
      compassNextStep,
      activeWorkstreams,
      updatedAt: s.updatedAt ? new Date(s.updatedAt).toISOString() : new Date().toISOString(),
    });
  }

  let result = cards;
  if (filters) {
    if (filters.advocate) {
      const adv = filters.advocate.toLowerCase();
      result = result.filter((c) => c.assignedAdvocateName.toLowerCase() === adv);
    }
    if (filters.planTier) {
      result = result.filter((c) => doesCardMatchPlanFilter(c, filters.planTier!));
    }
    if (filters.stage) {
      const st = filters.stage.toLowerCase();
      result = result.filter((c) => c.pipelineStage.toLowerCase() === st);
    }
    if (filters.pipelineGroup) {
      result = result.filter((c) => c.pipelineGroup === filters.pipelineGroup);
    }
    if (filters.accountStatus) {
      const acc = filters.accountStatus.toLowerCase();
      result = result.filter((c) => c.accountStatus.toLowerCase() === acc);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter((c) =>
        [
          c.fullName,
          c.parentName,
          c.parentEmail,
          c.schoolName,
          c.countyDistrict,
          c.caseId,
          c.pipelineStage,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    if (filters.sortField) {
      const dir = filters.sortDirection === "desc" ? -1 : 1;
      const stageOrderMap = new Map<string, number>();
      configuredStages.forEach((s) => stageOrderMap.set(s.name.toLowerCase(), s.order));
      result = [...result].sort((a, b) => {
        if (filters.sortField === "name") {
          return a.fullName.localeCompare(b.fullName) * dir;
        }
        if (filters.sortField === "family") {
          return (a.parentName || a.lastName).localeCompare(b.parentName || b.lastName) * dir;
        }
        if (filters.sortField === "stage") {
          const oa = stageOrderMap.get(a.pipelineStage.toLowerCase()) ?? 99;
          const ob = stageOrderMap.get(b.pipelineStage.toLowerCase()) ?? 99;
          return (oa - ob) * dir;
        }
        if (filters.sortField === "lastActivity") {
          return (
            (new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()) * dir
          );
        }
        if (filters.sortField === "nextDate") {
          return (a.meetingDate || a.primaryTask).localeCompare(
            b.meetingDate || b.primaryTask
          ) * dir;
        }
        return 0;
      });
    }
  }

  return result;
}

export async function updatePipelineCardStage(params: {
  contactId: number;
  stage: string;
  actorName?: string;
  actorRole?: string;
}): Promise<{
  success: boolean;
  stageChanged: boolean;
  contactId: number;
  previousStage: string;
  stage: string;
  stageGroup: PipelineGroupType;
  journeyType: "opportunity" | "active_advocacy";
  preservedPlanTier: string;
}> {
  await hydrateStagesIfNeeded();
  const configuredStages = Array.from(inMemoryStages.values());
  const normalizedTarget = normalizeStageName(params.stage, configuredStages);
  const stageObj = configuredStages.find(
    (s) => s.name.toLowerCase() === normalizedTarget.toLowerCase()
  );
  const stageGroup: PipelineGroupType =
    stageObj?.pipelineGroup || inferPipelineGroup(normalizedTarget, stageObj?.category);
  const journeyType: "opportunity" | "active_advocacy" =
    stageGroup === "opportunity" ? "opportunity" : "active_advocacy";

  const db = await getDb();
  let currentContact: any = inMemoryContacts.get(params.contactId) || null;
  if (!currentContact && db) {
    try {
      const [row] = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, params.contactId))
        .limit(1);
      if (row) currentContact = row;
    } catch {}
  }

  const previousStage = currentContact?.pipelineStage || "Discovery";
  const preservedPlanTier = currentContact?.planTier || "$55";

  // Determine updated lifecycleStage without touching billingStatus, planTier, contractStatus, or scholarship fields
  const newLifecycleStage =
     normalizedTarget === "Closed"
      ? "Closed"
      : normalizedTarget === "Intake / Onboarding" ||
          normalizedTarget === "Billing & Authorization" ||
          normalizedTarget === "Client Upload Tasks"
        ? "Onboarding"
        : stageGroup === "opportunity"
          ? "Discovery"
          : "Active";

  // 1. Update inMemoryContacts
  if (currentContact) {
    const updatedMem = {
      ...currentContact,
      pipelineStage: normalizedTarget,
      lifecycleStage: newLifecycleStage,
      updatedAt: new Date(),
    };
    inMemoryContacts.set(params.contactId, updatedMem);
  } else {
    inMemoryContacts.set(params.contactId, {
      id: params.contactId,
      firstName: "Student",
      lastName: `#${params.contactId}`,
      jobTitle: "Student",
      pipelineStage: normalizedTarget,
      lifecycleStage: newLifecycleStage,
      planTier: preservedPlanTier,
      updatedAt: new Date(),
    });
  }

  // 2. Update database contact record (ONLY pipelineStage, lifecycleStage, updatedAt — never billing/subscription/scholarship)
  if (shouldUseDatabasePersistence() && db) {
    try {
      await db
        .update(contacts)
        .set({
          pipelineStage: normalizedTarget,
          lifecycleStage: newLifecycleStage,
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, params.contactId));
    } catch (err) {
      console.warn("[Pipeline DB] Contact stage update warning:", err);
    }
  }

  // 3. Record stage change in Student Activity Timeline (preserving Case Compass completely)
  const stageChanged = previousStage.toLowerCase() !== normalizedTarget.toLowerCase();
  if (stageChanged) {
    try {
      await createCaseActivityItem({
        studentContactId: params.contactId,
        caseId: currentContact?.caseId || `WP-2026-${String(params.contactId).padStart(4, "0")}`,
        eventType: "strategy_decision",
        title: `Pipeline Stage Moved: ${previousStage} → ${normalizedTarget}`,
        description: `Case moved from "${previousStage}" to "${normalizedTarget}" (${
          stageGroup === "opportunity" ? "Opportunity Stage" : "Active Advocacy Stage"
        }). Service plan (${preservedPlanTier}) and Case Compass assessments preserved.`,
        whyReason: `Pipeline stage progression updated by ${params.actorName || "Staff"}`,
        ownerName: params.actorName || "Byron Honea",
        ownerRole: params.actorRole || "Advocate",
        categoryColor: stageGroup === "opportunity" ? "cyan" : "amber",
        eventDate: new Date(),
      });
    } catch (actErr) {
      console.warn("[Pipeline] Activity timeline log warning:", actErr);
    }

    // 4. Trigger WAP 2.1 Automations (executes matching enabled workflows once via eventKey idempotency)
    try {
      const { triggerAutomationFlow } = await import("./automations");
      await triggerAutomationFlow("stage_changed", params.contactId, false, {
        eventKey: `stage_${params.contactId}_${normalizedTarget}`,
        stageFrom: previousStage,
        stageTo: normalizedTarget,
      });
    } catch (autoErr) {
      console.warn("[Pipeline] Automation trigger warning on updateStage:", autoErr);
    }
  }

  return {
    success: true,
    stageChanged,
    contactId: params.contactId,
    previousStage,
    stage: normalizedTarget,
    stageGroup,
    journeyType,
    preservedPlanTier,
  };
}

export async function assignPipelineCardAdvocate(params: {
  contactId: number;
  advocateName: string;
  actorName?: string;
  actorRole?: string;
}): Promise<{
  success: boolean;
  contactId: number;
  assignedAdvocateName: string;
  assignedAdvocateInitials: string;
}> {
  const cleanAdvocate = params.advocateName.trim() || "Byron Honea";
  const initials =
    cleanAdvocate
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "BH";

  const db = await getDb();
  let currentContact: any = inMemoryContacts.get(params.contactId) || null;
  if (!currentContact && db) {
    try {
      const [row] = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, params.contactId))
        .limit(1);
      if (row) currentContact = row;
    } catch {}
  }

  if (currentContact) {
    inMemoryContacts.set(params.contactId, {
      ...currentContact,
      assignedAdvocateName: cleanAdvocate,
      updatedAt: new Date(),
    });
  } else {
    inMemoryContacts.set(params.contactId, {
      id: params.contactId,
      firstName: "Student",
      lastName: `#${params.contactId}`,
      jobTitle: "Student",
      assignedAdvocateName: cleanAdvocate,
      updatedAt: new Date(),
    });
  }

  if (shouldUseDatabasePersistence() && db) {
    try {
      await db
        .update(contacts)
        .set({
          assignedAdvocateName: cleanAdvocate,
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, params.contactId));
    } catch (err) {
      console.warn("[Pipeline DB] Advocate assignment warning:", err);
    }
  }

  try {
    await createCaseActivityItem({
      studentContactId: params.contactId,
      caseId: currentContact?.caseId || `WP-2026-${String(params.contactId).padStart(4, "0")}`,
      eventType: "general",
      title: `Assigned Advocate Updated: ${cleanAdvocate}`,
      description: `Student case assigned to advocate ${cleanAdvocate} by ${
        params.actorName || "Staff"
      }.`,
      whyReason: "Advocate assignment updated in Advocacy Pipeline",
      ownerName: params.actorName || "Byron Honea",
      ownerRole: params.actorRole || "Advocate",
      categoryColor: "teal",
      eventDate: new Date(),
    });
  } catch {}

  return {
    success: true,
    contactId: params.contactId,
    assignedAdvocateName: cleanAdvocate,
    assignedAdvocateInitials: initials,
  };
}

/**
 * Transitions a Lead / Opportunity into Active Advocacy (or connects a Lead to the Pipeline)
 * WITHOUT creating duplicate parent, student, or project records.
 * Preserves all discovery notes, uploaded files, communication history, and Case Compass data.
 */
export async function transitionOpportunityToActiveAdvocacy(params: {
  contactId?: number;
  studentContactId?: number;
  parentContactId?: number;
  leadId?: number;
  targetStage?: string;
  assignedAdvocateName?: string;
  actorName?: string;
  actorRole?: string;
}): Promise<{
  success: boolean;
  studentContactId: number;
  parentContactId: number | null;
  preservedIds: {
    studentContactId: number;
    parentContactId: number | null;
  };
  pipelineStage: string;
  journeyType: "opportunity" | "active_advocacy";
  reusedExistingStudent: boolean;
  reusedExistingParent: boolean;
}> {
  await hydrateStagesIfNeeded();
  const db = await getDb();
  const targetStage = params.targetStage || "Intake / Onboarding";
  const resolvedStudentId = params.studentContactId ?? params.contactId;

  let studentContact: any = null;
  let parentContact: any = null;
  let reusedExistingStudent = false;
  let reusedExistingParent = false;

  // 1. Resolve existing student contact if studentContactId supplied
  if (resolvedStudentId) {
    studentContact = inMemoryContacts.get(resolvedStudentId) || null;
    if (!studentContact && db) {
      try {
        const [row] = await db
          .select()
          .from(contacts)
          .where(eq(contacts.id, resolvedStudentId))
          .limit(1);
        if (row) studentContact = row;
      } catch {}
    }
    if (studentContact) {
      reusedExistingStudent = true;
    }
  }

  // 2. Resolve existing parent contact
  const resolvedParentId =
    params.parentContactId ||
    (studentContact?.parentContactId ? Number(studentContact.parentContactId) : null);

  if (resolvedParentId) {
    parentContact = inMemoryContacts.get(resolvedParentId) || null;
    if (!parentContact && db) {
      try {
        const [row] = await db
          .select()
          .from(contacts)
          .where(eq(contacts.id, resolvedParentId))
          .limit(1);
        if (row) parentContact = row;
      } catch {}
    }
    if (parentContact) {
      reusedExistingParent = true;
    }
  }

  // 3. If leadId was provided and studentContact not yet found, look up lead and existing children of parent
  if (!studentContact && params.leadId && db) {
    try {
      const [leadRow] = await db
        .select()
        .from(leads)
        .where(eq(leads.id, params.leadId))
        .limit(1);
      if (leadRow) {
        const pid = leadRow.contactId ? Number(leadRow.contactId) : resolvedParentId;
        if (pid) {
          reusedExistingParent = true;
          // Check inMemoryContacts and DB for existing student under this parent
          for (const c of Array.from(inMemoryContacts.values())) {
            if (Number(c.parentContactId) === pid) {
              studentContact = c;
              reusedExistingStudent = true;
              break;
            }
          }
          if (!studentContact) {
            const existingChildren = await db
              .select()
              .from(contacts)
              .where(eq(contacts.parentContactId, pid));
            if (existingChildren.length > 0) {
              studentContact = existingChildren[0];
              reusedExistingStudent = true;
            }
          }
        }
      }
    } catch {}
  }

  // 4. If parentContact exists but studentContact was not yet found by ID, check existing children of parentContact
  if (!studentContact && resolvedParentId) {
    for (const c of Array.from(inMemoryContacts.values())) {
      if (Number(c.parentContactId) === resolvedParentId) {
        studentContact = c;
        reusedExistingStudent = true;
        break;
      }
    }
    if (!studentContact && db) {
      try {
        const existingChildren = await db
          .select()
          .from(contacts)
          .where(eq(contacts.parentContactId, resolvedParentId));
        if (existingChildren.length > 0) {
          studentContact = existingChildren[0];
          reusedExistingStudent = true;
        }
      } catch {}
    }
  }

  if (!studentContact) {
    throw new Error("Student record not found for transition.");
  }

  const finalStudentId = Number(studentContact.id);
  const finalParentId = studentContact.parentContactId
    ? Number(studentContact.parentContactId)
    : resolvedParentId || null;

  if (params.assignedAdvocateName) {
    await assignPipelineCardAdvocate({
      contactId: finalStudentId,
      advocateName: params.assignedAdvocateName,
      actorName: params.actorName,
    });
  }

  const stageResult = await updatePipelineCardStage({
    contactId: finalStudentId,
    stage: targetStage,
    actorName: params.actorName,
    actorRole: params.actorRole,
  });

  // Mark student contact lifecycleStage as Client when transitioned to Active Advocacy
  const updatedStudentMem = inMemoryContacts.get(finalStudentId);
  if (updatedStudentMem && stageResult.journeyType === "active_advocacy") {
    updatedStudentMem.lifecycleStage = "Client";
    inMemoryContacts.set(finalStudentId, updatedStudentMem);
  }

  return {
    success: true,
    studentContactId: finalStudentId,
    parentContactId: finalParentId,
    preservedIds: {
      studentContactId: finalStudentId,
      parentContactId: finalParentId,
    },
    pipelineStage: stageResult.stage,
    journeyType: stageResult.journeyType,
    reusedExistingStudent,
    reusedExistingParent,
  };
}

export function __resetPipelineStateForTests(): void {
  stagesHydrated = false;
  viewsHydrated = false;
  nextStageId = 100;
  nextViewId = 100;
  inMemoryStages.clear();
  inMemoryViews.clear();
}

export const resetPipelineTestOverlay = __resetPipelineStateForTests;

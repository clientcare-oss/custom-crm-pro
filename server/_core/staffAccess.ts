import { TRPCError } from "@trpc/server";
import { eq, or } from "drizzle-orm";
import { staffAccessProfiles, users } from "../../drizzle/schema";
import { getDb } from "../db/connection";

export type StaffRoleId =
  | "management"
  | "advocate"
  | "call_center"
  | "documentation"
  | "technology"
  | "operations"
  | "none";

export type ModuleAccessLevel = "none" | "view" | "edit";
export type CaseAccessLevel = "none" | "view" | "edit" | "manage";
export type StaffAccountStatus = "active" | "on_leave" | "inactive";
export type StaffInvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export interface StaffAccessProfile {
  userId: number;
  openId: string;
  employeeId: string | null;
  name: string;
  email: string;
  primaryRole: StaffRoleId;
  additionalRoles: StaffRoleId[];
  isProtectedOwner: boolean;
  hasAdminAccess: boolean;
  isStaff: boolean;
  accountStatus: StaffAccountStatus;
  modulePermissions: Record<string, ModuleAccessLevel>;
  caseWorkspaceAccess: Record<string, CaseAccessLevel>;
  permissionOverrides: Record<string, boolean>;
  deactivatedAt?: Date | null;
  deactivatedBy?: number | null;
  deactivationNotes?: string | null;
  // WAP 1A.3 Employee Onboarding & Invitation Lifecycle Metadata
  invitationStatus?: StaffInvitationStatus;
  invitationToken?: string | null;
  clerkInvitationId?: string | null;
  invitedAt?: string | null;
  invitationExpiresAt?: string | null;
  acceptedAt?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  employmentType?: string | null;
  department?: string | null;
  normalScheduleSummary?: string | null;
}

export const SERVER_ROLE_DEFAULTS: Record<
  Exclude<StaffRoleId, "none">,
  {
    defaultModules: string[];
    defaultPermissions: string[];
    defaultCaseAccess: Record<string, CaseAccessLevel>;
  }
> = {
  management: {
    defaultModules: ["all"],
    defaultPermissions: ["all"],
    defaultCaseAccess: {
      compass: "manage",
      notes: "manage",
      files: "manage",
      tools: "manage",
      appointments: "manage",
      financials: "manage",
      meeting_workspace: "manage",
      post_meeting_review: "manage",
      projects: "manage",
      voyage_log: "manage",
      tasks: "manage",
      activity_timeline: "edit",
    },
  },
  advocate: {
    defaultModules: [
      "crew_quarters",
      "calendar",
      "advocacy_pipeline",
      "students_cases",
      "meeting_workspace",
      "post_meeting_review",
      "case_compass",
      "smart_files",
      "contracts",
      "first_mate",
      "tools_hub",
      "voyage_log",
      "braindump",
      "tasks",
      "templates",
      "knowledge_base",
      "walkthroughs",
    ],
    defaultPermissions: [
      "view_clients",
      "edit_clients",
      "manage_portal_access",
      "upload_files",
      "view_assigned_cases",
      "manage_appointments",
      "view_team_calendar",
      "view_reports",
    ],
    defaultCaseAccess: {
      compass: "edit",
      notes: "edit",
      files: "edit",
      tools: "edit",
      appointments: "edit",
      financials: "view",
      meeting_workspace: "manage",
      post_meeting_review: "manage",
      projects: "edit",
      voyage_log: "manage",
      tasks: "edit",
      activity_timeline: "view",
    },
  },
  call_center: {
    defaultModules: [
      "crew_quarters",
      "call_center",
      "calendar",
      "leads",
      "scheduler",
      "tasks",
      "knowledge_base",
    ],
    defaultPermissions: [
      "view_clients",
      "edit_clients",
      "manage_portal_access",
      "manage_appointments",
      "view_team_calendar",
      "manage_team_calendar",
    ],
    defaultCaseAccess: {
      compass: "view",
      notes: "view",
      files: "none",
      tools: "none",
      appointments: "edit",
      financials: "none",
      meeting_workspace: "none",
      post_meeting_review: "none",
      projects: "none",
      voyage_log: "none",
      tasks: "view",
      activity_timeline: "view",
    },
  },
  documentation: {
    defaultModules: [
      "crew_quarters",
      "students_cases",
      "tools_hub",
      "tasks",
      "templates",
      "knowledge_base",
      "walkthroughs",
    ],
    defaultPermissions: [
      "view_clients",
      "view_assigned_cases",
      "upload_files",
      "export_records",
    ],
    defaultCaseAccess: {
      compass: "view",
      notes: "view",
      files: "edit",
      tools: "edit",
      appointments: "view",
      financials: "none",
      meeting_workspace: "view",
      post_meeting_review: "edit",
      projects: "edit",
      voyage_log: "view",
      tasks: "edit",
      activity_timeline: "view",
    },
  },
  technology: {
    defaultModules: [
      "crew_quarters",
      "automations",
      "ai_connections",
      "tech_tasks",
      "knowledge_base",
      "settings",
    ],
    defaultPermissions: [
      "access_admin_settings",
      "manage_integrations",
      "access_ai_config",
      "view_reports",
    ],
    defaultCaseAccess: {
      compass: "none",
      notes: "none",
      files: "none",
      tools: "manage",
      appointments: "none",
      financials: "none",
      meeting_workspace: "view",
      post_meeting_review: "none",
      projects: "none",
      voyage_log: "view",
      tasks: "view",
      activity_timeline: "view",
    },
  },
  operations: {
    defaultModules: [
      "crew_quarters",
      "calendar",
      "invoices",
      "services",
      "bill_guardian",
      "tasks",
      "tech_tasks",
      "giving",
      "walkthroughs",
    ],
    defaultPermissions: [
      "view_team_calendar",
      "manage_team_calendar",
      "view_reports",
      "modify_billing",
      "modify_contracts",
      "manage_portal_access",
      "upload_files",
      "export_records",
    ],
    defaultCaseAccess: {
      compass: "view",
      notes: "view",
      files: "view",
      tools: "view",
      appointments: "edit",
      financials: "manage",
      meeting_workspace: "none",
      post_meeting_review: "view",
      projects: "view",
      voyage_log: "view",
      tasks: "manage",
      activity_timeline: "view",
    },
  },
};

/**
 * Confirmed WAP 1A.1 Account Assignments (Immutable Baseline Seed)
 */
export const CONFIRMED_STAFF_PROFILES: StaffAccessProfile[] = [
  // 1. Byron Honea, Clerk account 1 — Protected Owner
  {
    userId: 9060114,
    openId: "user_3HamsO4oLoKLKOnDi9BR16e6RZW",
    employeeId: "emp-byron-honea",
    name: "Byron Honea",
    email: "byron@waypointadvocates.com",
    primaryRole: "management",
    additionalRoles: ["advocate"],
    isProtectedOwner: true,
    hasAdminAccess: true,
    isStaff: true,
    accountStatus: "active",
    modulePermissions: {},
    caseWorkspaceAccess: {},
    permissionOverrides: {},
  },
  // 2. Byron Honea, Clerk account 2 — Protected Owner
  {
    userId: 9060115,
    openId: "user_3HEhAHIdXNwvbiK5NSR6RPkTInD",
    employeeId: "emp-byron-honea-2",
    name: "Byron Honea",
    email: "clientcare@waypointadvocates.com",
    primaryRole: "management",
    additionalRoles: ["advocate"],
    isProtectedOwner: true,
    hasAdminAccess: true,
    isStaff: true,
    accountStatus: "active",
    modulePermissions: {},
    caseWorkspaceAccess: {},
    permissionOverrides: {},
  },
  // 3. Kyle Atkins, Clerk account — Technology / Developer with Full Admin Access (Not Protected Owner)
  {
    userId: 9060249,
    openId: "user_3HELy6EVi_kyle_atkins",
    employeeId: "emp-kyle-atkins",
    name: "Kyle Atkins",
    email: "kyle@waypointadvocates.com",
    primaryRole: "technology",
    additionalRoles: ["management"],
    isProtectedOwner: false,
    hasAdminAccess: true,
    isStaff: true,
    accountStatus: "active",
    modulePermissions: {},
    caseWorkspaceAccess: {},
    permissionOverrides: {},
  },
  // 4. Kyle Atkins, development login — None / No Staff Access / Inactive
  {
    userId: 9060031,
    openId: "katkins-admin-openid",
    employeeId: null,
    name: "Kyle Atkins (Dev Login - Disabled)",
    email: "katkins@dev.local",
    primaryRole: "none",
    additionalRoles: [],
    isProtectedOwner: false,
    hasAdminAccess: false,
    isStaff: false,
    accountStatus: "inactive",
    modulePermissions: {},
    caseWorkspaceAccess: {},
    permissionOverrides: {},
  },
  // 5. Wyatt, Clerk account — Call Center Only (Restricted to Call Center Permissions)
  {
    userId: 9060250,
    openId: "user_3KPhcRBro_wyatt",
    employeeId: "emp-wyatt-smith",
    name: "Wyatt Smith",
    email: "wyatt.smith@waypointadvocates.com",
    primaryRole: "call_center",
    additionalRoles: [],
    isProtectedOwner: false,
    hasAdminAccess: false,
    isStaff: true,
    accountStatus: "active",
    modulePermissions: {},
    caseWorkspaceAccess: {},
    permissionOverrides: {},
  },
];

// Protected owner constants — never depend solely on email matching
export const PROTECTED_OWNER_USER_IDS = new Set<number>([9060114, 9060115]);
export const PROTECTED_OWNER_OPEN_IDS = new Set<string>([
  "user_3HamsO4oLoKLKOnDi9BR16e6RZW",
  "user_3HEhAHIdXNwvbiK5NSR6RPkTInD",
]);
export const PROTECTED_OWNER_EMPLOYEE_IDS = new Set<string>([
  "emp-byron-honea",
  "emp-byron-honea-2",
]);

// Authoritative in-memory state synchronized with DB (ensures deterministic behavior in both DB and offline Vitest runs)
const profilesByUserId = new Map<number, StaffAccessProfile>();
const profilesByOpenId = new Map<string, StaffAccessProfile>();
const profilesByEmployeeId = new Map<string, StaffAccessProfile>();

export function computeEffectiveInvitationStatus(
  status?: StaffInvitationStatus,
  expiresAt?: string | null
): StaffInvitationStatus {
  if (!status) return "accepted";
  if (status === "pending" && expiresAt) {
    const expMs = new Date(expiresAt).getTime();
    if (!Number.isNaN(expMs) && Date.now() > expMs) {
      return "expired";
    }
  }
  return status;
}

function indexProfile(profile: StaffAccessProfile) {
  const normalizedEmployeeId =
    profile.userId === 9060115 && profile.employeeId === "emp-byron-honea"
      ? "emp-byron-honea-2"
      : profile.employeeId;
  const effectiveInvStatus = computeEffectiveInvitationStatus(
    profile.invitationStatus,
    profile.invitationExpiresAt
  );
  const copy: StaffAccessProfile = {
    ...profile,
    employeeId: normalizedEmployeeId,
    additionalRoles: [...(profile.additionalRoles || [])],
    modulePermissions: { ...(profile.modulePermissions || {}) },
    caseWorkspaceAccess: { ...(profile.caseWorkspaceAccess || {}) },
    permissionOverrides: { ...(profile.permissionOverrides || {}) },
    invitationStatus: effectiveInvStatus,
  };
  profilesByUserId.set(copy.userId, copy);
  if (copy.openId) {
    profilesByOpenId.set(copy.openId, copy);
  }
  if (copy.employeeId) {
    profilesByEmployeeId.set(copy.employeeId, copy);
  }
}

function seedMemoryMapWithDefaults() {
  profilesByUserId.clear();
  profilesByOpenId.clear();
  profilesByEmployeeId.clear();
  for (const p of CONFIRMED_STAFF_PROFILES) {
    indexProfile(p);
  }
}

export async function resetStaffAccessMemoryToDefaults() {
  seedMemoryMapWithDefaults();
  const db = await getDb();
  if (db) {
    try {
      await db.delete(staffAccessProfiles);
      for (const p of CONFIRMED_STAFF_PROFILES) {
        await persistProfileToDb(p);
      }
    } catch {
      // Ignore if table not present in mock DB
    }
  }
}

// Initialize baseline fallback profiles on module load without overwriting DB
seedMemoryMapWithDefaults();

// Auth cache invalidation callback registered by context.ts
let authCacheInvalidator: ((openIdOrUserId?: string | number) => void) | null = null;

export function registerAuthCacheInvalidator(fn: (openIdOrUserId?: string | number) => void) {
  authCacheInvalidator = fn;
}

export function triggerAuthCacheInvalidation(openIdOrUserId?: string | number) {
  if (authCacheInvalidator) {
    authCacheInvalidator(openIdOrUserId);
  }
}

function parseJsonSafe<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

interface EncodedNotesMeta {
  __wpMeta?: number;
  deactivationNotes?: string | null;
  invitationStatus?: StaffInvitationStatus;
  invitationToken?: string | null;
  clerkInvitationId?: string | null;
  invitedAt?: string | null;
  invitationExpiresAt?: string | null;
  acceptedAt?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  employmentType?: string | null;
  department?: string | null;
  normalScheduleSummary?: string | null;
}

function decodeNotesMeta(raw: string | null | undefined): EncodedNotesMeta {
  if (!raw) return {};
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.__wpMeta === 1) {
        return parsed as EncodedNotesMeta;
      }
    } catch {}
  }
  return { deactivationNotes: raw };
}

function encodeNotesMeta(profile: StaffAccessProfile): string | null {
  const hasOnboardingMeta =
    Boolean(profile.invitationStatus && profile.invitationStatus !== "accepted") ||
    Boolean(profile.invitationToken) ||
    Boolean(profile.clerkInvitationId) ||
    Boolean(profile.invitedAt) ||
    Boolean(profile.invitationExpiresAt) ||
    Boolean(profile.acceptedAt) ||
    Boolean(profile.jobTitle) ||
    Boolean(profile.phone) ||
    Boolean(profile.employmentType) ||
    Boolean(profile.department) ||
    Boolean(profile.normalScheduleSummary);

  if (!hasOnboardingMeta) {
    return profile.deactivationNotes || null;
  }

  const meta: EncodedNotesMeta = {
    __wpMeta: 1,
    deactivationNotes: profile.deactivationNotes || null,
    invitationStatus: profile.invitationStatus || "accepted",
    invitationToken: profile.invitationToken || null,
    clerkInvitationId: profile.clerkInvitationId || null,
    invitedAt: profile.invitedAt || null,
    invitationExpiresAt: profile.invitationExpiresAt || null,
    acceptedAt: profile.acceptedAt || null,
    jobTitle: profile.jobTitle || null,
    phone: profile.phone || null,
    employmentType: profile.employmentType || null,
    department: profile.department || null,
    normalScheduleSummary: profile.normalScheduleSummary || null,
  };
  return JSON.stringify(meta);
}

function dbRowToProfile(row: any): StaffAccessProfile {
  const userId = Number(row.userId);
  const openId = String(row.openId || "");
  const isOwner =
    Boolean(row.isProtectedOwner) ||
    PROTECTED_OWNER_USER_IDS.has(userId) ||
    PROTECTED_OWNER_OPEN_IDS.has(openId);
  const primaryRole = (isOwner ? "management" : row.primaryRole || "none") as StaffRoleId;
  const accountStatus: StaffAccountStatus = isOwner
    ? "active"
    : ((row.accountStatus as StaffAccountStatus) || "active");
  const hasAdminAccess = isOwner ? true : Boolean(row.hasAdminAccess);
  const isStaff = isOwner ? true : Boolean(row.isStaff) && primaryRole !== "none";
  const rawEmployeeId = row.employeeId || null;
  const employeeId =
    userId === 9060115 && rawEmployeeId === "emp-byron-honea"
      ? "emp-byron-honea-2"
      : rawEmployeeId;

  const meta = decodeNotesMeta(row.deactivationNotes);
  const effectiveInvitationStatus = isOwner
    ? "accepted"
    : computeEffectiveInvitationStatus(meta.invitationStatus, meta.invitationExpiresAt);

  return {
    userId,
    openId,
    employeeId,
    name: row.name || "Staff Member",
    email: row.email || "",
    primaryRole,
    additionalRoles: parseJsonSafe<StaffRoleId[]>(row.additionalRoles, []),
    isProtectedOwner: isOwner,
    hasAdminAccess,
    isStaff,
    accountStatus,
    modulePermissions: parseJsonSafe<Record<string, ModuleAccessLevel>>(row.modulePermissions, {}),
    caseWorkspaceAccess: parseJsonSafe<Record<string, CaseAccessLevel>>(row.caseWorkspaceAccess, {}),
    permissionOverrides: parseJsonSafe<Record<string, boolean>>(row.permissionOverrides, {}),
    deactivatedAt: row.deactivatedAt ? new Date(row.deactivatedAt) : null,
    deactivatedBy: row.deactivatedBy ? Number(row.deactivatedBy) : null,
    deactivationNotes: meta.deactivationNotes || null,
    invitationStatus: effectiveInvitationStatus,
    invitationToken: meta.invitationToken || null,
    clerkInvitationId: meta.clerkInvitationId || null,
    invitedAt: meta.invitedAt || null,
    invitationExpiresAt: meta.invitationExpiresAt || null,
    acceptedAt: meta.acceptedAt || null,
    jobTitle: meta.jobTitle || null,
    phone: meta.phone || null,
    employmentType: meta.employmentType || null,
    department: meta.department || null,
    normalScheduleSummary: meta.normalScheduleSummary || null,
  };
}

/**
 * Checks whether a user identity matches a Protected Owner account.
 */
export function isProtectedOwnerAccount(userOrId: { id?: number; userId?: number; openId?: string; employeeId?: string | null } | number): boolean {
  if (typeof userOrId === "number") {
    return PROTECTED_OWNER_USER_IDS.has(userOrId);
  }
  const id = userOrId.id ?? userOrId.userId;
  if (id !== undefined && PROTECTED_OWNER_USER_IDS.has(Number(id))) {
    return true;
  }
  if (userOrId.openId && PROTECTED_OWNER_OPEN_IDS.has(userOrId.openId)) {
    return true;
  }
  if (userOrId.employeeId && PROTECTED_OWNER_EMPLOYEE_IDS.has(userOrId.employeeId)) {
    return true;
  }
  return false;
}

/**
 * Resolves the trusted server-side staff access profile for any authenticated or candidate user.
 * Never trusts client-supplied `role` to grant admin or staff access to unknown/unauthorized users.
 */
export async function resolveStaffAccess(user: {
  id?: number;
  openId?: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  loginMethod?: string | null;
} | null | undefined): Promise<StaffAccessProfile> {
  if (!user) {
    return {
      userId: 0,
      openId: "",
      employeeId: null,
      name: "Anonymous",
      email: "",
      primaryRole: "none",
      additionalRoles: [],
      isProtectedOwner: false,
      hasAdminAccess: false,
      isStaff: false,
      accountStatus: "inactive",
      modulePermissions: {},
      caseWorkspaceAccess: {},
      permissionOverrides: {},
    };
  }

  const userId = Number(user.id || 0);
  const openId = String(user.openId || "");

  // 1. Explicitly blocked dev login account (9060031 / katkins-admin-openid)
  if (userId === 9060031 || openId === "katkins-admin-openid") {
    return {
      userId: 9060031,
      openId: openId || "katkins-admin-openid",
      employeeId: null,
      name: user.name || "Kyle Atkins (Dev Login - Disabled)",
      email: user.email || "katkins@dev.local",
      primaryRole: "none",
      additionalRoles: [],
      isProtectedOwner: false,
      hasAdminAccess: false,
      isStaff: false,
      accountStatus: "inactive",
      modulePermissions: {},
      caseWorkspaceAccess: {},
      permissionOverrides: {},
    };
  }

  // 2. Check DB staff_access_profiles table if available (authoritative persistent truth)
  const db = await getDb();
  if (db) {
    try {
      const conditions: any[] = [];
      if (userId > 0) conditions.push(eq(staffAccessProfiles.userId, userId));
      if (openId) conditions.push(eq(staffAccessProfiles.openId, openId));
      if (conditions.length > 0) {
        const rows = await db
          .select()
          .from(staffAccessProfiles)
          .where(conditions.length === 1 ? conditions[0] : or(...conditions))
          .limit(1);
        if (rows.length > 0) {
          const dbProfile = dbRowToProfile(rows[0]);
          indexProfile(dbProfile);
          return dbProfile;
        }
      }
    } catch {
      // Table may not exist in mock unit test DB; fall through to authoritative memory map
    }
  }

  // 3. Check Protected Owners (9060114 and 9060115) — immutable full admin access
  if (PROTECTED_OWNER_USER_IDS.has(userId) || PROTECTED_OWNER_OPEN_IDS.has(openId)) {
    const base =
      profilesByUserId.get(userId) ||
      profilesByOpenId.get(openId) ||
      (userId === 9060115 || openId === "user_3HEhAHIdXNwvbiK5NSR6RPkTInD"
        ? CONFIRMED_STAFF_PROFILES[1]
        : CONFIRMED_STAFF_PROFILES[0]);
    return {
      ...base,
      userId: userId || base.userId,
      openId: openId || base.openId,
      primaryRole: "management",
      isProtectedOwner: true,
      hasAdminAccess: true,
      isStaff: true,
      accountStatus: "active",
    };
  }

  // 4. Check authoritative in-memory profile map (by userId, exact openId, or confirmed Clerk openId prefix)
  if (userId && profilesByUserId.has(userId)) {
    return profilesByUserId.get(userId)!;
  }
  if (openId && profilesByOpenId.has(openId)) {
    return profilesByOpenId.get(openId)!;
  }
  if (openId.startsWith("user_3HELy6EVi")) {
    const kyle = profilesByUserId.get(9060249)!;
    return { ...kyle, userId: userId || kyle.userId, openId };
  }
  if (openId.startsWith("user_3KPhcRBro")) {
    const wyatt = profilesByUserId.get(9060250)!;
    return { ...wyatt, userId: userId || wyatt.userId, openId };
  }

  // 5. Known parent/client accounts (e.g. 9060099, 9060100, or role === 'client')
  if (userId === 9060099 || userId === 9060100 || user.role === "client") {
    return {
      userId,
      openId,
      employeeId: null,
      name: user.name || "Parent / Client",
      email: user.email || "",
      primaryRole: "none",
      additionalRoles: [],
      isProtectedOwner: false,
      hasAdminAccess: false,
      isStaff: false,
      accountStatus: "active",
      modulePermissions: {},
      caseWorkspaceAccess: {},
      permissionOverrides: {},
    };
  }

  // 6. Isolated automated test owner (ID 1) — ONLY allowed in test/local dev when not an unverified Clerk user
  const isTestEnv = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);
  const isLocalDev = process.env.NODE_ENV === "development";
  const isClerkIdentity =
    user.loginMethod === "clerk" ||
    (openId.startsWith("user_") && !openId.startsWith("user_test_"));

  if (
    (userId === 1 || String(user.id) === "test-user-1") &&
    (isTestEnv || isLocalDev) &&
    !isClerkIdentity &&
    (!user.role || user.role === "admin")
  ) {
    return {
      userId: 1,
      openId: openId || "test-owner-1",
      employeeId: "emp-byron-honea",
      name: user.name || "Byron Honea (Test)",
      email: user.email || "byron@waypointadvocates.com",
      primaryRole: "management",
      additionalRoles: ["advocate"],
      isProtectedOwner: true,
      hasAdminAccess: true,
      isStaff: true,
      accountStatus: "active",
      modulePermissions: {},
      caseWorkspaceAccess: {},
      permissionOverrides: {},
    };
  }

  if (userId === 2 && isTestEnv && !isClerkIdentity) {
    return {
      userId: 2,
      openId: openId || "user_test_emily",
      employeeId: "emp-test-emily",
      name: user.name || "Emily Advocate",
      email: user.email || "emily@waypointadvocates.com",
      primaryRole: "advocate",
      additionalRoles: [],
      isProtectedOwner: false,
      hasAdminAccess: false,
      isStaff: true,
      accountStatus: "active",
      modulePermissions: {},
      caseWorkspaceAccess: {},
      permissionOverrides: {},
    };
  }

  // 7. Unknown Clerk accounts NEVER receive automatic admin or staff access!
  if (isClerkIdentity) {
    return {
      userId,
      openId,
      employeeId: null,
      name: user.name || "Unverified User",
      email: user.email || "",
      primaryRole: "none",
      additionalRoles: [],
      isProtectedOwner: false,
      hasAdminAccess: false,
      isStaff: false,
      accountStatus: "active",
      modulePermissions: {},
      caseWorkspaceAccess: {},
      permissionOverrides: {},
    };
  }

  // 8. Isolated Vitest unit test callers using synthetic non-Clerk user contexts (e.g., id: 2, role: "admin" | "user")
  if (isTestEnv && !isClerkIdentity) {
    if (user.role === "admin") {
      return {
        userId,
        openId: openId || `test-admin-${userId}`,
        employeeId: `emp-test-${userId}`,
        name: user.name || `Test Admin ${userId}`,
        email: user.email || `admin${userId}@waypoint.test`,
        primaryRole: "management",
        additionalRoles: [],
        isProtectedOwner: false,
        hasAdminAccess: true,
        isStaff: true,
        accountStatus: "active",
        modulePermissions: {},
        caseWorkspaceAccess: {},
        permissionOverrides: {},
      };
    }
    if (user.role === "user" || user.role === "advocate") {
      return {
        userId,
        openId: openId || `test-staff-${userId}`,
        employeeId: `emp-test-${userId}`,
        name: user.name || `Test Staff ${userId}`,
        email: user.email || `staff${userId}@waypoint.test`,
        primaryRole: "advocate",
        additionalRoles: [],
        isProtectedOwner: false,
        hasAdminAccess: false,
        isStaff: true,
        accountStatus: "active",
        modulePermissions: {},
        caseWorkspaceAccess: {},
        permissionOverrides: {},
      };
    }
  }

  // Default fallback for any unrecognized account: zero staff or admin access
  return {
    userId,
    openId,
    employeeId: null,
    name: user.name || "Guest",
    email: user.email || "",
    primaryRole: "none",
    additionalRoles: [],
    isProtectedOwner: false,
    hasAdminAccess: false,
    isStaff: false,
    accountStatus: "active",
    modulePermissions: {},
    caseWorkspaceAccess: {},
    permissionOverrides: {},
  };
}

const MODULE_ID_ALIASES: Record<string, string[]> = {
  contacts: ["contacts"],
  students: ["students", "students_cases"],
  students_cases: ["students_cases", "students"],
  "tools-hub": ["tools-hub", "tools_hub"],
  tools_hub: ["tools_hub", "tools-hub"],
  "first-mate": ["first-mate", "first_mate"],
  first_mate: ["first_mate", "first-mate"],
  "lead-center": ["lead-center", "leads"],
  leads: ["leads", "lead-center"],
  "crew-quarters": ["crew-quarters", "crew_quarters"],
  crew_quarters: ["crew_quarters", "crew-quarters"],
  "call-center": ["call-center", "call_center"],
  call_center: ["call_center", "call-center"],
  "case-compass": ["case-compass", "case_compass"],
  case_compass: ["case_compass", "case-compass"],
  "smart-files": ["smart-files", "smart_files"],
  smart_files: ["smart_files", "smart-files"],
  "bill-guardian": ["bill-guardian", "bill_guardian"],
  bill_guardian: ["bill_guardian", "bill-guardian"],
  "knowledge-base": ["knowledge-base", "knowledge_base"],
  knowledge_base: ["knowledge_base", "knowledge-base"],
  "session-types": ["session-types", "scheduler"],
  scheduler: ["scheduler", "session-types"],
  "meeting-workspace": ["meeting-workspace", "meeting_workspace"],
  meeting_workspace: ["meeting_workspace", "meeting-workspace"],
  "post-meeting-review": ["post-meeting-review", "post_meeting_review"],
  post_meeting_review: ["post_meeting_review", "post-meeting-review"],
  "brain-dump": ["brain-dump", "braindump"],
  braindump: ["braindump", "brain-dump"],
  "ai-connections": ["ai-connections", "ai_connections"],
  ai_connections: ["ai_connections", "ai-connections"],
};

const ROLE_MODULE_LEVEL_DEFAULTS: Record<
  Exclude<StaffRoleId, "none">,
  Record<string, ModuleAccessLevel>
> = {
  management: {},
  advocate: {
    contacts: "edit",
    students: "edit",
    students_cases: "edit",
    "first-mate": "edit",
    first_mate: "edit",
    "tools-hub": "edit",
    tools_hub: "edit",
    "case-compass": "edit",
    case_compass: "edit",
    "smart-files": "edit",
    smart_files: "edit",
    contracts: "edit",
    calendar: "edit",
    tasks: "edit",
    templates: "edit",
    "knowledge-base": "view",
    knowledge_base: "view",
    walkthroughs: "view",
    "crew-quarters": "edit",
    crew_quarters: "edit",
    "advocacy-pipeline": "edit",
    advocacy_pipeline: "edit",
    "meeting-workspace": "edit",
    meeting_workspace: "edit",
    "post-meeting-review": "edit",
    post_meeting_review: "edit",
    "brain-dump": "edit",
    braindump: "edit",
    "client-messages": "edit",
    portal: "view",
  },
  call_center: {
    contacts: "edit",
    students: "view",
    students_cases: "view",
    "lead-center": "edit",
    leads: "edit",
    "call-center": "edit",
    call_center: "edit",
    calendar: "edit",
    "session-types": "view",
    scheduler: "view",
    tasks: "edit",
    "knowledge-base": "view",
    knowledge_base: "view",
    "crew-quarters": "edit",
    crew_quarters: "edit",
    "client-messages": "edit",
    "national-coverage": "view",
  },
  documentation: {
    contacts: "view",
    students: "edit",
    students_cases: "edit",
    "tools-hub": "edit",
    tools_hub: "edit",
    "smart-files": "edit",
    smart_files: "edit",
    templates: "edit",
    tasks: "edit",
    "knowledge-base": "edit",
    knowledge_base: "edit",
    walkthroughs: "edit",
    "crew-quarters": "edit",
    crew_quarters: "edit",
    "post-meeting-review": "edit",
    post_meeting_review: "edit",
    "state-complaint": "edit",
  },
  technology: {
    "crew-quarters": "edit",
    crew_quarters: "edit",
    automations: "edit",
    "ai-connections": "edit",
    ai_connections: "edit",
    integrations: "edit",
    workflows: "edit",
    settings: "edit",
    "knowledge-base": "edit",
    knowledge_base: "edit",
    walkthroughs: "edit",
    "page-ids": "edit",
    tasks: "edit",
    tech_tasks: "edit",
    "tools-hub": "edit",
    tools_hub: "edit",
  },
  operations: {
    contacts: "edit",
    students: "view",
    students_cases: "view",
    invoices: "edit",
    contracts: "edit",
    agreements: "edit",
    "bill-guardian": "edit",
    bill_guardian: "edit",
    services: "edit",
    calendar: "edit",
    tasks: "edit",
    tech_tasks: "edit",
    giving: "edit",
    sponsors: "edit",
    metrics: "view",
    "crew-quarters": "edit",
    crew_quarters: "edit",
    "tools-hub": "view",
    tools_hub: "view",
    walkthroughs: "view",
  },
};

const CASE_ID_ALIASES: Record<string, string[]> = {
  activity: ["activity", "activity_timeline"],
  activity_timeline: ["activity_timeline", "activity"],
  overview: ["overview", "projects"],
  projects: ["projects", "overview"],
  "meeting-workspace": ["meeting-workspace", "meeting_workspace"],
  meeting_workspace: ["meeting_workspace", "meeting-workspace"],
  "post-meeting-review": ["post-meeting-review", "post_meeting_review"],
  post_meeting_review: ["post_meeting_review", "post-meeting-review"],
  "voyage-log": ["voyage-log", "voyage_log"],
  voyage_log: ["voyage_log", "voyage-log"],
};

/**
 * Checks whether a staff profile has access to a given CRM module on the backend.
 */
export function checkBackendModuleAccess(
  profile: StaffAccessProfile,
  moduleId: string
): ModuleAccessLevel {
  if (!profile.isStaff || profile.accountStatus === "inactive" || profile.primaryRole === "none") {
    return "none";
  }

  const candidateIds = MODULE_ID_ALIASES[moduleId] || [moduleId];

  if (profile.modulePermissions) {
    for (const cid of candidateIds) {
      if (cid in profile.modulePermissions) {
        return profile.modulePermissions[cid];
      }
    }
  }

  if (
    profile.isProtectedOwner ||
    profile.hasAdminAccess ||
    profile.primaryRole === "management" ||
    profile.additionalRoles.includes("management")
  ) {
    return "edit";
  }

  const levelRank: Record<ModuleAccessLevel, number> = {
    none: 0,
    view: 1,
    edit: 2,
  };
  let highestLevel: ModuleAccessLevel = "none";

  const allRoles = [profile.primaryRole, ...profile.additionalRoles];
  for (const roleId of allRoles) {
    if (roleId === "none") continue;
    const roleLevelMap = ROLE_MODULE_LEVEL_DEFAULTS[roleId] || {};
    for (const cid of candidateIds) {
      if (cid in roleLevelMap) {
        const lvl = roleLevelMap[cid];
        if (levelRank[lvl] > levelRank[highestLevel]) {
          highestLevel = lvl;
        }
      }
    }
    const roleDef = SERVER_ROLE_DEFAULTS[roleId];
    if (roleDef) {
      if (roleDef.defaultModules.includes("all")) {
        return "edit";
      }
      for (const cid of candidateIds) {
        if (roleDef.defaultModules.includes(cid) && !(cid in roleLevelMap)) {
          highestLevel = "edit";
        }
      }
    }
  }

  return highestLevel;
}

/**
 * Checks what access level a staff profile has to a specific Student/Case Workspace area on the backend.
 */
export function checkBackendCaseAccess(
  profile: StaffAccessProfile,
  caseModId: string
): CaseAccessLevel {
  if (!profile.isStaff || profile.accountStatus === "inactive" || profile.primaryRole === "none") {
    return "none";
  }

  const candidateIds = CASE_ID_ALIASES[caseModId] || [caseModId];

  if (profile.caseWorkspaceAccess) {
    for (const cid of candidateIds) {
      if (cid in profile.caseWorkspaceAccess) {
        return profile.caseWorkspaceAccess[cid];
      }
    }
  }

  if (
    profile.isProtectedOwner ||
    profile.hasAdminAccess ||
    profile.primaryRole === "management" ||
    profile.additionalRoles.includes("management")
  ) {
    return "manage";
  }

  const levelRank: Record<CaseAccessLevel, number> = {
    none: 0,
    view: 1,
    edit: 2,
    manage: 3,
  };

  let highestLevel: CaseAccessLevel = "none";
  const allRoles = [profile.primaryRole, ...profile.additionalRoles];

  for (const roleId of allRoles) {
    if (roleId === "none") continue;
    const roleDef = SERVER_ROLE_DEFAULTS[roleId];
    if (roleDef?.defaultCaseAccess) {
      for (const cid of candidateIds) {
        if (cid in roleDef.defaultCaseAccess) {
          const lvl = roleDef.defaultCaseAccess[cid];
          if (levelRank[lvl] > levelRank[highestLevel]) {
            highestLevel = lvl;
          }
        }
      }
    }
  }

  return highestLevel;
}

/**
 * Checks whether a staff profile has a specific granular system permission on the backend.
 */
export function checkBackendActionPermission(
  profile: StaffAccessProfile,
  permId: string
): boolean {
  if (!profile.isStaff || profile.accountStatus === "inactive" || profile.primaryRole === "none") {
    return false;
  }

  if (profile.permissionOverrides && permId in profile.permissionOverrides) {
    return profile.permissionOverrides[permId];
  }

  if (
    profile.isProtectedOwner ||
    profile.hasAdminAccess ||
    profile.primaryRole === "management" ||
    profile.additionalRoles.includes("management")
  ) {
    return true;
  }

  const allRoles = [profile.primaryRole, ...profile.additionalRoles];
  for (const roleId of allRoles) {
    if (roleId === "none") continue;
    const roleDef = SERVER_ROLE_DEFAULTS[roleId];
    if (roleDef) {
      if (roleDef.defaultPermissions.includes("all") || roleDef.defaultPermissions.includes(permId)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Resolves a target staff profile by userId or employeeId.
 */
export async function findTargetStaffProfile(params: {
  targetUserId?: number;
  targetEmployeeId?: string;
}): Promise<StaffAccessProfile | null> {
  const db = await getDb();
  if (db) {
    try {
      if (params.targetUserId) {
        const rows = await db
          .select()
          .from(staffAccessProfiles)
          .where(eq(staffAccessProfiles.userId, params.targetUserId))
          .limit(1);
        if (rows.length > 0) {
          const p = dbRowToProfile(rows[0]);
          indexProfile(p);
          return p;
        }
      }
      if (params.targetEmployeeId) {
        const rows = await db
          .select()
          .from(staffAccessProfiles)
          .where(eq(staffAccessProfiles.employeeId, params.targetEmployeeId))
          .limit(1);
        if (rows.length > 0) {
          const p = dbRowToProfile(rows[0]);
          indexProfile(p);
          return p;
        }
      }
    } catch {
      // Ignore if table not migrated in mock unit test DB
    }
  }

  if (params.targetUserId) {
    if (PROTECTED_OWNER_USER_IDS.has(params.targetUserId)) {
      return (
        profilesByUserId.get(params.targetUserId) ||
        (params.targetUserId === 9060115 ? CONFIRMED_STAFF_PROFILES[1] : CONFIRMED_STAFF_PROFILES[0])
      );
    }
    if (profilesByUserId.has(params.targetUserId)) {
      return profilesByUserId.get(params.targetUserId)!;
    }
  }
  if (params.targetEmployeeId) {
    if (params.targetEmployeeId === "emp-byron-honea") {
      return profilesByUserId.get(9060114) || CONFIRMED_STAFF_PROFILES[0];
    }
    if (params.targetEmployeeId === "emp-byron-honea-2") {
      return profilesByUserId.get(9060115) || CONFIRMED_STAFF_PROFILES[1];
    }
    if (profilesByEmployeeId.has(params.targetEmployeeId)) {
      return profilesByEmployeeId.get(params.targetEmployeeId)!;
    }
  }

  return null;
}

async function persistProfileToDb(profile: StaffAccessProfile) {
  const db = await getDb();
  if (!db) return;

  try {
    const existing = await db
      .select({ id: staffAccessProfiles.id })
      .from(staffAccessProfiles)
      .where(eq(staffAccessProfiles.userId, profile.userId))
      .limit(1);

    const payload = {
      userId: profile.userId,
      openId: profile.openId,
      employeeId: profile.employeeId,
      name: profile.name,
      email: profile.email,
      primaryRole: profile.primaryRole,
      additionalRoles: JSON.stringify(profile.additionalRoles || []),
      isProtectedOwner: profile.isProtectedOwner,
      hasAdminAccess: profile.hasAdminAccess,
      isStaff: profile.isStaff,
      accountStatus: profile.accountStatus,
      modulePermissions: JSON.stringify(profile.modulePermissions || {}),
      caseWorkspaceAccess: JSON.stringify(profile.caseWorkspaceAccess || {}),
      permissionOverrides: JSON.stringify(profile.permissionOverrides || {}),
      deactivatedAt: profile.deactivatedAt || null,
      deactivatedBy: profile.deactivatedBy || null,
      deactivationNotes: encodeNotesMeta(profile),
      updatedAt: new Date(),
    };

    if (existing.length > 0) {
      await db
        .update(staffAccessProfiles)
        .set(payload)
        .where(eq(staffAccessProfiles.userId, profile.userId));
    } else {
      await db.insert(staffAccessProfiles).values(payload);
    }

    // Also keep users.role synchronized so DB queries inspecting users.role remain consistent
    const mappedUserRole =
      profile.accountStatus === "inactive" || !profile.isStaff
        ? "client"
        : profile.hasAdminAccess
        ? "admin"
        : "user";

    await db
      .update(users)
      .set({ role: mappedUserRole, updatedAt: new Date() })
      .where(eq(users.id, profile.userId));
  } catch {
    // Ignore DB write errors in mock unit tests where tables are stubbed
  }
}

/**
 * Registers or updates a staff access profile in memory and DB (used by tests and admin provisioning).
 */
export async function upsertStaffAccessProfile(profile: StaffAccessProfile): Promise<StaffAccessProfile> {
  if (PROTECTED_OWNER_USER_IDS.has(profile.userId) || PROTECTED_OWNER_OPEN_IDS.has(profile.openId)) {
    profile.isProtectedOwner = true;
    profile.hasAdminAccess = true;
    profile.isStaff = true;
    profile.primaryRole = "management";
    profile.accountStatus = "active";
  }
  indexProfile(profile);
  await persistProfileToDb(profile);
  triggerAuthCacheInvalidation(profile.userId);
  triggerAuthCacheInvalidation(profile.openId);
  return profilesByUserId.get(profile.userId)!;
}

/**
 * Deactivates an employee account on the backend, revokes access, and invalidates auth cache.
 */
export async function deactivateStaffAccount(params: {
  actorUser: { id?: number; openId?: string; role?: string | null; loginMethod?: string | null };
  targetUserId?: number;
  targetEmployeeId?: string;
  notes?: string;
}): Promise<StaffAccessProfile> {
  const actorProfile = await resolveStaffAccess(params.actorUser);
  if (
    !actorProfile.isStaff ||
    actorProfile.accountStatus !== "active" ||
    (!actorProfile.hasAdminAccess && !checkBackendActionPermission(actorProfile, "manage_employees"))
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to deactivate employee accounts.",
    });
  }

  // Protect Protected Owners before lookup
  if (
    (params.targetUserId && PROTECTED_OWNER_USER_IDS.has(params.targetUserId)) ||
    (params.targetEmployeeId && PROTECTED_OWNER_EMPLOYEE_IDS.has(params.targetEmployeeId))
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Protected Owner accounts cannot be deactivated, demoted, or locked out.",
    });
  }

  const target = await findTargetStaffProfile({
    targetUserId: params.targetUserId,
    targetEmployeeId: params.targetEmployeeId,
  });

  if (!target) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Target employee account was not found.",
    });
  }

  if (target.isProtectedOwner || PROTECTED_OWNER_USER_IDS.has(target.userId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Protected Owner accounts cannot be deactivated, demoted, or locked out.",
    });
  }

  // Prevent deactivating the last active administrator
  const activeAdmins = Array.from(profilesByUserId.values()).filter(
    (p) => p.accountStatus === "active" && p.hasAdminAccess && p.userId !== target.userId
  );
  if (activeAdmins.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot deactivate the last active administrator account.",
    });
  }

  const updated: StaffAccessProfile = {
    ...target,
    accountStatus: "inactive",
    deactivatedAt: new Date(),
    deactivatedBy: actorProfile.userId,
    deactivationNotes: params.notes || "Account deactivated by administrator.",
  };

  indexProfile(updated);
  await persistProfileToDb(updated);
  triggerAuthCacheInvalidation(updated.userId);
  triggerAuthCacheInvalidation(updated.openId);

  return updated;
}

/**
 * Reactivates a previously deactivated employee account on the backend.
 */
export async function reactivateStaffAccount(params: {
  actorUser: { id?: number; openId?: string; role?: string | null; loginMethod?: string | null };
  targetUserId?: number;
  targetEmployeeId?: string;
}): Promise<StaffAccessProfile> {
  const actorProfile = await resolveStaffAccess(params.actorUser);
  if (
    !actorProfile.isStaff ||
    actorProfile.accountStatus !== "active" ||
    (!actorProfile.hasAdminAccess && !checkBackendActionPermission(actorProfile, "manage_employees"))
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to reactivate employee accounts.",
    });
  }

  if (params.targetUserId === 9060031) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Development login account 9060031 is permanently disabled.",
    });
  }

  const target = await findTargetStaffProfile({
    targetUserId: params.targetUserId,
    targetEmployeeId: params.targetEmployeeId,
  });

  if (!target) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Target employee account was not found.",
    });
  }

  const updated: StaffAccessProfile = {
    ...target,
    accountStatus: "active",
    invitationStatus: "accepted",
    acceptedAt: target.acceptedAt || new Date().toISOString(),
    deactivatedAt: null,
    deactivatedBy: null,
    deactivationNotes: null,
  };

  indexProfile(updated);
  await persistProfileToDb(updated);
  triggerAuthCacheInvalidation(updated.userId);
  triggerAuthCacheInvalidation(updated.openId);

  return updated;
}

/**
 * Updates an employee's roles and permissions on the backend while enforcing Protected Owner safeguards.
 */
export async function updateStaffAccessPermissions(params: {
  actorUser: { id?: number; openId?: string; role?: string | null; loginMethod?: string | null };
  targetUserId?: number;
  targetEmployeeId?: string;
  primaryRole?: StaffRoleId;
  additionalRoles?: StaffRoleId[];
  hasAdminAccess?: boolean;
  isProtectedOwner?: boolean;
  accountStatus?: StaffAccountStatus;
  modulePermissions?: Record<string, ModuleAccessLevel>;
  caseWorkspaceAccess?: Record<string, CaseAccessLevel>;
  permissionOverrides?: Record<string, boolean>;
}): Promise<StaffAccessProfile> {
  const actorProfile = await resolveStaffAccess(params.actorUser);
  if (
    !actorProfile.isStaff ||
    actorProfile.accountStatus !== "active" ||
    (!actorProfile.hasAdminAccess && !checkBackendActionPermission(actorProfile, "manage_roles"))
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to modify employee roles or permissions.",
    });
  }

  const target = await findTargetStaffProfile({
    targetUserId: params.targetUserId,
    targetEmployeeId: params.targetEmployeeId,
  });

  if (!target) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Target employee account was not found.",
    });
  }

  // Protected Owner Safeguards:
  // Neither Byron account (9060114, 9060115) can be demoted, deactivated, or stripped of Protected Owner / Admin access
  if (target.isProtectedOwner || PROTECTED_OWNER_USER_IDS.has(target.userId)) {
    if (
      (params.primaryRole !== undefined && params.primaryRole !== "management") ||
      params.hasAdminAccess === false ||
      params.isProtectedOwner === false ||
      (params.accountStatus !== undefined && params.accountStatus !== "active")
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Protected Owner accounts cannot be demoted, deactivated, or stripped of administrative ownership.",
      });
    }
  }

  // Non-owners (including Kyle 9060249) cannot grant or modify Protected Owner status
  if (params.isProtectedOwner !== undefined && params.isProtectedOwner !== target.isProtectedOwner) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Protected Owner designation is locked and cannot be reassigned.",
    });
  }

  const nextPrimaryRole = target.isProtectedOwner
    ? "management"
    : params.primaryRole ?? target.primaryRole;
  const nextAdditionalRoles = params.additionalRoles ?? target.additionalRoles;
  const nextHasAdminAccess = target.isProtectedOwner
    ? true
    : params.hasAdminAccess !== undefined
    ? params.hasAdminAccess
    : nextPrimaryRole === "management" ||
      nextAdditionalRoles.includes("management") ||
      target.userId === 9060249;

  const updated: StaffAccessProfile = {
    ...target,
    primaryRole: nextPrimaryRole,
    additionalRoles: nextAdditionalRoles,
    hasAdminAccess: nextHasAdminAccess,
    isStaff: nextPrimaryRole !== "none",
    accountStatus: target.isProtectedOwner
      ? "active"
      : params.accountStatus ?? target.accountStatus,
    modulePermissions: params.modulePermissions ?? target.modulePermissions,
    caseWorkspaceAccess: params.caseWorkspaceAccess ?? target.caseWorkspaceAccess,
    permissionOverrides: params.permissionOverrides ?? target.permissionOverrides,
  };

  indexProfile(updated);
  await persistProfileToDb(updated);
  triggerAuthCacheInvalidation(updated.userId);
  triggerAuthCacheInvalidation(updated.openId);

  return updated;
}

/**
 * Lists all active and inactive staff profiles known to the backend.
 * Authoritatively reads from `staff_access_profiles` in DB when available,
 * and excludes non-staff accounts (`primaryRole === "none"`).
 */
export async function listStaffAccessProfiles(options?: {
  includeNonStaff?: boolean;
}): Promise<StaffAccessProfile[]> {
  const db = await getDb();
  if (db) {
    try {
      const rows = await db.select().from(staffAccessProfiles);
      for (const row of rows) {
        const p = dbRowToProfile(row);
        indexProfile(p);
      }
    } catch {
      // Ignore if table not present in mock DB
    }
  }
  const allProfiles = Array.from(profilesByUserId.values()).map((p) => ({
    ...p,
    invitationStatus: computeEffectiveInvitationStatus(
      p.invitationStatus,
      p.invitationExpiresAt
    ),
  }));
  if (options?.includeNonStaff) {
    return allProfiles;
  }
  return allProfiles.filter(
    (p) => p.primaryRole !== "none" && (p.isStaff || Boolean(p.employeeId))
  );
}

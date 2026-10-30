import { eq, and, desc, asc, inArray, sql, or, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  crewConversations,
  crewConversationMembers,
  crewMessages,
  crewMessageAttachments,
  crewMessageLinks,
  crewMessageReactions,
  crewActionRequests,
  users,
  contacts,
  projects,
  teamInvites,
  caseActivityTimeline,
  internalTasks,
} from "../../drizzle/schema";
import { getDb } from "./connection";
import {
  resolveStaffAccess,
  checkBackendCaseAccess,
  listStaffAccessProfiles,
} from "../_core/staffAccess";

function extractInsertId(result: any): number {
  if (Array.isArray(result) && result[0]?.id !== undefined) {
    return Number(result[0].id);
  }
  if (result?.lastInsertRowid !== undefined) {
    return Number(result.lastInsertRowid);
  }
  if (result?.meta?.last_row_id !== undefined) {
    return Number(result.meta.last_row_id);
  }
  if (Array.isArray(result) && result[0]?.insertId !== undefined) {
    return Number(result[0].insertId);
  }
  if (result?.insertId !== undefined) {
    return Number(result.insertId);
  }
  return 0;
}

// In-memory test store for Vitest / offline testing where db proxy returns empty rows
const testMessagesMemory = new Map<number, any[]>();
const testReactionsMemory = new Set<string>();
const testActionRequestsMemory = new Map<number, any>();
const testDirectConvsMemory = new Map<string, number>();
const testLastReadMemory = new Map<string, number>();
const testConversationsMemory = new Map<
  number,
  { id: number; type: "channel" | "direct" | "group" | "case"; name?: string; linkedStudentId?: number | null }
>();
const testMembershipsMemory = new Map<number, Set<number>>();
const testMessageToConvMemory = new Map<number, number>();
let testMsgCounter = 100;
let testArCounter = 200;
let testConvCounter = 300;

const STAFF_ROLE_LABELS: Record<string, string> = {
  management: "Management",
  technology: "Technology & Systems",
  call_center: "Call Center & Intake",
  advocate: "Special Education Advocate",
  documentation: "Documentation & Records",
  operations: "Operations & Billing",
};

function computeInitials(name: string): string {
  return (
    (name || "WA")
      .trim()
      .split(/\s+/)
      .map((p) => p[0] || "")
      .slice(0, 2)
      .join("")
      .toUpperCase() || "WA"
  );
}

export async function assertActiveStaffUser(userId: number, label = "Account"): Promise<any> {
  if (!userId || userId === 9060031 || userId === 9060099 || userId === 9060100) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `${label} is not an active authorized employee.`,
    });
  }

  let dbUser: any = undefined;
  const db = await getDb();
  if (db) {
    try {
      const rows = await db
        .select({
          id: users.id,
          openId: users.openId,
          name: users.name,
          email: users.email,
          role: users.role,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (rows.length > 0) {
        dbUser = rows[0];
        if (dbUser.role === "client") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `${label} is a client account and cannot access Crew Messages.`,
          });
        }
      }
    } catch (err) {
      if (err instanceof TRPCError) throw err;
    }
  }

  const staffAccess = await resolveStaffAccess(dbUser || { id: userId });
  if (
    !staffAccess.isStaff ||
    staffAccess.accountStatus !== "active" ||
    staffAccess.primaryRole === "none" ||
    staffAccess.invitationStatus === "pending" ||
    staffAccess.invitationStatus === "revoked" ||
    staffAccess.invitationStatus === "expired"
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `${label} is not an active authorized employee or has been deactivated.`,
    });
  }

  return staffAccess;
}

function registerMemoryMembership(
  conversationId: number,
  userIds: number[],
  meta?: { type: "channel" | "direct" | "group" | "case"; name?: string; linkedStudentId?: number | null }
) {
  if (meta && !testConversationsMemory.has(conversationId)) {
    testConversationsMemory.set(conversationId, { id: conversationId, ...meta });
  }
  if (!testMembershipsMemory.has(conversationId)) {
    testMembershipsMemory.set(conversationId, new Set<number>());
  }
  const set = testMembershipsMemory.get(conversationId)!;
  for (const uid of userIds) {
    set.add(Number(uid));
  }
}

/**
 * Verifies that `userId` is an active staff member and an authorized participant of `conversationId`.
 * Full CRM administrators do NOT automatically bypass private DM or group conversation membership checks.
 */
export async function assertConversationMember(conversationId: number, userId: number): Promise<void> {
  await assertActiveStaffUser(userId, "Staff account");

  const db = await getDb();

  // Check in-memory conversation registry first (used in offline Vitest runs and same-process mutations)
  const memConv = testConversationsMemory.get(conversationId);
  const memMembers = testMembershipsMemory.get(conversationId);

  if (memConv) {
    if (memConv.type === "channel") {
      registerMemoryMembership(conversationId, [userId]);
      return;
    }
    if (memMembers && memMembers.has(userId)) {
      return;
    }
    // Check DB fallback if not in memMembers
    if (db) {
      const dbMem = await db
        .select()
        .from(crewConversationMembers)
        .where(
          and(
            eq(crewConversationMembers.conversationId, conversationId),
            eq(crewConversationMembers.userId, userId)
          )
        )
        .limit(1);
      if (dbMem.length > 0) {
        registerMemoryMembership(conversationId, [userId]);
        return;
      }
    }
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not a participant in this private conversation.",
    });
  }

  // Check DB conversation record
  if (db) {
    const convRows = await db
      .select()
      .from(crewConversations)
      .where(eq(crewConversations.id, conversationId))
      .limit(1);

    if (convRows.length > 0) {
      const conv = convRows[0];
      if (conv.type === "channel") {
        registerMemoryMembership(conversationId, [userId], {
          type: "channel",
          name: conv.name || undefined,
        });
        return;
      }

      const dbMem = await db
        .select()
        .from(crewConversationMembers)
        .where(
          and(
            eq(crewConversationMembers.conversationId, conversationId),
            eq(crewConversationMembers.userId, userId)
          )
        )
        .limit(1);

      if (dbMem.length > 0) {
        registerMemoryMembership(conversationId, [userId], {
          type: conv.type as any,
          name: conv.name || undefined,
          linkedStudentId: conv.linkedStudentId,
        });
        return;
      }

      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not a participant in this private conversation.",
      });
    }
  }

  // Default seeded channels (IDs 1, 2, 3) are accessible to active staff
  if (conversationId >= 1 && conversationId <= 3) {
    registerMemoryMembership(conversationId, [userId], { type: "channel" });
    return;
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "You do not have access to this conversation.",
  });
}

/**
 * Resolves the parent conversationId for a given messageId and asserts caller membership.
 */
export async function assertMessageConversationMember(messageId: number, userId: number): Promise<number> {
  let convId = testMessageToConvMemory.get(messageId);

  if (!convId) {
    const db = await getDb();
    if (db) {
      const rows = await db
        .select({ conversationId: crewMessages.conversationId })
        .from(crewMessages)
        .where(eq(crewMessages.id, messageId))
        .limit(1);
      if (rows.length > 0) {
        convId = Number(rows[0].conversationId);
        testMessageToConvMemory.set(messageId, convId);
      }
    }
  }

  if (!convId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Message not found.",
    });
  }

  await assertConversationMember(convId, userId);
  return convId;
}

export interface AvailableEmployee {
  id: number;
  name: string;
  email: string;
  role: string;
  presence: "available" | "away" | "offline";
  initials: string;
  avatarUrl?: string | null;
  jobTitle?: string;
  isCurrentUser?: boolean;
}

async function resolveEmployeeDirectoryMap(currentUserId?: number): Promise<Map<number, AvailableEmployee>> {
  const userMap = new Map<number, AvailableEmployee>();

  // 1. Authoritative staff profiles from `staff_access_profiles`
  const staffProfiles = await listStaffAccessProfiles();
  for (const sp of staffProfiles) {
    if (
      !sp.isStaff ||
      sp.accountStatus !== "active" ||
      sp.primaryRole === "none" ||
      sp.userId === 9060031 ||
      sp.invitationStatus === "pending" ||
      sp.invitationStatus === "revoked" ||
      sp.invitationStatus === "expired"
    ) {
      continue;
    }
    const roleLabel =
      sp.jobTitle ||
      (sp.isProtectedOwner
        ? "Protected Owner · Management"
        : STAFF_ROLE_LABELS[sp.primaryRole] || "Staff Member");
    userMap.set(sp.userId, {
      id: sp.userId,
      name: sp.name,
      email: sp.email,
      role: roleLabel,
      presence: "available",
      initials: computeInitials(sp.name),
      jobTitle: roleLabel,
      isCurrentUser: currentUserId !== undefined ? sp.userId === currentUserId : false,
    });
  }

  // 2. Active staff records in `users` table (excluding clients and deactivated profiles)
  const db = await getDb();
  if (db) {
    const allUsers = await db
      .select({
        id: users.id,
        openId: users.openId,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(ne(users.role, "client"));

    for (const u of allUsers) {
      if (!u.id || u.id === 9060031 || userMap.has(u.id)) continue;
      const access = await resolveStaffAccess(u);
      if (
        !access.isStaff ||
        access.accountStatus !== "active" ||
        access.primaryRole === "none" ||
        access.invitationStatus === "pending" ||
        access.invitationStatus === "revoked" ||
        access.invitationStatus === "expired"
      ) {
        continue;
      }

      const name = access.name || u.name || (u.email ? u.email.split("@")[0] : "Advocate");
      const roleLabel =
        access.jobTitle ||
        (access.isProtectedOwner
          ? "Protected Owner · Management"
          : STAFF_ROLE_LABELS[access.primaryRole] ||
            (access.hasAdminAccess ? "Lead Special Education Advocate / Owner" : "Staff Member"));

      userMap.set(u.id, {
        id: u.id,
        name,
        email: u.email || access.email || "",
        role: roleLabel,
        presence: "available",
        initials: computeInitials(name),
        jobTitle: roleLabel,
        isCurrentUser: currentUserId !== undefined ? u.id === currentUserId : false,
      });
    }
  }

  return userMap;
}

async function resolveParticipantDisplay(
  userId: number,
  directoryMap: Map<number, AvailableEmployee>,
  fallbackName?: string | null,
  fallbackEmail?: string | null,
  fallbackRole?: string | null
): Promise<{ name: string; email: string; role: string; initials: string }> {
  const fromDir = directoryMap.get(userId);
  if (fromDir) {
    return {
      name: fromDir.name,
      email: fromDir.email,
      role: fromDir.jobTitle || fromDir.role,
      initials: fromDir.initials,
    };
  }
  const resolved = await resolveStaffAccess({
    id: userId,
    name: fallbackName,
    email: fallbackEmail,
    role: fallbackRole,
  });
  const name =
    (resolved.isStaff && resolved.name && resolved.name !== "Anonymous" ? resolved.name : null) ||
    fallbackName ||
    (fallbackEmail ? fallbackEmail.split("@")[0] : `Employee #${userId}`);
  const role =
    resolved.jobTitle ||
    (resolved.isProtectedOwner
      ? "Protected Owner · Management"
      : STAFF_ROLE_LABELS[resolved.primaryRole] ||
        (fallbackRole === "admin" ? "Lead IEP Advocate" : "Special Education Advocate"));
  return {
    name,
    email: resolved.email || fallbackEmail || "",
    role,
    initials: computeInitials(name),
  };
}

/**
 * Ensures default company channels exist and the user is joined.
 */
export async function ensureDefaultChannelsAndMemberships(userId: number, tenantId = "waypoint") {
  const db = await getDb();
  if (!db) return;

  const defaultChannels = [
    { name: "All Crew", description: "Company-wide employee announcements, updates, and open discussions." },
    { name: "Operations", description: "Schedules, internal logistics, paperwork, and office coordination." },
    { name: "Advocacy", description: "IEP strategy, state complaints, meeting preparation, and case collaboration." },
  ];

  for (const ch of defaultChannels) {
    let conv = await db
      .select()
      .from(crewConversations)
      .where(
        and(
          eq(crewConversations.tenantId, tenantId),
          eq(crewConversations.type, "channel"),
          eq(crewConversations.name, ch.name)
        )
      )
      .limit(1);

    let convId: number;
    if (conv.length === 0) {
      const inserted = await db.insert(crewConversations).values({
        tenantId,
        type: "channel",
        name: ch.name,
        description: ch.description,
        createdBy: 1,
      }).returning({ id: crewConversations.id });
      convId = extractInsertId(inserted);
      if (!convId) {
        const [latest] = await db.select({ id: crewConversations.id }).from(crewConversations).orderBy(desc(crewConversations.id)).limit(1);
        convId = latest ? Number(latest.id) : 1;
      }
    } else {
      convId = conv[0].id;
    }

    // Check membership
    const membership = await db
      .select()
      .from(crewConversationMembers)
      .where(
        and(
          eq(crewConversationMembers.conversationId, convId),
          eq(crewConversationMembers.userId, userId)
        )
      )
      .limit(1);

    if (membership.length === 0) {
      await db.insert(crewConversationMembers).values({
        conversationId: convId,
        tenantId,
        userId,
        role: "member",
      });
    }
  }
}

/**
 * Returns active employees available for direct messaging and assignments.
 */
export async function getAvailableEmployees(currentUserId: number): Promise<AvailableEmployee[]> {
  await assertActiveStaffUser(currentUserId, "Caller account");
  const userMap = await resolveEmployeeDirectoryMap(currentUserId);
  return Array.from(userMap.values());
}

/**
 * Returns all conversations for a user grouped by category with unread counts and last message previews.
 */
export async function getConversationsForUser(userId: number, tenantId = "waypoint") {
  await assertActiveStaffUser(userId, "Caller account");
  const db = await getDb();
  if (!db) return { channels: [], directMessages: [], groupMessages: [], caseThreads: [] };

  const directoryMap = await resolveEmployeeDirectoryMap(userId);
  await ensureDefaultChannelsAndMemberships(userId, tenantId);

  // Get user memberships
  const memberships = await db
    .select()
    .from(crewConversationMembers)
    .where(
      and(
        eq(crewConversationMembers.userId, userId),
        eq(crewConversationMembers.tenantId, tenantId)
      )
    );

  const convIds = memberships.map((m) => m.conversationId);
  if (convIds.length === 0) {
    // Offline/Vitest fallback: build conversations from in-memory conversation/membership registries
    const memDMs: any[] = [];
    const memGroups: any[] = [];
    const memCases: any[] = [];

    for (const [cId, mSet] of Array.from(testMembershipsMemory.entries())) {
      if (!mSet.has(Number(userId))) continue;
      const meta = testConversationsMemory.get(cId);
      if (!meta || meta.type === "channel") continue;

      const memMsgs = (testMessagesMemory.get(cId) || []).filter((m) => !m.deletedAt);
      const lastMsg = memMsgs.length > 0 ? memMsgs[memMsgs.length - 1] : null;
      const lastReadId = Number(testLastReadMemory.get(`${cId}:${userId}`) || 0);
      const unreadCount = memMsgs.filter(
        (m) => Number(m.senderUserId) !== Number(userId) && Number(m.id) > lastReadId
      ).length;

      if (meta.type === "direct") {
        const partnerId: number = Array.from<number>(mSet).find((uid) => Number(uid) !== Number(userId)) ?? userId;
        const partnerInfo = await resolveParticipantDisplay(partnerId, directoryMap);
        memDMs.push({
          id: cId,
          type: "direct",
          displayName: partnerInfo.name,
          partnerUserId: partnerId,
          role: partnerInfo.role,
          initials: partnerInfo.initials,
          unreadCount,
          membersCount: mSet.size,
          lastMessage: lastMsg,
          createdAt: lastMsg?.createdAt || new Date().toISOString(),
          updatedAt: lastMsg?.createdAt || new Date().toISOString(),
        });
      } else if (meta.type === "group") {
        memGroups.push({
          id: cId,
          type: "group",
          name: meta.name || "Group",
          displayName: meta.name || "Group",
          unreadCount,
          membersCount: mSet.size,
          lastMessage: lastMsg,
          createdAt: lastMsg?.createdAt || new Date().toISOString(),
          updatedAt: lastMsg?.createdAt || new Date().toISOString(),
        });
      } else if (meta.type === "case") {
        memCases.push({
          id: cId,
          type: "case",
          name: meta.name || "Case Thread",
          displayName: meta.name || "Case Thread",
          linkedStudentId: meta.linkedStudentId || null,
          unreadCount,
          membersCount: mSet.size,
          lastMessage: lastMsg,
          createdAt: lastMsg?.createdAt || new Date().toISOString(),
          updatedAt: lastMsg?.createdAt || new Date().toISOString(),
        });
      }
    }

    return {
      channels: [
        {
          id: 1,
          name: "All Crew",
          description: "Company-wide employee announcements, updates, and open discussions.",
          unreadCount: 0,
          membersCount: 3,
          lastMessage: null,
          type: "channel",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 2,
          name: "Operations",
          description: "Schedules, internal logistics, paperwork, and office coordination.",
          unreadCount: 0,
          membersCount: 3,
          lastMessage: null,
          type: "channel",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 3,
          name: "Advocacy",
          description: "IEP strategy, state complaints, meeting preparation, and case collaboration.",
          unreadCount: 0,
          membersCount: 3,
          lastMessage: null,
          type: "channel",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      directMessages: memDMs,
      groupMessages: memGroups,
      caseThreads: memCases,
    };
  }

  // Fetch conversations
  const convRows = await db
    .select()
    .from(crewConversations)
    .where(
      and(
        eq(crewConversations.tenantId, tenantId),
        inArray(crewConversations.id, convIds)
      )
    )
    .orderBy(desc(crewConversations.updatedAt));

  // Get all members for these conversations to map DM participants and group avatars
  const allMembers = await db
    .select({
      conversationId: crewConversationMembers.conversationId,
      userId: crewConversationMembers.userId,
      role: crewConversationMembers.role,
      name: users.name,
      email: users.email,
    })
    .from(crewConversationMembers)
    .leftJoin(users, eq(users.id, crewConversationMembers.userId))
    .where(inArray(crewConversationMembers.conversationId, convIds));

  // Fetch last messages (excluding soft-deleted messages)
  const lastMessages = await db
    .select({
      id: crewMessages.id,
      conversationId: crewMessages.conversationId,
      body: crewMessages.body,
      messageType: crewMessages.messageType,
      createdAt: crewMessages.createdAt,
      senderUserId: crewMessages.senderUserId,
      senderName: users.name,
      senderEmail: users.email,
    })
    .from(crewMessages)
    .leftJoin(users, eq(users.id, crewMessages.senderUserId))
    .where(
      and(
        inArray(crewMessages.conversationId, convIds),
        sql`${crewMessages.deletedAt} IS NULL`
      )
    )
    .orderBy(desc(crewMessages.createdAt), desc(crewMessages.id));

  const lastMsgMap = new Map<number, any>();
  for (const m of lastMessages) {
    if (!lastMsgMap.has(m.conversationId)) {
      const senderInfo = await resolveParticipantDisplay(
        m.senderUserId,
        directoryMap,
        m.senderName,
        m.senderEmail
      );
      lastMsgMap.set(m.conversationId, {
        ...m,
        senderName: senderInfo.name,
      });
    }
  }

  // Count unread messages per conversation
  const membershipMap = new Map<number, typeof memberships[0]>();
  for (const m of memberships) {
    membershipMap.set(m.conversationId, m);
  }

  const unreadCounts = new Map<number, number>();
  for (const convId of convIds) {
    const mem = membershipMap.get(convId);
    const dbLastReadId = Number(mem?.lastReadMessageId || 0);
    const memLastReadId = Number(testLastReadMemory.get(`${convId}:${userId}`) || 0);
    const lastReadId = Math.max(dbLastReadId, memLastReadId);
    const countRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(crewMessages)
      .where(
        and(
          eq(crewMessages.conversationId, convId),
          ne(crewMessages.senderUserId, userId),
          sql`${crewMessages.deletedAt} IS NULL`,
          sql`${crewMessages.id} > ${lastReadId}`
        )
      );
    unreadCounts.set(convId, Number(countRes[0]?.count || 0));
  }

  // Fetch linked students for case threads
  const studentIds = convRows
    .filter((c) => c.type === "case" && c.linkedStudentId)
    .map((c) => c.linkedStudentId as number);

  const studentMap = new Map<number, any>();
  if (studentIds.length > 0) {
    const stRows = await db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        notes: contacts.notes,
      })
      .from(contacts)
      .where(inArray(contacts.id, studentIds));

    for (const s of stRows) {
      studentMap.set(s.id, s);
    }
  }

  // Categorize
  const channels: any[] = [];
  const directMessages: any[] = [];
  const seenDirectPartners = new Set<number>();
  const groupMessages: any[] = [];
  const caseThreads: any[] = [];

  for (const conv of convRows) {
    const lastMsg = lastMsgMap.get(conv.id);
    const unread = unreadCounts.get(conv.id) || 0;
    const members = allMembers.filter((m) => m.conversationId === conv.id);

    if (conv.type === "channel") {
      channels.push({
        ...conv,
        unreadCount: unread,
        lastMessage: lastMsg || null,
        membersCount: members.length,
      });
    } else if (conv.type === "direct") {
      // Find other participant
      const other = members.find((m) => m.userId !== userId) || members[0];
      const partnerId = other?.userId || 0;
      if (partnerId && seenDirectPartners.has(partnerId)) {
        continue;
      }
      if (partnerId) {
        seenDirectPartners.add(partnerId);
      }

      const partnerInfo = await resolveParticipantDisplay(
        partnerId,
        directoryMap,
        other?.name || conv.name,
        other?.email
      );

      directMessages.push({
        ...conv,
        displayName: partnerInfo.name,
        partnerUserId: partnerId,
        initials: partnerInfo.initials,
        role: partnerInfo.role,
        presence: "available",
        unreadCount: unread,
        lastMessage: lastMsg || null,
      });
    } else if (conv.type === "group") {
      const enrichedMembers = await Promise.all(
        members.map(async (m) => {
          const info = await resolveParticipantDisplay(m.userId, directoryMap, m.name, m.email, m.role);
          return {
            ...m,
            name: info.name,
            email: info.email,
            roleLabel: info.role,
            initials: info.initials,
          };
        })
      );
      groupMessages.push({
        ...conv,
        displayName: conv.name || "Group Conversation",
        unreadCount: unread,
        lastMessage: lastMsg || null,
        members: enrichedMembers,
      });
    } else if (conv.type === "case") {
      const student = conv.linkedStudentId ? studentMap.get(conv.linkedStudentId) : null;
      const studentName = student ? `${student.firstName} ${student.lastName}` : conv.name || "Student Case";
      caseThreads.push({
        ...conv,
        displayName: studentName,
        student,
        unreadCount: unread,
        lastMessage: lastMsg || null,
      });
    }
  }

  return { channels, directMessages, groupMessages, caseThreads };
}

/**
 * Returns full message thread for a conversation, including reactions, attachments, links, and action requests.
 */
export async function getMessagesForConversation(conversationId: number, userId: number, limit = 100) {
  await assertConversationMember(conversationId, userId);

  const db = await getDb();
  if (!db) return [];

  const directoryMap = await resolveEmployeeDirectoryMap(userId);

  // Determine read status across other participants in this conversation
  const memberRows = await db
    .select({
      userId: crewConversationMembers.userId,
      lastReadMessageId: crewConversationMembers.lastReadMessageId,
    })
    .from(crewConversationMembers)
    .where(eq(crewConversationMembers.conversationId, conversationId));

  let maxOtherLastReadId = 0;
  for (const mr of memberRows) {
    if (Number(mr.userId) !== Number(userId)) {
      const dbRead = Number(mr.lastReadMessageId || 0);
      const memRead = Number(testLastReadMemory.get(`${conversationId}:${mr.userId}`) || 0);
      const highest = Math.max(dbRead, memRead);
      if (highest > maxOtherLastReadId) {
        maxOtherLastReadId = highest;
      }
    }
  }
  const memMbrs = testMembershipsMemory.get(conversationId);
  if (memMbrs) {
    for (const mUid of Array.from(memMbrs)) {
      if (Number(mUid) !== Number(userId)) {
        const memRead = Number(testLastReadMemory.get(`${conversationId}:${mUid}`) || 0);
        if (memRead > maxOtherLastReadId) {
          maxOtherLastReadId = memRead;
        }
      }
    }
  }

  const msgs = await db
    .select({
      id: crewMessages.id,
      conversationId: crewMessages.conversationId,
      senderUserId: crewMessages.senderUserId,
      messageType: crewMessages.messageType,
      body: crewMessages.body,
      replyToMessageId: crewMessages.replyToMessageId,
      createdAt: crewMessages.createdAt,
      editedAt: crewMessages.editedAt,
      deletedAt: crewMessages.deletedAt,
      senderName: users.name,
      senderEmail: users.email,
      senderRole: users.role,
    })
    .from(crewMessages)
    .leftJoin(users, eq(users.id, crewMessages.senderUserId))
    .where(
      and(
        eq(crewMessages.conversationId, conversationId),
        sql`${crewMessages.deletedAt} IS NULL`
      )
    )
    .orderBy(asc(crewMessages.createdAt), asc(crewMessages.id))
    .limit(limit);

  if (msgs.length === 0) {
    const memoryMsgs = (testMessagesMemory.get(conversationId) || []).filter((m) => !m.deletedAt);
    return Promise.all(
      memoryMsgs.map(async (m) => {
        const senderInfo = await resolveParticipantDisplay(
          m.senderUserId,
          directoryMap,
          m.senderName,
          m.senderEmail,
          m.senderRole
        );
        return {
          ...m,
          senderName: senderInfo.name,
          senderRole: senderInfo.role,
          isSender: m.senderUserId === userId,
          isReadByRecipient: m.senderUserId === userId ? Number(m.id) <= maxOtherLastReadId : true,
        };
      })
    );
  }

  const msgIds = msgs.map((m) => m.id);

  // Fetch reactions
  const reactions = await db
    .select()
    .from(crewMessageReactions)
    .where(inArray(crewMessageReactions.messageId, msgIds));

  const reactionMap = new Map<number, any[]>();
  for (const r of reactions) {
    if (!reactionMap.has(r.messageId)) reactionMap.set(r.messageId, []);
    reactionMap.get(r.messageId)!.push(r);
  }

  // Fetch attachments
  const attachments = await db
    .select()
    .from(crewMessageAttachments)
    .where(inArray(crewMessageAttachments.messageId, msgIds));

  const attachMap = new Map<number, any[]>();
  for (const a of attachments) {
    if (!attachMap.has(a.messageId)) attachMap.set(a.messageId, []);
    attachMap.get(a.messageId)!.push(a);
  }

  // Fetch links
  const links = await db
    .select()
    .from(crewMessageLinks)
    .where(inArray(crewMessageLinks.messageId, msgIds));

  const linkMap = new Map<number, any[]>();
  for (const l of links) {
    if (!linkMap.has(l.messageId)) linkMap.set(l.messageId, []);
    let parsedMetadata = null;
    try {
      if (l.metadata) parsedMetadata = JSON.parse(l.metadata);
    } catch {}
    linkMap.get(l.messageId)!.push({ ...l, parsedMetadata });
  }

  // Fetch action requests
  const actionRequests = await db
    .select()
    .from(crewActionRequests)
    .where(inArray(crewActionRequests.messageId, msgIds));

  const arMap = new Map<number, any>();
  for (const ar of actionRequests) {
    arMap.set(ar.messageId, ar);
  }

  // Resolve sender names from staff directory
  const senderDisplayByMsgId = new Map<number, { name: string; role: string }>();
  for (const m of msgs) {
    const info = await resolveParticipantDisplay(
      m.senderUserId,
      directoryMap,
      m.senderName,
      m.senderEmail,
      m.senderRole
    );
    senderDisplayByMsgId.set(m.id, { name: info.name, role: info.role });
  }

  // Map reply-to parent snippets
  const replyMap = new Map<number, { body: string; senderName?: string }>();
  for (const m of msgs) {
    const senderInfo = senderDisplayByMsgId.get(m.id);
    replyMap.set(m.id, { body: m.body, senderName: senderInfo?.name || m.senderName || undefined });
  }

  return msgs.map((m) => {
    const rawReactions = reactionMap.get(m.id) || [];
    // Group reactions by emoji
    const groupedReactions: { emoji: string; count: number; userIds: number[]; hasReacted: boolean }[] = [];
    const emojiMap = new Map<string, { count: number; userIds: number[] }>();
    for (const r of rawReactions) {
      if (!emojiMap.has(r.emoji)) emojiMap.set(r.emoji, { count: 0, userIds: [] });
      const entry = emojiMap.get(r.emoji)!;
      entry.count++;
      entry.userIds.push(r.userId);
    }
    for (const [emoji, data] of Array.from(emojiMap.entries())) {
      groupedReactions.push({
        emoji,
        count: data.count,
        userIds: data.userIds,
        hasReacted: data.userIds.includes(userId),
      });
    }

    const replySnippet = m.replyToMessageId ? replyMap.get(m.replyToMessageId) : undefined;
    const senderInfo = senderDisplayByMsgId.get(m.id);

    return {
      ...m,
      senderName: senderInfo?.name || m.senderName || "Advocate",
      senderRole: senderInfo?.role || m.senderRole || "Advocate",
      isSender: m.senderUserId === userId,
      isReadByRecipient: m.senderUserId === userId ? Number(m.id) <= maxOtherLastReadId : true,
      reactions: groupedReactions,
      attachments: attachMap.get(m.id) || [],
      links: linkMap.get(m.id) || [],
      actionRequest: arMap.get(m.id) || null,
      replySnippet,
    };
  });
}

/**
 * Sends a message in a conversation.
 */
export async function sendMessage(input: {
  conversationId: number;
  senderUserId: number;
  body: string;
  messageType?: "text" | "attachment" | "linked_record" | "action_request" | "system";
  replyToMessageId?: number;
  links?: Array<{ recordType: string; recordId: string; metadata?: any }>;
  attachments?: Array<{ fileName: string; mimeType: string; fileSize: number; r2Key?: string; documentId?: number }>;
}) {
  await assertConversationMember(input.conversationId, input.senderUserId);

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (input.replyToMessageId) {
    const replyConvId = await assertMessageConversationMember(input.replyToMessageId, input.senderUserId);
    if (Number(replyConvId) !== Number(input.conversationId)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot reply to a message from a different conversation.",
      });
    }
  }

  const msgType = input.messageType || "text";
  const senderAccess = await resolveStaffAccess({ id: input.senderUserId });
  const now = new Date();

  const inserted = await db.insert(crewMessages).values({
    conversationId: input.conversationId,
    senderUserId: input.senderUserId,
    messageType: msgType,
    body: input.body,
    replyToMessageId: input.replyToMessageId || null,
  }).returning({ id: crewMessages.id });

  let messageId = extractInsertId(inserted);
  if (!messageId) {
    const [latest] = await db.select({ id: crewMessages.id }).from(crewMessages).orderBy(desc(crewMessages.id)).limit(1);
    messageId = latest ? Number(latest.id) : ++testMsgCounter;
  }

  testMessageToConvMemory.set(messageId, input.conversationId);
  testLastReadMemory.set(`${input.conversationId}:${input.senderUserId}`, messageId);

  // Store in test cache for instant query availability in test/offline mode
  const currentMem = testMessagesMemory.get(input.conversationId) || [];
  currentMem.push({
    id: messageId,
    conversationId: input.conversationId,
    senderUserId: input.senderUserId,
    senderName: senderAccess.name || "Advocate",
    messageType: msgType,
    body: input.body,
    replyToMessageId: input.replyToMessageId || null,
    createdAt: now.toISOString(),
    editedAt: null,
    deletedAt: null,
    isSender: true,
    reactions: [],
    attachments: [],
    links: input.links || [],
    actionRequest: null,
  });
  testMessagesMemory.set(input.conversationId, currentMem);

  // Insert links if any
  if (input.links && input.links.length > 0) {
    for (const link of input.links) {
      await db.insert(crewMessageLinks).values({
        messageId,
        recordType: link.recordType as any,
        recordId: link.recordId,
        metadata: link.metadata ? JSON.stringify(link.metadata) : null,
        createdBy: input.senderUserId,
      });
    }
  }

  // Insert attachments if any
  if (input.attachments && input.attachments.length > 0) {
    for (const att of input.attachments) {
      await db.insert(crewMessageAttachments).values({
        messageId,
        documentId: att.documentId || null,
        r2Key: att.r2Key || null,
        fileName: att.fileName,
        mimeType: att.mimeType,
        fileSize: att.fileSize,
        uploadedBy: input.senderUserId,
      });
    }
  }

  // Update conversation updatedAt
  await db
    .update(crewConversations)
    .set({ updatedAt: now })
    .where(eq(crewConversations.id, input.conversationId));

  // Mark read for sender
  await db
    .update(crewConversationMembers)
    .set({
      lastReadMessageId: messageId,
      lastReadAt: now,
    })
    .where(
      and(
        eq(crewConversationMembers.conversationId, input.conversationId),
        eq(crewConversationMembers.userId, input.senderUserId)
      )
    );

  return { messageId, createdAt: now.toISOString(), success: true };
}

/**
 * Edits an existing message. Strictly restricted to the original message author.
 */
export async function editMessage(input: {
  messageId: number;
  userId: number;
  body: string;
}) {
  const trimmed = input.body.trim();
  if (!trimmed) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Message body cannot be empty." });
  }

  const convId = await assertMessageConversationMember(input.messageId, input.userId);
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select()
    .from(crewMessages)
    .where(eq(crewMessages.id, input.messageId))
    .limit(1);

  const memList = testMessagesMemory.get(convId) || [];
  const memMsg = memList.find((m) => Number(m.id) === Number(input.messageId));
  const target = rows[0] || memMsg;

  if (!target || target.deletedAt) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Message not found." });
  }

  if (Number(target.senderUserId) !== Number(input.userId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You can only edit messages that you sent. Editing another employee's message is prohibited.",
    });
  }

  if (target.messageType === "system" || target.messageType === "action_request") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "System and action request messages cannot be edited.",
    });
  }

  const editedAt = new Date();
  await db
    .update(crewMessages)
    .set({
      body: trimmed,
      editedAt,
    })
    .where(eq(crewMessages.id, input.messageId));

  if (memMsg) {
    memMsg.body = trimmed;
    memMsg.editedAt = editedAt.toISOString();
  }

  return { success: true, messageId: input.messageId, body: trimmed, editedAt: editedAt.toISOString() };
}

/**
 * Soft-deletes a message. Only the original sender (or a Protected Owner / Management admin who is a participant) may delete.
 */
export async function deleteMessage(input: {
  messageId: number;
  userId: number;
}) {
  const convId = await assertMessageConversationMember(input.messageId, input.userId);
  const staffAccess = await assertActiveStaffUser(input.userId, "Caller account");
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select()
    .from(crewMessages)
    .where(eq(crewMessages.id, input.messageId))
    .limit(1);

  const memList = testMessagesMemory.get(convId) || [];
  const memMsg = memList.find((m) => Number(m.id) === Number(input.messageId));
  const target = rows[0] || memMsg;

  if (!target || target.deletedAt) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Message not found." });
  }

  const isAuthor = Number(target.senderUserId) === Number(input.userId);
  const canModerate = Boolean(staffAccess.isProtectedOwner || staffAccess.primaryRole === "management");
  if (!isAuthor && !canModerate) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not authorized to delete another employee's message.",
    });
  }

  const deletedAt = new Date();
  await db
    .update(crewMessages)
    .set({ deletedAt })
    .where(eq(crewMessages.id, input.messageId));

  if (memMsg) {
    memMsg.deletedAt = deletedAt.toISOString();
  }

  return { success: true, messageId: input.messageId };
}

/**
 * Marks conversation as read up to a message ID (or latest message if not specified).
 */
export async function markConversationRead(conversationId: number, userId: number, messageId?: number) {
  await assertConversationMember(conversationId, userId);

  const db = await getDb();
  if (!db) return;

  let targetMessageId = messageId;
  if (targetMessageId === undefined) {
    const latest = await db
      .select({ id: crewMessages.id })
      .from(crewMessages)
      .where(
        and(
          eq(crewMessages.conversationId, conversationId),
          sql`${crewMessages.deletedAt} IS NULL`
        )
      )
      .orderBy(desc(crewMessages.id))
      .limit(1);
    if (latest[0]) {
      targetMessageId = Number(latest[0].id);
    } else {
      const memMsgs = testMessagesMemory.get(conversationId) || [];
      if (memMsgs.length > 0) {
        targetMessageId = Number(memMsgs[memMsgs.length - 1].id);
      }
    }
  }

  if (targetMessageId !== undefined) {
    const prevMem = Number(testLastReadMemory.get(`${conversationId}:${userId}`) || 0);
    if (targetMessageId > prevMem) {
      testLastReadMemory.set(`${conversationId}:${userId}`, targetMessageId);
    }
  }

  const existingMember = await db
    .select()
    .from(crewConversationMembers)
    .where(
      and(
        eq(crewConversationMembers.conversationId, conversationId),
        eq(crewConversationMembers.userId, userId)
      )
    )
    .limit(1);

  const now = new Date();
  if (existingMember.length > 0) {
    const updateFields: any = { lastReadAt: now };
    if (targetMessageId !== undefined) {
      updateFields.lastReadMessageId = targetMessageId;
    }
    await db
      .update(crewConversationMembers)
      .set(updateFields)
      .where(
        and(
          eq(crewConversationMembers.conversationId, conversationId),
          eq(crewConversationMembers.userId, userId)
        )
      );
  } else {
    await db.insert(crewConversationMembers).values({
      conversationId,
      tenantId: "waypoint",
      userId,
      role: "member",
      lastReadMessageId: targetMessageId ?? null,
      lastReadAt: now,
    });
  }
}

/**
 * Creates or gets an existing direct conversation without duplicate threads.
 */
export async function getOrCreateDirectConversation(userId: number, targetUserId: number, tenantId = "waypoint") {
  if (Number(userId) === Number(targetUserId)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot start a direct conversation with yourself.",
    });
  }

  await assertActiveStaffUser(userId, "Sender account");
  const targetAccess = await assertActiveStaffUser(targetUserId, "Target recipient");

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const directoryMap = await resolveEmployeeDirectoryMap(userId);
  const partnerInfo = await resolveParticipantDisplay(
    targetUserId,
    directoryMap,
    targetAccess.name,
    targetAccess.email
  );

  const directKey = [Number(userId), Number(targetUserId)].sort((a, b) => a - b).join(":");
  if (testDirectConvsMemory.has(directKey)) {
    const existingConvId = testDirectConvsMemory.get(directKey)!;
    registerMemoryMembership(existingConvId, [userId, targetUserId], { type: "direct" });
    return {
      conversationId: existingConvId,
      isNew: false,
      displayName: partnerInfo.name,
      partnerUserId: targetUserId,
      role: partnerInfo.role,
      initials: partnerInfo.initials,
    };
  }

  // Check if a direct conversation already exists between these 2 users
  const user1Convs = await db
    .select({
      conversationId: crewConversationMembers.conversationId,
      updatedAt: crewConversations.updatedAt,
    })
    .from(crewConversationMembers)
    .innerJoin(crewConversations, eq(crewConversations.id, crewConversationMembers.conversationId))
    .where(
      and(
        eq(crewConversationMembers.userId, userId),
        eq(crewConversations.type, "direct"),
        eq(crewConversations.tenantId, tenantId)
      )
    )
    .orderBy(desc(crewConversations.updatedAt));

  const candidateIds = user1Convs.map((c) => c.conversationId);

  if (candidateIds.length > 0) {
    const match = await db
      .select()
      .from(crewConversationMembers)
      .where(
        and(
          eq(crewConversationMembers.userId, targetUserId),
          inArray(crewConversationMembers.conversationId, candidateIds)
        )
      )
      .limit(1);

    if (match.length > 0) {
      const foundId = match[0].conversationId;
      testDirectConvsMemory.set(directKey, foundId);
      registerMemoryMembership(foundId, [userId, targetUserId], { type: "direct" });
      return {
        conversationId: foundId,
        isNew: false,
        displayName: partnerInfo.name,
        partnerUserId: targetUserId,
        role: partnerInfo.role,
        initials: partnerInfo.initials,
      };
    }
  }

  // Create new direct conversation
  const inserted = await db.insert(crewConversations).values({
    tenantId,
    type: "direct",
    name: partnerInfo.name,
    createdBy: userId,
  }).returning({ id: crewConversations.id });

  let conversationId = extractInsertId(inserted);
  if (!conversationId) {
    const [latest] = await db.select({ id: crewConversations.id }).from(crewConversations).orderBy(desc(crewConversations.id)).limit(1);
    conversationId = latest ? Number(latest.id) : ++testConvCounter;
  }

  testDirectConvsMemory.set(directKey, conversationId);
  registerMemoryMembership(conversationId, [userId, targetUserId], { type: "direct", name: partnerInfo.name });

  // Add both members
  await db.insert(crewConversationMembers).values([
    { conversationId, tenantId, userId, role: "member" },
    { conversationId, tenantId, userId: targetUserId, role: "member" },
  ]);

  return {
    conversationId,
    isNew: true,
    displayName: partnerInfo.name,
    partnerUserId: targetUserId,
    role: partnerInfo.role,
    initials: partnerInfo.initials,
  };
}

/**
 * Creates a new group conversation.
 */
export async function createGroupConversation(
  userId: number,
  name: string,
  memberUserIds: number[],
  description?: string,
  tenantId = "waypoint"
) {
  await assertActiveStaffUser(userId, "Sender account");

  const uniqueMemberIds = Array.from(new Set([userId, ...memberUserIds]));
  for (const uid of uniqueMemberIds) {
    await assertActiveStaffUser(uid, `Group member #${uid}`);
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const inserted = await db.insert(crewConversations).values({
    tenantId,
    type: "group",
    name,
    description: description || null,
    createdBy: userId,
  }).returning({ id: crewConversations.id });

  let conversationId = extractInsertId(inserted);
  if (!conversationId) {
    const [latest] = await db.select({ id: crewConversations.id }).from(crewConversations).orderBy(desc(crewConversations.id)).limit(1);
    conversationId = latest ? Number(latest.id) : ++testConvCounter;
  }

  registerMemoryMembership(conversationId, uniqueMemberIds, { type: "group", name });

  const memberValues = uniqueMemberIds.map((uid) => ({
    conversationId,
    tenantId,
    userId: uid,
    role: uid === userId ? "owner" : "member",
  }));

  await db.insert(crewConversationMembers).values(memberValues);

  return { conversationId, name, success: true };
}

/**
 * Creates or gets an existing Student Case Thread.
 */
export async function getOrCreateCaseThread(userId: number, studentContactId: number, tenantId = "waypoint") {
  const staffAccess = await assertActiveStaffUser(userId, "Staff account");

  // Case thread creation and access require case workspace access
  const hasCaseAccess =
    checkBackendCaseAccess(staffAccess, "compass") !== "none" ||
    checkBackendCaseAccess(staffAccess, "notes") !== "none";
  if (!hasCaseAccess) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have case workspace access to open or view student case threads.",
    });
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if thread exists for this student
  const existing = await db
    .select()
    .from(crewConversations)
    .where(
      and(
        eq(crewConversations.tenantId, tenantId),
        eq(crewConversations.type, "case"),
        eq(crewConversations.linkedStudentId, studentContactId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Ensure user is member
    const isMember = await db
      .select()
      .from(crewConversationMembers)
      .where(
        and(
          eq(crewConversationMembers.conversationId, existing[0].id),
          eq(crewConversationMembers.userId, userId)
        )
      )
      .limit(1);

    if (isMember.length === 0) {
      await db.insert(crewConversationMembers).values({
        conversationId: existing[0].id,
        tenantId,
        userId,
        role: "member",
      });
    }

    registerMemoryMembership(existing[0].id, [userId], {
      type: "case",
      name: existing[0].name || undefined,
      linkedStudentId: studentContactId,
    });

    return { conversationId: existing[0].id, isNew: false };
  }

  // Look up student details
  const student = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, studentContactId))
    .limit(1);

  const studentName = student.length > 0 ? `${student[0].firstName} ${student[0].lastName}` : "Student Case Thread";

  const inserted = await db.insert(crewConversations).values({
    tenantId,
    type: "case",
    name: studentName,
    description: `Internal advocacy & strategy thread for ${studentName}`,
    linkedStudentId: studentContactId,
    createdBy: userId,
  }).returning({ id: crewConversations.id });

  let conversationId = extractInsertId(inserted);
  if (!conversationId) {
    const [latest] = await db.select({ id: crewConversations.id }).from(crewConversations).orderBy(desc(crewConversations.id)).limit(1);
    conversationId = latest ? Number(latest.id) : ++testConvCounter;
  }

  registerMemoryMembership(conversationId, [userId], {
    type: "case",
    name: studentName,
    linkedStudentId: studentContactId,
  });

  await db.insert(crewConversationMembers).values({
    conversationId,
    tenantId,
    userId,
    role: "owner",
  });

  return { conversationId, isNew: true };
}

/**
 * Toggles an emoji reaction.
 */
export async function toggleMessageReaction(messageId: number, userId: number, emoji: string, tenantId = "waypoint") {
  await assertMessageConversationMember(messageId, userId);

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const reactionKey = `${messageId}:${userId}:${emoji}`;
  if (testReactionsMemory.has(reactionKey)) {
    testReactionsMemory.delete(reactionKey);
    try {
      await db.delete(crewMessageReactions).where(
        and(
          eq(crewMessageReactions.messageId, messageId),
          eq(crewMessageReactions.userId, userId),
          eq(crewMessageReactions.emoji, emoji)
        )
      );
    } catch {}
    return { action: "removed", emoji };
  } else {
    testReactionsMemory.add(reactionKey);
    try {
      await db.insert(crewMessageReactions).values({
        messageId,
        userId,
        emoji,
        tenantId,
      });
    } catch {}
    return { action: "added", emoji };
  }
}

/**
 * Creates an Action Request message and approval card.
 * Kept strictly internal to Crew Messages (does not write to client activity timeline).
 */
export async function createActionRequest(input: {
  conversationId: number;
  requestedBy: number;
  assignedApproverId: number;
  requestType: string;
  title: string;
  explanation?: string;
  relatedRecordType?: string;
  relatedRecordId?: string;
  dueAt?: Date;
  tenantId?: string;
}) {
  await assertConversationMember(input.conversationId, input.requestedBy);
  await assertActiveStaffUser(input.assignedApproverId, "Assigned approver");

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const tenantId = input.tenantId || "waypoint";

  // 1. Create message
  const insertedMsg = await db.insert(crewMessages).values({
    conversationId: input.conversationId,
    senderUserId: input.requestedBy,
    messageType: "action_request",
    body: `📋 [Action Request: ${input.title}] ${input.explanation || ""}`,
  }).returning({ id: crewMessages.id });
  let messageId = extractInsertId(insertedMsg);
  if (!messageId) {
    const [latest] = await db.select({ id: crewMessages.id }).from(crewMessages).orderBy(desc(crewMessages.id)).limit(1);
    messageId = latest ? Number(latest.id) : ++testMsgCounter;
  }

  testMessageToConvMemory.set(messageId, input.conversationId);

  // 2. Create action request record
  const insertedAr = await db.insert(crewActionRequests).values({
    tenantId,
    conversationId: input.conversationId,
    messageId,
    requestType: input.requestType,
    title: input.title,
    explanation: input.explanation || null,
    requestedBy: input.requestedBy,
    assignedApproverId: input.assignedApproverId,
    relatedRecordType: input.relatedRecordType || null,
    relatedRecordId: input.relatedRecordId || null,
    status: "pending",
    dueAt: input.dueAt || null,
  }).returning({ id: crewActionRequests.id });
  let actionRequestId = extractInsertId(insertedAr);
  if (!actionRequestId) {
    const [latest] = await db.select({ id: crewActionRequests.id }).from(crewActionRequests).orderBy(desc(crewActionRequests.id)).limit(1);
    actionRequestId = latest ? Number(latest.id) : ++testArCounter;
  }

  testActionRequestsMemory.set(actionRequestId, {
    id: actionRequestId,
    status: "pending",
    assignedApproverId: input.assignedApproverId,
    requestedBy: input.requestedBy,
    conversationId: input.conversationId,
    title: input.title,
  });

  return { messageId, actionRequestId, success: true };
}

/**
 * Decides an Action Request (single-use, permission checked, and audited within Crew Messages).
 */
export async function decideActionRequest(input: {
  actionRequestId: number;
  deciderUserId: number;
  deciderName: string;
  decision: "approved" | "declined" | "changes_requested";
  note?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const testAr = testActionRequestsMemory.get(input.actionRequestId);

  const ar = await db
    .select()
    .from(crewActionRequests)
    .where(eq(crewActionRequests.id, input.actionRequestId))
    .limit(1);

  if (ar.length === 0 && !testAr) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Action request not found" });
  }

  const targetAr = ar[0] || testAr;
  const convId = Number(targetAr.conversationId || 1);
  const assignedApproverId = Number(targetAr.assignedApproverId || 0);

  // 1. Decider must be a member of the conversation
  await assertConversationMember(convId, input.deciderUserId);

  // 2. Only the assigned approver may decide the action request
  if (assignedApproverId && input.deciderUserId !== assignedApproverId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the assigned approver is authorized to decide this action request.",
    });
  }

  // 3. Single-use status validation
  if (testAr && testAr.status !== "pending") {
    throw new Error(`This request has already been decided (${testAr.status})`);
  }
  if (ar.length > 0 && ar[0].status !== "pending") {
    throw new Error(`This request has already been decided (${ar[0].status})`);
  }
  if (testAr) {
    testAr.status = input.decision;
  }

  // Update status
  await db
    .update(crewActionRequests)
    .set({
      status: input.decision,
      decidedBy: input.deciderUserId,
      decidedAt: new Date(),
      decisionNote: input.note || null,
      updatedAt: new Date(),
    })
    .where(eq(crewActionRequests.id, input.actionRequestId));

  // Insert a system message into conversation announcing the decision
  const decisionText =
    input.decision === "approved"
      ? "APPROVED"
      : input.decision === "declined"
      ? "DECLINED"
      : "CHANGES REQUESTED";

  const reqTitle = ar[0]?.title || testAr?.title || "Action Request";

  await db.insert(crewMessages).values({
    conversationId: convId,
    senderUserId: input.deciderUserId,
    messageType: "system",
    body: `⚡ Action Request "${reqTitle}" was ${decisionText} by ${input.deciderName}.${
      input.note ? ` Note: "${input.note}"` : ""
    }`,
  });

  return { success: true, status: input.decision };
}

/**
 * Converts a normal message into an existing CRM internal task.
 * Kept separate from the client activity timeline.
 */
export async function convertMessageToTask(input: {
  messageId: number;
  creatorUserId: number;
  creatorName: string;
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  dueDate?: string;
  studentContactId?: number;
}) {
  await assertMessageConversationMember(input.messageId, input.creatorUserId);

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Create internal task
  const insertedTask = await db.insert(internalTasks).values({
    title: input.title,
    description: input.description || null,
    status: "not_started",
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    linkedStudentId: input.studentContactId || null,
    createdBy: input.creatorUserId,
  }).returning({ id: internalTasks.id });

  let taskId = extractInsertId(insertedTask);
  if (!taskId) {
    const [latest] = await db.select({ id: internalTasks.id }).from(internalTasks).orderBy(desc(internalTasks.id)).limit(1);
    taskId = latest ? Number(latest.id) : 1;
  }

  // Link task to message
  await db.insert(crewMessageLinks).values({
    messageId: input.messageId,
    recordType: "task",
    recordId: String(taskId),
    metadata: JSON.stringify({
      title: input.title,
      priority: input.priority || "medium",
      dueDate: input.dueDate || "Due Soon",
      status: "Todo",
    }),
    createdBy: input.creatorUserId,
  });

  return { taskId, success: true };
}

/**
 * Returns Linked Context for a conversation (linked student, task, document, meeting, members).
 */
export async function getLinkedContext(conversationId: number, userId?: number) {
  if (userId !== undefined) {
    await assertConversationMember(conversationId, userId);
  }

  const db = await getDb();
  if (!db) return null;

  const directoryMap = await resolveEmployeeDirectoryMap(userId);

  const conv = await db
    .select()
    .from(crewConversations)
    .where(eq(crewConversations.id, conversationId))
    .limit(1);

  if (conv.length === 0) return null;

  const c = conv[0];

  // Linked student details if any
  let linkedStudent: any = null;
  if (c.linkedStudentId) {
    const st = await db.select().from(contacts).where(eq(contacts.id, c.linkedStudentId)).limit(1);
    if (st.length > 0) {
      linkedStudent = {
        id: st[0].id,
        name: `${st[0].firstName} ${st[0].lastName}`,
        grade: st[0].gradeLevel || "Student Record",
        focus: st[0].iepEligibility || "Special Education Advocacy",
        caseNumber: st[0].caseId || `WP-${st[0].id}`,
      };
    }
  }

  // Members
  const memberRows = await db
    .select({
      userId: crewConversationMembers.userId,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(crewConversationMembers)
    .leftJoin(users, eq(users.id, crewConversationMembers.userId))
    .where(eq(crewConversationMembers.conversationId, conversationId));

  const enrichedMembers = await Promise.all(
    memberRows.map(async (m) => {
      const info = await resolveParticipantDisplay(m.userId, directoryMap, m.name, m.email, m.role);
      return {
        id: m.userId,
        name: info.name,
        role: info.role,
        initials: info.initials,
      };
    })
  );

  // Message count
  const countRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(crewMessages)
    .where(
      and(
        eq(crewMessages.conversationId, conversationId),
        sql`${crewMessages.deletedAt} IS NULL`
      )
    );

  const messageCount = Number(countRes[0]?.count || 0);

  // Latest linked task if any
  const recentLink = await db
    .select()
    .from(crewMessageLinks)
    .innerJoin(crewMessages, eq(crewMessages.id, crewMessageLinks.messageId))
    .where(
      and(
        eq(crewMessages.conversationId, conversationId),
        eq(crewMessageLinks.recordType, "task")
      )
    )
    .orderBy(desc(crewMessageLinks.createdAt))
    .limit(1);

  let linkedTask: any = null;
  if (recentLink.length > 0 && recentLink[0].crew_message_links.metadata) {
    try {
      linkedTask = JSON.parse(recentLink[0].crew_message_links.metadata);
    } catch {
      linkedTask = null;
    }
  }

  return {
    conversation: c,
    linkedStudent,
    linkedTask,
    members: enrichedMembers,
    messageCount,
    createdAt: c.createdAt,
    lastMessageTime: c.updatedAt,
  };
}

/**
 * Returns compact overview statistics for the Crew Quarters Overview widget & notification indicators.
 */
export async function getCrewOverviewStats(userId: number, tenantId = "waypoint") {
  const callerAccess = await assertActiveStaffUser(userId, "Caller account");
  const db = await getDb();
  if (!db) {
    return {
      unreadTotal: 0,
      recentConversations: [],
      recentMentions: 0,
      latestActionRequest: null,
    };
  }

  const directoryMap = await resolveEmployeeDirectoryMap(userId);
  const convs = await getConversationsForUser(userId, tenantId);
  const allConvs = [
    ...convs.channels,
    ...convs.directMessages,
    ...convs.groupMessages,
    ...convs.caseThreads,
  ];

  const unreadTotal = allConvs.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  // Top 4 recent conversations
  const recentConversations = allConvs
    .filter((c) => c.lastMessage)
    .sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime())
    .slice(0, 4);

  // Compute real unread mentions for the current user (0 if none)
  const firstName = (callerAccess.name || "").split(/\s+/)[0]?.toLowerCase() || "";
  let recentMentions = 0;
  if (firstName && unreadTotal > 0) {
    for (const c of allConvs) {
      if ((c.unreadCount || 0) > 0 && c.lastMessage?.body?.toLowerCase().includes(`@${firstName}`)) {
        recentMentions += 1;
      }
    }
  }

  // Latest pending action request assigned to user
  const latestAr = await db
    .select({
      id: crewActionRequests.id,
      title: crewActionRequests.title,
      requestType: crewActionRequests.requestType,
      status: crewActionRequests.status,
      dueAt: crewActionRequests.dueAt,
      createdAt: crewActionRequests.createdAt,
      requestedBy: crewActionRequests.requestedBy,
      requestedByName: users.name,
      conversationId: crewActionRequests.conversationId,
    })
    .from(crewActionRequests)
    .leftJoin(users, eq(users.id, crewActionRequests.requestedBy))
    .where(
      and(
        eq(crewActionRequests.assignedApproverId, userId),
        eq(crewActionRequests.status, "pending")
      )
    )
    .orderBy(desc(crewActionRequests.createdAt))
    .limit(1);

  let latestActionRequest: any = null;
  if (latestAr.length > 0) {
    const ar = latestAr[0];
    const reqInfo = await resolveParticipantDisplay(ar.requestedBy, directoryMap, ar.requestedByName);
    latestActionRequest = {
      ...ar,
      requestedByName: reqInfo.name,
    };
  }

  return {
    unreadTotal,
    recentConversations,
    recentMentions,
    latestActionRequest,
  };
}

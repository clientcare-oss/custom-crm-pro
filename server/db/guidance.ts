import { eq, and, desc } from "drizzle-orm";
import { guidanceSessions, clientPresence, GuidanceSession, ClientPresence } from "../../drizzle/schema";
import { getDb } from "./connection";

// In-memory fallback map for sub-second reactive sync and offline test resiliency
const inMemorySessions = new Map<string, any>();
const inMemoryPresence = new Map<number, any>();

export async function upsertClientPresence(data: {
  studentContactId: number;
  parentContactId?: number;
  currentPath?: string;
  currentSection?: string;
  isPaymentArea?: boolean;
  isOnline?: boolean;
}): Promise<ClientPresence> {
  const now = new Date();
  const record: any = {
    id: data.studentContactId,
    studentContactId: data.studentContactId,
    parentContactId: data.parentContactId ?? null,
    currentPath: data.currentPath || "/portal",
    currentSection: data.currentSection || "Overview",
    isPaymentArea: Boolean(data.isPaymentArea),
    lastSeenAt: now,
    isOnline: data.isOnline !== undefined ? data.isOnline : true,
  };
  inMemoryPresence.set(data.studentContactId, record);

  try {
    const db = await getDb();
    if (db) {
      const existing = await db
        .select()
        .from(clientPresence)
        .where(eq(clientPresence.studentContactId, data.studentContactId))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(clientPresence)
          .set({
            currentPath: record.currentPath,
            currentSection: record.currentSection,
            isPaymentArea: record.isPaymentArea,
            lastSeenAt: now,
            isOnline: record.isOnline,
            parentContactId: record.parentContactId,
          })
          .where(eq(clientPresence.id, existing[0].id));
      } else {
        await db.insert(clientPresence).values(record);
      }
    }
  } catch (err) {
    // Fallback to in-memory store cleanly
  }

  return record as ClientPresence;
}

export async function getClientPresence(studentContactId: number): Promise<ClientPresence | null> {
  const mem = inMemoryPresence.get(studentContactId);
  try {
    const db = await getDb();
    if (db) {
      const rows = await db
        .select()
        .from(clientPresence)
        .where(eq(clientPresence.studentContactId, studentContactId))
        .limit(1);
      if (rows.length > 0) {
        return rows[0] as ClientPresence;
      }
    }
  } catch (err) {
    // Fallback to in-memory
  }
  return mem ? (mem as ClientPresence) : null;
}

export async function createGuidanceSession(data: {
  sessionId: string;
  studentContactId: number;
  parentContactId?: number;
  employeeId: string;
  employeeName: string;
}): Promise<GuidanceSession> {
  const now = new Date();
  const record: any = {
    id: inMemorySessions.size + 1,
    sessionId: data.sessionId,
    studentContactId: data.studentContactId,
    parentContactId: data.parentContactId ?? null,
    employeeId: data.employeeId,
    employeeName: data.employeeName,
    status: "pending",
    currentSection: "Overview",
    currentPath: "/portal",
    currentTab: "dashboard",
    isPaymentArea: false,
    pointerX: null,
    pointerY: null,
    highlightSelector: null,
    startedAt: now,
    connectedAt: null,
    endedAt: null,
    durationSeconds: 0,
    endReason: null,
    createdAt: now,
    updatedAt: now,
  };

  inMemorySessions.set(data.sessionId, record);

  try {
    const db = await getDb();
    if (db) {
      await db.insert(guidanceSessions).values(record);
    }
  } catch (err) {
    // Fallback to in-memory store
  }

  return record as GuidanceSession;
}

export async function getGuidanceSessionBySessionId(sessionId: string): Promise<GuidanceSession | null> {
  const mem = inMemorySessions.get(sessionId);
  try {
    const db = await getDb();
    if (db) {
      const rows = await db
        .select()
        .from(guidanceSessions)
        .where(eq(guidanceSessions.sessionId, sessionId))
        .limit(1);
      if (rows.length > 0) {
        return rows[0] as GuidanceSession;
      }
    }
  } catch (err) {
    // Fallback to in-memory
  }
  return mem ? (mem as GuidanceSession) : null;
}

export async function getPendingGuidanceSessionForStudent(studentContactId: number): Promise<GuidanceSession | null> {
  // Check in-memory first for fastest response
  for (const sess of Array.from(inMemorySessions.values())) {
    if (sess.studentContactId === studentContactId && sess.status === "pending") {
      return sess as GuidanceSession;
    }
  }

  try {
    const db = await getDb();
    if (db) {
      const rows = await db
        .select()
        .from(guidanceSessions)
        .where(
          and(
            eq(guidanceSessions.studentContactId, studentContactId),
            eq(guidanceSessions.status, "pending")
          )
        )
        .orderBy(desc(guidanceSessions.createdAt))
        .limit(1);
      if (rows.length > 0) {
        return rows[0] as GuidanceSession;
      }
    }
  } catch (err) {
    // Return null on fallback
  }

  return null;
}

export async function updateGuidanceSession(
  sessionId: string,
  updates: Partial<GuidanceSession>
): Promise<GuidanceSession | null> {
  const now = new Date();
  const existing = inMemorySessions.get(sessionId);
  if (existing) {
    Object.assign(existing, updates, { updatedAt: now });
  }

  try {
    const db = await getDb();
    if (db) {
      await db
        .update(guidanceSessions)
        .set({ ...updates, updatedAt: now } as any)
        .where(eq(guidanceSessions.sessionId, sessionId));
    }
  } catch (err) {
    // Fallback to memory
  }

  return (existing || updates) as GuidanceSession;
}

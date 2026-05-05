import { eq, and, desc, asc, gte, lte, like, inArray, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  contacts,
  leads,
  projects,
  projectTasks,
  projectFiles,
  invoices,
  invoiceLineItems,
  contracts,
  appointments,
  messages,
  ownerAvailability,
  webhooks,
  clientFiles,
  vaultSubscriptions,
  caseCompass,
  caseCompassHistory,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ CONTACTS ============

export async function getContactsByOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(contacts)
    .where(eq(contacts.ownerId, ownerId))
    .orderBy(desc(contacts.createdAt));
}

export async function getContactById(id: number, ownerId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.ownerId, ownerId)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createContact(data: any, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Auto-generate a unique caseId in WP-YYYY-NNNN format
  const year = new Date().getFullYear();
  const countResult = await db.select().from(contacts);
  const nextNum = String(countResult.length + 1).padStart(4, "0");
  const caseId = `WP-${year}-${nextNum}`;

  const result = await db.insert(contacts).values({
    ...data,
    ownerId,
    caseId,
  });

  return result;
}

export async function updateContact(id: number, ownerId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(contacts)
    .set(data)
    .where(and(eq(contacts.id, id), eq(contacts.ownerId, ownerId)));
}

export async function deleteContact(id: number, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .delete(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.ownerId, ownerId)));
}

// ============ LEADS ============

export async function getLeadsByOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(leads)
    .where(eq(leads.ownerId, ownerId))
    .orderBy(desc(leads.createdAt));
}

export async function getLeadById(id: number, ownerId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, id), eq(leads.ownerId, ownerId)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createLead(data: any, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(leads).values({
    ...data,
    ownerId,
  });
}

export async function updateLead(id: number, ownerId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(leads)
    .set(data)
    .where(and(eq(leads.id, id), eq(leads.ownerId, ownerId)));
}

// ============ PROJECTS ============

export async function getProjectsByOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(projects)
    .where(eq(projects.ownerId, ownerId))
    .orderBy(desc(projects.createdAt));
}

export async function getProjectsByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(projects)
    .where(eq(projects.clientId, clientId))
    .orderBy(desc(projects.createdAt));
}

export async function getProjectById(id: number, userId: number, userRole: string) {
  const db = await getDb();
  if (!db) return undefined;

  const query =
    userRole === "admin"
      ? and(eq(projects.id, id), eq(projects.ownerId, userId))
      : and(eq(projects.id, id), eq(projects.clientId, userId));

  const result = await db.select().from(projects).where(query).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createProject(data: any, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(projects).values({
    ...data,
    ownerId,
  });
}

export async function updateProject(id: number, ownerId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(projects)
    .set(data)
    .where(and(eq(projects.id, id), eq(projects.ownerId, ownerId)));
}

// ============ PROJECT TASKS ============

export async function getTasksByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(projectTasks)
    .where(eq(projectTasks.projectId, projectId))
    .orderBy(asc(projectTasks.dueDate));
}

export async function createTask(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(projectTasks).values(data);
}

export async function updateTask(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(projectTasks).set(data).where(eq(projectTasks.id, id));
}

// ============ PROJECT FILES ============

export async function getFilesByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(projectFiles)
    .where(eq(projectFiles.projectId, projectId))
    .orderBy(desc(projectFiles.createdAt));
}

export async function createProjectFile(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(projectFiles).values(data);
}

// ============ INVOICES ============

export async function getInvoicesByOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(invoices)
    .where(eq(invoices.ownerId, ownerId))
    .orderBy(desc(invoices.createdAt));
}

export async function getInvoicesByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(invoices)
    .where(eq(invoices.clientId, clientId))
    .orderBy(desc(invoices.createdAt));
}

export async function getInvoiceById(id: number, userId: number, userRole: string) {
  const db = await getDb();
  if (!db) return undefined;

  const query =
    userRole === "admin"
      ? and(eq(invoices.id, id), eq(invoices.ownerId, userId))
      : and(eq(invoices.id, id), eq(invoices.clientId, userId));

  const result = await db.select().from(invoices).where(query).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createInvoice(data: any, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(invoices).values({
    ...data,
    ownerId,
  });
}

export async function updateInvoice(id: number, ownerId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(invoices)
    .set(data)
    .where(and(eq(invoices.id, id), eq(invoices.ownerId, ownerId)));
}

export async function getInvoiceLineItems(invoiceId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, invoiceId));
}

export async function createInvoiceLineItems(items: any[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(invoiceLineItems).values(items);
}

// ============ CONTRACTS ============

export async function getContractsByOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(contracts)
    .where(eq(contracts.ownerId, ownerId))
    .orderBy(desc(contracts.createdAt));
}

export async function getContractsByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(contracts)
    .where(eq(contracts.clientId, clientId))
    .orderBy(desc(contracts.createdAt));
}

export async function getContractById(id: number, userId: number, userRole: string) {
  const db = await getDb();
  if (!db) return undefined;

  const query =
    userRole === "admin"
      ? and(eq(contracts.id, id), eq(contracts.ownerId, userId))
      : and(eq(contracts.id, id), eq(contracts.clientId, userId));

  const result = await db.select().from(contracts).where(query).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createContract(data: any, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(contracts).values({
    ...data,
    ownerId,
  });
}

export async function updateContract(id: number, ownerId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(contracts)
    .set(data)
    .where(and(eq(contracts.id, id), eq(contracts.ownerId, ownerId)));
}

// ============ APPOINTMENTS ============

export async function getAppointmentsByOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(appointments)
    .where(eq(appointments.ownerId, ownerId))
    .orderBy(asc(appointments.startTime));
}

export async function getAppointmentsByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(appointments)
    .where(eq(appointments.clientId, clientId))
    .orderBy(asc(appointments.startTime));
}

export async function createAppointment(data: any, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(appointments).values({
    ...data,
    ownerId,
  });
}

export async function updateAppointment(id: number, ownerId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(appointments)
    .set(data)
    .where(and(eq(appointments.id, id), eq(appointments.ownerId, ownerId)));
}

// ============ MESSAGES ============

export async function getMessagesBetween(userId1: number, userId2: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(messages)
    .where(
      or(
        and(eq(messages.senderId, userId1), eq(messages.recipientId, userId2)),
        and(eq(messages.senderId, userId2), eq(messages.recipientId, userId1))
      )
    )
    .orderBy(asc(messages.createdAt));
}

export async function getUnreadMessages(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.recipientId, userId),
        eq(messages.isRead, false)
      )
    )
    .orderBy(desc(messages.createdAt));
}

export async function createMessage(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(messages).values(data);
}

export async function markMessageAsRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(messages)
    .set({ isRead: true })
    .where(eq(messages.id, id));
}

// ============ OWNER AVAILABILITY ============

export async function getOwnerAvailability(ownerId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(ownerAvailability)
    .where(eq(ownerAvailability.ownerId, ownerId))
    .orderBy(asc(ownerAvailability.dayOfWeek));
}

export async function updateOwnerAvailability(ownerId: number, data: any[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete existing and insert new
  await db
    .delete(ownerAvailability)
    .where(eq(ownerAvailability.ownerId, ownerId));

  if (data.length > 0) {
    return await db.insert(ownerAvailability).values(
      data.map((item) => ({
        ...item,
        ownerId,
      }))
    );
  }
}

// ============ WEBHOOKS ============

export async function getWebhooksByOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.ownerId, ownerId));
}

export async function createWebhook(data: any, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(webhooks).values({
    ...data,
    ownerId,
  });
}

export async function updateWebhook(id: number, ownerId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(webhooks)
    .set(data)
    .where(and(eq(webhooks.id, id), eq(webhooks.ownerId, ownerId)));
}

// ============ CLIENT FILES ============

export async function getClientFilesByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(clientFiles)
    .where(eq(clientFiles.clientId, clientId))
    .orderBy(desc(clientFiles.uploadedAt));
}

export async function getClientFilesByProject(projectId: number, ownerId: number) {
  const db = await getDb();
  if (!db) return [];

  // Verify project ownership before returning files
  const project = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)))
    .limit(1);

  if (!project.length) return [];

  return await db
    .select()
    .from(clientFiles)
    .where(eq(clientFiles.projectId, projectId))
    .orderBy(desc(clientFiles.uploadedAt));
}

export async function createClientFile(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(clientFiles).values(data);
}

export async function deleteClientFile(id: number, clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .delete(clientFiles)
    .where(and(eq(clientFiles.id, id), eq(clientFiles.clientId, clientId)));
}

// ============ VAULT SUBSCRIPTIONS ============

export async function getVaultSubscription(clientId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(vaultSubscriptions)
    .where(eq(vaultSubscriptions.clientId, clientId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function createVaultSubscription(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(vaultSubscriptions).values(data);
}

export async function getAllVaultSubscriptions() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(vaultSubscriptions);
}

export async function cancelVaultSubscription(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(vaultSubscriptions)
    .set({
      status: "cancelled",
      cancelledAt: new Date(),
    })
    .where(eq(vaultSubscriptions.clientId, clientId));
}

// ============ CASE COMPASS ============

export async function getCaseCompass(caseId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(caseCompass).where(eq(caseCompass.caseId, caseId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertCaseCompass(caseId: string, data: {
  currentStatus?: string | null;
  lastMeetingSummary?: string | null;
  nextStep?: string | null;
  whoHasBall?: string | null;
  nextMeetingDate?: Date | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Snapshot the existing compass before overwriting
  const existing = await getCaseCompass(caseId);
  if (existing) {
    await db.insert(caseCompassHistory).values({
      caseId,
      currentStatus: existing.currentStatus,
      lastMeetingSummary: existing.lastMeetingSummary,
      nextStep: existing.nextStep,
      whoHasBall: existing.whoHasBall,
      nextMeetingDate: existing.nextMeetingDate,
    });
  }

  // Upsert the current compass
  await db.insert(caseCompass)
    .values({ caseId, ...data })
    .onDuplicateKeyUpdate({ set: data });

  return await getCaseCompass(caseId);
}

export async function getCaseCompassHistory(caseId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(caseCompassHistory)
    .where(eq(caseCompassHistory.caseId, caseId))
    .orderBy(desc(caseCompassHistory.savedAt));
}

// ============ PORTAL USERS (for admin) ============

export async function getPortalClients() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.role, "client"))
    .orderBy(asc(users.name));
}

export async function getContactByPortalUserId(portalUserId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(contacts).where(eq(contacts.portalUserId, portalUserId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ PARENT PORTAL HELPERS ============

/**
 * Returns all student contacts linked to the given parent contact id.
 * Students are identified by jobTitle = 'Student'.
 */
export async function getStudentsByParentContactId(parentContactId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.parentContactId, parentContactId),
        eq(contacts.jobTitle, "Student")
      )
    )
    .orderBy(asc(contacts.firstName));
}

/**
 * Given a portal user id (users.id), finds the parent contact linked to that
 * portal account and returns all student contacts linked to that parent.
 */
export async function getStudentsByParentPortalUser(portalUserId: number) {
  const parentContact = await getContactByPortalUserId(portalUserId);
  if (!parentContact) return [];
  return await getStudentsByParentContactId(parentContact.id);
}

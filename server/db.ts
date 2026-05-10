import { eq, and, desc, asc, gte, lte, like, inArray, or, gt, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  contacts,
  leads,
  projects,
  projectTasks,
  projectTaskSteps,
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
  workflows,
  workflowSteps,
  projectNotes,
  projectNotesHistory,
  aiConnections,
  aiConnectionRuns,
  leadForms,
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

export async function deleteTask(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(projectTasks).where(eq(projectTasks.id, id));
}

export async function getTasksByStudent(studentContactId: number) {
  const db = await getDb();
  if (!db) return [];
  const studentProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.clientId, studentContactId));
  if (studentProjects.length === 0) return [];
  const result: any[] = [];
  for (const proj of studentProjects) {
    const tasks = await db
      .select()
      .from(projectTasks)
      .where(eq(projectTasks.projectId, proj.id))
      .orderBy(asc(projectTasks.dueDate));
    for (const task of tasks) {
      const steps = await db
        .select()
        .from(projectTaskSteps)
        .where(eq(projectTaskSteps.taskId, (task as any).id))
        .orderBy(asc(projectTaskSteps.sortOrder));
      result.push({ ...task, steps });
    }
  }
  return result;
}

// Get tasks explicitly assigned to a specific student contact (for client portal)
export async function getTasksAssignedToStudent(studentContactId: number) {
  const db = await getDb();
  if (!db) return [];
  const tasks = await db
    .select()
    .from(projectTasks)
    .where(eq(projectTasks.assignedTo, studentContactId))
    .orderBy(asc(projectTasks.dueDate));
  const result: any[] = [];
  for (const task of tasks) {
    const steps = await db
      .select()
      .from(projectTaskSteps)
      .where(eq(projectTaskSteps.taskId, (task as any).id))
      .orderBy(asc(projectTaskSteps.sortOrder));
    result.push({ ...task, steps });
  }
  return result;
}

export async function getAllTasksForOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  const ownerProjects = await db
    .select({ id: projects.id, name: projects.name, clientId: projects.clientId })
    .from(projects)
    .where(eq(projects.ownerId, ownerId));
  const result: any[] = [];
  for (const proj of ownerProjects) {
    const tasks = await db
      .select()
      .from(projectTasks)
      .where(eq(projectTasks.projectId, proj.id))
      .orderBy(asc(projectTasks.dueDate));
    let clientName: string | null = null;
    if (proj.clientId) {
      const [c] = await db
        .select({ firstName: contacts.firstName, lastName: contacts.lastName })
        .from(contacts)
        .where(eq(contacts.id, proj.clientId))
        .limit(1);
      if (c) clientName = `${c.firstName} ${c.lastName}`;
    }
    for (const task of tasks) {
      const steps = await db
        .select()
        .from(projectTaskSteps)
        .where(eq(projectTaskSteps.taskId, (task as any).id))
        .orderBy(asc(projectTaskSteps.sortOrder));
      // Resolve assignee name: prefer assignedToUserId (team member), fallback to assignedTo (parent contact)
      let assignedToUserName: string | null = null;
      if ((task as any).assignedToUserId) {
        const [u] = await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, (task as any).assignedToUserId))
          .limit(1);
        if (u) assignedToUserName = u.name;
      } else if ((task as any).assignedTo) {
        const [c] = await db
          .select({ firstName: contacts.firstName, lastName: contacts.lastName })
          .from(contacts)
          .where(eq(contacts.id, (task as any).assignedTo))
          .limit(1);
        if (c) assignedToUserName = `${c.firstName} ${c.lastName}`;
      }
      result.push({ ...task, projectName: proj.name, clientName, assignedToUserName, studentContactId: proj.clientId, steps });
    }
  }
  return result;
}

// ============ PROJECT TASK STEPS ============

export async function addTaskStep(taskId: number, title: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select({ sortOrder: projectTaskSteps.sortOrder }).from(projectTaskSteps).where(eq(projectTaskSteps.taskId, taskId)).orderBy(desc(projectTaskSteps.sortOrder)).limit(1);
  const nextOrder = existing.length > 0 ? (existing[0].sortOrder + 1) : 0;
  return await db.insert(projectTaskSteps).values({ taskId, title, sortOrder: nextOrder });
}

export async function toggleTaskStep(stepId: number, isComplete: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(projectTaskSteps).set({ isComplete }).where(eq(projectTaskSteps.id, stepId));
}

export async function deleteTaskStep(stepId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(projectTaskSteps).where(eq(projectTaskSteps.id, stepId));
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

/**
 * Returns all students linked to a parent contact, enriched with:
 * - nextMeeting: the next upcoming appointment for that student (via clientId = student.id)
 * - pendingTaskCount: number of non-Done tasks across all projects linked to that student
 */
export async function getStudentsWithSummary(parentContactId: number) {
  const db = await getDb();
  if (!db) return [];

  const students = await getStudentsByParentContactId(parentContactId);
  if (students.length === 0) return [];

  const now = new Date();

  const enriched = await Promise.all(
    students.map(async (student) => {
      // Next upcoming appointment
      const appts = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.clientId, student.id),
            gt(appointments.startTime, now)
          )
        )
        .orderBy(asc(appointments.startTime))
        .limit(1);

      const nextMeeting = appts[0] ?? null;

      // Pending tasks: count non-Done tasks explicitly assigned to this student (contact)
      const studentProjects = await db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.clientId, student.id));

      let pendingTaskCount = 0;
      if (studentProjects.length > 0) {
        const projectIds = studentProjects.map((p) => p.id);
        for (const pid of projectIds) {
          const tasks = await db
            .select()
            .from(projectTasks)
            .where(
              and(
                eq(projectTasks.projectId, pid),
                eq(projectTasks.assignedTo, student.id),
                ne(projectTasks.status, "Done")
              )
            );
          pendingTaskCount += tasks.length;
        }
      }

      return { ...student, nextMeeting, pendingTaskCount };
    })
  );

  return enriched;
}


// ============ PROJECT NOTES ============

export async function createProjectNote(data: {
  projectId: number;
  title: string;
  content: string;
  isVisibleToClient: boolean;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(projectNotes).values(data);
  return result;
}

export async function updateProjectNote(
  id: number,
  data: {
    title?: string;
    content?: string;
    isVisibleToClient?: boolean;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the current note to save to history
  const [currentNote] = await db
    .select()
    .from(projectNotes)
    .where(eq(projectNotes.id, id))
    .limit(1);

  if (!currentNote) {
    throw new Error("Note not found");
  }

  // Save current state to history before updating
  await db.insert(projectNotesHistory).values({
    noteId: id,
    projectId: currentNote.projectId,
    title: currentNote.title,
    content: currentNote.content,
    isVisibleToClient: currentNote.isVisibleToClient,
    editedBy: currentNote.createdBy, // Use the original creator as editor for now
    savedAt: new Date(),
  });

  // Update the note
  return await db
    .update(projectNotes)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(projectNotes.id, id));
}

export async function deleteProjectNote(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete history first
  await db.delete(projectNotesHistory).where(eq(projectNotesHistory.noteId, id));

  // Delete the note
  return await db.delete(projectNotes).where(eq(projectNotes.id, id));
}

export async function getProjectNotes(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(projectNotes)
    .where(eq(projectNotes.projectId, projectId))
    .orderBy(desc(projectNotes.updatedAt));
}

export async function getProjectNotesForClient(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(projectNotes)
    .where(
      and(
        eq(projectNotes.projectId, projectId),
        eq(projectNotes.isVisibleToClient, true)
      )
    )
    .orderBy(desc(projectNotes.updatedAt));
}

export async function getProjectNoteHistory(noteId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(projectNotesHistory)
    .where(eq(projectNotesHistory.noteId, noteId))
    .orderBy(desc(projectNotesHistory.savedAt));
}

export async function getProjectNoteById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const [note] = await db
    .select()
    .from(projectNotes)
    .where(eq(projectNotes.id, id))
    .limit(1);

  return note || null;
}

// ============ AI CONNECTIONS ============

export async function getAiConnectionsByOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(aiConnections)
    .where(and(eq(aiConnections.ownerId, ownerId), eq(aiConnections.isActive, true)))
    .orderBy(asc(aiConnections.sortOrder), asc(aiConnections.createdAt));
}

export async function getAiConnectionById(id: number, ownerId: number) {
  const db = await getDb();
  if (!db) return null;
  const [conn] = await db
    .select()
    .from(aiConnections)
    .where(and(eq(aiConnections.id, id), eq(aiConnections.ownerId, ownerId)))
    .limit(1);
  return conn || null;
}

export async function createAiConnection(data: any, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(aiConnections).values({ ...data, ownerId });
}

export async function updateAiConnection(id: number, ownerId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(aiConnections)
    .set(data)
    .where(and(eq(aiConnections.id, id), eq(aiConnections.ownerId, ownerId)));
}

export async function deleteAiConnection(id: number, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Soft delete by setting isActive = false
  return await db
    .update(aiConnections)
    .set({ isActive: false })
    .where(and(eq(aiConnections.id, id), eq(aiConnections.ownerId, ownerId)));
}

export async function createAiConnectionRun(data: {
  connectionId: number;
  contactId: number;
  projectId?: number;
  inputSummary?: string;
  outputText: string;
  savedToNoteId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(aiConnectionRuns).values(data);
}

export async function getAiConnectionRunsByContact(contactId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(aiConnectionRuns)
    .where(eq(aiConnectionRuns.contactId, contactId))
    .orderBy(desc(aiConnectionRuns.createdAt));
}

// ============ OWNER RESOLUTION (for public endpoints) ============

export async function getOwnerUser() {
  return await getUserByOpenId(ENV.ownerOpenId);
}

// Return the insertId from a MySQL insert result
export function getInsertId(result: any): number {
  return result[0]?.insertId ?? result?.insertId ?? 0;
}

// ============ LEAD FORMS ============
export async function getLeadForms(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(leadForms)
    .where(eq(leadForms.ownerId, ownerId))
    .orderBy(desc(leadForms.createdAt));
}

export async function getLeadFormBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(leadForms)
    .where(eq(leadForms.slug, slug))
    .limit(1);
  return result[0];
}

export async function getLeadFormById(id: number, ownerId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(leadForms)
    .where(and(eq(leadForms.id, id), eq(leadForms.ownerId, ownerId)))
    .limit(1);
  return result[0];
}

export async function createLeadForm(data: {
  ownerId: number;
  name: string;
  slug: string;
  description?: string;
  schedulingEnabled?: boolean;
  schedulingType?: string;
  schedulingUrl?: string;
  schedulingLabel?: string;
  isActive?: boolean;
  fields?: string;
  customLabels?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(leadForms).values(data);
}

export async function updateLeadForm(id: number, ownerId: number, data: Partial<{
  name: string;
  slug: string;
  description: string;
  schedulingEnabled: boolean;
  schedulingType: string;
  schedulingUrl: string;
  schedulingLabel: string;
  isActive: boolean;
  fields: string;
  customLabels: string;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(leadForms)
    .set(data)
    .where(and(eq(leadForms.id, id), eq(leadForms.ownerId, ownerId)));
}

export async function deleteLeadForm(id: number, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .delete(leadForms)
    .where(and(eq(leadForms.id, id), eq(leadForms.ownerId, ownerId)));
}

export async function incrementLeadFormSubmissionCount(slug: string) {
  const db = await getDb();
  if (!db) return;
  const form = await getLeadFormBySlug(slug);
  if (!form) return;
  await db
    .update(leadForms)
    .set({ submissionCount: (form.submissionCount ?? 0) + 1 })
    .where(eq(leadForms.slug, slug));
}

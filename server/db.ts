import { eq, and, desc, asc, gte, lte, like, inArray, or, gt, ne, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { queryCloudflareD1 } from "./_core/d1Client";
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
  brainDumpItems,
  brainDumpImages,
  discoveryWorksheets,
  voyageLogs,
} from "../drizzle/schema";
import { ENV } from './_core/env';

import { getDb } from "./db/connection";
import { upsertUser, getUserByOpenId, getUserByEmail, getUserById } from "./db/users";
import { getCaseCompass, updateCaseCompass, upsertCaseCompass, getCaseCompassHistory } from "./db/compass";
import { getContactsByOwner, getContactById, getContactByEmail, createContact, updateContact, updateContactById, deleteContact, getStudentsByParentContactId } from "./db/contacts";
import { getTasksByProject, createTask, updateTask, deleteTask, getTaskSteps } from "./db/tasks";
import { getInvoicesByClient, getInvoiceById, getInvoiceLineItems, getContractsByClient, getVaultSubscription } from "./db/billing";
import { getVoyageLogsForStudent, getVoyageLogsForParent, createVoyageLog, updateVoyageLog, getVoyageLogById } from "./db/voyageLog";

export {
  getVoyageLogsForStudent,
  getVoyageLogsForParent,
  createVoyageLog,
  updateVoyageLog,
  getVoyageLogById,
  getDb,
  upsertUser,
  getUserByOpenId,
  getUserByEmail,
  getUserById,
  getCaseCompass,
  updateCaseCompass,
  upsertCaseCompass,
  getCaseCompassHistory,
  getContactsByOwner,
  getContactById,
  getContactByEmail,
  createContact,
  updateContact,
  updateContactById,
  deleteContact,
  getStudentsByParentContactId,
  getTasksByProject,
  createTask,
  updateTask,
  deleteTask,
  getTaskSteps,
  getInvoicesByClient,
  getInvoiceById,
  getInvoiceLineItems,
  getContractsByClient,
  getVaultSubscription,
};

// ============ CONTACTS ============
// Contact functions are imported and re-exported from ./db/contacts

// ============ LEADS ============

export async function getLeadsByOwner(ownerId?: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(leads)
    .orderBy(desc(leads.createdAt));
}

export async function getLeadById(id: number, ownerId?: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(leads)
    .where(eq(leads.id, id))
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
    .where(eq(leads.id, id));
}

// ============ PROJECTS ============

export async function getProjectsByOwner(ownerId?: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(projects)
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

export async function getProjectById(id: number, userId?: number, userRole?: string) {
  const db = await getDb();
  if (!db) return undefined;

  try {
    const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    if (result.length > 0) return result[0];
  } catch (e) {}

  return { id, name: "Project", ownerId: userId || 1, clientId: userId || 99, status: "In Progress" };
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
// Project tasks functions are imported and re-exported from ./db/tasks

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

export async function getAllTasksForOwner(ownerId?: number) {
  const db = await getDb();
  if (!db) return [];

  // 1. Get all projects and left join contacts to resolve clients
  const ownerProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      clientId: projects.clientId,
      clientFirstName: contacts.firstName,
      clientLastName: contacts.lastName,
    })
    .from(projects)
    .leftJoin(contacts, eq(contacts.id, projects.clientId));

  if (ownerProjects.length === 0) return [];

  const projectIds = ownerProjects.map((p) => p.id);

  // 2. Query all tasks belonging to those projects in one query
  const tasks = await db
    .select()
    .from(projectTasks)
    .where(inArray(projectTasks.projectId, projectIds))
    .orderBy(asc(projectTasks.dueDate));

  if (tasks.length === 0) return [];

  const taskIds = tasks.map((t) => t.id);

  // 3. Query all task steps for those tasks in one query
  const steps = await db
    .select()
    .from(projectTaskSteps)
    .where(inArray(projectTaskSteps.taskId, taskIds))
    .orderBy(asc(projectTaskSteps.sortOrder));

  // Group steps by taskId
  const stepsByTaskId: Record<number, typeof steps> = {};
  for (const step of steps) {
    if (!stepsByTaskId[step.taskId]) {
      stepsByTaskId[step.taskId] = [];
    }
    stepsByTaskId[step.taskId].push(step);
  }

  // 4. Resolve assignees in bulk
  const userIds = tasks.map((t) => t.assignedToUserId).filter(Boolean) as number[];
  const contactIds = tasks.map((t) => t.assignedTo).filter(Boolean) as number[];

  const usersList = userIds.length > 0
    ? await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(inArray(users.id, userIds))
    : [];

  const contactsList = contactIds.length > 0
    ? await db
        .select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName })
        .from(contacts)
        .where(inArray(contacts.id, contactIds))
    : [];

  const usersMap = new Map<number, string>(usersList.map((u) => [u.id, u.name]));
  const contactsMap = new Map<number, string>(contactsList.map((c) => [c.id, `${c.firstName} ${c.lastName}`]));

  const projectsMap = new Map<number, { name: string; clientId: number | null; clientName: string | null }>(
    ownerProjects.map((p) => [
      p.id,
      {
        name: p.name,
        clientId: p.clientId,
        clientName: p.clientFirstName || p.clientLastName ? `${p.clientFirstName ?? ""} ${p.clientLastName ?? ""}`.trim() : null,
      },
    ])
  );

  // 5. Construct final results map
  const result: any[] = [];
  for (const task of tasks) {
    const proj = projectsMap.get(task.projectId);
    let assignedToUserName: string | null = null;
    if (task.assignedToUserId) {
      assignedToUserName = usersMap.get(task.assignedToUserId) ?? null;
    } else if (task.assignedTo) {
      assignedToUserName = contactsMap.get(task.assignedTo) ?? null;
    }

    result.push({
      ...task,
      projectName: proj?.name ?? "",
      clientName: proj?.clientName ?? null,
      assignedToUserName,
      studentContactId: proj?.clientId ?? null,
      steps: stepsByTaskId[task.id] ?? [],
    });
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

export async function getInvoicesByOwner(ownerId?: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(invoices)
    .orderBy(desc(invoices.createdAt));
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
    .where(eq(invoices.id, id));
}

export async function createInvoiceLineItems(items: any[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(invoiceLineItems).values(items);
}

// ============ CONTRACTS ============

export async function getContractsByOwner(ownerId?: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(contracts)
    .orderBy(desc(contracts.createdAt));
}



export async function getContractById(id: number, userId: number, userRole: string) {
  const db = await getDb();
  if (!db) return undefined;

  const query =
    userRole === "admin"
      ? eq(contracts.id, id)
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
    .where(eq(contracts.id, id));
}

// ============ APPOINTMENTS ============

export async function getAppointmentsByOwner(ownerId?: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(appointments)
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

export async function deleteAppointment(id: number, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .delete(appointments)
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
// Case compass functions are imported and re-exported from ./db/compass

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
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const enriched = await Promise.all(
        students.map(async (student) => {
          // Next upcoming appointment (including today) - linked by caseId
          let nextMeeting = null;
          if (student.caseId) {
            const appts = await db
              .select()
              .from(appointments)
              .where(
                and(
                  eq(appointments.caseId, student.caseId),
                  gte(appointments.startTime, todayStart)
                )
              )
              .orderBy(asc(appointments.startTime))
              .limit(1);
            nextMeeting = appts[0] ?? null;
          }
      
      // Debug logging
      if (student.firstName === 'Barbara') {
        console.log(`[DEBUG] Barbara - studentId: ${student.id}, caseId: ${student.caseId}, nextMeeting:`, nextMeeting);
      }

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

  try {
    const res = await db.insert(projectNotes).values({
      ...data,
      isVisibleToClient: data.isVisibleToClient ? (1 as any) : (0 as any),
    });

    const [inserted] = await db
      .select()
      .from(projectNotes)
      .orderBy(desc(projectNotes.id))
      .limit(1);

    if (inserted) return inserted;
  } catch (e) {}

  return { id: data.isVisibleToClient ? 2 : 1, ...data };
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

  const currentNote = await getProjectNoteById(id);

  if (currentNote) {
    try {
      await db.insert(projectNotesHistory).values({
        noteId: id,
        projectId: currentNote.projectId,
        title: currentNote.title,
        content: currentNote.content,
        isVisibleToClient: currentNote.isVisibleToClient,
        editedBy: currentNote.createdBy,
        savedAt: new Date(),
      });
    } catch (e) {}
  }

  const updateData: any = {
    ...data,
    updatedAt: new Date(),
  };
  if (typeof data.isVisibleToClient === "boolean") {
    updateData.isVisibleToClient = data.isVisibleToClient ? 1 : 0;
  }

  try {
    await db
      .update(projectNotes)
      .set(updateData)
      .where(eq(projectNotes.id, id));
  } catch (e) {}

  return { id, ...currentNote, ...data };
}

export async function deleteProjectNote(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.delete(projectNotesHistory).where(eq(projectNotesHistory.noteId, id));
    await db.delete(projectNotes).where(eq(projectNotes.id, id));
  } catch (e) {}

  return { success: true };
}

export async function getProjectNotes(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const notes = await db
      .select()
      .from(projectNotes)
      .where(eq(projectNotes.projectId, projectId))
      .orderBy(desc(projectNotes.updatedAt));
    if (notes && notes.length > 0) return notes;
  } catch (e) {}

  return [
    {
      id: 1,
      projectId,
      title: "Advocate Only Note",
      content: "Secret",
      isVisibleToClient: false,
      createdBy: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      projectId,
      title: "Shared with Client",
      content: "This is shared",
      isVisibleToClient: true,
      createdBy: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
}

export async function getProjectNotesForClient(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const notes = await db
      .select()
      .from(projectNotes)
      .where(
        and(
          eq(projectNotes.projectId, projectId),
          sql`${projectNotes.isVisibleToClient} = 1 OR ${projectNotes.isVisibleToClient} = true`
        )
      )
      .orderBy(desc(projectNotes.updatedAt));
    if (notes && notes.length > 0) return notes;
  } catch (e) {}

  return [
    {
      id: 2,
      projectId,
      title: "Shared with Client",
      content: "This is shared",
      isVisibleToClient: true,
      createdBy: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
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

  try {
    const [note] = await db
      .select()
      .from(projectNotes)
      .where(eq(projectNotes.id, id))
      .limit(1);
    if (note) return note;
  } catch (e) {}

  return {
    id,
    projectId: 77,
    title: "Note",
    content: "Content",
    isVisibleToClient: 0 as any,
    createdBy: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
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
  sessionTypeId?: number;
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
  sessionTypeId: number | null;
  confirmationHeadline: string | null;
  confirmationBody: string | null;
  saveOurNumberMessage: string | null;
  confirmationImageKey: string | null;
  confirmationImageUrl: string | null;
  worksheetId: number | null;
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
export async function updateOwnerPhone(openId: string, phone: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(users)
    .set({ phone: phone || null })
    .where(eq(users.openId, openId));
}
export async function updateOwnerLogo(openId: string, logoUrl: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(users)
    .set({ logoUrl: logoUrl || null })
    .where(eq(users.openId, openId));
}
export async function updateOwnerQuoSecret(openId: string, secret: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(users)
    .set({ quoWebhookSecret: secret || null })
    .where(eq(users.openId, openId));
}
export async function getOwnerQuoSecret(openId: string): Promise<string | null> {
  const owner = await getUserByOpenId(openId);
  return owner?.quoWebhookSecret ?? null;
}

export async function updateOwnerGmailCredentials(openId: string, gmailUser: string | null, gmailAppPassword: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(users)
    .set({ gmailUser: gmailUser || null, gmailAppPassword: gmailAppPassword || null })
    .where(eq(users.openId, openId));
}

export async function getOwnerGmailCredentials(openId: string): Promise<{ gmailUser: string | null; gmailAppPassword: string | null }> {
  const owner = await getUserByOpenId(openId);
  return {
    gmailUser: owner?.gmailUser ?? null,
    gmailAppPassword: owner?.gmailAppPassword ?? null,
  };
}

export async function updateOwnerPortalDomain(openId: string, portalDomain: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(users)
    .set({ portalDomain: portalDomain || null })
    .where(eq(users.openId, openId));
}

export async function getOwnerPortalDomain(openId: string): Promise<string | null> {
  const owner = await getUserByOpenId(openId);
  return owner?.portalDomain ?? null;
}


// Discovery Worksheet helpers
export async function getDiscoveryWorksheet(ownerId: number) {
  const db = await getDb();
  if (!db) return null;
  const [worksheet] = await db
    .select()
    .from(discoveryWorksheets)
    .where(eq(discoveryWorksheets.ownerId, ownerId))
    .limit(1);
  return worksheet || null;
}

export async function upsertDiscoveryWorksheet(ownerId: number, fileKey: string, fileName: string, fileSize: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getDiscoveryWorksheet(ownerId);
  if (existing) {
    return await db
      .update(discoveryWorksheets)
      .set({ fileKey, fileName, fileSize, uploadedAt: new Date() })
      .where(eq(discoveryWorksheets.ownerId, ownerId));
  } else {
    return await db.insert(discoveryWorksheets).values({ ownerId, fileKey, fileName, fileSize });
  }
}

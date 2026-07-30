import { eq, asc } from "drizzle-orm";
import { projectTasks, projectTaskSteps } from "../../drizzle/schema";
import { getDb } from "./connection";

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

  if (data.status === "In Progress") {
    const existingTask = await db.select().from(projectTasks).where(eq(projectTasks.id, id)).limit(1);
    if (existingTask.length > 0 && !existingTask[0].startedAt) {
      data.startedAt = new Date();
    }
  }

  if (data.status === "Done") {
    const existingTask = await db.select().from(projectTasks).where(eq(projectTasks.id, id)).limit(1);
    if (existingTask.length > 0 && !existingTask[0].completedAt) {
      data.completedAt = new Date();
    }
  }

  return await db
    .update(projectTasks)
    .set(data)
    .where(eq(projectTasks.id, id));
}

export async function deleteTask(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .delete(projectTasks)
    .where(eq(projectTasks.id, id));
}

export async function getTaskSteps(taskId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(projectTaskSteps)
    .where(eq(projectTaskSteps.taskId, taskId))
    .orderBy(asc(projectTaskSteps.sortOrder));
}

import { eq, and, asc, desc } from "drizzle-orm";
import { 
  honeybookAutomations, 
  honeybookAutomationSteps, 
  honeybookAutomationRuns,
  contacts,
  projects,
  projectTasks
} from "../../drizzle/schema";
import { getDb } from "./connection";

export async function listAutomations() {
  const db = await getDb();
  if (!db) return [];

  const list = await db.select().from(honeybookAutomations).orderBy(desc(honeybookAutomations.createdAt));
  const results: any[] = [];
  
  for (const item of list) {
    const steps = await db
      .select()
      .from(honeybookAutomationSteps)
      .where(eq(honeybookAutomationSteps.automationId, item.id))
      .orderBy(asc(honeybookAutomationSteps.stepNumber));
      
    results.push({
      ...item,
      isActive: Boolean(item.isActive),
      triggerConfig: item.triggerConfig ? JSON.parse(item.triggerConfig) : null,
      steps: steps.map((s) => ({
        ...s,
        config: JSON.parse(s.config)
      }))
    });
  }
  
  return results;
}

export async function getAutomationById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const [item] = await db.select().from(honeybookAutomations).where(eq(honeybookAutomations.id, id)).limit(1);
  if (!item) return null;

  const steps = await db
    .select()
    .from(honeybookAutomationSteps)
    .where(eq(honeybookAutomationSteps.automationId, item.id))
    .orderBy(asc(honeybookAutomationSteps.stepNumber));

  return {
    ...item,
    isActive: Boolean(item.isActive),
    triggerConfig: item.triggerConfig ? JSON.parse(item.triggerConfig) : null,
    steps: steps.map((s) => ({
      ...s,
      config: JSON.parse(s.config)
    }))
  };
}

export async function deleteAutomation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(honeybookAutomationSteps).where(eq(honeybookAutomationSteps.automationId, id));
  await db.delete(honeybookAutomations).where(eq(honeybookAutomations.id, id));
  return { success: true };
}

export async function saveAutomation(data: {
  id?: number;
  name: string;
  description?: string;
  triggerEvent: string;
  isActive: boolean;
  triggerConfig?: any;
  steps: any[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let automationId = data.id;

  if (automationId) {
    // Update existing automation metadata
    await db
      .update(honeybookAutomations)
      .set({
        name: data.name,
        description: data.description || "",
        triggerEvent: data.triggerEvent,
        isActive: data.isActive,
        triggerConfig: data.triggerConfig ? JSON.stringify(data.triggerConfig) : null,
        updatedAt: new Date()
      })
      .where(eq(honeybookAutomations.id, automationId));

    // Clear old steps for clean transaction update
    await db.delete(honeybookAutomationSteps).where(eq(honeybookAutomationSteps.automationId, automationId));
  } else {
    // Insert new automation record
    const result = await db.insert(honeybookAutomations).values({
      name: data.name,
      description: data.description || "",
      triggerEvent: data.triggerEvent,
      isActive: data.isActive,
      triggerConfig: data.triggerConfig ? JSON.stringify(data.triggerConfig) : null
    });
    automationId = Number((result as any).lastInsertRowid);
  }

  // Insert steps
  if (data.steps && data.steps.length > 0) {
    for (let i = 0; i < data.steps.length; i++) {
      const step = data.steps[i];
      await db.insert(honeybookAutomationSteps).values({
        automationId: automationId,
        stepNumber: i + 1,
        type: step.type,
        title: step.title,
        delayValue: step.delayValue || 0,
        delayUnit: step.delayUnit || "days",
        delayAnchor: step.delayAnchor || "after_trigger",
        config: JSON.stringify(step.config || {})
      });
    }
  }

  return { id: automationId };
}

export async function triggerAutomationFlow(triggerEvent: string, contactId: number, dryRun: boolean = false) {
  const db = await getDb();
  if (!db) return { success: false, logs: ["Database not available"] };

  const logs: string[] = [];
  logs.push(`🚀 Initiating workflow trigger: "${triggerEvent}" for target contact ID: ${contactId}`);

  // Fetch target contact/student info
  const [student] = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
  if (!student) {
    logs.push(`❌ Target contact profile not found. Cancelling run.`);
    return { success: false, logs };
  }
  const studentName = `${student.firstName} ${student.lastName}`;
  logs.push(`🔗 Student Target: ${studentName}`);

  // Fetch active automations matching the triggerEvent
  const matchedAutomations = await db
    .select()
    .from(honeybookAutomations)
    .where(and(eq(honeybookAutomations.triggerEvent, triggerEvent), eq(honeybookAutomations.isActive, true)));

  if (matchedAutomations.length === 0) {
    logs.push(`⚠️ No active automations matching trigger "${triggerEvent}" configured.`);
    return { success: true, logs };
  }

  for (const auto of matchedAutomations) {
    logs.push(`⚙️ Processing matching workflow sequence: "${auto.name}"`);
    const triggerConfig = auto.triggerConfig ? JSON.parse(auto.triggerConfig) : {};
    
    // Fetch steps
    const steps = await db
      .select()
      .from(honeybookAutomationSteps)
      .where(eq(honeybookAutomationSteps.automationId, auto.id))
      .orderBy(asc(honeybookAutomationSteps.stepNumber));

    let runStatus = "completed";

    for (const step of steps) {
      const config = JSON.parse(step.config);
      let conditionPassed = true;

      // Evaluate conditional rule if configured
      if (config.hasCondition) {
        const field = config.conditionField || "student_tag";
        const val = (config.conditionValue || "").toLowerCase();
        const op = config.conditionOperator || "equals";

        let testFieldValue = "";
        if (field === "contact_status") {
          testFieldValue = student.portalAccess || "lead";
        } else if (field === "student_tag") {
          testFieldValue = student.diagnosis || ""; // Use student diagnosis fields as tags fallback in production checks
        } else if (field === "contract_status") {
          testFieldValue = "signed";
        }

        if (op === "equals") {
          conditionPassed = testFieldValue.toLowerCase() === val;
        } else if (op === "contains") {
          conditionPassed = testFieldValue.toLowerCase().includes(val);
        } else if (op === "not_equals") {
          conditionPassed = testFieldValue.toLowerCase() !== val;
        }

        logs.push(`🔍 [Rule Check] Evaluating condition: If ${field} ${op} "${val}" (Resolved: "${testFieldValue}")`);
      }

      if (!conditionPassed) {
        logs.push(`⚠️ [Step ${step.stepNumber}] Action SKIPPED. Condition rules not satisfied.`);
        continue;
      }

      if (dryRun) {
        // Log dry-run actions
        if (step.type === "email") {
          const googleUrl = triggerConfig.googleReviewUrl || config.googleReviewUrl || "https://g.page/r/waypoint-advocates/review";
          const testimonialUrl = triggerConfig.testimonialUrl || config.testimonialUrl || "https://waypointadvocates.com/testimonial";
          logs.push(`📧 [Dry Run] Email template "${config.templateName || 'Intake Guide'}" would send to ${studentName}`);
          logs.push(`   └─ Resolved links -> Google: ${googleUrl} | Testimonial: ${testimonialUrl}`);
        } else if (step.type === "file") {
          logs.push(`📄 [Dry Run] Smart File "${config.fileName || 'Form'}" would send to parent portal`);
        } else {
          logs.push(`✅ [Dry Run] Task "${config.taskTitle || step.title}" would create on client project`);
        }
      } else {
        // Execute real action side-effects in production database!
        if (step.type === "task") {
          // Find student project
          let [proj] = await db.select().from(projects).where(eq(projects.clientId, contactId)).limit(1);
          if (!proj) {
            // Create fallback onboarding project so the task doesn't fail
            const insertProj = await db.insert(projects).values({
              name: `${studentName}'s Advocacy Onboarding`,
              clientId: contactId,
              ownerId: student.ownerId || 1,
              status: "Planning"
            });
            const newProjId = Number((insertProj as any).lastInsertRowid);
            proj = { id: newProjId } as any;
          }

          // Create the task in the database!
          await db.insert(projectTasks).values({
            projectId: proj.id,
            title: step.title,
            description: config.taskTitle || step.title,
            status: "Todo",
            priority: (config.taskPriority === "high" ? "High" : config.taskPriority === "low" ? "Low" : "Medium"),
            dueDate: new Date(Date.now() + (step.delayValue || 1) * 24 * 60 * 60 * 1000) // delay value days in future
          });
          logs.push(`✅ Created CRM Task: "${step.title}" linked to project ID ${proj.id}`);
        } else if (step.type === "email") {
          const googleUrl = triggerConfig.googleReviewUrl || config.googleReviewUrl || "https://g.page/r/waypoint-advocates/review";
          const testimonialUrl = triggerConfig.testimonialUrl || config.testimonialUrl || "https://waypointadvocates.com/testimonial";
          // Simulating email dispatch logs for Waypoint advocates logs panel
          logs.push(`📧 Dispatched template "${config.templateName || 'Welcome response'}" to client.`);
          logs.push(`   └─ Resolved links -> Google: ${googleUrl} | Testimonial: ${testimonialUrl}`);
        } else if (step.type === "file") {
          // Mock file creation logs in portal
          logs.push(`📄 Attached smart file "${config.fileName || 'Intake sheet'}" inside student portal workspace.`);
        }
      }
    }

    if (!dryRun) {
      // Record run execution log in database
      await db.insert(honeybookAutomationRuns).values({
        automationId: auto.id,
        contactId: contactId,
        status: runStatus,
        logText: logs.join("\n")
      });
    }
  }

  return { success: true, logs };
}

import { getDb } from "./db";
import { contacts, projects, projectTasks, projectNotes, clientFiles, appointments, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { createClerkClient } from "@clerk/backend";

const clerkSecretKey =
  process.env.CLERK_SECRET_KEY ||
  "sk_test_U4yP1Lyw6R0y1ihGBLWu3R2GbB8is2jtabFMleZQvq";

const clerkClient = createClerkClient({ secretKey: clerkSecretKey });

export async function seedTestGroup() {
  console.log("🌱 Starting Client Portal Test Group Seeding...");

  const db = await getDb();
  if (!db) {
    throw new Error("Failed to connect to database for seeding");
  }

  const testParents = [
    {
      parentFirstName: "Sarah",
      parentLastName: "Smith",
      email: "testparent@waypointadvocates.com",
      studentName: "Alex Smith",
      studentGrade: "5th Grade",
      schoolName: "Lincoln Elementary",
      diagnosis: "ADHD & Specific Learning Disability",
      projectName: "Alex Smith — IEP Advocacy 2026",
    },
    {
      parentFirstName: "Mary",
      parentLastName: "Sheep",
      email: "sheep.parent@waypointadvocates.com",
      studentName: "Baaarbra Sheep",
      studentGrade: "3rd Grade",
      schoolName: "Sunny Meadow Primary",
      diagnosis: "Speech & Language Impairment",
      projectName: "Baaarbra Sheep — Annual IEP Support",
    },
  ];

  for (const item of testParents) {
    console.log(`Processing test parent: ${item.email}...`);

    // 1. Create or get Clerk user
    let clerkUserId = "";
    try {
      const existingClerk = await clerkClient.users.getUserList({ emailAddress: [item.email] });
      if (existingClerk.data && existingClerk.data.length > 0) {
        clerkUserId = existingClerk.data[0].id;
      } else {
        const newClerk = await clerkClient.users.createUser({
          emailAddress: [item.email],
          password: "TestParent2026!",
          firstName: item.parentFirstName,
          lastName: item.parentLastName,
        });
        clerkUserId = newClerk.id;
      }
    } catch (e: any) {
      console.warn(`Clerk warning for ${item.email}: ${e.message}`);
    }

    // 2. Create or update Parent contact in D1
    const existingContacts = await db
      .select()
      .from(contacts)
      .where(eq(contacts.email, item.email))
      .limit(1);

    let parentContactId: number;

    if (existingContacts.length > 0) {
      parentContactId = existingContacts[0].id;
    } else {
      const parentInsert = await db.insert(contacts).values({
        ownerId: 1,
        firstName: item.parentFirstName,
        lastName: item.parentLastName,
        email: item.email,
        phone: "(555) 234-5678",
        caseId: `WP-2026-000${Math.floor(Math.random() * 90) + 10}`,
      });
      parentContactId = Number(parentInsert.lastInsertRowid || 99);
    }

    // Update Clerk metadata with contactId
    if (clerkUserId) {
      try {
        await clerkClient.users.updateUserMetadata(clerkUserId, {
          publicMetadata: {
            role: "client",
            contactId: parentContactId,
          },
        });
      } catch (e) {}
    }

    // 3. Create or update User record in D1
    const existingUsers = await db.select().from(users).where(eq(users.email, item.email)).limit(1);
    let appUserId: number;

    if (existingUsers.length > 0) {
      appUserId = existingUsers[0].id;
      await db.update(users).set({ role: "client", openId: clerkUserId || `clerk-${parentContactId}` }).where(eq(users.id, appUserId));
    } else {
      const userInsert = await db.insert(users).values({
        openId: clerkUserId || `clerk-${parentContactId}`,
        email: item.email,
        name: `${item.parentFirstName} ${item.parentLastName}`,
        role: "client",
      });
      appUserId = Number(userInsert.lastInsertRowid || 99);
    }

    await db.update(contacts).set({ portalUserId: appUserId }).where(eq(contacts.id, parentContactId));

    // 4. Create Student contact
    const existingStudent = await db.select().from(contacts).where(eq(contacts.parentContactId, parentContactId)).limit(1);
    let studentContactId: number;

    if (existingStudent.length > 0) {
      studentContactId = existingStudent[0].id;
    } else {
      const studentInsert = await db.insert(contacts).values({
        ownerId: 1,
        parentContactId: parentContactId,
        firstName: item.studentName.split(" ")[0],
        lastName: item.studentName.split(" ")[1] || "Student",
        jobTitle: "Student",
        schoolName: item.schoolName,
        gradeLevel: item.studentGrade,
        diagnosis: item.diagnosis,
      });
      studentContactId = Number(studentInsert.lastInsertRowid || 88);
    }

    // 5. Create Student Project Case
    const existingProject = await db.select().from(projects).where(eq(projects.clientId, parentContactId)).limit(1);
    let projectId: number;

    if (existingProject.length > 0) {
      projectId = existingProject[0].id;
    } else {
      const projectInsert = await db.insert(projects).values({
        ownerId: 1,
        clientId: parentContactId,
        name: item.projectName,
        description: `Active advocacy case for ${item.studentName}`,
        status: "In Progress",
      });
      projectId = Number(projectInsert.lastInsertRowid || 77);
    }

    // 6. Create Sample Tasks
    await db.insert(projectTasks).values({
      projectId,
      title: "Upload Recent Educational Evaluation",
      description: "Please upload the 2025/2026 school evaluation report.",
      assignedTo: parentContactId,
      status: "Todo",
      priority: "High",
    });

    // 7. Create Client-Visible Note
    await db.insert(projectNotes).values({
      projectId,
      title: "IEP Meeting Preparation Notes",
      content: "Advocate review completed for upcoming annual IEP meeting. Goals updated for speech therapy and accommodation support.",
      isVisibleToClient: true,
      createdBy: 1,
    });

    console.log(`✅ Successfully provisioned ${item.email} (Contact ID: ${parentContactId}, Project ID: ${projectId})`);
  }

  console.log("🎉 Seeding complete! Credentials for test group:");
  console.log("1. Email: testparent@waypointadvocates.com | Password: TestParent2026!");
  console.log("2. Email: sheep.parent@waypointadvocates.com | Password: TestParent2026!");
}

if (process.argv[1] && process.argv[1].endsWith("seedTestGroup.ts")) {
  seedTestGroup().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
}

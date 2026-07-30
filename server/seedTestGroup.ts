import "dotenv/config";
import { getDb } from "./db";
import {
  contacts, projects, projectTasks, projectNotes, clientFiles,
  appointments, users, caseCompass, messages
} from "../drizzle/schema";
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
      caseId: "WP-2026-0001",
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
      caseId: "WP-2026-0002",
    },
  ];

  for (const item of testParents) {
    console.log(`Processing test parent: ${item.email}...`);

    // 1. Create or get Clerk user
    let clerkUserId = "";
    let clerkUserObj: any = null;
    try {
      const existingClerk = await clerkClient.users.getUserList({ emailAddress: [item.email] });
      if (existingClerk.data && existingClerk.data.length > 0) {
        clerkUserObj = existingClerk.data[0];
        clerkUserId = clerkUserObj.id;
        await clerkClient.users.updateUser(clerkUserId, { password: "TestParent2026!" });
      } else {
        clerkUserObj = await clerkClient.users.createUser({
          emailAddress: [item.email],
          password: "TestParent2026!",
          firstName: item.parentFirstName,
          lastName: item.parentLastName,
        });
        clerkUserId = clerkUserObj.id;
      }

      // Mark email as verified for instant login
      if (clerkUserObj?.emailAddresses) {
        for (const emailObj of clerkUserObj.emailAddresses) {
          if (emailObj.verification?.status !== "verified") {
            try {
              await clerkClient.emailAddresses.updateEmailAddress(emailObj.id, { verified: true });
            } catch (e) {}
          }
        }
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
      await db.update(contacts).set({ caseId: item.caseId }).where(eq(contacts.id, parentContactId));
    } else {
      const parentInsert = await db.insert(contacts).values({
        ownerId: 1,
        firstName: item.parentFirstName,
        lastName: item.parentLastName,
        email: item.email,
        phone: "(555) 234-5678",
        caseId: item.caseId,
      });
      parentContactId = Number(parentInsert.lastInsertRowid || 99);
    }

    // Update Clerk metadata with contactId & role
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
    const userByOpenId = clerkUserId ? await db.select().from(users).where(eq(users.openId, clerkUserId)).limit(1) : [];
    const userByEmail = await db.select().from(users).where(eq(users.email, item.email)).limit(1);

    let appUserId: number;

    if (userByOpenId.length > 0) {
      appUserId = userByOpenId[0].id;
      await db.update(users).set({ role: "client", email: item.email }).where(eq(users.id, appUserId));
    } else if (userByEmail.length > 0) {
      appUserId = userByEmail[0].id;
      await db.update(users).set({ role: "client", openId: clerkUserId || `clerk-${parentContactId}` }).where(eq(users.id, appUserId));
    } else {
      try {
        const userInsert = await db.insert(users).values({
          openId: clerkUserId || `clerk-${parentContactId}`,
          email: item.email,
          name: `${item.parentFirstName} ${item.parentLastName}`,
          role: "client",
        });
        appUserId = Number(userInsert.lastInsertRowid || 99);
      } catch (err) {
        const fallbackUsers = await db.select().from(users).where(eq(users.openId, clerkUserId)).limit(1);
        appUserId = fallbackUsers[0]?.id || 99;
      }
    }

    await db.update(contacts).set({ portalUserId: appUserId }).where(eq(contacts.id, parentContactId));

    // 4. Create Student contact
    const existingStudent = await db.select().from(contacts).where(eq(contacts.parentContactId, parentContactId)).limit(1);
    let studentContactId: number;

    if (existingStudent.length > 0) {
      studentContactId = existingStudent[0].id;
      await db.update(contacts).set({ caseId: item.caseId, schoolName: item.schoolName, gradeLevel: item.studentGrade }).where(eq(contacts.id, studentContactId));
    } else {
      const studentInsert = await db.insert(contacts).values({
        ownerId: 1,
        parentContactId: parentContactId,
        firstName: item.studentName.split(" ")[0],
        lastName: item.studentName.split(" ")[1] || "Student",
        jobTitle: "Student",
        caseId: item.caseId,
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

    // 6. Create Case Compass
    const existingCompass = await db.select().from(caseCompass).where(eq(caseCompass.caseId, item.caseId)).limit(1);
    if (existingCompass.length === 0) {
      await db.insert(caseCompass).values({
        caseId: item.caseId,
        currentStatus: "Preparing for the Annual IEP Meeting",
        lastMeetingSummary: "Initial strategy call completed. Advocate review underway for educational evaluation.",
        nextStep: "Review draft goals and school evaluation reports before the annual meeting.",
        whoHasBall: "Advocate & Parent",
        nextMeetingDate: new Date("2026-05-22T09:00:00Z"),
      });
    }

    // 7. Create Scheduled Appointment
    const existingAppt = await db.select().from(appointments).where(eq(appointments.caseId, item.caseId)).limit(1);
    if (existingAppt.length === 0) {
      await db.insert(appointments).values({
        ownerId: 1,
        clientId: studentContactId,
        caseId: item.caseId,
        title: "Annual IEP Meeting",
        description: "Annual Individualized Education Program Review",
        startTime: new Date("2026-05-22T09:00:00Z"),
        endTime: new Date("2026-05-22T10:30:00Z"),
        location: `${item.schoolName} — Conference Room 204`,
        status: "Scheduled",
        parentName: `${item.parentFirstName} ${item.parentLastName}`,
        studentName: item.studentName,
      });
    }

    // 8. Create Messages
    const existingMsg = await db.select().from(messages).where(eq(messages.recipientId, appUserId)).limit(1);
    if (existingMsg.length === 0) {
      await db.insert(messages).values({
        senderId: 1,
        recipientId: appUserId,
        content: `Hi ${item.parentFirstName}, I've reviewed ${item.studentName.split(" ")[0]}'s latest evaluation report and prepared our draft goals for the upcoming Annual IEP meeting on May 22nd. Let me know if you have any questions!`,
        isRead: false,
      });
    }

    // 9. Create Sample Tasks
    const existingTasks = await db.select().from(projectTasks).where(eq(projectTasks.projectId, projectId)).limit(1);
    if (existingTasks.length === 0) {
      await db.insert(projectTasks).values({
        projectId,
        title: "Upload Recent Educational Evaluation",
        description: "Please upload the 2025/2026 school evaluation report.",
        assignedTo: parentContactId,
        status: "Todo",
        priority: "High",
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      });

      await db.insert(projectTasks).values({
        projectId,
        title: "Review Parent Concern Form",
        description: "Complete and return the parent input worksheet.",
        assignedTo: parentContactId,
        status: "Done",
        priority: "Medium",
      });
    }

    // 10. Create Client-Visible Note
    const existingNotes = await db.select().from(projectNotes).where(eq(projectNotes.projectId, projectId)).limit(1);
    if (existingNotes.length === 0) {
      await db.insert(projectNotes).values({
        projectId,
        title: "IEP Meeting Preparation Notes",
        content: "Advocate review completed for upcoming annual IEP meeting. Goals updated for speech therapy and accommodation support.",
        isVisibleToClient: true,
        createdBy: 1,
      });
    }

    // 11. Create Sample Client File
    const existingFiles = await db.select().from(clientFiles).where(eq(clientFiles.clientId, studentContactId)).limit(1);
    if (existingFiles.length === 0) {
      await db.insert(clientFiles).values({
        clientId: studentContactId,
        fileName: "Evaluation Report.pdf",
        fileKey: `eval-report-${studentContactId}.pdf`,
        fileUrl: "/storage/sample-eval-report.pdf",
        fileSize: 2048500,
        uploadedBy: 1,
      });
    }

    console.log(`✅ Successfully provisioned ${item.email} (Contact ID: ${parentContactId}, Project ID: ${projectId})`);
  }

  console.log("🎉 Seeding complete! Credentials for test group:");
  console.log("1. Email: testparent@waypointadvocates.com | Password: TestParent2026!");
  console.log("2. Email: sheep.parent@waypointadvocates.com | Password: TestParent2026!");
}

if (process.argv[1] && process.argv[1].endsWith("seedTestGroup.ts")) {
  seedTestGroup().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
}

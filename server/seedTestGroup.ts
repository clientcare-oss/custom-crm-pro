import "dotenv/config";
import { getDb } from "./db";
import {
  contacts, projects, projectTasks, projectNotes, clientFiles,
  appointments, users, caseCompass, messages, voyageLogs
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
      diagnosis: "ADHD & Specific Learning Disability (Dyslexia)",
      projectName: "Alex Smith — IEP Advocacy 2026",
      caseId: "WP-2026-0001",
      compass: {
        currentStatus: "Drafting Comprehensive PWN Response for Reading & Math Accommodations",
        lastMeetingSummary: "Met with district special education coordinator on May 10th. District agreed to formal Orton-Gillingham reading intervention 4x/week and assistive technology assessment.",
        nextStep: "Review updated draft IEP goals and finalize accommodations matrix prior to the scheduled May 22nd meeting.",
        whoHasBall: "Waypoint Advocates & School District",
        nextMeetingDate: new Date("2026-05-22T09:00:00Z"),
      },
    },
    {
      parentFirstName: "Mary",
      parentLastName: "Sheep",
      email: "sheep.parent@waypointadvocates.com",
      studentName: "Baaarbra Sheep",
      studentGrade: "3rd Grade",
      schoolName: "Sunny Meadow Primary",
      diagnosis: "Speech & Language Impairment & Sensory Processing",
      projectName: "Baaarbra Sheep — Annual IEP & OT Support",
      caseId: "WP-2026-0002",
      compass: {
        currentStatus: "Advocating to reinstate full Speech & Language + OT Compensatory Services into formal IEP",
        lastMeetingSummary: "Discovered district reduced speech therapy from 60 min to 30 min without prior written notice (PWN). Demanding 45 hours compensatory OT and speech services.",
        nextStep: "Submit independent educational evaluation (IEE) request and speech therapist logs to district compliance officer.",
        whoHasBall: "Head Shepherd (Parent) & Waypoint Advocates",
        nextMeetingDate: new Date("2026-05-22T09:00:00Z"),
      },
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
      await db.update(contacts).set({ 
        caseId: item.caseId,
        portalAccess: "active",
        firstName: item.parentFirstName,
        lastName: item.parentLastName,
      }).where(eq(contacts.id, parentContactId));
    } else {
      const parentInsert = await db.insert(contacts).values({
        ownerId: 1,
        firstName: item.parentFirstName,
        lastName: item.parentLastName,
        email: item.email,
        phone: "(555) 234-5678",
        caseId: item.caseId,
        portalAccess: "active",
      });
      parentContactId = Number(parentInsert.lastInsertRowid || 99);
    }

    // 3. Create or update User record in D1
    const userByOpenId = clerkUserId ? await db.select().from(users).where(eq(users.openId, clerkUserId)).limit(1) : [];
    const userByEmail = await db.select().from(users).where(eq(users.email, item.email)).limit(1);

    let appUserId: number;

    if (userByOpenId.length > 0) {
      appUserId = userByOpenId[0].id;
      await db.update(users).set({ role: "client", email: item.email, name: `${item.parentFirstName} ${item.parentLastName}` }).where(eq(users.id, appUserId));
    } else if (userByEmail.length > 0) {
      appUserId = userByEmail[0].id;
      await db.update(users).set({ role: "client", openId: clerkUserId || `clerk-${parentContactId}`, name: `${item.parentFirstName} ${item.parentLastName}` }).where(eq(users.id, appUserId));
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

    await db.update(contacts).set({ portalUserId: appUserId, portalAccess: "active" }).where(eq(contacts.id, parentContactId));

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

    // 4. Create Student contact
    const existingStudent = await db.select().from(contacts).where(eq(contacts.parentContactId, parentContactId)).limit(1);
    let studentContactId: number;

    if (existingStudent.length > 0) {
      studentContactId = existingStudent[0].id;
      await db.update(contacts).set({ 
        caseId: item.caseId, 
        schoolName: item.schoolName, 
        gradeLevel: item.studentGrade,
        diagnosis: item.diagnosis,
        portalAccess: "active",
        jobTitle: "Student"
      }).where(eq(contacts.id, studentContactId));
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
        portalAccess: "active",
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

    // 6. Create / Update Case Compass
    const existingCompass = await db.select().from(caseCompass).where(eq(caseCompass.caseId, item.caseId)).limit(1);
    if (existingCompass.length > 0) {
      await db.update(caseCompass).set({
        ...item.compass,
        updatedAt: new Date(),
      }).where(eq(caseCompass.caseId, item.caseId));
    } else {
      await db.insert(caseCompass).values({
        caseId: item.caseId,
        ...item.compass,
      });
    }

    // 7. Create Scheduled Appointments
    const existingAppt = await db.select().from(appointments).where(eq(appointments.caseId, item.caseId)).limit(1);
    if (existingAppt.length === 0) {
      await db.insert(appointments).values({
        ownerId: 1,
        clientId: studentContactId,
        caseId: item.caseId,
        title: "Annual IEP Meeting",
        description: `Annual Individualized Education Program Review for ${item.studentName}`,
        startTime: new Date("2026-05-22T09:00:00Z"),
        endTime: new Date("2026-05-22T10:30:00Z"),
        location: `${item.schoolName} — Conference Room 204`,
        status: "Scheduled",
        parentName: `${item.parentFirstName} ${item.parentLastName}`,
        studentName: item.studentName,
      });

      await db.insert(appointments).values({
        ownerId: 1,
        clientId: studentContactId,
        caseId: item.caseId,
        title: "Pre-IEP Advocate Strategy Session",
        description: "Review accommodation checklist and parent priority talking points",
        startTime: new Date("2026-05-20T14:00:00Z"),
        endTime: new Date("2026-05-20T15:00:00Z"),
        location: "Zoom Video Conference (Link in Portal)",
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
        content: `Hi ${item.parentFirstName}, I've reviewed ${item.studentName.split(" ")[0]}'s latest evaluation reports and drafted our proposed IEP goals for our strategy session on May 20th. Please check the Tasks tab to complete the parent input worksheet!`,
        isRead: false,
      });
    }

    // 9. Create Sample Tasks
    const existingTasks = await db.select().from(projectTasks).where(eq(projectTasks.projectId, projectId));
    if (existingTasks.length === 0) {
      await db.insert(projectTasks).values({
        projectId,
        title: "Upload Recent Educational Evaluation",
        description: "Please upload the 2025/2026 psychoeducational report from the school psychologist.",
        assignedTo: parentContactId,
        status: "Todo",
        priority: "High",
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      });

      await db.insert(projectTasks).values({
        projectId,
        title: "Review Proposed Speech Therapy Goals",
        description: "Review the proposed 4 articulation and language goals drafted by Byron.",
        assignedTo: parentContactId,
        status: "In Progress",
        priority: "High",
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      });

      await db.insert(projectTasks).values({
        projectId,
        title: "Sign Assessment Plan Consent Form",
        description: "Electronic signature required for Independent Educational Evaluation (IEE) request.",
        assignedTo: parentContactId,
        status: "Todo",
        priority: "Medium",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      await db.insert(projectTasks).values({
        projectId,
        title: "Complete Parent Concern Input Worksheet",
        description: "Input worksheet detailing parent observations at home and school.",
        assignedTo: parentContactId,
        status: "Done",
        priority: "Medium",
      });
    }

    // 10. Create Client-Visible Notes
    const existingNotes = await db.select().from(projectNotes).where(eq(projectNotes.projectId, projectId));
    if (existingNotes.length === 0) {
      await db.insert(projectNotes).values({
        projectId,
        title: "IEP Strategy & Accommodation Review",
        content: `Advocate review completed for ${item.studentName}. High priority placed on 1-on-1 speech therapy, sensory breaks in the classroom, and clear behavioral support accommodations.`,
        isVisibleToClient: true,
        createdBy: 1,
      });
    }

    // 11. Create Sample Client Files
    const existingFiles = await db.select().from(clientFiles).where(eq(clientFiles.clientId, studentContactId));
    if (existingFiles.length === 0) {
      await db.insert(clientFiles).values({
        clientId: studentContactId,
        fileName: "2025-2026_Individualized_Education_Program.pdf",
        fileKey: `iep-${studentContactId}.pdf`,
        fileUrl: "/storage/sample-eval-report.pdf",
        fileSize: 3450000,
        uploadedBy: 1,
      });

      await db.insert(clientFiles).values({
        clientId: studentContactId,
        fileName: "Psychoeducational_Evaluation_Report.pdf",
        fileKey: `eval-report-${studentContactId}.pdf`,
        fileUrl: "/storage/sample-eval-report.pdf",
        fileSize: 2150000,
        uploadedBy: 1,
      });

      await db.insert(clientFiles).values({
        clientId: studentContactId,
        fileName: "Speech_Language_Pathology_Assessment.pdf",
        fileKey: `slp-${studentContactId}.pdf`,
        fileUrl: "/storage/sample-eval-report.pdf",
        fileSize: 1200000,
        uploadedBy: 1,
      });
    }

    // 12. Create Sample Voyage Meeting Logs
    const existingVoyage = await db.select().from(voyageLogs).where(eq(voyageLogs.contactId, studentContactId));
    if (existingVoyage.length === 0) {
      await db.insert(voyageLogs).values({
        contactId: studentContactId,
        portalUserId: appUserId,
        title: `Annual IEP Strategy & Goal Review — ${item.studentName}`,
        status: "ready",
        duration: "42:15",
        rawTranscript: "Speaker 1 (Advocate): Let's examine the accommodations on page 4. The student needs structured sensory breaks.\nSpeaker 2 (Parent): We completely agree, especially during afternoon transitions.",
        formattedTranscript: "<b>Byron Honea (Advocate):</b> We need to ensure the OT compensatory services are written into Section 7 with clear delivery timelines.<br><br><b>Parent:</b> That has been our main frustration with the district this semester.",
        executiveSummary: `Full strategy review session for ${item.studentName}. Key areas covered included speech minutes restoration, sensory room accommodations, and compensatory service calculations.`,
        approvedItems: "• 60 min/week direct Speech & Language therapy\n• Daily 10-minute sensory reset breaks\n• Visual schedule and quiet testing accommodation",
        unapprovedItems: "• 1-on-1 paraprofessional during unassigned hallway transitions (pending FBA observation)",
        crmTaskSuggestions: "• Draft follow-up letter to school principal\n• Request service logs from district OT provider",
        caseCompassSummary: `Restoration of IEP services underway for ${item.studentName}. School agreed to formal speech therapy timeline.`,
      });
    }

    console.log(`✅ Successfully provisioned ${item.email} (Contact ID: ${parentContactId}, Student ID: ${studentContactId}, Project ID: ${projectId})`);
  }

  console.log("🎉 Seeding complete! Credentials for test group:");
  console.log("1. Email: testparent@waypointadvocates.com | Password: TestParent2026!");
  console.log("2. Email: sheep.parent@waypointadvocates.com | Password: TestParent2026!");
}

if (process.argv[1] && process.argv[1].endsWith("seedTestGroup.ts")) {
  seedTestGroup().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
}

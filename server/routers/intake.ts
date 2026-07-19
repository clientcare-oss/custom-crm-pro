import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { brainDumpItems, brainDumpImages } from "../../drizzle/schema";

export const intakeRouter = router({

    submit: publicProcedure
      .input(z.object({
        // Parent / Guardian
        parentFirstName: z.string().min(1),
        parentLastName: z.string().min(1),
        parentEmail: z.string().email(),
        parentPhone: z.string().min(1),
        timezone: z.string().optional(),
        bestTimeToCall: z.string().optional(),
        howHeardAboutUs: z.string().optional(),
        referredBy: z.string().optional(),
        // Second parent (optional)
        secondParentName: z.string().optional(),
        secondParentPhone: z.string().optional(),
        secondParentEmail: z.string().optional(),
        // Student
        studentFirstName: z.string().min(1),
        studentLastName: z.string().min(1),
        dateOfBirth: z.string().optional(),
        diagnosis: z.string().optional(),
        schoolName: z.string().optional(),
        gradeLevel: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        countyDistrict: z.string().optional(),
        challenges: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Resolve the owner (advocate/admin)
        const ownerUser = await db.getOwnerUser();
        if (!ownerUser) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No owner configured" });
        const ownerId = ownerUser.id;

        // 1. Create parent contact
        const parentResult = await db.createContact({
          firstName: input.parentFirstName,
          lastName: input.parentLastName,
          email: input.parentEmail,
          phone: input.parentPhone,
          jobTitle: "Parent",
          timezone: input.timezone,
          bestTimeToCall: input.bestTimeToCall,
          howHeardAboutUs: input.howHeardAboutUs,
          referredBy: input.referredBy,
          secondParentName: input.secondParentName,
          secondParentPhone: input.secondParentPhone,
          secondParentEmail: input.secondParentEmail,
          state: input.state,
          zipCode: input.zipCode,
          city: input.city,
        }, ownerId);
        const parentContactId = db.getInsertId(parentResult);

        // 2. Generate unique caseId for the student
        const year = new Date().getFullYear();
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const caseId = `WP-${year}-${randomSuffix}`;

        // 3. Create student contact linked to parent
        const studentResult = await db.createContact({
          firstName: input.studentFirstName,
          lastName: input.studentLastName,
          jobTitle: "Student",
          parentContactId,
          caseId,
          dateOfBirth: input.dateOfBirth,
          diagnosis: input.diagnosis,
          schoolName: input.schoolName,
          gradeLevel: input.gradeLevel,
          city: input.city,
          state: input.state,
          zipCode: input.zipCode,
          countyDistrict: input.countyDistrict,
          challenges: input.challenges,
        }, ownerId);
        const studentContactId = db.getInsertId(studentResult);

        // 4. Create initial project/case for the student
        const projectName = `${input.studentFirstName} ${input.studentLastName} — Case`;
        await db.createProject({
          clientId: studentContactId,
          name: projectName,
          description: `Intake case created from lead form. Student: ${input.studentFirstName} ${input.studentLastName}. Diagnosis: ${input.diagnosis || 'Not specified'}.`,
          status: "Planning",
        }, ownerId);

        // 5. Create a lead record for pipeline tracking
        await db.createLead({
          contactId: parentContactId,
          source: input.howHeardAboutUs || "Lead Form",
          status: "New",
          notes: `Intake form submitted. Student: ${input.studentFirstName} ${input.studentLastName}. Challenges: ${input.challenges || 'Not specified'}.`,
        }, ownerId);

        // 6. Notify the advocate
        await notifyOwner({
          title: `New Lead: ${input.parentFirstName} ${input.parentLastName}`,
          content: `A new intake form was submitted.\n\nParent: ${input.parentFirstName} ${input.parentLastName} (${input.parentEmail})\nStudent: ${input.studentFirstName} ${input.studentLastName}\nCase ID: ${caseId}\nDiagnosis: ${input.diagnosis || 'Not specified'}\nSchool: ${input.schoolName || 'Not specified'}\nChallenges: ${input.challenges || 'Not specified'}`,
        });

        return {
          success: true,
          caseId,
          parentContactId,
          studentContactId,
        };
      }),
  
});

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

        // Resolve or create connected family identity
        const { resolveOrCreateFamilyIdentity } = await import("../services/familyIdentityService");
        const resolution = await resolveOrCreateFamilyIdentity({
          ownerId,
          parent: {
            firstName: input.parentFirstName,
            lastName: input.parentLastName,
            email: input.parentEmail,
            phone: input.parentPhone,
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
          },
          student: {
            firstName: input.studentFirstName,
            lastName: input.studentLastName,
            dateOfBirth: input.dateOfBirth,
            diagnosis: input.diagnosis,
            schoolName: input.schoolName,
            gradeLevel: input.gradeLevel,
            challenges: input.challenges,
            countyDistrict: input.countyDistrict,
          },
          source: input.howHeardAboutUs || "Lead Form",
          notes: `Intake form submission for ${input.studentFirstName} ${input.studentLastName}. Diagnosis: ${input.diagnosis || "Not specified"}. Challenges: ${input.challenges || "Not specified"}.`,
        });

        // Get student contact caseId if created/found
        let studentCaseId = "";
        if (resolution.studentContactId) {
          const studentContact = await db.getContactById(resolution.studentContactId, ownerId);
          studentCaseId = studentContact?.caseId || `WP-${new Date().getFullYear()}-${resolution.studentContactId}`;
        }

        // Internal-only Do Not Serve evaluation (never exposed in public intake response)
        let staffDnsNotice = "";
        try {
          const { evaluateDoNotServeCandidate } = await import("../services/doNotServeService");
          const dnsEval = await evaluateDoNotServeCandidate({
            ownerId: 1,
            contactIds: [resolution.parentContactId, resolution.studentContactId],
            phones: [input.parentPhone, input.secondParentPhone],
            emails: [input.parentEmail, input.secondParentEmail],
            names: [
              `${input.parentFirstName} ${input.parentLastName}`.trim(),
              input.secondParentName,
              `${input.studentFirstName} ${input.studentLastName}`.trim(),
            ],
            targetEntityType: "lead",
            targetEntityId: String(resolution.leadId || resolution.parentContactId || studentCaseId),
          });
          if (dnsEval.hasActiveMatch) {
            staffDnsNotice =
              dnsEval.highestTier === "hard_match"
                ? "\n\n[Staff Alert: Do Not Serve match detected — review before proceeding]"
                : "\n\n[Staff Alert: Possible restricted name match — verify contact details before proceeding]";
          }
        } catch {}

        // Notify the advocate
        await notifyOwner({
          title: `${resolution.isExistingFamily ? "Existing Family Inquiry" : "New Lead"}: ${input.parentFirstName} ${input.parentLastName}`,
          content: `${resolution.isExistingFamily ? "An existing family submitted an inquiry" : "A new intake form was submitted"}.\n\nParent: ${input.parentFirstName} ${input.parentLastName} (${input.parentEmail})\nStudent: ${input.studentFirstName} ${input.studentLastName}\nCase ID: ${studentCaseId}\nDiagnosis: ${input.diagnosis || "Not specified"}\nSchool: ${input.schoolName || "Not specified"}\nChallenges: ${input.challenges || "Not specified"}${resolution.ambiguousMatch ? `\n\n⚠️ Notice: ${resolution.ambiguousMatch.reason}` : ""}${staffDnsNotice}`,
        });

        return {
          success: true,
          caseId: studentCaseId,
          parentContactId: resolution.parentContactId,
          studentContactId: resolution.studentContactId,
          leadId: resolution.leadId,
          isExistingFamily: resolution.isExistingFamily,
        };
      }),
  
});

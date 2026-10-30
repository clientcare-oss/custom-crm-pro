import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  router,
  publicProcedure,
  protectedProcedure,
  staffProcedure,
  adminProcedure,
  portalProcedure,
  requireStaffModule,
  requireStaffPermission,
  assertClientContactOwnership,
} from "../_core/trpc";
import {
  checkBackendModuleAccess,
  checkBackendCaseAccess,
  checkBackendActionPermission,
  resolveStaffAccess,
  isProtectedOwnerAccount,
  CONFIRMED_STAFF_PROFILES,
} from "../_core/staffAccess";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { brainDumpItems, brainDumpImages } from "../../drizzle/schema";
import { recordCaseActivity } from "../services/caseActivityService";

const PARENT_EDITABLE_CONTACT_FIELDS = new Set<string>([
  "attorneyName",
  "attorneyFirm",
  "attorneyPhone",
  "attorneyEmail",
  "attorneyAddress",
  "phone",
  "address",
  "city",
  "state",
  "zipCode",
  "country",
  "bestTimeToCall",
]);

const STUDENT_PROTECTED_FIELDS = new Set<string>([
  "dateOfBirth",
  "schoolName",
  "gradeLevel",
  "previousSchool",
  "goingToSchool",
  "diagnosis",
  "iepEligibility",
  "medicalDiagnoses",
  "countyDistrict",
  "challenges",
  "planType",
]);

const BILLING_PROTECTED_FIELDS = new Set<string>([
  "planTier",
  "accountStatus",
  "billingStatus",
  "contractStatus",
  "pauseType",
  "contractTreatment",
  "pauseApprovedBy",
  "paymentFailureDate",
  "failedAttemptCount",
  "nextRetryDate",
  "gracePeriodExpiresAt",
  "amountDue",
  "paymentMethodSummary",
  "managerApprovalStatus",
  "approvingManager",
  "scholarshipNotes",
]);

const LIFECYCLE_PROTECTED_FIELDS = new Set<string>([
  "lifecycleStage",
  "operationalState",
  "serviceStatus",
  "portalLifecycleStatus",
  "currentPrimaryAction",
  "currentActionDestination",
  "currentActionDueDate",
  "currentActionHelperText",
  "journeyProgress",
  "journeyTotalSteps",
  "renewalDate",
  "renewalDaysRemaining",
  "serviceTermEndsAt",
  "pauseReason",
  "pauseStartDate",
  "pauseReviewDate",
  "offboardingReason",
  "offboardingRequestedAt",
  "offboardingEffectiveDate",
  "closeoutCompletedBy",
]);

export const contactsRouter = router({

    list: staffProcedure.query(async ({ ctx }) => {
      const hasContactsView = checkBackendModuleAccess(ctx.staffAccess, "contacts") !== "none";
      const hasStudentsView = checkBackendModuleAccess(ctx.staffAccess, "students") !== "none";
      if (!hasContactsView && !hasStudentsView) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access to contacts directory is restricted for your role.",
        });
      }
      const contacts = await db.getContactsByOwner(ctx.user?.id);
      return contacts;
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.staffAccess?.isStaff) {
          const hasContactsView = checkBackendModuleAccess(ctx.staffAccess, "contacts") !== "none";
          const hasStudentsView = checkBackendModuleAccess(ctx.staffAccess, "students") !== "none";
          if (!hasContactsView && !hasStudentsView) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Access to contact records is restricted for your role.",
            });
          }
        } else {
          await assertClientContactOwnership(ctx, input.id);
        }
        return await db.getContactById(input.id, ctx.user?.id);
      }),

    create: requireStaffModule("contacts", "edit")
      .input(
        z.object({
          firstName: z.string().min(1),
          lastName: z.string().min(1),
          email: z.union([z.string().email(), z.literal("")]).optional(),
          phone: z.string().optional(),
          company: z.string().optional(),
          jobTitle: z.string().optional(),
          address: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          zipCode: z.string().optional(),
          country: z.string().optional(),
          notes: z.string().optional(),
          parentContactId: z.number().optional(),
          bestTimeToCall: z.string().optional(),
          schoolName: z.string().optional(),
          gradeLevel: z.string().optional(),
          planType: z.string().optional(),
          diagnosis: z.string().optional(),
          dateOfBirth: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const ownerId = ctx.user?.id || 1;
        return await db.createContact(input, ownerId);
      }),

    createSamplePair: requireStaffModule("contacts", "edit")
      .input(
        z.object({
          pairIndex: z.number().optional(),
        }).optional()
      )
      .mutation(async ({ ctx, input }) => {
        const ownerId = ctx.user?.id || 1;

        const SAMPLE_PAIRS = [
          {
            parent: {
              firstName: "Sarah",
              lastName: "Sterling",
              email: "sarah.sterling@sample.waypointadvocates.com",
              phone: "(404) 555-0182",
              company: "Sterling Family",
              jobTitle: "Parent / Guardian",
              city: "Atlanta",
              state: "GA",
              zipCode: "30309",
              notes: "Sample parent record. Prefers morning contact before 11:00 AM.",
              bestTimeToCall: "Mornings before 11:00 AM",
            },
            student: {
              firstName: "Lucas",
              lastName: "Sterling",
              schoolName: "North Atlanta High",
              gradeLevel: "10th Grade",
              planType: "IEP",
              company: "Sterling Family",
              phone: "(404) 555-0182",
              city: "Atlanta",
              state: "GA",
              zipCode: "30309",
              notes: "Sample student file. Focus on executive functioning accommodations and math progress monitoring.",
            }
          },
          {
            parent: {
              firstName: "David",
              lastName: "Vance",
              email: "david.vance@sample.waypointadvocates.com",
              phone: "(404) 555-0194",
              company: "Vance Family",
              jobTitle: "Parent / Guardian",
              city: "Decatur",
              state: "GA",
              zipCode: "30030",
              notes: "Sample parent record. Collaborative 504 plan review.",
              bestTimeToCall: "Afternoons after 2:00 PM",
            },
            student: {
              firstName: "Maya",
              lastName: "Vance",
              schoolName: "Decatur High School",
              gradeLevel: "8th Grade",
              planType: "504",
              company: "Vance Family",
              phone: "(404) 555-0194",
              city: "Decatur",
              state: "GA",
              zipCode: "30030",
              notes: "Sample student file. Extended time accommodations and sensory regulation plan.",
            }
          },
          {
            parent: {
              firstName: "Kendra",
              lastName: "Mitchell",
              email: "kendra.mitchell@sample.waypointadvocates.com",
              phone: "(770) 555-0138",
              company: "Mitchell Family",
              jobTitle: "Parent / Guardian",
              city: "Marietta",
              state: "GA",
              zipCode: "30062",
              notes: "Sample parent record. Seeking annual IEP review advocacy support.",
              bestTimeToCall: "Mid-day 12:00 PM - 1:00 PM",
            },
            student: {
              firstName: "Elijah",
              lastName: "Mitchell",
              schoolName: "Walton High School",
              gradeLevel: "11th Grade",
              planType: "IEP",
              company: "Mitchell Family",
              phone: "(770) 555-0138",
              city: "Marietta",
              state: "GA",
              zipCode: "30062",
              notes: "Sample student file. Transition planning, reading goals, and testing accommodations.",
            }
          },
          {
            parent: {
              firstName: "Marcus",
              lastName: "Davis",
              email: "marcus.davis@sample.waypointadvocates.com",
              phone: "(678) 555-0177",
              company: "Davis Family",
              jobTitle: "Parent / Guardian",
              city: "Sandy Springs",
              state: "GA",
              zipCode: "30328",
              notes: "Sample parent record. Initial comprehensive evaluation in progress.",
              bestTimeToCall: "Fridays anytime",
            },
            student: {
              firstName: "Caleb",
              lastName: "Davis",
              schoolName: "Riverwood High School",
              gradeLevel: "6th Grade",
              planType: "No IEP/504 Yet",
              company: "Davis Family",
              phone: "(678) 555-0177",
              city: "Sandy Springs",
              state: "GA",
              zipCode: "30328",
              notes: "Sample student file. Multidisciplinary psychoeducational evaluation request.",
            }
          }
        ];

        const selected = input?.pairIndex != null 
          ? SAMPLE_PAIRS[input.pairIndex % SAMPLE_PAIRS.length] 
          : SAMPLE_PAIRS[Math.floor(Math.random() * SAMPLE_PAIRS.length)];

        const suffix = Math.floor(Math.random() * 9000 + 1000);
        const parentEmail = selected.parent.email.replace("@", `+${suffix}@`);

        // 1. Create parent
        const parentRes = await db.createContact({
          ...selected.parent,
          email: parentEmail,
        }, ownerId);
        let parentId = db.getInsertId(parentRes);

        if (!parentId || parentId <= 0) {
          const list = await db.getContactsByOwner(ownerId);
          const found = list.find((c: any) => c.email === parentEmail);
          if (found?.id) parentId = found.id;
        }

        // 2. Create student linked to parent
        const studentRes = await db.createContact({
          ...selected.student,
          jobTitle: "Student",
          parentContactId: parentId > 0 ? parentId : undefined,
        }, ownerId);
        let studentId = db.getInsertId(studentRes);

        if (!studentId || studentId <= 0) {
          const list = await db.getContactsByOwner(ownerId);
          const found = list.find((c: any) => c.firstName === selected.student.firstName && c.lastName === selected.student.lastName);
          if (found?.id) studentId = found.id;
        }

        return {
          success: true,
          parentId,
          studentId,
          parentName: `${selected.parent.firstName} ${selected.parent.lastName}`,
          studentName: `${selected.student.firstName} ${selected.student.lastName}`,
          planType: selected.student.planType,
          message: `Sample student "${selected.student.firstName} ${selected.student.lastName}" & parent "${selected.parent.firstName} ${selected.parent.lastName}" created!`,
        };
      }),

    bulkImport: requireStaffModule("contacts", "edit")
      .input(
        z.object({
          sourceCrm: z.string().default("Generic CSV"),
          duplicateStrategy: z.enum(["skip", "update", "create_new"]).default("skip"),
          defaultPlanTier: z.string().optional(),
          defaultPipelineStage: z.string().optional(),
          clients: z.array(
            z.object({
              firstName: z.string().min(1),
              lastName: z.string().min(1),
              email: z.string().optional(),
              phone: z.string().optional(),
              company: z.string().optional(),
              jobTitle: z.string().optional(),
              address: z.string().optional(),
              city: z.string().optional(),
              state: z.string().optional(),
              zipCode: z.string().optional(),
              country: z.string().optional(),
              notes: z.string().optional(),
              studentFirstName: z.string().optional(),
              studentLastName: z.string().optional(),
              schoolName: z.string().optional(),
              gradeLevel: z.string().optional(),
              dateOfBirth: z.string().optional(),
              diagnosis: z.string().optional(),
              iepEligibility: z.string().optional(),
              planType: z.string().optional(),
              pipelineStage: z.string().optional(),
              planTier: z.string().optional(),
              accountStatus: z.string().optional(),
              billingStatus: z.string().optional(),
              hourlyRate: z.union([z.number(), z.string()]).optional(),
              howHeardAboutUs: z.string().optional(),
              referredBy: z.string().optional(),
              caseId: z.string().optional(),
              bestTimeToCall: z.string().optional(),
            })
          ),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const ownerId = ctx.user?.id || 1;
        return await db.bulkImportContacts(input, ownerId);
      }),

    expressSetup: requireStaffModule("contacts", "edit")
      .input(
        z.object({
          parentName: z.string().min(1, "Parent name is required"),
          studentName: z.string().min(1, "Student name is required"),
          email: z.string().optional(),
          phone: z.string().optional(),
          schoolName: z.string().optional(),
          gradeLevel: z.string().optional(),
          diagnosis: z.string().optional(),
          planType: z.string().optional(),
          planTier: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          notes: z.string().optional(),
          bestTimeToCall: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const ownerId = ctx.user?.id || 1;
        return await db.expressStudentSetup(input, ownerId);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          email: z.union([z.string().email(), z.literal("")]).optional(),
          phone: z.string().optional(),
          company: z.string().optional(),
          jobTitle: z.string().optional(),
          address: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          zipCode: z.string().optional(),
          country: z.string().optional(),
          notes: z.string().optional(),
          parentContactId: z.number().nullable().optional(),
          attorneyName: z.string().optional(),
          attorneyFirm: z.string().optional(),
          attorneyPhone: z.string().optional(),
          attorneyEmail: z.string().optional(),
          attorneyAddress: z.string().optional(),
          portalAccess: z.string().optional(),
          dateOfBirth: z.string().optional(),
          schoolName: z.string().optional(),
          gradeLevel: z.string().optional(),
          previousSchool: z.string().optional(),
          goingToSchool: z.string().optional(),
          diagnosis: z.string().optional(),
          iepEligibility: z.string().optional(),
          medicalDiagnoses: z.string().optional(),
          countyDistrict: z.string().optional(),
          challenges: z.string().optional(),
          planType: z.string().optional(),
          planTier: z.string().optional(),
          accountStatus: z.string().optional(),
          billingStatus: z.string().optional(),
          contractStatus: z.string().optional(),
          lifecycleStage: z.string().optional(),
          operationalState: z.string().optional(),
          serviceStatus: z.string().optional(),
          portalLifecycleStatus: z.string().optional(),
          currentPrimaryAction: z.string().optional(),
          currentActionDestination: z.string().optional(),
          currentActionDueDate: z.string().optional(),
          currentActionHelperText: z.string().optional(),
          journeyProgress: z.number().optional(),
          journeyTotalSteps: z.number().optional(),
          renewalDate: z.string().optional(),
          renewalDaysRemaining: z.number().optional(),
          serviceTermEndsAt: z.string().optional(),
          pauseReason: z.string().optional(),
          pauseStartDate: z.string().optional(),
          pauseReviewDate: z.string().optional(),
          pauseType: z.string().optional(),
          contractTreatment: z.string().optional(),
          pauseApprovedBy: z.string().optional(),
          paymentFailureDate: z.string().optional(),
          failedAttemptCount: z.number().optional(),
          nextRetryDate: z.string().optional(),
          gracePeriodExpiresAt: z.string().optional(),
          amountDue: z.string().optional(),
          paymentMethodSummary: z.string().optional(),
          offboardingReason: z.string().optional(),
          offboardingRequestedAt: z.string().optional(),
          offboardingEffectiveDate: z.string().optional(),
          closeoutCompletedBy: z.string().optional(),
          managerApprovalStatus: z.string().optional(),
          approvingManager: z.string().optional(),
          scholarshipNotes: z.string().optional(),
          bestTimeToCall: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const providedKeys = Object.entries(data)
          .filter(([, val]) => val !== undefined)
          .map(([key]) => key);

        // 1. Parent / Client Self-Service Path
        if (!ctx.staffAccess?.isStaff) {
          await assertClientContactOwnership(ctx, id);
          for (const key of providedKeys) {
            if (!PARENT_EDITABLE_CONTACT_FIELDS.has(key)) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: `Parent accounts are not authorized to modify restricted field: ${key}`,
              });
            }
          }
          const ownerId = ctx.user?.id || 1;
          return await db.updateContact(id, ownerId, data);
        }

        // 2. Staff Path: Enforce module & field-level authorization
        const hasContactsEdit = checkBackendModuleAccess(ctx.staffAccess, "contacts") === "edit";
        const hasStudentsEdit = checkBackendModuleAccess(ctx.staffAccess, "students") === "edit";
        if (!hasContactsEdit && !hasStudentsEdit) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access to modify contact records is restricted for your role.",
          });
        }

        // 2a. Protected Student Educational, Disability & Medical Fields require student-edit access
        for (const key of providedKeys) {
          if (STUDENT_PROTECTED_FIELDS.has(key) && !hasStudentsEdit) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `Student-edit authorization is required to modify protected student or medical field '${key}'.`,
            });
          }
        }

        // 2b. Protected Billing, Scholarship, Contract & Financial Fields
        const hasBillingAuth = Boolean(
          ctx.staffAccess.hasAdminAccess ||
          checkBackendActionPermission(ctx.staffAccess, "modify_billing") ||
          checkBackendActionPermission(ctx.staffAccess, "modify_contracts") ||
          checkBackendCaseAccess(ctx.staffAccess, "financials") === "edit" ||
          checkBackendCaseAccess(ctx.staffAccess, "financials") === "manage"
        );
        for (const key of providedKeys) {
          if (BILLING_PROTECTED_FIELDS.has(key) && !hasBillingAuth) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `Financial or billing authorization is required to modify '${key}'.`,
            });
          }
        }

        if (
          (input.managerApprovalStatus === "Approved" || input.approvingManager !== undefined) &&
          !ctx.staffAccess.hasAdminAccess &&
          !checkBackendActionPermission(ctx.staffAccess, "modify_billing")
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Manager authorization required to approve scholarships or billing changes.",
          });
        }

        // 2c. Protected Case Lifecycle / Journey Fields require student-edit or billing authorization
        for (const key of providedKeys) {
          if (LIFECYCLE_PROTECTED_FIELDS.has(key) && !hasStudentsEdit && !hasBillingAuth) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `Case lifecycle authorization is required to modify '${key}'.`,
            });
          }
        }

        // 2d. Portal & Parent/Student Relationship Validation
        if (input.portalAccess !== undefined || input.parentContactId !== undefined) {
          if (!checkBackendActionPermission(ctx.staffAccess, "manage_portal_access") && !hasContactsEdit) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Client portal administration permission is required to modify portal associations.",
            });
          }
          if (input.parentContactId !== undefined && input.parentContactId !== null) {
            if (input.parentContactId === id) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "A contact cannot be assigned as its own parent.",
              });
            }
            const targetParent = await db.getContactById(input.parentContactId, ctx.user?.id);
            if (!targetParent) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Target parent contact not found.",
              });
            }
            if ((targetParent as any).parentContactId) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Target contact is a student record and cannot be assigned as a parent contact.",
              });
            }
          }
        }

        const ownerId = ctx.user?.id || 1;
        const res = await db.updateContact(id, ownerId, data);

        if (input.lifecycleStage || input.accountStatus) {
          try {
            const { triggerAutomationFlow } = await import("../db/automations");
            const stageVal = input.lifecycleStage || input.accountStatus || "Updated";
            await triggerAutomationFlow("stage_changed", id, false, {
              eventKey: `contact_stage_${id}_${stageVal}`,
              stageTo: stageVal,
            });
          } catch {}
        }

        if (input.diagnosis || input.iepEligibility || input.planType) {
          try {
            const { triggerAutomationFlow } = await import("../db/automations");
            const tagVal = input.diagnosis || input.iepEligibility || input.planType || "";
            await triggerAutomationFlow("tags_added", id, false, {
              eventKey: `contact_tag_${id}_${tagVal}`,
              tagAdded: tagVal,
            });
          } catch {}
        }

        if (input.parentContactId !== undefined || input.portalAccess !== undefined) {
          try {
            await recordCaseActivity({
              studentContactId: id,
              caseId: `WP-${id}`,
              eventType: "client_account_admin",
              title: "Client Account / Portal Association Updated",
              description: `Updated ${providedKeys.join(", ")} on contact #${id} by ${ctx.user?.name || "Waypoint Staff"}`,
              ownerName: ctx.user?.name || "Waypoint Staff",
              ownerRole: ctx.staffAccess.primaryRole || "Staff",
              eventDate: new Date(),
            });
          } catch {}
        }

        return res;
      }),

    updateStudentProfile: requireStaffModule("students", "edit")
      .input(
        z.object({
          id: z.number(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          dateOfBirth: z.string().optional(),
          gradeLevel: z.string().optional(),
          state: z.string().optional(),
          countyDistrict: z.string().optional(),
          schoolName: z.string().optional(),
          previousSchool: z.string().optional(),
          gtid: z.string().optional(),
          iepEligibility: z.string().optional(),
          medicalDiagnoses: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, gtid, ...fields } = input;
        const ownerId = ctx.user?.id || 1;
        const editorName = ctx.user?.name || "Byron Honea";

        // Fetch existing contact
        const existing = await db.getContactById(id, ownerId);
        if (!existing) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Student record not found" });
        }

        const updateData: Record<string, any> = { ...fields };

        // Handle GTID preserving leading zeros via notes
        if (gtid !== undefined) {
          const cleanGtid = gtid.trim();
          let currentNotes = existing.notes || "";
          if (/\[GTID:\s*[^\]]+\]/i.test(currentNotes)) {
            currentNotes = currentNotes.replace(/\[GTID:\s*[^\]]+\]/i, `[GTID: ${cleanGtid}]`);
          } else if (cleanGtid) {
            currentNotes = currentNotes ? `${currentNotes}\n[GTID: ${cleanGtid}]` : `[GTID: ${cleanGtid}]`;
          }
          updateData.notes = currentNotes;
        }

        // Save update
        await db.updateContact(id, ownerId, updateData);

        // Audit Logging: Compare previous and new values, record in case activity timeline
        const fieldLabels: Record<string, string> = {
          firstName: "First Name",
          lastName: "Last Name",
          dateOfBirth: "Date of Birth",
          gradeLevel: "Grade Level",
          state: "State",
          countyDistrict: "District",
          schoolName: "Current School",
          previousSchool: "Original School",
          iepEligibility: "Eligibility",
          medicalDiagnoses: "Medical Diagnoses",
          gtid: "GTID",
        };

        const changedEntries: Array<{ field: string; prev: string; next: string }> = [];

        for (const [k, label] of Object.entries(fieldLabels)) {
          if (k === "gtid") {
            if (gtid !== undefined) {
              const oldGtidMatch = (existing.notes || "").match(/\[GTID:\s*([^\]]+)\]/i);
              const oldGtid = oldGtidMatch ? oldGtidMatch[1].trim() : (existing.caseId ? existing.caseId.replace(/[^0-9]/g, "") : "");
              if (oldGtid !== gtid.trim()) {
                changedEntries.push({ field: label, prev: oldGtid || "(none)", next: gtid.trim() || "(cleared)" });
              }
            }
          } else if ((fields as any)[k] !== undefined) {
            const oldVal = String((existing as any)?.[k] || "").trim();
            const newVal = String((fields as any)[k] || "").trim();
            if (oldVal !== newVal) {
              changedEntries.push({ field: label, prev: oldVal || "(empty)", next: newVal || "(cleared)" });
            }
          }
        }

        if (changedEntries.length > 0) {
          const desc = changedEntries.map(c => `${c.field}: "${c.prev}" → "${c.next}"`).join("; ");
          try {
            await recordCaseActivity({
              studentContactId: id,
              caseId: existing.caseId || `WP-${id}`,
              eventType: "profile_update",
              title: `Student Profile Updated (${changedEntries.map(c => c.field).join(", ")})`,
              description: `Inline profile edit by ${editorName}: ${desc}`,
              ownerName: editorName,
              ownerRole: "Advocate",
              sources: [{
                type: "note",
                label: "Student Dossier Edit",
                excerpt: desc,
              }],
              eventDate: new Date(),
            });
          } catch (e: any) {
            console.warn("[Audit Log] Failed to record case activity for student profile update:", e.message);
          }
        }

        return {
          success: true,
          updatedFields: Object.keys(updateData),
          changedCount: changedEntries.length,
        };
      }),

    updateJourneyState: staffProcedure
      .input(
        z.object({
          id: z.number().optional(),
          contactId: z.number().optional(),
          lifecycleStage: z.string().optional(),
          operationalState: z.string().optional(),
          serviceStatus: z.string().optional(),
          billingStatus: z.string().optional(),
          planTier: z.string().optional(),
          portalLifecycleStatus: z.string().optional(),
          currentPrimaryAction: z.string().optional(),
          currentActionDestination: z.string().optional(),
          currentActionDueDate: z.string().optional(),
          currentActionHelperText: z.string().optional(),
          journeyProgress: z.union([z.string(), z.number()]).optional(),
          journeyTotalSteps: z.number().optional(),
          renewalDate: z.string().optional(),
          renewalDaysRemaining: z.number().optional(),
          serviceTermEndsAt: z.string().optional(),
          pauseReason: z.string().optional(),
          pauseStartDate: z.string().optional(),
          pauseReviewDate: z.string().optional(),
          pauseType: z.string().optional(),
          contractTreatment: z.string().optional(),
          pauseApprovedBy: z.string().optional(),
          paymentFailureDate: z.string().optional(),
          failedAttemptCount: z.number().optional(),
          nextRetryDate: z.string().optional(),
          gracePeriodExpiresAt: z.string().optional(),
          amountDue: z.string().optional(),
          paymentMethodSummary: z.string().optional(),
          offboardingReason: z.string().optional(),
          offboardingRequestedAt: z.string().optional(),
          offboardingEffectiveDate: z.string().optional(),
          closeoutCompletedBy: z.string().optional(),
          managerApprovalStatus: z.string().optional(),
          approvingManager: z.string().optional(),
          approvalTimestamp: z.string().optional(),
          scholarshipNotes: z.string().optional(),
          reason: z.string().optional(),
          activityEvent: z.object({
            title: z.string(),
            description: z.string(),
            eventType: z.string().default("lifecycle_change"),
            categoryColor: z.string().default("blue"),
            whyReason: z.string().optional(),
          }).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const targetId = input.id ?? input.contactId;
        if (!targetId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Contact ID required" });
        }

        const hasStudentsEdit = checkBackendModuleAccess(ctx.staffAccess, "students") === "edit";
        const hasBillingAuth = Boolean(
          ctx.staffAccess.hasAdminAccess ||
          checkBackendActionPermission(ctx.staffAccess, "modify_billing") ||
          checkBackendActionPermission(ctx.staffAccess, "modify_contracts") ||
          checkBackendCaseAccess(ctx.staffAccess, "financials") === "edit" ||
          checkBackendCaseAccess(ctx.staffAccess, "financials") === "manage"
        );

        if (!hasStudentsEdit && !hasBillingAuth) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Modifying client journey, billing, or lifecycle state is restricted for your role.",
          });
        }

        const isManager = Boolean(
          ctx.staffAccess.hasAdminAccess ||
          checkBackendActionPermission(ctx.staffAccess, "modify_billing")
        );
        // Check permissions for manager-only sensitive operations
        if (input.managerApprovalStatus === "Approved" && !isManager) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Manager authorization required to approve scholarships or billing changes.",
          });
        }

        const { id, contactId, activityEvent, reason, ...rawJourneyData } = input;
        
        // Convert string journeyProgress to number or store in metadata/extra if needed
        const dataToUpdate: any = { ...rawJourneyData };
        if (typeof dataToUpdate.journeyProgress === "string") {
          const parsed = parseInt(dataToUpdate.journeyProgress, 10);
          dataToUpdate.journeyProgress = isNaN(parsed) ? 1 : parsed;
        }

        if (dataToUpdate.approvalTimestamp && typeof dataToUpdate.approvalTimestamp === "string") {
          dataToUpdate.approvalTimestamp = new Date(dataToUpdate.approvalTimestamp);
        }

        const previous = await db.getContactById(targetId, ctx.user.id);
        const result = await db.updateContact(targetId, ctx.user.id, dataToUpdate);
        const updatedContact = await db.getContactById(targetId, ctx.user.id);

        if (input.lifecycleStage || input.operationalState) {
          try {
            const { triggerAutomationFlow } = await import("../db/automations");
            const stageVal = input.lifecycleStage || input.operationalState || "Updated";
            await triggerAutomationFlow("stage_changed", targetId, false, {
              eventKey: `journey_stage_${targetId}_${stageVal}`,
              stageFrom: previous?.lifecycleStage || undefined,
              stageTo: stageVal,
            });
          } catch {}
        }

        // Record Activity Timeline event
        try {
          const stageOrState = input.operationalState && input.operationalState !== "Normal"
            ? input.operationalState
            : input.lifecycleStage || "Journey Update";

          const title = activityEvent?.title || `Client Journey: ${stageOrState}`;
          const description =
            activityEvent?.description ||
            `Transitioned ${input.lifecycleStage ? `Lifecycle to ${input.lifecycleStage}` : ""}${
              input.operationalState ? ` (Operational: ${input.operationalState})` : ""
            }${input.currentPrimaryAction ? ` · Next: ${input.currentPrimaryAction}` : ""}`;

          await recordCaseActivity({
            studentContactId: targetId,
            caseId: updatedContact?.caseId || previous?.caseId || "WP-2026-0001",
            eventType: activityEvent?.eventType || "lifecycle_change",
            title,
            description,
            whyReason: reason || activityEvent?.whyReason || "Workflow progression in Client Journey system",
            ownerName: ctx.user.name || "Byron Honea",
            ownerRole: isManager ? "Manager" : "Advocate",
            categoryColor: activityEvent?.categoryColor || (input.operationalState === "Payment Attention" ? "red" : input.operationalState === "Services Paused" ? "purple" : "blue"),
            eventDate: new Date(),
          });
        } catch (e) {
          console.warn("[updateJourneyState] Failed to record timeline activity:", e);
        }

        return {
          success: true,
          contact: updatedContact || { id: targetId, ...(previous || {}), ...dataToUpdate },
        };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return await db.deleteContact(input.id, ctx.user.id);
      }),

    // Contact detail hub: all data for one contact
    detail: adminProcedure
      .input(z.object({ id: z.union([z.number(), z.string()]) }))
      .query(async ({ ctx, input }) => {
        const contact = await db.getContactByIdOrCaseId(input.id, ctx.user.id);
        if (!contact) throw new TRPCError({ code: "NOT_FOUND" });
        const contactId = contact.id;
        const [projects, invoices, contracts, appointments, files, messages, parentContact] = await Promise.all([
          db.getProjectsByClient(contactId),
          db.getInvoicesByClient(contactId),
          db.getContractsByClient(contactId),
          db.getAppointmentsByClient(contactId),
          db.getClientFilesByClient(contactId),
          db.getMessagesBetween(ctx.user.id, contactId),
          contact.parentContactId
            ? db.getContactById(contact.parentContactId, ctx.user.id)
            : Promise.resolve(null),
        ]);
        // Fetch compass using caseId (unique per student)
        const compass = contact.caseId
          ? await db.getCaseCompass(contact.caseId)
          : null;
        const compassHistory = contact.caseId
          ? await db.getCaseCompassHistory(contact.caseId)
          : [];
        return { contact, projects, invoices, contracts, appointments, files, messages, compass, compassHistory, parentContact };
      }),

    // Get students linked to a parent contact with next meeting + task summary
    getStudentsWithSummary: requireStaffModule("contacts", "view")
      .input(z.object({ parentContactId: z.number() }))
      .query(async ({ input }) => {
        return await db.getStudentsWithSummary(input.parentContactId);
      }),

    // Link or reassign a client contact to a portal user account (authorized for Call Center & staff with manage_portal_access)
    linkPortalUser: requireStaffPermission("manage_portal_access")
      .input(z.object({ contactId: z.number(), portalUserId: z.number().nullable() }))
      .mutation(async ({ ctx, input }) => {
        const targetContact = await db.getContactById(input.contactId, ctx.user.id);
        if (!targetContact) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Client contact not found." });
        }

        if (input.portalUserId !== null) {
          // 1. Never allow linking a staff, developer, or owner user account as a client portal user
          if (
            isProtectedOwnerAccount(input.portalUserId) ||
            CONFIRMED_STAFF_PROFILES.some(p => p.userId === Number(input.portalUserId))
          ) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Cannot link a staff, developer, or administrator account as a client portal user.",
            });
          }
          const targetStaffCheck = await resolveStaffAccess({ id: input.portalUserId });
          if (targetStaffCheck.isStaff || targetStaffCheck.hasAdminAccess || targetStaffCheck.isProtectedOwner) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Cannot link a staff, developer, or administrator account as a client portal user.",
            });
          }

          // 2. Prevent cross-family account exposure: ensure portalUserId is not already linked to an unrelated family
          const allContacts = await db.getContactsByOwner(ctx.user.id);
          const conflictingContact = allContacts.find(
            (c: any) =>
              c.id !== targetContact.id &&
              c.parentContactId !== targetContact.id &&
              targetContact.parentContactId !== c.id &&
              (targetContact.parentContactId == null || c.parentContactId !== targetContact.parentContactId) &&
              Number(c.portalUserId) === Number(input.portalUserId)
          );
          if (conflictingContact) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                "This portal user ID is already linked to another family's account. Cross-family account assignment is prohibited unless the prior association is unlinked first.",
            });
          }
        }

        const res = await db.updateContact(input.contactId, ctx.user.id, {
          portalUserId: input.portalUserId,
          portalAccess: input.portalUserId !== null ? "active" : "inactive",
        });

        try {
          await recordCaseActivity({
            studentContactId: input.contactId,
            caseId: targetContact.caseId || `WP-${input.contactId}`,
            eventType: "portal_user_linked",
            title: input.portalUserId !== null ? "Client Portal Account Linked" : "Client Portal Account Unlinked",
            description: `Portal user association set to ${input.portalUserId ?? "none"} on contact #${input.contactId} by ${ctx.user.name || "Waypoint Staff"}`,
            ownerName: ctx.user.name || "Waypoint Staff",
            ownerRole: ctx.staffAccess?.primaryRole || "Staff",
            eventDate: new Date(),
          });
        } catch {}

        return res;
      }),

    // Validated reassignment of parent/student relationship and client portal ownership
    reassignClientOwnership: requireStaffPermission("manage_portal_access")
      .input(
        z.object({
          studentContactId: z.number(),
          newParentContactId: z.number(),
          reason: z.string().min(3, "Reason for reassignment is required for audit trail"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (input.studentContactId === input.newParentContactId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Student contact and parent contact must be distinct records.",
          });
        }

        const student = await db.getContactById(input.studentContactId, ctx.user.id);
        if (!student) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Student contact not found." });
        }

        const newParent = await db.getContactById(input.newParentContactId, ctx.user.id);
        if (!newParent) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Target parent contact not found." });
        }
        if ((newParent as any).parentContactId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Target contact is a student record and cannot be assigned as a parent.",
          });
        }

        const prevParentId = student.parentContactId ?? null;
        await db.updateContact(input.studentContactId, ctx.user.id, {
          parentContactId: input.newParentContactId,
        });

        try {
          await recordCaseActivity({
            studentContactId: input.studentContactId,
            caseId: student.caseId || `WP-${input.studentContactId}`,
            eventType: "client_ownership_reassigned",
            title: "Parent / Student Account Association Updated",
            description: `Student #${input.studentContactId} reassigned from parent #${prevParentId ?? "none"} to parent #${input.newParentContactId} by ${ctx.user.name || "Waypoint Staff"}. Reason: ${input.reason}`,
            ownerName: ctx.user.name || "Waypoint Staff",
            ownerRole: ctx.staffAccess?.primaryRole || "Staff",
            eventDate: new Date(),
          });
        } catch {}

        return {
          success: true,
          studentContactId: input.studentContactId,
          previousParentContactId: prevParentId,
          newParentContactId: input.newParentContactId,
        };
      }),

    // Send portal link to parent contact(s) via email
    sendPortalLink: requireStaffPermission("manage_portal_access")
      .input(z.object({
        parentContactIds: z.array(z.number()).min(1),
        portalLink: z.string(),
        studentName: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { sendEmail } = await import("../_core/email");
        
        // Fetch parent contact details
        const parentContacts = await Promise.all(
          input.parentContactIds.map(id => db.getContactById(id, ctx.user.id))
        );

        const validContacts = parentContacts
          .filter(contact => contact?.email)
          .map(contact => ({
            email: contact!.email!,
            name: `${contact!.firstName} ${contact!.lastName}`,
          }));

        if (validContacts.length === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'No parent contacts with valid email addresses found.',
          });
        }

        // Send email to each parent contact
        const emailResults = await Promise.all(
          validContacts.map(contact =>
            sendEmail({
              to: contact.email,
              subject: `Portal Access for ${input.studentName}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px;">
                  <h2>Portal Access</h2>
                  <p>Hello ${contact.name},</p>
                  <p>You have been granted access to the client portal for <strong>${input.studentName}</strong>.</p>
                  <p style="margin-top: 20px;">
                    <a href="${input.portalLink}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Access Portal</a>
                  </p>
                  <p style="margin-top: 20px; color: #666; font-size: 14px;">If you have any questions, please contact us.</p>
                </div>
              `,
            })
          )
        );

        const successCount = emailResults.filter(Boolean).length;
        return {
          sent: successCount,
          total: validContacts.length,
          success: successCount > 0,
        };
      }),

    // Archive a contact with a custom reason
    archive: adminProcedure
      .input(z.object({
        id: z.number(),
        reason: z.string().min(1, "Archive reason is required"),
      }))
      .mutation(async ({ ctx, input }) => {
        const { contacts: contactsTable } = await import("../../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await dbConn
          .update(contactsTable)
          .set({ archivedAt: new Date(), archiveReason: input.reason })
          .where(and(eq(contactsTable.id, input.id), eq(contactsTable.ownerId, ctx.user.id)));
        return { success: true };
      }),

    // Unarchive a contact
    unarchive: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { contacts: contactsTable } = await import("../../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await dbConn
          .update(contactsTable)
          .set({ archivedAt: null, archiveReason: null })
          .where(and(eq(contactsTable.id, input.id), eq(contactsTable.ownerId, ctx.user.id)));
        return { success: true };
      }),
  
});

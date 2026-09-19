import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { brainDumpItems, brainDumpImages } from "../../drizzle/schema";
import { recordCaseActivity } from "../services/caseActivityService";

export const contactsRouter = router({

    list: adminProcedure.query(async ({ ctx }) => {
      const contacts = await db.getContactsByOwner(ctx.user.id);
      console.log('[contacts.list] User:', ctx.user.id, 'Contacts:', contacts.length, contacts);
      return contacts;
    }),

    get: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getContactById(input.id, ctx.user.id);
      }),

    create: adminProcedure
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
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await db.createContact(input, ctx.user.id);
      }),

    update: adminProcedure
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
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return await db.updateContact(id, ctx.user.id, data);
      }),

    updateJourneyState: protectedProcedure
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

        const isManager = ctx.user.role === "admin";
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
            ownerName: ctx.user.name || "Byron Clausen",
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
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const contact = await db.getContactById(input.id, ctx.user.id);
        if (!contact) throw new TRPCError({ code: "NOT_FOUND" });
        const [projects, invoices, contracts, appointments, files, messages, parentContact] = await Promise.all([
          db.getProjectsByClient(input.id),
          db.getInvoicesByClient(input.id),
          db.getContractsByClient(input.id),
          db.getAppointmentsByClient(input.id),
          db.getClientFilesByClient(input.id),
          db.getMessagesBetween(ctx.user.id, input.id),
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
    getStudentsWithSummary: adminProcedure
      .input(z.object({ parentContactId: z.number() }))
      .query(async ({ input }) => {
        return await db.getStudentsWithSummary(input.parentContactId);
      }),

    // Link a contact to a portal user account
    linkPortalUser: adminProcedure
      .input(z.object({ contactId: z.number(), portalUserId: z.number().nullable() }))
      .mutation(async ({ ctx, input }) => {
        return await db.updateContact(input.contactId, ctx.user.id, { portalUserId: input.portalUserId });
      }),

    // Send portal link to parent contact(s) via email
    sendPortalLink: adminProcedure
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

import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { brainDumpItems, brainDumpImages } from "../../drizzle/schema";

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
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return await db.updateContact(id, ctx.user.id, data);
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
        const [projects, invoices, contracts, appointments, files, messages] = await Promise.all([
          db.getProjectsByClient(input.id),
          db.getInvoicesByClient(input.id),
          db.getContractsByClient(input.id),
          db.getAppointmentsByClient(input.id),
          db.getClientFilesByClient(input.id),
          db.getMessagesBetween(ctx.user.id, input.id),
        ]);
        // Fetch compass using caseId (unique per student)
        const compass = contact.caseId
          ? await db.getCaseCompass(contact.caseId)
          : null;
        const compassHistory = contact.caseId
          ? await db.getCaseCompassHistory(contact.caseId)
          : [];
        return { contact, projects, invoices, contracts, appointments, files, messages, compass, compassHistory };
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

import { z } from "zod";
import * as db from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure, portalProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { brainDumpItems, brainDumpImages } from "../../drizzle/schema";

export const leadFormsRouter = router({

    // List all forms for the owner
    list: adminProcedure.query(async ({ ctx }) => {
      return await db.getLeadForms(ctx.user.id);
    }),

    // Get or auto-create the built-in public intake form record (admin only)
    getPublicIntakeForm: adminProcedure.query(async ({ ctx }) => {
      const slug = "public-intake";
      let form = await db.getLeadFormBySlug(slug);
      if (!form) {
        // Auto-create the record so it can be edited
        const result = await db.createLeadForm({
          ownerId: ctx.user.id,
          name: "Public Intake Form",
          slug,
          description: "Default public intake form for families",
          schedulingEnabled: false,
          schedulingType: "builtin",
          isActive: true,
        });
        const id = db.getInsertId(result);
        form = await db.getLeadFormBySlug(slug);
      }
      return form;
    }),

    // Get a single form by slug (public — for rendering the form)
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const form = await db.getLeadFormBySlug(input.slug);
        if (!form || !form.isActive) throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
        return form;
      }),

    // Create a new form
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        schedulingEnabled: z.boolean().default(false),
        schedulingType: z.enum(["builtin", "external"]).default("builtin"),
        schedulingUrl: z.string().optional(),
        schedulingLabel: z.string().optional(),
        isActive: z.boolean().default(true),
        fields: z.array(z.string()).optional(),
        customLabels: z.string().optional(),
        sessionTypeId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Auto-generate slug from name
        const baseSlug = input.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 80);
        // Ensure uniqueness by appending timestamp if needed
        const existing = await db.getLeadFormBySlug(baseSlug);
        const slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug;
        const result = await db.createLeadForm({
          ownerId: ctx.user.id,
          name: input.name,
          slug,
          description: input.description,
          schedulingEnabled: input.schedulingEnabled,
          schedulingType: input.schedulingType,
          schedulingUrl: input.schedulingUrl,
          schedulingLabel: input.schedulingLabel,
          isActive: input.isActive,
          fields: input.fields ? JSON.stringify(input.fields) : undefined,
          customLabels: input.customLabels,
          sessionTypeId: input.sessionTypeId,
        });
        const id = db.getInsertId(result);
        return { id, slug };
      }),

    // Update an existing form
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        schedulingEnabled: z.boolean().optional(),
        schedulingType: z.enum(["builtin", "external"]).optional(),
        schedulingUrl: z.string().optional(),
        schedulingLabel: z.string().optional(),
        isActive: z.boolean().optional(),
        fields: z.array(z.string()).optional(),
        customLabels: z.string().optional(),
        sessionTypeId: z.number().nullable().optional(),
        confirmationHeadline: z.string().max(200).optional(),
        confirmationBody: z.string().optional(),
        saveOurNumberMessage: z.string().optional(),
        confirmationImageKey: z.string().optional().nullable(),
        confirmationImageUrl: z.string().optional().nullable(),
        confirmationHeadlineAlign: z.enum(["left", "center"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, fields, customLabels, sessionTypeId, ...rest } = input;
        await db.updateLeadForm(id, ctx.user.id, {
          ...rest,
          ...(fields !== undefined ? { fields: JSON.stringify(fields) } : {}),
          ...(customLabels !== undefined ? { customLabels } : {}),
          ...(sessionTypeId !== undefined ? { sessionTypeId } : {}),
        });
        return { success: true };
      }),
    // Delete a form
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteLeadForm(input.id, ctx.user.id);
        return { success: true };
      }),

    // Submit a custom form (public)
    submit: publicProcedure
      .input(z.object({
        slug: z.string(),
        parentFirstName: z.string().min(1),
        parentLastName: z.string().min(1),
        parentEmail: z.string().email(),
        parentPhone: z.string().min(1),
        timezone: z.string().optional(),
        bestTimeToCall: z.string().optional(),
        howHeardAboutUs: z.string().optional(),
        referredBy: z.string().optional(),
        secondParentName: z.string().optional(),
        secondParentPhone: z.string().optional(),
        secondParentEmail: z.string().optional(),
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
        // Get form and owner
        const form = await db.getLeadFormBySlug(input.slug);
        if (!form || !form.isActive) throw new TRPCError({ code: "NOT_FOUND", message: "Form not found" });
        const ownerId = form.ownerId;
        // Create parent contact
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
        }, ownerId);
        const parentContactId = db.getInsertId(parentResult);
        // Create student contact
        const studentResult = await db.createContact({
          firstName: input.studentFirstName,
          lastName: input.studentLastName,
          jobTitle: "Student",
          parentContactId,
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
        const studentContact = await db.getContactById(studentContactId, ownerId);
        const caseId = studentContact?.caseId || `WP-${new Date().getFullYear()}-${studentContactId}`;
        // Create project
        await db.createProject({
          clientId: studentContactId,
          name: `${input.studentFirstName} ${input.studentLastName} — Case`,
          description: `Case from form: ${form.name}. Diagnosis: ${input.diagnosis || 'Not specified'}.`,
          status: "Planning",
        }, ownerId);
        // Create lead
        await db.createLead({
          contactId: parentContactId,
          source: form.name,
          status: "New",
          notes: `Form submission: ${form.name}. Student: ${input.studentFirstName} ${input.studentLastName}.`,
        }, ownerId);
        // Increment submission count
        await db.incrementLeadFormSubmissionCount(input.slug);
        
        // Get worksheet if assigned to this form
        let worksheetUrl: string | null = null;
        if (form.worksheetId) {
          const worksheet = await db.getDiscoveryWorksheet(ownerId);
          if (worksheet?.fileKey) {
            const { storageGet } = await import("../storage");
            const presigned = await storageGet(worksheet.fileKey);
            worksheetUrl = presigned.url;
          }
        }
        
        // Notify
        await notifyOwner({
          title: `New Lead via "${form.name}": ${input.parentFirstName} ${input.parentLastName}`,
          content: `Form: ${form.name}\nParent: ${input.parentFirstName} ${input.parentLastName} (${input.parentEmail})\nStudent: ${input.studentFirstName} ${input.studentLastName}\nCase ID: ${caseId}`,
        });
        return { success: true, caseId, parentContactId, studentContactId, worksheetUrl };
      }),
    // Upload a confirmation page image (QR code, logo, etc.)
    uploadConfirmationImage: adminProcedure
      .input(z.object({
        formId: z.number(),
        fileName: z.string().min(1),
        fileData: z.string().min(1), // base64
        mimeType: z.string().default("image/png"),
      }))
      .mutation(async ({ ctx, input }) => {
        const fileBuffer = Buffer.from(input.fileData, "base64");
        const ext = input.fileName.split(".").pop() ?? "png";
        const fileKey = `lead-forms/${ctx.user.id}/confirmation-${input.formId}-${Date.now()}.${ext}`;
        const { key, url } = await storagePut(fileKey, fileBuffer, input.mimeType);
        await db.updateLeadForm(input.formId, ctx.user.id, {
          confirmationImageKey: key,
          confirmationImageUrl: url,
        });
        return { success: true, key, url };
      }),

    // Assign a worksheet to a lead form
    assignWorksheet: adminProcedure
      .input(z.object({
        formId: z.number(),
        worksheetId: z.number().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateLeadForm(input.formId, ctx.user.id, {
          worksheetId: input.worksheetId,
        });
        return { success: true };
      }),
  
});

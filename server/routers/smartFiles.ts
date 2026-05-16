/**
 * Smart File Builder router
 * Handles templates, blocks, add-ons, assignments, and portal submission.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, portalProcedure } from "../\_core/trpc";
import * as dbModule from "../db";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getDbConn() {
  const dbConn = await dbModule.getDb();
  if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
  return dbConn;
}
// ─── Block / AddOn schemas ───────────────────────────────────────────────────

const blockSchema = z.object({
  id: z.number().optional(),
  blockOrder: z.number(),
  type: z.string(),
  content: z.string().optional().nullable(),   // JSON string
  settings: z.string().optional().nullable(),  // JSON string
});

const addOnSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1),
  shortDescription: z.string().optional().nullable(),
  price: z.string().default("0.00"),
  contractText: z.string().optional().nullable(),
  isRequired: z.number().default(0),
  sortOrder: z.number().default(0),
});

// ─── Router ─────────────────────────────────────────────────────────────────

export const smartFilesRouter = router({

  // ── Templates ──────────────────────────────────────────────────────────────

  listTemplates: protectedProcedure.query(async ({ ctx }) => {
    const { smartFileTemplates: sft } = await import("../../drizzle/schema");
    const { eq, desc } = await import("drizzle-orm");
    const dbConn = await getDbConn();
    return dbConn
      .select()
      .from(sft)
      .where(eq(sft.ownerId, ctx.user.id))
      .orderBy(desc(sft.updatedAt));
  }),

  getTemplate: protectedProcedure
    .input(z.object({ templateId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { smartFileTemplates: sft, smartFileBlocks: sfb, smartFileAddOns: sfa } = await import("../../drizzle/schema");
      const { eq, and, asc } = await import("drizzle-orm");
      const dbConn = await getDbConn();
      const [template] = await dbConn
        .select()
        .from(sft)
        .where(and(eq(sft.id, input.templateId), eq(sft.ownerId, ctx.user.id)))
        .limit(1);
      if (!template) throw new TRPCError({ code: "NOT_FOUND" });
      const blocks = await dbConn
        .select()
        .from(sfb)
        .where(eq(sfb.templateId, input.templateId))
        .orderBy(asc(sfb.blockOrder));
      const addOns = await dbConn
        .select()
        .from(sfa)
        .where(eq(sfa.templateId, input.templateId))
        .orderBy(asc(sfa.sortOrder));
      return { ...template, blocks, addOns };
    }),

  createTemplate: protectedProcedure
    .input(z.object({ name: z.string().min(1), description: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { smartFileTemplates: sft } = await import("../../drizzle/schema");
      const dbConn = await getDbConn();
      const [result] = await dbConn.insert(sft).values({
        ownerId: ctx.user.id,
        name: input.name,
        description: input.description ?? null,
        status: "draft",
      });
      return { id: (result as any).insertId as number };
    }),

  updateTemplate: protectedProcedure
    .input(z.object({
      templateId: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional().nullable(),
      status: z.enum(["draft", "active", "archived"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { smartFileTemplates: sft } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      const dbConn = await getDbConn();
      const updates: Record<string, unknown> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (input.status !== undefined) updates.status = input.status;
      await dbConn.update(sft).set(updates).where(and(eq(sft.id, input.templateId), eq(sft.ownerId, ctx.user.id)));
      return { success: true };
    }),

  duplicateTemplate: protectedProcedure
    .input(z.object({ templateId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { smartFileTemplates: sft, smartFileBlocks: sfb, smartFileAddOns: sfa } = await import("../../drizzle/schema");
      const { eq, and, asc } = await import("drizzle-orm");
      const dbConn = await getDbConn();
      const [original] = await dbConn
        .select()
        .from(sft)
        .where(and(eq(sft.id, input.templateId), eq(sft.ownerId, ctx.user.id)))
        .limit(1);
      if (!original) throw new TRPCError({ code: "NOT_FOUND" });
      const [newResult] = await dbConn.insert(sft).values({
        ownerId: ctx.user.id,
        name: `${original.name} (Copy)`,
        description: original.description,
        status: "draft",
      });
      const newTemplateId = (newResult as any).insertId as number;
      const blocks = await dbConn.select().from(sfb).where(eq(sfb.templateId, input.templateId)).orderBy(asc(sfb.blockOrder));
      for (const block of blocks) {
        await dbConn.insert(sfb).values({
          templateId: newTemplateId,
          blockOrder: block.blockOrder,
          type: block.type,
          content: block.content,
          settings: block.settings,
        });
      }
      const addOns = await dbConn.select().from(sfa).where(eq(sfa.templateId, input.templateId)).orderBy(asc(sfa.sortOrder));
      for (const addOn of addOns) {
        await dbConn.insert(sfa).values({
          templateId: newTemplateId,
          name: addOn.name,
          shortDescription: addOn.shortDescription,
          price: addOn.price,
          contractText: addOn.contractText,
          isRequired: addOn.isRequired,
          sortOrder: addOn.sortOrder,
        });
      }
      return { id: newTemplateId };
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ templateId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { smartFileTemplates: sft } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      const dbConn = await getDbConn();
      await dbConn.update(sft).set({ status: "archived" }).where(and(eq(sft.id, input.templateId), eq(sft.ownerId, ctx.user.id)));
      return { success: true };
    }),

  // ── Blocks ─────────────────────────────────────────────────────────────────

  saveBlocks: protectedProcedure
    .input(z.object({
      templateId: z.number(),
      blocks: z.array(blockSchema),
    }))
    .mutation(async ({ ctx, input }) => {
      const { smartFileTemplates: sft, smartFileBlocks: sfb } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      const dbConn = await getDbConn();
      // Verify ownership
      const [template] = await dbConn.select().from(sft).where(and(eq(sft.id, input.templateId), eq(sft.ownerId, ctx.user.id))).limit(1);
      if (!template) throw new TRPCError({ code: "NOT_FOUND" });
      // Delete all existing blocks and re-insert (simplest approach for reordering)
      await dbConn.delete(sfb).where(eq(sfb.templateId, input.templateId));
      for (const block of input.blocks) {
        await dbConn.insert(sfb).values({
          templateId: input.templateId,
          blockOrder: block.blockOrder,
          type: block.type,
          content: block.content ?? null,
          settings: block.settings ?? null,
        });
      }
      return { success: true };
    }),

  // ── Add-Ons ────────────────────────────────────────────────────────────────

  saveAddOns: protectedProcedure
    .input(z.object({
      templateId: z.number(),
      addOns: z.array(addOnSchema),
    }))
    .mutation(async ({ ctx, input }) => {
      const { smartFileTemplates: sft, smartFileAddOns: sfa } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      const dbConn = await getDbConn();
      const [template] = await dbConn.select().from(sft).where(and(eq(sft.id, input.templateId), eq(sft.ownerId, ctx.user.id))).limit(1);
      if (!template) throw new TRPCError({ code: "NOT_FOUND" });
      await dbConn.delete(sfa).where(eq(sfa.templateId, input.templateId));
      for (const addOn of input.addOns) {
        await dbConn.insert(sfa).values({
          templateId: input.templateId,
          name: addOn.name,
          shortDescription: addOn.shortDescription ?? null,
          price: addOn.price,
          contractText: addOn.contractText ?? null,
          isRequired: addOn.isRequired,
          sortOrder: addOn.sortOrder,
        });
      }
      return { success: true };
    }),

  // ── Assignments ────────────────────────────────────────────────────────────

  listAssignments: protectedProcedure
    .input(z.object({ contactId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const { smartFileAssignments: sfas, smartFileTemplates: sft, contacts } = await import("../../drizzle/schema");
      const { eq, and, desc } = await import("drizzle-orm");
      const dbConn = await getDbConn();
      const rows = await dbConn
        .select({
          assignment: sfas,
          templateName: sft.name,
          contactFirstName: contacts.firstName,
          contactLastName: contacts.lastName,
        })
        .from(sfas)
        .leftJoin(sft, eq(sfas.templateId, sft.id))
        .leftJoin(contacts, eq(sfas.contactId, contacts.id))
        .where(
          input?.contactId
            ? and(eq(sfas.ownerId, ctx.user.id), eq(sfas.contactId, input.contactId))
            : eq(sfas.ownerId, ctx.user.id)
        )
        .orderBy(desc(sfas.updatedAt));
      return rows;
    }),

  assignToClient: protectedProcedure
    .input(z.object({
      templateId: z.number(),
      contactId: z.number(),
      studentContactId: z.number().optional(),
      dueDate: z.string().optional(),
      sendNow: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const { smartFileAssignments: sfas } = await import("../../drizzle/schema");
      const dbConn = await getDbConn();
      const now = new Date();
      const [result] = await dbConn.insert(sfas).values({
        templateId: input.templateId,
        ownerId: ctx.user.id,
        contactId: input.contactId,
        studentContactId: input.studentContactId ?? null,
        status: input.sendNow ? "sent" : "draft",
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        sentAt: input.sendNow ? now : null,
      });
      return { id: (result as any).insertId as number };
    }),

  getAssignment: protectedProcedure
    .input(z.object({ assignmentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { smartFileAssignments: sfas, smartFileTemplates: sft, smartFileBlocks: sfb, smartFileAddOns: sfa, contacts } = await import("../../drizzle/schema");
      const { eq, and, asc } = await import("drizzle-orm");
      const dbConn = await getDbConn();
      const [assignment] = await dbConn
        .select()
        .from(sfas)
        .where(and(eq(sfas.id, input.assignmentId), eq(sfas.ownerId, ctx.user.id)))
        .limit(1);
      if (!assignment) throw new TRPCError({ code: "NOT_FOUND" });
      const [template] = await dbConn.select().from(sft).where(eq(sft.id, assignment.templateId)).limit(1);
      const blocks = await dbConn.select().from(sfb).where(eq(sfb.templateId, assignment.templateId)).orderBy(asc(sfb.blockOrder));
      const addOns = await dbConn.select().from(sfa).where(eq(sfa.templateId, assignment.templateId)).orderBy(asc(sfa.sortOrder));
      const [contact] = await dbConn.select().from(contacts).where(eq(contacts.id, assignment.contactId)).limit(1);
      let student = null;
      if (assignment.studentContactId) {
        const [s] = await dbConn.select().from(contacts).where(eq(contacts.id, assignment.studentContactId)).limit(1);
        student = s ?? null;
      }
      return { assignment, template, blocks, addOns, contact, student };
    }),

  voidAssignment: protectedProcedure
    .input(z.object({ assignmentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { smartFileAssignments: sfas } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      const dbConn = await getDbConn();
      await dbConn.update(sfas).set({ status: "cancelled" }).where(and(eq(sfas.id, input.assignmentId), eq(sfas.ownerId, ctx.user.id)));
      return { success: true };
    }),

  // ── Portal: client-facing procedures ──────────────────────────────────────

  portalListAssignments: portalProcedure.query(async ({ ctx }) => {
    const { smartFileAssignments: sfas, smartFileTemplates: sft, contacts } = await import("../../drizzle/schema");
    const { eq, and, desc, ne } = await import("drizzle-orm");
    const dbConn = await getDbConn();
    // portalContactId is the parent contact's id
    const portalContactId = ctx.portalContactId;
    if (!portalContactId) return []; // admin preview with no contact context
    // Find all contacts linked to this portal contact (the parent themselves + their students)
    const allContacts = await dbConn.select({ id: contacts.id }).from(contacts)
      .where(eq(contacts.id, portalContactId));
    const contactIds = allContacts.map((c: { id: number }) => c.id);
    if (contactIds.length === 0) return [];
    // Fetch assignments for any of those contacts
    const rows = await dbConn
      .select({ assignment: sfas, templateName: sft.name })
      .from(sfas)
      .leftJoin(sft, eq(sfas.templateId, sft.id))
      .where(and(
        ne(sfas.status, "cancelled"),
        ne(sfas.status, "draft"),
        eq(sfas.contactId, portalContactId),
      ))
      .orderBy(desc(sfas.updatedAt));
    return rows;
  }),

  portalGetAssignment: portalProcedure
    .input(z.object({ assignmentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { smartFileAssignments: sfas, smartFileTemplates: sft, smartFileBlocks: sfb, smartFileAddOns: sfa, contacts } = await import("../../drizzle/schema");
      const { eq, asc } = await import("drizzle-orm");
      const dbConn = await getDbConn();
      const [assignment] = await dbConn.select().from(sfas).where(eq(sfas.id, input.assignmentId)).limit(1);
      if (!assignment) throw new TRPCError({ code: "NOT_FOUND" });
      // Verify this portal user owns the contact
      const [contact] = await dbConn.select().from(contacts).where(eq(contacts.id, assignment.contactId)).limit(1);
      const portalContactId = ctx.portalContactId;
      if (!contact || (portalContactId !== null && contact.id !== portalContactId)) throw new TRPCError({ code: "FORBIDDEN" });
      const [template] = await dbConn.select().from(sft).where(eq(sft.id, assignment.templateId)).limit(1);
      const blocks = await dbConn.select().from(sfb).where(eq(sfb.templateId, assignment.templateId)).orderBy(asc(sfb.blockOrder));
      const addOns = await dbConn.select().from(sfa).where(eq(sfa.templateId, assignment.templateId)).orderBy(asc(sfa.sortOrder));
      let student = null;
      if (assignment.studentContactId) {
        const [s] = await dbConn.select().from(contacts).where(eq(contacts.id, assignment.studentContactId)).limit(1);
        student = s ?? null;
      }
      return { assignment, template, blocks, addOns, contact, student };
    }),

  portalMarkViewed: portalProcedure
    .input(z.object({ assignmentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { smartFileAssignments: sfas, contacts } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const dbConn = await getDbConn();
      const [assignment] = await dbConn.select().from(sfas).where(eq(sfas.id, input.assignmentId)).limit(1);
      if (!assignment) throw new TRPCError({ code: "NOT_FOUND" });
      const [contact] = await dbConn.select().from(contacts).where(eq(contacts.id, assignment.contactId)).limit(1);
      const portalContactIdMv = ctx.portalContactId;
      if (!contact || (portalContactIdMv !== null && contact.id !== portalContactIdMv)) throw new TRPCError({ code: "FORBIDDEN" });
      if (assignment.status === "sent") {
        await dbConn.update(sfas).set({ status: "viewed", viewedAt: new Date() }).where(eq(sfas.id, input.assignmentId));
      }
      return { success: true };
    }),

  portalSubmit: portalProcedure
    .input(z.object({
      assignmentId: z.number(),
      fieldValues: z.string(),       // JSON string: { blockId: value }
      initialsData: z.string().optional(), // JSON string: { blockId: initials }
      signatureName: z.string().min(1),
      paymentOption: z.enum(["one_time", "monthly"]).optional(),
      selectedAddOnIds: z.string().optional(), // JSON string: [id, ...]
    }))
    .mutation(async ({ ctx, input }) => {
      const { smartFileAssignments: sfas, contacts } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const dbConn = await getDbConn();
      const [assignment] = await dbConn.select().from(sfas).where(eq(sfas.id, input.assignmentId)).limit(1);
      if (!assignment) throw new TRPCError({ code: "NOT_FOUND" });
      const [contact] = await dbConn.select().from(contacts).where(eq(contacts.id, assignment.contactId)).limit(1);
      const portalContactIdSub = ctx.portalContactId;
      if (!contact || (portalContactIdSub !== null && contact.id !== portalContactIdSub)) throw new TRPCError({ code: "FORBIDDEN" });
      const now = new Date();
      await dbConn.update(sfas).set({
        status: "completed",
        completedAt: now,
        signedAt: now,
        signatureName: input.signatureName,
        fieldValues: input.fieldValues,
        initialsData: input.initialsData ?? null,
        paymentOption: input.paymentOption ?? null,
        selectedAddOnIds: input.selectedAddOnIds ?? null,
      }).where(eq(sfas.id, input.assignmentId));
      return { success: true };
    }),
});

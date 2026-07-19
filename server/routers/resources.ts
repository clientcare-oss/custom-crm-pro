import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { and, eq, desc, asc, gte } from "drizzle-orm";
import * as db from "../db";

export const resourcesRouter = router({
    list: adminProcedure.query(async ({ ctx }) => {
      const { resources: resourcesTable } = await import("../../drizzle/schema");
      const { eq: req, asc: rasc } = await import("drizzle-orm");
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return await dbConn.select().from(resourcesTable)
        .where(req(resourcesTable.ownerId, ctx.user.id))
        .orderBy(rasc(resourcesTable.name));
    }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        specialty: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        website: z.string().optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
        category: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { resources: resourcesTable } = await import("../../drizzle/schema");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const result = await dbConn.insert(resourcesTable).values({ ...input, ownerId: ctx.user.id });
        return { id: (result as any).insertId };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        specialty: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        website: z.string().optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
        category: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { resources: resourcesTable } = await import("../../drizzle/schema");
        const { eq: req } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { id, ...data } = input;
        await dbConn.update(resourcesTable).set(data)
          .where(and(req(resourcesTable.id, id), req(resourcesTable.ownerId, ctx.user.id)));
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { resources: resourcesTable } = await import("../../drizzle/schema");
        const { eq: req } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await dbConn.delete(resourcesTable)
          .where(and(req(resourcesTable.id, input.id), req(resourcesTable.ownerId, ctx.user.id)));
        return { success: true };
      }),

    // Share a resource with a client: sends email + creates portal message
    share: adminProcedure
      .input(z.object({
        resourceId: z.number(),
        contactId: z.number(),  // parent contact with portal access
        message: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { resources: resourcesTable } = await import("../../drizzle/schema");
        const { eq: req } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // Get resource
        const [resource] = await dbConn.select().from(resourcesTable)
          .where(and(req(resourcesTable.id, input.resourceId), req(resourcesTable.ownerId, ctx.user.id)))
          .limit(1);
        if (!resource) throw new TRPCError({ code: "NOT_FOUND" });
        // Get contact
        const contact = await db.getContactById(input.contactId, ctx.user.id);
        if (!contact) throw new TRPCError({ code: "NOT_FOUND" });
        const resourceBody = [
          `**${resource.name}**`,
          resource.specialty ? `Specialty: ${resource.specialty}` : null,
          resource.phone ? `Phone: ${resource.phone}` : null,
          resource.email ? `Email: ${resource.email}` : null,
          resource.website ? `Website: ${resource.website}` : null,
          resource.notes ? `\nNotes: ${resource.notes}` : null,
          input.message ? `\n${input.message}` : null,
        ].filter(Boolean).join("\n");
        // Send email if contact has email
        if (contact.email) {
          const { sendEmail } = await import("../_core/email");
          await sendEmail({
            to: contact.email,
            subject: `Resource Recommendation: ${resource.name}`,
            html: `<div style="font-family:Arial,sans-serif;max-width:600px">
              <h2>Resource Recommendation</h2>
              <p>Hello ${contact.firstName},</p>
              <p>Your advocate has shared the following resource with you:</p>
              <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0">
                <strong>${resource.name}</strong>${resource.specialty ? ` — ${resource.specialty}` : ""}<br/>
                ${resource.phone ? `📞 ${resource.phone}<br/>` : ""}
                ${resource.email ? `✉️ ${resource.email}<br/>` : ""}
                ${resource.website ? `🌐 <a href="${resource.website}">${resource.website}</a><br/>` : ""}
                ${resource.notes ? `<p style="margin-top:8px">${resource.notes}</p>` : ""}
              </div>
              ${input.message ? `<p>${input.message}</p>` : ""}
            </div>`,
          });
        }
        // Create portal message if contact has portal user
        if (contact.portalUserId) {
          await db.createMessage({
            senderId: ctx.user.id,
            recipientId: contact.portalUserId,
            content: resourceBody,
          });
        }
        return { success: true, emailSent: !!contact.email, messageSent: !!contact.portalUserId };
      }),
  });

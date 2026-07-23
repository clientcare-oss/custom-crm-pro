import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { and, eq, desc, asc, gte } from "drizzle-orm";
import * as db from "../db";

export const discoveryRouter = router({
    // Get or create a discovery call session for a lead
    getOrCreate: adminProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { discoveryCalls, discoveryPipelineSteps, discoveryQuestions } = await import("../../drizzle/schema");
        const { eq: deq, asc: dasc } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // Get existing call
        const [existing] = await dbConn.select().from(discoveryCalls)
          .where(and(deq(discoveryCalls.leadId, input.leadId), deq(discoveryCalls.ownerId, ctx.user.id)))
          .limit(1);
        if (existing) return existing;
        // Create new call session
        const result = await dbConn.insert(discoveryCalls).values({ leadId: input.leadId, ownerId: ctx.user.id });
        const [created] = await dbConn.select().from(discoveryCalls)
          .where(deq(discoveryCalls.id, (result as any).insertId))
          .limit(1);
        return created;
      }),

    // Save/autosave call session data
    save: adminProcedure
      .input(z.object({
        leadId: z.number(),
        currentStepId: z.number().optional(),
        status: z.enum(["Preparing", "In Progress", "Completed", "Lost"]).optional(),
        openingScript: z.string().optional(),
        voicemailScript: z.string().optional(),
        callScriptNotes: z.string().optional(),
        theirStoryNotes: z.string().optional(),
        questionNotes: z.string().optional(),
        questionMode: z.string().optional(),
        howItWorksNotes: z.string().optional(),
        pricingNotes: z.string().optional(),
        closingResponse: z.string().optional(),
        nextStepsCompleted: z.string().optional(),
        lostStepsCompleted: z.string().optional(),
        additionalNotes: z.string().optional(),
        privateNotes: z.string().optional(),
        scheduledAt: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { discoveryCalls } = await import("../../drizzle/schema");
        const { eq: deq } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { leadId, ...data } = input;
        // Upsert
        const [existing] = await dbConn.select().from(discoveryCalls)
          .where(and(deq(discoveryCalls.leadId, leadId), deq(discoveryCalls.ownerId, ctx.user.id)))
          .limit(1);
        if (existing) {
          await dbConn.update(discoveryCalls).set(data).where(deq(discoveryCalls.id, existing.id));
        } else {
          await dbConn.insert(discoveryCalls).values({ leadId, ownerId: ctx.user.id, ...data });
        }
        return { success: true };
      }),

    // Sync additional/private notes to the contact's project notes (advocate-only)
    syncNotes: adminProcedure
      .input(z.object({
        leadId: z.number(),
        contactId: z.number(),
        notes: z.string(),
        label: z.string().default("Discovery Call Notes"),
      }))
      .mutation(async ({ ctx, input }) => {
        const { projectNotes, projects } = await import("../../drizzle/schema");
        const { eq: deq } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // Find the contact's project
        const [project] = await dbConn.select().from(projects)
          .where(deq(projects.clientId, input.contactId))
          .limit(1);
        if (!project) return { success: false, reason: "No project found for contact" };
        // Check if a discovery call note already exists for this lead
        const [existing] = await dbConn.select().from(projectNotes)
          .where(and(deq(projectNotes.projectId, project.id), deq(projectNotes.title, input.label)))
          .limit(1);
        if (existing) {
          await dbConn.update(projectNotes).set({ content: input.notes, isVisibleToClient: false })
            .where(deq(projectNotes.id, existing.id));
        } else {
          await dbConn.insert(projectNotes).values({
            projectId: project.id,
            title: input.label,
            content: input.notes,
            isVisibleToClient: false,
            createdBy: ctx.user.id,
          });
        }
        return { success: true };
      }),

    // Get pipeline steps (seeding defaults if none exist)
    getSteps: adminProcedure.query(async ({ ctx }) => {
      const { discoveryPipelineSteps } = await import("../../drizzle/schema");
      const { eq: deq, asc: dasc } = await import("drizzle-orm");
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const existing = await dbConn.select().from(discoveryPipelineSteps)
        .where(deq(discoveryPipelineSteps.ownerId, ctx.user.id))
        .orderBy(dasc(discoveryPipelineSteps.sortOrder));
      if (existing.length > 0) return existing;
      // Seed defaults
      const defaults = [
        "Discovery Scheduled", "Discovery Completed", "Records Requested",
        "Records Received", "Strategy Built", "Proposal Sent",
        "Client Signed", "Welcome Sent", "Onboarding", "First IEP Scheduled",
      ];
      await dbConn.insert(discoveryPipelineSteps).values(
        defaults.map((label, i) => ({ ownerId: ctx.user.id, label, sortOrder: i }))
      );
      return await dbConn.select().from(discoveryPipelineSteps)
        .where(deq(discoveryPipelineSteps.ownerId, ctx.user.id))
        .orderBy(dasc(discoveryPipelineSteps.sortOrder));
    }),

    // Update a pipeline step label
    updateStep: adminProcedure
      .input(z.object({ id: z.number(), label: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const { discoveryPipelineSteps } = await import("../../drizzle/schema");
        const { eq: deq } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await dbConn.update(discoveryPipelineSteps).set({ label: input.label })
          .where(and(deq(discoveryPipelineSteps.id, input.id), deq(discoveryPipelineSteps.ownerId, ctx.user.id)));
        return { success: true };
      }),

    // Add a new pipeline step
    createPipelineStep: adminProcedure
      .input(z.object({ label: z.string().min(1), afterId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        const { discoveryPipelineSteps } = await import("../../drizzle/schema");
        const { eq: deq, asc: dasc, gte: dgte } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const allSteps = await dbConn.select().from(discoveryPipelineSteps)
          .where(deq(discoveryPipelineSteps.ownerId, ctx.user.id))
          .orderBy(dasc(discoveryPipelineSteps.sortOrder));
        let insertAt = allSteps.length; // default: append at end
        if (input.afterId) {
          const afterIdx = allSteps.findIndex((s: any) => s.id === input.afterId);
          if (afterIdx !== -1) insertAt = afterIdx + 1;
        }
        // Shift all steps at or after insertAt up by 1
        for (const step of allSteps.slice(insertAt)) {
          await dbConn.update(discoveryPipelineSteps).set({ sortOrder: step.sortOrder + 1 })
            .where(deq(discoveryPipelineSteps.id, step.id));
        }
        const result = await dbConn.insert(discoveryPipelineSteps).values({
          ownerId: ctx.user.id, label: input.label, sortOrder: insertAt,
        });
        return { id: (result as any).insertId };
      }),

    // Delete a pipeline step
    deletePipelineStep: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { discoveryPipelineSteps } = await import("../../drizzle/schema");
        const { eq: deq } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await dbConn.delete(discoveryPipelineSteps)
          .where(and(deq(discoveryPipelineSteps.id, input.id), deq(discoveryPipelineSteps.ownerId, ctx.user.id)));
        return { success: true };
      }),

    // Reorder pipeline steps (accepts ordered array of ids)
    reorderPipelineSteps: adminProcedure
      .input(z.object({ orderedIds: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => {
        const { discoveryPipelineSteps } = await import("../../drizzle/schema");
        const { eq: deq } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        for (let i = 0; i < input.orderedIds.length; i++) {
          await dbConn.update(discoveryPipelineSteps)
            .set({ sortOrder: i })
            .where(and(deq(discoveryPipelineSteps.id, input.orderedIds[i]), deq(discoveryPipelineSteps.ownerId, ctx.user.id)));
        }
        return { success: true };
      }),

    // Get discovery questions (seeding defaults if none exist)
    getQuestions: adminProcedure.query(async ({ ctx }) => {
      const { discoveryQuestions } = await import("../../drizzle/schema");
      const { eq: deq, asc: dasc } = await import("drizzle-orm");
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const existing = await dbConn.select().from(discoveryQuestions)
        .where(deq(discoveryQuestions.ownerId, ctx.user.id))
        .orderBy(dasc(discoveryQuestions.sortOrder));
      if (existing.length > 0) return existing;
      // Seed defaults
      const defaults = [
        { label: "Current Situation", subLabel: "What's going on right now?", mode: "both" },
        { label: "IEP or 504?", subLabel: "Do they have one? Need one?", mode: "IEP/504" },
        { label: "School Information", subLabel: "District, School, Grade, Teachers", mode: "both" },
        { label: "Evaluations", subLabel: "Past evaluations or assessments?", mode: "both" },
        { label: "Services & Supports", subLabel: "What services are in place now?", mode: "both" },
        { label: "Behavior / Social", subLabel: "Behavior concerns or supports?", mode: "both" },
        { label: "Challenges", subLabel: "What are the biggest challenges?", mode: "both" },
        { label: "Goals", subLabel: "What are you hoping changes?", mode: "both" },
        { label: "Timeline & Urgency", subLabel: "How soon do you need help?", mode: "both" },
      ];
      await dbConn.insert(discoveryQuestions).values(
        defaults.map((q, i) => ({ ownerId: ctx.user.id, ...q, sortOrder: i }))
      );
      return await dbConn.select().from(discoveryQuestions)
        .where(deq(discoveryQuestions.ownerId, ctx.user.id))
        .orderBy(dasc(discoveryQuestions.sortOrder));
    }),

    // Create a new discovery question
    createQuestion: adminProcedure
      .input(z.object({ label: z.string().min(1), subLabel: z.string().optional(), mode: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const { discoveryQuestions } = await import("../../drizzle/schema");
        const { eq: deq, desc: ddesc } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const existing = await dbConn.select().from(discoveryQuestions)
          .where(deq(discoveryQuestions.ownerId, ctx.user.id))
          .orderBy(ddesc(discoveryQuestions.sortOrder)).limit(1);
        const nextSort = existing.length > 0 ? existing[0].sortOrder + 1 : 0;
        const result = await dbConn.insert(discoveryQuestions).values({
          ownerId: ctx.user.id, label: input.label,
          subLabel: input.subLabel ?? null, mode: input.mode ?? "both", sortOrder: nextSort,
        });
        return { id: (result as any).insertId };
      }),

    // Update a discovery question
    updateQuestion: adminProcedure
      .input(z.object({ id: z.number(), label: z.string().optional(), subLabel: z.string().optional(), mode: z.string().optional(), isActive: z.boolean().optional() }))
      .mutation(async ({ ctx, input }) => {
        const { discoveryQuestions } = await import("../../drizzle/schema");
        const { eq: deq } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { id, ...data } = input;
        await dbConn.update(discoveryQuestions).set(data)
          .where(and(deq(discoveryQuestions.id, id), deq(discoveryQuestions.ownerId, ctx.user.id)));
        return { success: true };
      }),

    // Delete a discovery question
    deleteQuestion: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { discoveryQuestions } = await import("../../drizzle/schema");
        const { eq: deq } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await dbConn.delete(discoveryQuestions)
          .where(and(deq(discoveryQuestions.id, input.id), deq(discoveryQuestions.ownerId, ctx.user.id)));
        return { success: true };
      }),

    // Get the discovery worksheet
    getWorksheet: adminProcedure.query(async ({ ctx }) => {
      return await db.getDiscoveryWorksheet(ctx.user.id);
    }),

    // Upload/update the discovery worksheet
    uploadWorksheet: adminProcedure
      .input(z.object({ fileKey: z.string(), fileName: z.string(), fileSize: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertDiscoveryWorksheet(ctx.user.id, input.fileKey, input.fileName, input.fileSize);
        return { success: true };
      }),
    getPreliminaryNote: adminProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { projectNotes } = await import("../../drizzle/schema");
        const { eq: deq, asc: dasc } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [note] = await dbConn.select().from(projectNotes)
          .where(and(deq(projectNotes.projectId, input.projectId), deq(projectNotes.isVisibleToClient, false)))
          .orderBy(dasc(projectNotes.createdAt))
          .limit(1);
        return note || null;
      }),
    updatePreliminaryNote: adminProcedure
      .input(z.object({ projectId: z.number(), content: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { projectNotes } = await import("../../drizzle/schema");
        const { eq: deq, asc: dasc } = await import("drizzle-orm");
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [existing] = await dbConn.select().from(projectNotes)
          .where(and(deq(projectNotes.projectId, input.projectId), deq(projectNotes.isVisibleToClient, false)))
          .orderBy(dasc(projectNotes.createdAt))
          .limit(1);
        if (existing) {
          await dbConn.update(projectNotes).set({ content: input.content }).where(deq(projectNotes.id, existing.id));
          return { id: existing.id };
        } else {
          const result = await dbConn.insert(projectNotes).values({
            projectId: input.projectId,
            title: "Preliminary Notes",
            content: input.content,
            isVisibleToClient: false,
            createdBy: ctx.user.id,
          });
          return { id: (result as any).insertId };
        }
      }),
  });

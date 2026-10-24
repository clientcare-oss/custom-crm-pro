import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { emailTemplates, emailTemplateFolders, workflows } from "../../drizzle/schema";
import { eq, and, isNull, desc, like } from "drizzle-orm";
import { invokeLLM, CF_MODELS } from "../_core/llm";

// ─── Folders ──────────────────────────────────────────────────────────────────

const foldersRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return await db
      .select()
      .from(emailTemplateFolders)
      .where(eq(emailTemplateFolders.ownerId, ctx.user.id))
      .orderBy(emailTemplateFolders.name);
  }),

  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      color: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(emailTemplateFolders).values({
        name: input.name,
        color: input.color ?? "blue",
        ownerId: ctx.user.id,
      });
      const [created] = await db
        .select()
        .from(emailTemplateFolders)
        .where(eq(emailTemplateFolders.ownerId, ctx.user.id))
        .orderBy(desc(emailTemplateFolders.createdAt))
        .limit(1);
      return created;
    }),

  rename: adminProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1), color: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .update(emailTemplateFolders)
        .set({ name: input.name, ...(input.color ? { color: input.color } : {}) })
        .where(and(eq(emailTemplateFolders.id, input.id), eq(emailTemplateFolders.ownerId, ctx.user.id)));
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // Move all templates in this folder to unfiled
      await db
        .update(emailTemplates)
        .set({ folderId: null })
        .where(and(eq(emailTemplates.folderId, input.id), eq(emailTemplates.ownerId, ctx.user.id)));
      await db
        .delete(emailTemplateFolders)
        .where(and(eq(emailTemplateFolders.id, input.id), eq(emailTemplateFolders.ownerId, ctx.user.id)));
      return { success: true };
    }),
});

// ─── Templates ────────────────────────────────────────────────────────────────

export const emailTemplatesRouter = router({
  folders: foldersRouter,

  list: adminProcedure
    .input(z.object({
      folderId: z.number().nullable().optional(), // null = unfiled, undefined = all
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [eq(emailTemplates.ownerId, ctx.user.id)];

      if (input?.folderId === null) {
        // Explicitly unfiled
        conditions.push(isNull(emailTemplates.folderId));
      } else if (input?.folderId !== undefined) {
        conditions.push(eq(emailTemplates.folderId, input.folderId));
      }
      // if folderId is undefined (omitted), return all templates

      return await db
        .select()
        .from(emailTemplates)
        .where(and(...conditions))
        .orderBy(desc(emailTemplates.updatedAt));
    }),

  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      subject: z.string().min(1),
      body: z.string(),
      category: z.string().optional(),
      folderId: z.number().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(emailTemplates).values({ ...input, ownerId: ctx.user.id });
      const [created] = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.ownerId, ctx.user.id))
        .orderBy(desc(emailTemplates.createdAt))
        .limit(1);
      return created;
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      subject: z.string().min(1).optional(),
      body: z.string().optional(),
      category: z.string().optional(),
      folderId: z.number().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db
        .update(emailTemplates)
        .set(data)
        .where(and(eq(emailTemplates.id, id), eq(emailTemplates.ownerId, ctx.user.id)));
      return { success: true };
    }),

  checkAutomationUsage: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { linked: false, automationNames: [] as string[] };
      const allWorkflows = await db
        .select({ id: workflows.id, title: workflows.title, canvasData: workflows.canvasData })
        .from(workflows)
        .where(eq(workflows.createdBy, ctx.user.id));
      const linkedNames: string[] = [];
      for (const wf of allWorkflows) {
        if (wf.canvasData && wf.canvasData.includes(`"emailTemplateId":${input.id}`) || wf.canvasData?.includes(`"emailTemplateId": ${input.id}`) || wf.canvasData?.includes(`"templateId":${input.id}`) || wf.canvasData?.includes(`"templateId": ${input.id}`) || wf.canvasData?.includes(`"emailTemplate":${input.id}`) || wf.canvasData?.includes(`"emailTemplate": ${input.id}`)) {
          linkedNames.push(wf.title);
        }
      }
      return { linked: linkedNames.length > 0, automationNames: linkedNames };
    }),

  checkAllAutomationUsage: adminProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return {} as Record<number, string[]>;
      const allWorkflows = await db
        .select({ id: workflows.id, title: workflows.title, canvasData: workflows.canvasData })
        .from(workflows)
        .where(eq(workflows.createdBy, ctx.user.id));
      // Build a map: templateId -> [workflow names]
      const map: Record<number, string[]> = {};
      for (const wf of allWorkflows) {
        if (!wf.canvasData) continue;
        // Extract all template IDs referenced in canvasData
        const patterns = [
          /"emailTemplateId":\s*(\d+)/g,
          /"templateId":\s*(\d+)/g,
          /"emailTemplate":\s*(\d+)/g,
        ];
        for (const pattern of patterns) {
          let match;
          while ((match = pattern.exec(wf.canvasData)) !== null) {
            const tplId = parseInt(match[1]);
            if (!map[tplId]) map[tplId] = [];
            if (!map[tplId].includes(wf.title)) map[tplId].push(wf.title);
          }
        }
      }
      return map;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .delete(emailTemplates)
        .where(and(eq(emailTemplates.id, input.id), eq(emailTemplates.ownerId, ctx.user.id)));
      return { success: true };
    }),

  aiAssist: adminProcedure
    .input(z.object({
      action: z.enum(["ask", "changeTone", "shorten", "improveClarity"]),
      content: z.string(),
      prompt: z.string().optional(),
      tone: z.enum(["firm_advocate", "friendly_reassuring", "assertive_procedural", "concise"]).optional(),
      studentName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { action, content, prompt, tone, studentName } = input;
      try {
        let systemPrompt = "You are Byron Honea's AI executive assistant at Waypoint Advocates, a premier Special Education & IEP Advocacy practice in Atlanta, GA. Never use 'Master Coach' or variants. Produce ready-to-send email copy directly without conversational filler or markdown code blocks.";
        let userPrompt = "";

        if (action === "ask") {
          userPrompt = `Instructions: ${prompt || "Draft an email reply"}\nContext/Student: ${studentName || "Student"}\nCurrent Draft:\n${content}\nProvide the revised or drafted email:`;
        } else if (action === "shorten") {
          userPrompt = `Shorten and make the following email concise while preserving critical advocacy points:\n\n${content}`;
        } else if (action === "improveClarity") {
          userPrompt = `Improve the clarity, grammar, and flow of the following advocacy email while keeping the advocate's voice strong and professional:\n\n${content}`;
        } else if (action === "changeTone") {
          const toneDescriptions: Record<string, string> = {
            firm_advocate: "Firm, authoritative, and uncompromising on student rights and IDEA/Section 504 compliance",
            friendly_reassuring: "Warm, empathetic, encouraging, and reassuring to the family",
            assertive_procedural: "Strictly procedural, referencing statutory timelines, Prior Written Notice, and factual recordkeeping",
            concise: "Ultra-brief, direct bullet points, and actionable next steps",
          };
          const selectedTone = tone ? toneDescriptions[tone] : "Professional advocate";
          userPrompt = `Rewrite the following email with the tone: "${selectedTone}".\n\n${content}`;
        }

        const res = await invokeLLM({
          model: CF_MODELS.FAST,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });

        const choice = res.choices?.[0]?.message?.content;
        const text = typeof choice === "string" ? choice : (Array.isArray(choice) ? (choice[0] as any)?.text : "");
        if (text && text.trim().length > 0) {
          return { revisedContent: text.trim() };
        }
      } catch (e) {
        console.warn("[emailTemplates.aiAssist] AI fallback invoked:", e);
      }

      // Smart local heuristic fallbacks if LLM is offline
      if (action === "shorten") {
        const sentences = content.split(/(?<=[.?!])\s+/);
        const shortened = sentences.slice(0, Math.max(1, Math.ceil(sentences.length * 0.6))).join(" ");
        return { revisedContent: shortened || content };
      }
      if (action === "improveClarity") {
        return { revisedContent: content.trim() };
      }
      if (action === "changeTone" && tone === "firm_advocate") {
        return { revisedContent: `Dear IEP Team,\n\nWe are writing to formalize our position regarding the educational programming for ${studentName || "the student"}.\n\n${content}\n\nWe expect a written response within the statutory timeline.\n\nSincerely,\nWaypoint Advocates` };
      }
      return { revisedContent: content };
    }),
});


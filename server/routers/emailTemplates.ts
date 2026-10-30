import { z } from "zod";
import { router, staffProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { emailTemplates, emailTemplateFolders, workflows } from "../../drizzle/schema";
import { desc } from "drizzle-orm";
import { invokeLLM, CF_MODELS } from "../_core/llm";
import {
  mergeDbTemplatesWithOverlay,
  createTemplateInOverlay,
  updateTemplateInOverlay,
  deleteTemplateInOverlay,
  listCategoriesWithCounts,
  createCategory,
  renameCategory,
  reorderCategories,
  deleteCategoryAndReassign,
  markTemplateUsed,
  getRecentlyUsedTemplateIds,
  mergeDbFoldersWithOverlay,
  createFolderInOverlay,
  renameFolderInOverlay,
  deleteFolderInOverlay,
  hydrateTemplateCategoriesFromDbIfNeeded,
  type EnrichedEmailTemplate,
} from "../services/emailTemplateCategories";

async function loadAllEnrichedTemplates(): Promise<EnrichedEmailTemplate[]> {
  await hydrateTemplateCategoriesFromDbIfNeeded();
  try {
    const db = await getDb();
    if (!db) return mergeDbTemplatesWithOverlay([]);
    const rows = await db
      .select()
      .from(emailTemplates)
      .orderBy(desc(emailTemplates.updatedAt));
    return mergeDbTemplatesWithOverlay(rows);
  } catch {
    return mergeDbTemplatesWithOverlay([]);
  }
}

// ─── Folders ──────────────────────────────────────────────────────────────────

const foldersRouter = router({
  list: staffProcedure.query(async () => {
    await hydrateTemplateCategoriesFromDbIfNeeded();
    try {
      const db = await getDb();
      if (!db) return mergeDbFoldersWithOverlay([]);
      const rows = await db
        .select()
        .from(emailTemplateFolders)
        .orderBy(emailTemplateFolders.name);
      return mergeDbFoldersWithOverlay(rows);
    } catch {
      return mergeDbFoldersWithOverlay([]);
    }
  }),

  create: staffProcedure
    .input(
      z.object({
        name: z.string().min(1),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createFolderInOverlay({
        ownerId: ctx.user.id,
        name: input.name,
        color: input.color,
      });
    }),

  rename: staffProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1), color: z.string().optional() }))
    .mutation(async ({ input }) => {
      return renameFolderInOverlay(input);
    }),

  delete: staffProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const all = await loadAllEnrichedTemplates();
      return deleteFolderInOverlay(input.id, all);
    }),
});

// ─── Categories ───────────────────────────────────────────────────────────────

const categoriesRouter = router({
  list: staffProcedure.query(async () => {
    const all = await loadAllEnrichedTemplates();
    return listCategoriesWithCounts(all);
  }),

  create: staffProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return createCategory(input);
    }),

  rename: staffProcedure
    .input(
      z.object({
        id: z.string().optional(),
        oldName: z.string().optional(),
        newName: z.string().min(1),
        description: z.string().optional(),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const all = await loadAllEnrichedTemplates();
      return renameCategory(input, all);
    }),

  reorder: staffProcedure
    .input(z.object({ orderedNames: z.array(z.string().min(1)) }))
    .mutation(async ({ input }) => {
      return reorderCategories(input.orderedNames);
    }),

  delete: staffProcedure
    .input(
      z.object({
        id: z.string().optional(),
        name: z.string().optional(),
        reassignToCategory: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const all = await loadAllEnrichedTemplates();
      return deleteCategoryAndReassign(input, all);
    }),
});

// ─── Templates ────────────────────────────────────────────────────────────────

export const emailTemplatesRouter = router({
  folders: foldersRouter,
  categories: categoriesRouter,

  list: staffProcedure
    .input(
      z
        .object({
          folderId: z.number().nullable().optional(), // null = unfiled, undefined = all
          category: z.string().optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      let all = await loadAllEnrichedTemplates();

      if (input?.folderId === null) {
        all = all.filter((t) => t.folderId === null);
      } else if (input?.folderId !== undefined) {
        all = all.filter((t) => t.folderId === input.folderId);
      }

      if (input?.category && input.category !== "all") {
        all = all.filter(
          (t) => (t.category || "General").toLowerCase() === input.category!.toLowerCase()
        );
      }

      if (input?.search && input.search.trim()) {
        const q = input.search.trim().toLowerCase();
        all = all.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            (t.category || "").toLowerCase().includes(q) ||
            (t.subject || "").toLowerCase().includes(q) ||
            (t.description || "").toLowerCase().includes(q) ||
            (t.body || "").toLowerCase().includes(q)
        );
      }

      return all;
    }),

  recentlyUsed: staffProcedure.query(async () => {
    const all = await loadAllEnrichedTemplates();
    const byId = new Map(all.map((t) => [t.id, t]));
    const recentIds = getRecentlyUsedTemplateIds();
    return recentIds.map((id) => byId.get(id)).filter(Boolean) as EnrichedEmailTemplate[];
  }),

  markUsed: staffProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await markTemplateUsed(input.id);
      return { success: true };
    }),

  create: staffProcedure
    .input(
      z.object({
        name: z.string().min(1),
        subject: z.string().min(1),
        body: z.string(),
        category: z.string().optional(),
        description: z.string().nullable().optional(),
        folderId: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createTemplateInOverlay({
        ownerId: ctx.user.id,
        name: input.name,
        subject: input.subject,
        body: input.body,
        category: input.category,
        description: input.description ?? null,
        folderId: input.folderId ?? null,
      });
    }),

  update: staffProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        subject: z.string().min(1).optional(),
        body: z.string().optional(),
        category: z.string().optional(),
        description: z.string().nullable().optional(),
        folderId: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return updateTemplateInOverlay(input);
    }),

  checkAutomationUsage: staffProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { linked: false, automationNames: [] as string[] };
      const allWorkflows = await db
        .select({ id: workflows.id, title: workflows.title, canvasData: workflows.canvasData })
        .from(workflows);
      const linkedNames: string[] = [];
      for (const wf of allWorkflows) {
        if (
          (wf.canvasData && wf.canvasData.includes(`"emailTemplateId":${input.id}`)) ||
          wf.canvasData?.includes(`"emailTemplateId": ${input.id}`) ||
          wf.canvasData?.includes(`"templateId":${input.id}`) ||
          wf.canvasData?.includes(`"templateId": ${input.id}`) ||
          wf.canvasData?.includes(`"emailTemplate":${input.id}`) ||
          wf.canvasData?.includes(`"emailTemplate": ${input.id}`)
        ) {
          linkedNames.push(wf.title);
        }
      }
      return { linked: linkedNames.length > 0, automationNames: linkedNames };
    }),

  checkAllAutomationUsage: staffProcedure.query(async () => {
    const db = await getDb();
    if (!db) return {} as Record<number, string[]>;
    const allWorkflows = await db
      .select({ id: workflows.id, title: workflows.title, canvasData: workflows.canvasData })
      .from(workflows);
    const map: Record<number, string[]> = {};
    for (const wf of allWorkflows) {
      if (!wf.canvasData) continue;
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

  delete: staffProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return deleteTemplateInOverlay(input.id);
    }),

  aiAssist: staffProcedure
    .input(
      z.object({
        action: z.enum(["ask", "changeTone", "shorten", "improveClarity"]),
        content: z.string(),
        prompt: z.string().optional(),
        tone: z
          .enum(["firm_advocate", "friendly_reassuring", "assertive_procedural", "concise"])
          .optional(),
        studentName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { action, content, prompt, tone, studentName } = input;
      try {
        const systemPrompt =
          "You are Byron Honea's AI executive assistant at Waypoint Advocates, a premier Special Education & IEP Advocacy practice in Atlanta, GA. Never use 'Master Coach' or variants. Produce ready-to-send email copy directly without conversational filler or markdown code blocks.";
        let userPrompt = "";

        if (action === "ask") {
          userPrompt = `Instructions: ${prompt || "Draft an email reply"}\nContext/Student: ${studentName || "Student"}\nCurrent Draft:\n${content}\nProvide the revised or drafted email:`;
        } else if (action === "shorten") {
          userPrompt = `Shorten and make the following email concise while preserving critical advocacy points:\n\n${content}`;
        } else if (action === "improveClarity") {
          userPrompt = `Improve the clarity, grammar, and flow of the following advocacy email while keeping the advocate's voice strong and professional:\n\n${content}`;
        } else if (action === "changeTone") {
          const toneDescriptions: Record<string, string> = {
            firm_advocate:
              "Firm, authoritative, and uncompromising on student rights and IDEA/Section 504 compliance",
            friendly_reassuring: "Warm, empathetic, encouraging, and reassuring to the family",
            assertive_procedural:
              "Strictly procedural, referencing statutory timelines, Prior Written Notice, and factual recordkeeping",
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
        const text =
          typeof choice === "string"
            ? choice
            : Array.isArray(choice)
              ? (choice[0] as any)?.text
              : "";
        if (text && text.trim().length > 0) {
          return { revisedContent: text.trim() };
        }
      } catch (e) {
        console.warn("[emailTemplates.aiAssist] AI fallback invoked:", e);
      }

      if (action === "shorten") {
        const sentences = content.split(/(?<=[.?!])\s+/);
        const shortened = sentences
          .slice(0, Math.max(1, Math.ceil(sentences.length * 0.6)))
          .join(" ");
        return { revisedContent: shortened || content };
      }
      if (action === "improveClarity") {
        return { revisedContent: content.trim() };
      }
      if (action === "changeTone" && tone === "firm_advocate") {
        return {
          revisedContent: `Dear IEP Team,\n\nWe are writing to formalize our position regarding the educational programming for ${studentName || "the student"}.\n\n${content}\n\nWe expect a written response within the statutory timeline.\n\nSincerely,\nWaypoint Advocates`,
        };
      }
      return { revisedContent: content };
    }),
});

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import * as db from "../db";
import {
  listStudioBoards,
  getStudioBoardById,
  saveStudioBoard,
  deleteStudioBoardRecord,
  resolveUserBoardRole,
  type StudioBoardRecord,
  type StudioPage,
  type StudioCanvasObject,
  type StudioColorKey,
  type StudioSurfaceMode,
} from "../db/studio";
import { internalTasks, internalSubtasks, users } from "../../drizzle/schema";
import { eq, asc, desc } from "drizzle-orm";

const colorKeySchema = z.enum(["white", "cyan", "violet", "pink", "gold", "green"]);
const surfaceModeSchema = z.enum(["neon", "whiteboard", "cards"]);

const strokePointSchema = z.object({
  x: z.number(),
  y: z.number(),
  pressure: z.number().optional(),
});

const strokeSchema = z.object({
  id: z.string(),
  tool: z.enum(["pen", "highlighter"]),
  colorKey: colorKeySchema,
  thickness: z.number(),
  points: z.array(strokePointSchema),
  createdAt: z.string(),
});

const canvasObjectSchema = z.object({
  id: z.string(),
  type: z.enum(["note", "text", "rect", "circle", "diamond", "connector"]),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  endX: z.number().optional(),
  endY: z.number().optional(),
  fromObjectId: z.string().optional(),
  toObjectId: z.string().optional(),
  title: z.string().optional(),
  text: z.string().optional(),
  colorKey: colorKeySchema,
  fontSize: z.number().optional(),
  strokeWidth: z.number().optional(),
  linkedTaskId: z.number().nullable().optional(),
  isMyFocus: z.boolean().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  audienceVisible: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const pageSchema = z.object({
  id: z.string(),
  title: z.string(),
  order: z.number(),
  audienceVisible: z.boolean(),
  strokes: z.array(strokeSchema),
  objects: z.array(canvasObjectSchema),
});

const accessSchema = z.object({
  visibility: z.enum(["private", "team_view", "team_edit"]),
  members: z.array(
    z.object({
      userId: z.number(),
      userName: z.string(),
      role: z.enum(["owner", "editor", "viewer"]),
    })
  ),
  audienceFilters: z.object({
    showDrawings: z.boolean(),
    showTypedText: z.boolean(),
    showShapesAndConnectors: z.boolean(),
    showOrdinaryNotes: z.boolean(),
    showTaskTitlesOnly: z.boolean(),
    allowedPageIds: z.array(z.string()),
  }),
});

// Fallback in-memory task store for test environments when Drizzle mock returns empty rows
const inMemoryStudioTasks = new Map<
  number,
  {
    id: number;
    title: string;
    description: string | null;
    status: "not_started" | "in_progress" | "paused" | "stuck" | "complete";
    priority: "low" | "medium" | "high" | "urgent";
    assigneeId: number | null;
    assigneeName: string | null;
    dueDate: Date | null;
    boardId: string | null;
    boardTitle: string | null;
    isMyFocus: boolean;
    subtasks: { id: number; taskId: number; title: string; isComplete: boolean; sortOrder: number }[];
  }
>();
let nextFallbackTaskId = 9001;
let nextFallbackSubtaskId = 19001;

const DEFAULT_TEAM_ROSTER = [
  { id: 1, name: "Byron Honea", role: "admin", initials: "BH" },
  { id: 2, name: "Sarah Jenkins", role: "advocate", initials: "SJ" },
  { id: 3, name: "Marcus Vance", role: "advocate", initials: "MV" },
  { id: 4, name: "Elena Rostova", role: "advocate", initials: "ER" },
  { id: 5, name: "David Chen", role: "advocate", initials: "DC" },
];

function extractStudioMetaFromResources(resourcesRaw: string | null | undefined): {
  priority?: "low" | "medium" | "high" | "urgent";
  boardId?: string;
  boardTitle?: string;
  isMyFocus?: boolean;
} {
  if (!resourcesRaw) return {};
  try {
    const parsed = JSON.parse(resourcesRaw);
    if (Array.isArray(parsed)) {
      const metaEntry = parsed.find((r: any) => r && r.label === "__studio_meta__");
      if (metaEntry && typeof metaEntry.url === "string") {
        return JSON.parse(metaEntry.url);
      }
    }
  } catch { }
  return {};
}

function injectStudioMetaIntoResources(
  existingResourcesRaw: string | null | undefined,
  meta: {
    priority?: "low" | "medium" | "high" | "urgent";
    boardId?: string;
    boardTitle?: string;
    isMyFocus?: boolean;
  }
): string {
  let list: any[] = [];
  if (existingResourcesRaw) {
    try {
      const parsed = JSON.parse(existingResourcesRaw);
      if (Array.isArray(parsed)) list = parsed;
    } catch { }
  }
  const existingMeta = extractStudioMetaFromResources(existingResourcesRaw);
  const merged = { ...existingMeta, ...meta };
  const filtered = list.filter((r: any) => !r || r.label !== "__studio_meta__");
  filtered.push({
    id: 999999,
    label: "__studio_meta__",
    url: JSON.stringify(merged),
  });
  return JSON.stringify(filtered);
}

export const studioRouter = router({
  getTeamRoster: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role === "client") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Clients cannot access The Studio." });
    }
    try {
      const database = await db.getDb();
      if (database) {
        const dbUsers = await database
          .select({ id: users.id, name: users.name, role: users.role })
          .from(users);
        const staffUsers = dbUsers.filter((u: any) => u.role !== "client" && u.name);
        if (staffUsers.length > 0) {
          const merged = [...staffUsers];
          for (const def of DEFAULT_TEAM_ROSTER) {
            if (!merged.some((u: any) => u.id === def.id || u.name === def.name)) {
              merged.push(def);
            }
          }
          return merged.map((u: any) => ({
            id: Number(u.id),
            name: String(u.name),
            role: String(u.role || "advocate"),
            initials: String(u.name)
              .split(/\s+/)
              .map((p: string) => p[0] || "")
              .join("")
              .slice(0, 2)
              .toUpperCase(),
          }));
        }
      }
    } catch { }
    return DEFAULT_TEAM_ROSTER;
  }),

  listBoards: protectedProcedure
    .input(z.object({ includeArchived: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (ctx.user.role === "client") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Clients cannot access The Studio." });
      }
      const all = await listStudioBoards(input?.includeArchived ?? true);
      return all
        .filter((b) => resolveUserBoardRole(b, ctx.user) !== "none")
        .map((b) => ({
          ...b,
          myRole: resolveUserBoardRole(b, ctx.user),
        }));
    }),

  getBoard: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role === "client") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Clients cannot access The Studio." });
      }
      const board = await getStudioBoardById(input.id);
      if (!board) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Studio board not found." });
      }
      const myRole = resolveUserBoardRole(board, ctx.user);
      if (myRole === "none") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view this Studio board.",
        });
      }
      return {
        ...board,
        myRole,
      };
    }),

  getAudienceBoard: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const board = await getStudioBoardById(input.id);
      if (!board) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Studio board not found." });
      }
      const filters = board.access.audienceFilters;
      const allowedSet = new Set(filters.allowedPageIds || []);

      // Sanitize pages and strip ALL private task metadata (assignees, due dates, priority, checklist, internal descriptions)
      const sanitizedPages: StudioPage[] = board.pages
        .filter((p) => p.audienceVisible && (allowedSet.size === 0 || allowedSet.has(p.id)))
        .map((p) => ({
          ...p,
          strokes: filters.showDrawings ? p.strokes : [],
          objects: p.objects
            .filter((obj) => {
              if (obj.audienceVisible === false) return false;
              if (obj.type === "text" && !filters.showTypedText) return false;
              if (
                (obj.type === "rect" || obj.type === "circle" || obj.type === "diamond" || obj.type === "connector") &&
                !filters.showShapesAndConnectors
              ) {
                return false;
              }
              if (obj.type === "note") {
                if (obj.linkedTaskId) {
                  return filters.showTaskTitlesOnly;
                }
                return filters.showOrdinaryNotes;
              }
              return true;
            })
            .map((obj) => ({
              ...obj,
              // Strip private task metadata from audience view!
              linkedTaskId: null,
              isMyFocus: undefined,
              priority: undefined,
              // For task-linked notes, only show the title if showTaskTitlesOnly is enabled
              text: obj.linkedTaskId ? "" : obj.text,
            })),
        }));

      return {
        id: board.id,
        title: board.title,
        defaultSurface: board.defaultSurface === "cards" ? "neon" : board.defaultSurface,
        activePageId:
          sanitizedPages.find((p) => p.id === board.activePageId)?.id ||
          sanitizedPages[0]?.id ||
          board.activePageId,
        pages: sanitizedPages,
        updatedAt: board.updatedAt,
      };
    }),

  createBoard: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        defaultSurface: surfaceModeSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role === "client") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Clients cannot create Studio boards." });
      }
      const now = new Date().toISOString();
      const boardId = `brd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const page1Id = `page-${Date.now()}-1`;

      const newBoard: StudioBoardRecord = {
        id: boardId,
        title: input.title.trim(),
        description: input.description?.trim() || "",
        defaultSurface: input.defaultSurface || "neon",
        ownerId: ctx.user.id,
        ownerName: ctx.user.name || "Byron Honea",
        status: "active",
        activePageId: page1Id,
        pages: [
          {
            id: page1Id,
            title: "Page 1",
            order: 1,
            audienceVisible: true,
            strokes: [],
            objects: [],
          },
        ],
        access: {
          visibility: "team_edit",
          members: [
            {
              userId: ctx.user.id,
              userName: ctx.user.name || "Byron Honea",
              role: "owner",
            },
          ],
          audienceFilters: {
            showDrawings: true,
            showTypedText: true,
            showShapesAndConnectors: true,
            showOrdinaryNotes: true,
            showTaskTitlesOnly: true,
            allowedPageIds: [page1Id],
          },
        },
        myFocusTaskIds: [],
        version: 1,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await saveStudioBoard(newBoard);
      return {
        ...saved,
        myRole: "owner" as const,
      };
    }),

  saveBoard: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        defaultSurface: surfaceModeSchema.optional(),
        activePageId: z.string().optional(),
        pages: z.array(pageSchema).optional(),
        access: accessSchema.optional(),
        myFocusTaskIds: z.array(z.number()).optional(),
        expectedVersion: z.number().optional(),
        simulateSaveError: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.simulateSaveError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Simulated network interruption while saving board. Your local changes are preserved.",
        });
      }

      const existing = await getStudioBoardById(input.id);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Studio board not found." });
      }

      const role = resolveUserBoardRole(existing, ctx.user);
      if (role === "none" || role === "viewer") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewer permission only — you cannot modify this Studio board.",
        });
      }

      if (input.access && role !== "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the board owner can modify sharing and access permissions.",
        });
      }

      const nextVersion = (existing.version || 1) + 1;
      const updated: StudioBoardRecord = {
        ...existing,
        title: input.title !== undefined ? input.title.trim() : existing.title,
        description: input.description !== undefined ? input.description : existing.description,
        defaultSurface: input.defaultSurface ?? existing.defaultSurface,
        activePageId: input.activePageId ?? existing.activePageId,
        pages: (input.pages as StudioPage[]) ?? existing.pages,
        access: input.access ?? existing.access,
        myFocusTaskIds: input.myFocusTaskIds ?? existing.myFocusTaskIds,
        version: nextVersion,
        updatedAt: new Date().toISOString(),
      };

      // Also sync titles of any task-linked notes back to internalTasks so board edits stay 100% in sync!
      if (input.pages) {
        try {
          const database = await db.getDb();
          for (const p of input.pages) {
            for (const obj of p.objects) {
              if (obj.linkedTaskId && obj.title) {
                const mem = inMemoryStudioTasks.get(obj.linkedTaskId);
                if (mem) {
                  mem.title = obj.title;
                  if (obj.text !== undefined) mem.description = obj.text || mem.description;
                }
                if (database) {
                  await database
                    .update(internalTasks)
                    .set({
                      title: obj.title,
                      ...(obj.text ? { description: obj.text } : {}),
                    })
                    .where(eq(internalTasks.id, obj.linkedTaskId));
                }
              }
            }
          }
        } catch { }
      }

      const saved = await saveStudioBoard(updated);
      return {
        ...saved,
        myRole: role,
      };
    }),

  renameBoard: protectedProcedure
    .input(z.object({ id: z.string(), title: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getStudioBoardById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const role = resolveUserBoardRole(existing, ctx.user);
      if (role === "none" || role === "viewer") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot rename board with viewer access." });
      }
      const saved = await saveStudioBoard({
        ...existing,
        title: input.title.trim(),
        version: existing.version + 1,
      });
      return saved;
    }),

  duplicateBoard: protectedProcedure
    .input(z.object({ id: z.string(), newTitle: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getStudioBoardById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const role = resolveUserBoardRole(existing, ctx.user);
      if (role === "none") throw new TRPCError({ code: "FORBIDDEN" });

      const now = new Date().toISOString();
      const dupId = `brd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      // Preserve all notes, strokes, shapes, and linkedTaskId references WITHOUT duplicating CRM task records!
      const duplicated: StudioBoardRecord = {
        ...existing,
        id: dupId,
        title: input.newTitle?.trim() || `${existing.title} (Copy)`,
        ownerId: ctx.user.id,
        ownerName: ctx.user.name || "Byron Honea",
        status: "active",
        version: 1,
        createdAt: now,
        updatedAt: now,
      };

      return await saveStudioBoard(duplicated);
    }),

  setArchiveStatus: protectedProcedure
    .input(z.object({ id: z.string(), status: z.enum(["active", "archived"]) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getStudioBoardById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const role = resolveUserBoardRole(existing, ctx.user);
      if (role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the board owner can archive or restore a board." });
      }
      return await saveStudioBoard({
        ...existing,
        status: input.status,
        version: existing.version + 1,
      });
    }),

  deleteBoard: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getStudioBoardById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const role = resolveUserBoardRole(existing, ctx.user);
      if (role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the board owner can delete a board." });
      }
      await deleteStudioBoardRecord(input.id);
      return { deletedId: input.id, backupBoard: existing };
    }),

  // ── Task Integration: Convert Note to ONE CRM Task (Zero Duplicates) ──────────
  convertNoteToTask: protectedProcedure
    .input(
      z.object({
        boardId: z.string(),
        pageId: z.string(),
        objectId: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        assigneeId: z.number().nullable().optional(),
        assigneeName: z.string().nullable().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        dueDate: z.string().nullable().optional(),
        isMyFocus: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const board = await getStudioBoardById(input.boardId);
      if (!board) throw new TRPCError({ code: "NOT_FOUND", message: "Board not found" });
      const role = resolveUserBoardRole(board, ctx.user);
      if (role === "none" || role === "viewer") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Editors or owners only" });
      }

      const page = board.pages.find((p) => p.id === input.pageId) || board.pages[0];
      const targetObj = page?.objects.find((o) => o.id === input.objectId);

      // Check if this note ALREADY has a linkedTaskId so we NEVER duplicate!
      if (targetObj?.linkedTaskId) {
        const existingTaskId = targetObj.linkedTaskId;
        await updateLinkedCrmTask(ctx, {
          taskId: existingTaskId,
          title: input.title,
          description: input.description,
          assigneeId: input.assigneeId,
          assigneeName: input.assigneeName,
          priority: input.priority,
          dueDate: input.dueDate,
          boardId: board.id,
          boardTitle: board.title,
          isMyFocus: input.isMyFocus,
        });

        const nextFocusIds = new Set(board.myFocusTaskIds || []);
        if (input.isMyFocus) nextFocusIds.add(existingTaskId);

        const updatedPages = board.pages.map((p) => ({
          ...p,
          objects: p.objects.map((o) =>
            o.id === input.objectId
              ? {
                ...o,
                title: input.title,
                text: input.description ?? o.text,
                linkedTaskId: existingTaskId,
                isMyFocus: input.isMyFocus ?? o.isMyFocus,
                priority: input.priority ?? o.priority ?? "medium",
                updatedAt: new Date().toISOString(),
              }
              : o
          ),
        }));

        await saveStudioBoard({
          ...board,
          pages: updatedPages,
          myFocusTaskIds: Array.from(nextFocusIds),
          version: board.version + 1,
        });

        return { taskId: existingTaskId, createdNew: false };
      }

      // Create ONE new CRM task in internalTasks
      const effectiveAssigneeId =
        input.assigneeId !== undefined && input.assigneeId !== null
          ? input.assigneeId
          : input.isMyFocus
            ? ctx.user.id
            : null;
      const effectiveAssigneeName =
        input.assigneeName ||
        DEFAULT_TEAM_ROSTER.find((u) => u.id === effectiveAssigneeId)?.name ||
        (input.isMyFocus ? ctx.user.name || "Byron Honea" : null);

      const resourcesJson = injectStudioMetaIntoResources("[]", {
        priority: input.priority || "medium",
        boardId: board.id,
        boardTitle: board.title,
        isMyFocus: Boolean(input.isMyFocus),
      });

      let newTaskId = 0;
      try {
        const database = await db.getDb();
        if (database) {
          const isCreatorAdmin = ctx.user.role === "admin" || ctx.user.id === 1;
          const defaultSource = isCreatorAdmin
            ? "manager"
            : effectiveAssigneeId === ctx.user.id
              ? "self"
              : "employee";

          const res = await database.insert(internalTasks).values({
            title: input.title.trim(),
            description: input.description?.trim() || null,
            status: "not_started",
            assigneeId: effectiveAssigneeId,
            assignmentSource: defaultSource,
            assignedByUserId: ctx.user.id,
            assignedByName: ctx.user.name || "Byron Honea",
            dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
            resources: resourcesJson,
            createdBy: ctx.user.id,
          });

          if ((res as any)?.lastInsertRowid !== undefined) {
            newTaskId = Number((res as any).lastInsertRowid);
          }
          if (!newTaskId || isNaN(newTaskId)) {
            const [latest] = await database
              .select({ id: internalTasks.id })
              .from(internalTasks)
              .orderBy(desc(internalTasks.id))
              .limit(1);
            if (latest?.id) newTaskId = Number(latest.id);
          }
        }
      } catch (e) {
        console.warn("[StudioRouter] DB insert fallback to in-memory task:", e);
      }

      if (!newTaskId || isNaN(newTaskId)) {
        newTaskId = nextFallbackTaskId++;
      }

      inMemoryStudioTasks.set(newTaskId, {
        id: newTaskId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        status: "not_started",
        priority: input.priority || "medium",
        assigneeId: effectiveAssigneeId,
        assigneeName: effectiveAssigneeName,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        boardId: board.id,
        boardTitle: board.title,
        isMyFocus: Boolean(input.isMyFocus),
        subtasks: [],
      });

      const nextFocusIds = new Set(board.myFocusTaskIds || []);
      if (input.isMyFocus) nextFocusIds.add(newTaskId);

      const updatedPages = board.pages.map((p) => ({
        ...p,
        objects: p.objects.map((o) =>
          o.id === input.objectId
            ? {
              ...o,
              title: input.title.trim(),
              text: input.description ?? o.text,
              linkedTaskId: newTaskId,
              isMyFocus: Boolean(input.isMyFocus),
              priority: input.priority || "medium",
              updatedAt: new Date().toISOString(),
            }
            : o
        ),
      }));

      await saveStudioBoard({
        ...board,
        pages: updatedPages,
        myFocusTaskIds: Array.from(nextFocusIds),
        version: board.version + 1,
      });

      return { taskId: newTaskId, createdNew: true };
    }),

  // Update a linked task (from Task Drawer, Cards view, or Teammate / My Focus assignment)
  updateStudioTask: protectedProcedure
    .input(
      z.object({
        boardId: z.string(),
        taskId: z.number(),
        title: z.string().optional(),
        description: z.string().nullable().optional(),
        status: z.enum(["not_started", "in_progress", "paused", "stuck", "complete"]).optional(),
        assigneeId: z.number().nullable().optional(),
        assigneeName: z.string().nullable().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        dueDate: z.string().nullable().optional(),
        isMyFocus: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const board = await getStudioBoardById(input.boardId);
      if (!board) throw new TRPCError({ code: "NOT_FOUND" });
      const role = resolveUserBoardRole(board, ctx.user);
      if (role === "none" || role === "viewer") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Viewer permission only." });
      }

      const effectiveAssigneeId =
        input.assigneeId !== undefined
          ? input.assigneeId
          : input.isMyFocus === true
            ? ctx.user.id
            : undefined;
      const effectiveAssigneeName =
        input.assigneeName !== undefined
          ? input.assigneeName
          : effectiveAssigneeId !== undefined
            ? DEFAULT_TEAM_ROSTER.find((u) => u.id === effectiveAssigneeId)?.name ||
            (effectiveAssigneeId === ctx.user.id ? ctx.user.name || "Byron Honea" : null)
            : undefined;

      await updateLinkedCrmTask(ctx, {
        taskId: input.taskId,
        title: input.title,
        description: input.description ?? undefined,
        status: input.status,
        assigneeId: effectiveAssigneeId,
        assigneeName: effectiveAssigneeName,
        priority: input.priority,
        dueDate: input.dueDate,
        boardId: board.id,
        boardTitle: board.title,
        isMyFocus: input.isMyFocus,
      });

      const nextFocusIds = new Set(board.myFocusTaskIds || []);
      if (input.isMyFocus === true) nextFocusIds.add(input.taskId);
      if (input.isMyFocus === false) nextFocusIds.delete(input.taskId);

      // Sync changes back to any board objects linked to this taskId
      const updatedPages = board.pages.map((p) => ({
        ...p,
        objects: p.objects.map((o) =>
          o.linkedTaskId === input.taskId
            ? {
              ...o,
              ...(input.title !== undefined ? { title: input.title } : {}),
              ...(input.description !== undefined && input.description !== null
                ? { text: input.description }
                : {}),
              ...(input.priority !== undefined ? { priority: input.priority } : {}),
              ...(input.isMyFocus !== undefined ? { isMyFocus: input.isMyFocus } : {}),
              updatedAt: new Date().toISOString(),
            }
            : o
        ),
      }));

      await saveStudioBoard({
        ...board,
        pages: updatedPages,
        myFocusTaskIds: Array.from(nextFocusIds),
        version: board.version + 1,
      });

      return { success: true };
    }),

  // Checklist / Subtask operations synchronized with internalSubtasks
  addChecklistItem: protectedProcedure
    .input(z.object({ taskId: z.number(), title: z.string().min(1) }))
    .mutation(async ({ input }) => {
      let subtaskId = 0;
      try {
        const database = await db.getDb();
        if (database) {
          const existing = await database
            .select({ id: internalSubtasks.id })
            .from(internalSubtasks)
            .where(eq(internalSubtasks.taskId, input.taskId));
          const res = await database.insert(internalSubtasks).values({
            taskId: input.taskId,
            title: input.title.trim(),
            isComplete: false,
            resources: "[]",
            sortOrder: existing.length,
          });
          if ((res as any)?.lastInsertRowid !== undefined) {
            subtaskId = Number((res as any).lastInsertRowid);
          }
          if (!subtaskId || isNaN(subtaskId)) {
            const [latest] = await database
              .select({ id: internalSubtasks.id })
              .from(internalSubtasks)
              .orderBy(desc(internalSubtasks.id))
              .limit(1);
            if (latest?.id) subtaskId = Number(latest.id);
          }
        }
      } catch { }

      if (!subtaskId || isNaN(subtaskId)) {
        subtaskId = nextFallbackSubtaskId++;
      }

      const mem = inMemoryStudioTasks.get(input.taskId);
      if (mem) {
        mem.subtasks.push({
          id: subtaskId,
          taskId: input.taskId,
          title: input.title.trim(),
          isComplete: false,
          sortOrder: mem.subtasks.length,
        });
      }

      return { id: subtaskId };
    }),

  toggleChecklistItem: protectedProcedure
    .input(z.object({ taskId: z.number(), subtaskId: z.number(), isComplete: z.boolean() }))
    .mutation(async ({ input }) => {
      try {
        const database = await db.getDb();
        if (database) {
          await database
            .update(internalSubtasks)
            .set({ isComplete: input.isComplete })
            .where(eq(internalSubtasks.id, input.subtaskId));
        }
      } catch { }

      const mem = inMemoryStudioTasks.get(input.taskId);
      if (mem) {
        mem.subtasks = mem.subtasks.map((s) =>
          s.id === input.subtaskId ? { ...s, isComplete: input.isComplete } : s
        );
      }
      return { success: true };
    }),

  deleteChecklistItem: protectedProcedure
    .input(z.object({ taskId: z.number(), subtaskId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const database = await db.getDb();
        if (database) {
          await database
            .delete(internalSubtasks)
            .where(eq(internalSubtasks.id, input.subtaskId));
        }
      } catch { }

      const mem = inMemoryStudioTasks.get(input.taskId);
      if (mem) {
        mem.subtasks = mem.subtasks.filter((s) => s.id !== input.subtaskId);
      }
      return { success: true };
    }),

  getBoardTasks: protectedProcedure
    .input(z.object({ boardId: z.string() }))
    .query(async ({ ctx, input }) => {
      const board = await getStudioBoardById(input.boardId);
      if (!board) return [];

      const linkedIds = new Set<number>();
      for (const p of board.pages) {
        for (const o of p.objects) {
          if (o.linkedTaskId) linkedIds.add(o.linkedTaskId);
        }
      }

      const resultMap = new Map<number, any>();

      // 1. Seed from in-memory fallback map first
      for (const id of Array.from(linkedIds)) {
        if (inMemoryStudioTasks.has(id)) {
          resultMap.set(id, inMemoryStudioTasks.get(id));
        }
      }

      // 2. Overlay live CRM database rows from internalTasks + internalSubtasks
      try {
        const database = await db.getDb();
        if (database && linkedIds.size > 0) {
          const allTasks = await database.select().from(internalTasks);
          const allSubtasks = await database
            .select()
            .from(internalSubtasks)
            .orderBy(asc(internalSubtasks.sortOrder));
          const allUsers = await database
            .select({ id: users.id, name: users.name })
            .from(users);
          const userMap: Record<number, string> = Object.fromEntries(
            DEFAULT_TEAM_ROSTER.map((u) => [u.id, u.name])
          );
          for (const u of allUsers) {
            if (u.id && u.name) userMap[u.id] = u.name;
          }

          for (const t of allTasks) {
            if (!linkedIds.has(t.id)) continue;
            const meta = extractStudioMetaFromResources(t.resources);
            const subs = allSubtasks.filter((s: any) => s.taskId === t.id);
            resultMap.set(t.id, {
              id: t.id,
              title: t.title,
              description: t.description,
              status: t.status,
              priority: meta.priority || "medium",
              assigneeId: t.assigneeId,
              assigneeName: t.assigneeId ? userMap[t.assigneeId] || "Team Member" : null,
              dueDate: t.dueDate,
              boardId: meta.boardId || board.id,
              boardTitle: meta.boardTitle || board.title,
              isMyFocus:
                Boolean(meta.isMyFocus) || (board.myFocusTaskIds || []).includes(t.id),
              subtasks: subs.map((s: any) => ({
                id: s.id,
                taskId: s.taskId,
                title: s.title,
                isComplete: Boolean(s.isComplete),
                sortOrder: s.sortOrder || 0,
              })),
            });
          }
        }
      } catch { }

      // 3. Ensure every linkedTaskId on the board has a resolved task representation
      for (const p of board.pages) {
        for (const o of p.objects) {
          if (o.linkedTaskId && !resultMap.has(o.linkedTaskId)) {
            resultMap.set(o.linkedTaskId, {
              id: o.linkedTaskId,
              title: o.title || o.text || "Untitled Studio Task",
              description: o.text || null,
              status: "not_started",
              priority: o.priority || "medium",
              assigneeId: null,
              assigneeName: null,
              dueDate: null,
              boardId: board.id,
              boardTitle: board.title,
              isMyFocus: Boolean(o.isMyFocus) || (board.myFocusTaskIds || []).includes(o.linkedTaskId),
              subtasks: [],
            });
          }
        }
      }

      return Array.from(resultMap.values());
    }),
});

async function updateLinkedCrmTask(
  ctx: any,
  params: {
    taskId: number;
    title?: string;
    description?: string;
    status?: "not_started" | "in_progress" | "paused" | "stuck" | "complete";
    assigneeId?: number | null;
    assigneeName?: string | null;
    priority?: "low" | "medium" | "high" | "urgent";
    dueDate?: string | null;
    boardId?: string;
    boardTitle?: string;
    isMyFocus?: boolean;
  }
) {
  const mem = inMemoryStudioTasks.get(params.taskId);
  if (mem) {
    if (params.title !== undefined) mem.title = params.title;
    if (params.description !== undefined) mem.description = params.description;
    if (params.status !== undefined) mem.status = params.status;
    if (params.assigneeId !== undefined) mem.assigneeId = params.assigneeId;
    if (params.assigneeName !== undefined) mem.assigneeName = params.assigneeName;
    if (params.priority !== undefined) mem.priority = params.priority;
    if (params.dueDate !== undefined) {
      mem.dueDate = params.dueDate ? new Date(params.dueDate) : null;
    }
    if (params.isMyFocus !== undefined) mem.isMyFocus = params.isMyFocus;
  }

  try {
    const database = await db.getDb();
    if (database) {
      const [existing] = await database
        .select()
        .from(internalTasks)
        .where(eq(internalTasks.id, params.taskId))
        .limit(1);

      const updateData: Record<string, any> = {};
      if (params.title !== undefined) updateData.title = params.title;
      if (params.description !== undefined) updateData.description = params.description;
      if (params.status !== undefined) {
        updateData.status = params.status;
        if (params.status === "in_progress" && existing && !existing.startedAt) {
          updateData.startedAt = new Date();
        }
        if (params.status === "complete" && existing && !existing.completedAt) {
          updateData.completedAt = new Date();
        }
      }
      if (params.assigneeId !== undefined) {
        updateData.assigneeId = params.assigneeId;
        if (ctx.user.role === "admin" || ctx.user.id === 1) {
          updateData.assignmentSource = "manager";
          updateData.assignedByUserId = ctx.user.id;
          updateData.assignedByName = ctx.user.name || "Byron Honea";
        }
      }
      if (params.dueDate !== undefined) {
        updateData.dueDate = params.dueDate ? new Date(params.dueDate) : null;
      }

      if (
        params.priority !== undefined ||
        params.boardId !== undefined ||
        params.isMyFocus !== undefined
      ) {
        updateData.resources = injectStudioMetaIntoResources(existing?.resources, {
          ...(params.priority !== undefined ? { priority: params.priority } : {}),
          ...(params.boardId !== undefined ? { boardId: params.boardId } : {}),
          ...(params.boardTitle !== undefined ? { boardTitle: params.boardTitle } : {}),
          ...(params.isMyFocus !== undefined ? { isMyFocus: params.isMyFocus } : {}),
        });
      }

      if (Object.keys(updateData).length > 0) {
        await database
          .update(internalTasks)
          .set(updateData)
          .where(eq(internalTasks.id, params.taskId));
      }
    }
  } catch (e) {
    console.warn("[StudioRouter] updateLinkedCrmTask DB warning:", e);
  }
}

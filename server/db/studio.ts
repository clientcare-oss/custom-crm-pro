import { queryCloudflareD1, getLocalDbClient } from "../_core/d1Client";
import { getDb } from "./connection";
import { internalTasks, internalSubtasks, users } from "../../drizzle/schema";
import { eq, asc, desc, inArray } from "drizzle-orm";

export type StudioSurfaceMode = "neon" | "whiteboard" | "cards";
export type StudioColorKey = "white" | "cyan" | "violet" | "pink" | "gold" | "green";
export type StudioRole = "owner" | "editor" | "viewer";

export interface StudioStrokePoint {
  x: number;
  y: number;
  pressure?: number;
}

export interface StudioStroke {
  id: string;
  tool: "pen" | "highlighter";
  colorKey: StudioColorKey;
  thickness: number;
  points: StudioStrokePoint[];
  createdAt: string;
}

export interface StudioCanvasObject {
  id: string;
  type: "note" | "text" | "rect" | "circle" | "diamond" | "connector";
  x: number;
  y: number;
  width: number;
  height: number;
  endX?: number;
  endY?: number;
  fromObjectId?: string;
  toObjectId?: string;
  title?: string;
  text?: string;
  colorKey: StudioColorKey;
  fontSize?: number;
  strokeWidth?: number;
  linkedTaskId?: number | null;
  isMyFocus?: boolean;
  priority?: "low" | "medium" | "high" | "urgent";
  audienceVisible?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudioPage {
  id: string;
  title: string;
  order: number;
  audienceVisible: boolean;
  strokes: StudioStroke[];
  objects: StudioCanvasObject[];
}

export interface StudioMemberAccess {
  userId: number;
  userName: string;
  role: StudioRole;
}

export interface StudioAudienceFilters {
  showDrawings: boolean;
  showTypedText: boolean;
  showShapesAndConnectors: boolean;
  showOrdinaryNotes: boolean;
  showTaskTitlesOnly: boolean;
  allowedPageIds: string[];
}

export interface StudioAccessSettings {
  visibility: "private" | "team_view" | "team_edit";
  members: StudioMemberAccess[];
  audienceFilters: StudioAudienceFilters;
}

export interface StudioBoardRecord {
  id: string;
  title: string;
  description: string;
  defaultSurface: StudioSurfaceMode;
  ownerId: number;
  ownerName: string;
  status: "active" | "archived";
  activePageId: string;
  pages: StudioPage[];
  access: StudioAccessSettings;
  myFocusTaskIds: number[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

let tableEnsured = false;

export async function ensureStudioTables(): Promise<void> {
  if (tableEnsured && process.env.NODE_ENV !== "test") return;

  const ddl = `
    CREATE TABLE IF NOT EXISTS studio_boards (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      default_surface TEXT DEFAULT 'neon' NOT NULL,
      owner_id INTEGER NOT NULL,
      owner_name TEXT NOT NULL,
      status TEXT DEFAULT 'active' NOT NULL,
      active_page_id TEXT NOT NULL,
      pages_json TEXT NOT NULL,
      access_json TEXT NOT NULL,
      my_focus_task_ids_json TEXT DEFAULT '[]' NOT NULL,
      version INTEGER DEFAULT 1 NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `;

  try {
    const cfDb = (globalThis as any).__CF_ENV_DB__;
    if (cfDb) {
      await cfDb.prepare(ddl).run();
    }
  } catch {}

  try {
    const local = getLocalDbClient();
    await local.execute(ddl);
  } catch {}

  tableEnsured = true;
}

const inMemoryBoards = new Map<string, StudioBoardRecord>();

function createDefaultStarterBoard(ownerId: number = 1, ownerName: string = "Byron Honea"): StudioBoardRecord {
  const now = new Date().toISOString();
  const page1Id = "page-1";
  const page2Id = "page-2";

  const pages: StudioPage[] = [
    {
      id: page1Id,
      title: "Page 1 — IEP Strategy & Teaching Canvas",
      order: 1,
      audienceVisible: true,
      strokes: [
        {
          id: "stroke-demo-underline",
          tool: "pen",
          colorKey: "cyan",
          thickness: 4,
          points: [
            { x: 110, y: 122 },
            { x: 220, y: 118 },
            { x: 350, y: 121 },
            { x: 465, y: 120 },
          ],
          createdAt: now,
        },
      ],
      objects: [
        {
          id: "obj-heading-1",
          type: "text",
          x: 110,
          y: 72,
          width: 440,
          height: 48,
          text: "IEP Goal Alignment & Present Levels Workshop",
          colorKey: "white",
          fontSize: 24,
          audienceVisible: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "obj-note-1",
          type: "note",
          x: 110,
          y: 165,
          width: 240,
          height: 155,
          title: "Baseline Reading Fluency Data",
          text: "Compare fall curriculum benchmark with independent Wilson decoding probe before drafting annual goal.",
          colorKey: "cyan",
          audienceVisible: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "obj-note-2",
          type: "note",
          x: 410,
          y: 165,
          width: 240,
          height: 155,
          title: "Sensory & Executive Function Supports",
          text: "Chunk multi-step directions and provide visual schedule check-ins at transition blocks.",
          colorKey: "violet",
          audienceVisible: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "obj-connector-1",
          type: "connector",
          x: 350,
          y: 242,
          width: 60,
          height: 0,
          endX: 410,
          endY: 242,
          fromObjectId: "obj-note-1",
          toObjectId: "obj-note-2",
          colorKey: "gold",
          strokeWidth: 3,
          audienceVisible: true,
          createdAt: now,
          updatedAt: now,
        },
      ],
    },
    {
      id: page2Id,
      title: "Page 2 — Parent Teaching Walkthrough",
      order: 2,
      audienceVisible: true,
      strokes: [],
      objects: [
        {
          id: "obj-p2-heading",
          type: "text",
          x: 120,
          y: 84,
          width: 520,
          height: 46,
          text: "Understanding Prior Written Notice (§300.503)",
          colorKey: "cyan",
          fontSize: 24,
          audienceVisible: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "obj-p2-rect",
          type: "rect",
          x: 120,
          y: 160,
          width: 280,
          height: 130,
          title: "1. What was Proposed or Refused",
          text: "Every district decision must be documented in writing with specific evaluation evidence.",
          colorKey: "gold",
          strokeWidth: 2,
          audienceVisible: true,
          createdAt: now,
          updatedAt: now,
        },
      ],
    },
  ];

  return {
    id: "brd-waypoint-studio-main",
    title: "IEP Strategy & Live Teaching Board",
    description: "Collaborative studio for advocacy notes, linked tasks, brainstorming, and live parent teaching.",
    defaultSurface: "neon",
    ownerId,
    ownerName,
    status: "active",
    activePageId: page1Id,
    pages,
    access: {
      visibility: "team_edit",
      members: [
        { userId: ownerId, userName: ownerName, role: "owner" },
      ],
      audienceFilters: {
        showDrawings: true,
        showTypedText: true,
        showShapesAndConnectors: true,
        showOrdinaryNotes: true,
        showTaskTitlesOnly: true,
        allowedPageIds: [page1Id, page2Id],
      },
    },
    myFocusTaskIds: [],
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

function safeJsonParse<T>(raw: any, fallback: T): T {
  if (!raw) return fallback;
  if (typeof raw === "object") return raw as T;
  try {
    return JSON.parse(String(raw)) as T;
  } catch {
    return fallback;
  }
}

function normalizeBoardRow(row: any): StudioBoardRecord {
  const now = new Date().toISOString();
  const pages = safeJsonParse<StudioPage[]>(row.pages_json ?? row.pagesJson, []);
  const firstPageId = pages[0]?.id || "page-1";
  const defaultAccess: StudioAccessSettings = {
    visibility: "team_edit",
    members: [],
    audienceFilters: {
      showDrawings: true,
      showTypedText: true,
      showShapesAndConnectors: true,
      showOrdinaryNotes: true,
      showTaskTitlesOnly: true,
      allowedPageIds: pages.map((p) => p.id),
    },
  };

  return {
    id: String(row.id),
    title: String(row.title || "Untitled Studio Board"),
    description: String(row.description ?? ""),
    defaultSurface: ((row.default_surface ?? row.defaultSurface) || "neon") as StudioSurfaceMode,
    ownerId: Number(row.owner_id ?? row.ownerId ?? 1),
    ownerName: String(row.owner_name ?? row.ownerName ?? "Byron Honea"),
    status: ((row.status || "active") as "active" | "archived"),
    activePageId: String(row.active_page_id ?? row.activePageId ?? firstPageId),
    pages: pages.length > 0 ? pages : [
      {
        id: firstPageId,
        title: "Page 1",
        order: 1,
        audienceVisible: true,
        strokes: [],
        objects: [],
      },
    ],
    access: safeJsonParse<StudioAccessSettings>(row.access_json ?? row.accessJson, defaultAccess),
    myFocusTaskIds: safeJsonParse<number[]>(row.my_focus_task_ids_json ?? row.myFocusTaskIdsJson, []),
    version: Number(row.version ?? 1),
    createdAt: String(row.created_at ?? row.createdAt ?? now),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? now),
  };
}

export async function listStudioBoards(includeArchived: boolean = true): Promise<StudioBoardRecord[]> {
  await ensureStudioTables();
  const isTest = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);

  if (!isTest) {
    try {
      const rows = await queryCloudflareD1(
        "SELECT * FROM studio_boards ORDER BY updated_at DESC",
        []
      );
      if (Array.isArray(rows) && rows.length > 0) {
        const list = rows.map(normalizeBoardRow);
        list.forEach((b) => inMemoryBoards.set(b.id, b));
        return includeArchived ? list : list.filter((b) => b.status !== "archived");
      }
    } catch (e) {
      console.warn("[StudioDB] Failed to query studio_boards:", e);
    }
  }

  if (inMemoryBoards.size === 0) {
    const starter = createDefaultStarterBoard(1, "Byron Honea");
    await saveStudioBoard(starter);
  }

  const all = Array.from(inMemoryBoards.values()).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
  return includeArchived ? all : all.filter((b) => b.status !== "archived");
}

export async function getStudioBoardById(id: string): Promise<StudioBoardRecord | null> {
  await ensureStudioTables();
  const isTest = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);

  if (!isTest) {
    try {
      const rows = await queryCloudflareD1(
        "SELECT * FROM studio_boards WHERE id = ? LIMIT 1",
        [id]
      );
      if (Array.isArray(rows) && rows.length > 0) {
        const board = normalizeBoardRow(rows[0]);
        inMemoryBoards.set(board.id, board);
        return board;
      }
    } catch (e) {
      console.warn("[StudioDB] getStudioBoardById fallback:", e);
    }
  }

  if (inMemoryBoards.has(id)) {
    return inMemoryBoards.get(id)!;
  }

  const all = await listStudioBoards(true);
  return all.find((b) => b.id === id) || null;
}

export async function saveStudioBoard(board: StudioBoardRecord): Promise<StudioBoardRecord> {
  await ensureStudioTables();
  const now = new Date().toISOString();
  const updated: StudioBoardRecord = {
    ...board,
    updatedAt: now,
  };

  inMemoryBoards.set(updated.id, updated);

  const isTest = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);
  if (!isTest) {
    const sql = `
      INSERT INTO studio_boards (
        id, title, description, default_surface, owner_id, owner_name,
        status, active_page_id, pages_json, access_json, my_focus_task_ids_json,
        version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        default_surface = excluded.default_surface,
        owner_id = excluded.owner_id,
        owner_name = excluded.owner_name,
        status = excluded.status,
        active_page_id = excluded.active_page_id,
        pages_json = excluded.pages_json,
        access_json = excluded.access_json,
        my_focus_task_ids_json = excluded.my_focus_task_ids_json,
        version = excluded.version,
        updated_at = excluded.updated_at
    `;
    const params = [
      updated.id,
      updated.title,
      updated.description || "",
      updated.defaultSurface || "neon",
      updated.ownerId,
      updated.ownerName,
      updated.status || "active",
      updated.activePageId,
      JSON.stringify(updated.pages),
      JSON.stringify(updated.access),
      JSON.stringify(updated.myFocusTaskIds || []),
      updated.version,
      updated.createdAt || now,
      updated.updatedAt,
    ];

    try {
      await queryCloudflareD1(sql, params);
    } catch (e) {
      console.warn("[StudioDB] saveStudioBoard D1 write warning:", e);
    }
  }

  return updated;
}

export async function deleteStudioBoardRecord(id: string): Promise<boolean> {
  await ensureStudioTables();
  inMemoryBoards.delete(id);

  const isTest = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);
  if (!isTest) {
    try {
      await queryCloudflareD1("DELETE FROM studio_boards WHERE id = ?", [id]);
    } catch (e) {
      console.warn("[StudioDB] deleteStudioBoardRecord warning:", e);
    }
  }
  return true;
}

export function resolveUserBoardRole(
  board: StudioBoardRecord,
  user: { id: number; name?: string | null; role?: string | null }
): StudioRole | "none" {
  if (!user) return "none";
  if (user.role === "client") return "none";
  if (board.ownerId === user.id || user.role === "admin" || user.id === 1) {
    return "owner";
  }

  const explicit = board.access.members.find((m) => m.userId === user.id);
  if (explicit) return explicit.role;

  if (board.access.visibility === "team_edit") return "editor";
  if (board.access.visibility === "team_view") return "viewer";
  return "none";
}

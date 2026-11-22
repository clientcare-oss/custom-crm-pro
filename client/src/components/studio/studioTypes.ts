export type StudioSurfaceMode = "neon" | "whiteboard" | "cards";
export type StudioColorKey = "white" | "cyan" | "violet" | "pink" | "gold" | "green";
export type StudioToolId =
  | "select"
  | "pen"
  | "highlighter"
  | "eraser"
  | "text"
  | "note"
  | "rect"
  | "circle"
  | "diamond"
  | "connector"
  | "pointer";

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

export interface StudioTaskRecord {
  id: number;
  title: string;
  description: string | null;
  status: "not_started" | "in_progress" | "paused" | "stuck" | "complete";
  priority: "low" | "medium" | "high" | "urgent";
  assigneeId: number | null;
  assigneeName: string | null;
  dueDate: Date | string | null;
  boardId: string | null;
  boardTitle: string | null;
  isMyFocus: boolean;
  subtasks: {
    id: number;
    taskId: number;
    title: string;
    isComplete: boolean;
    sortOrder: number;
  }[];
}

export interface StudioColorPaletteEntry {
  key: StudioColorKey;
  label: string;
  swatchHex: string;
  // Neon surface ink & controlled glow
  neonInk: string;
  neonGlow: string;
  neonNoteBg: string;
  neonNoteBorder: string;
  neonText: string;
  // Whiteboard surface high-contrast marker ink
  whiteboardInk: string;
  whiteboardGlow: string;
  whiteboardNoteBg: string;
  whiteboardNoteBorder: string;
  whiteboardText: string;
}

/**
 * Approved 6-color Studio palette (Strictly NO orange anywhere).
 * Automatically adapts ink contrast when switching between Neon and Whiteboard surfaces.
 */
export const STUDIO_COLORS: Record<StudioColorKey, StudioColorPaletteEntry> = {
  white: {
    key: "white",
    label: "Chalk / Charcoal",
    swatchHex: "#F8FAFC",
    neonInk: "#F8FAFC",
    neonGlow: "rgba(248, 250, 252, 0.55)",
    neonNoteBg: "rgba(15, 29, 64, 0.92)",
    neonNoteBorder: "rgba(226, 232, 240, 0.55)",
    neonText: "#F8FAFC",
    whiteboardInk: "#0F172A",
    whiteboardGlow: "rgba(15, 23, 42, 0.12)",
    whiteboardNoteBg: "#FFFFFF",
    whiteboardNoteBorder: "#94A3B8",
    whiteboardText: "#0F172A",
  },
  cyan: {
    key: "cyan",
    label: "Electric Cyan",
    swatchHex: "#22D3EE",
    neonInk: "#22D3EE",
    neonGlow: "rgba(34, 211, 238, 0.65)",
    neonNoteBg: "rgba(8, 38, 68, 0.92)",
    neonNoteBorder: "rgba(34, 211, 238, 0.65)",
    neonText: "#ECFEFF",
    whiteboardInk: "#0284C7",
    whiteboardGlow: "rgba(2, 132, 199, 0.18)",
    whiteboardNoteBg: "#E0F2FE",
    whiteboardNoteBorder: "#0284C7",
    whiteboardText: "#0C4A6E",
  },
  violet: {
    key: "violet",
    label: "Luminous Violet",
    swatchHex: "#A78BFA",
    neonInk: "#A78BFA",
    neonGlow: "rgba(167, 139, 250, 0.65)",
    neonNoteBg: "rgba(29, 20, 72, 0.92)",
    neonNoteBorder: "rgba(167, 139, 250, 0.65)",
    neonText: "#F5F3FF",
    whiteboardInk: "#6D28D9",
    whiteboardGlow: "rgba(109, 40, 217, 0.18)",
    whiteboardNoteBg: "#EDE9FE",
    whiteboardNoteBorder: "#7C3AED",
    whiteboardText: "#4C1D95",
  },
  pink: {
    key: "pink",
    label: "Neon Magenta",
    swatchHex: "#F472B6",
    neonInk: "#F472B6",
    neonGlow: "rgba(244, 114, 182, 0.65)",
    neonNoteBg: "rgba(56, 16, 54, 0.92)",
    neonNoteBorder: "rgba(244, 114, 182, 0.65)",
    neonText: "#FDF2F8",
    whiteboardInk: "#DB2777",
    whiteboardGlow: "rgba(219, 39, 119, 0.18)",
    whiteboardNoteBg: "#FCE7F3",
    whiteboardNoteBorder: "#DB2777",
    whiteboardText: "#831843",
  },
  gold: {
    key: "gold",
    label: "Admiralty Gold",
    swatchHex: "#FFE394",
    neonInk: "#FFE394",
    neonGlow: "rgba(255, 227, 148, 0.62)",
    neonNoteBg: "rgba(46, 36, 14, 0.92)",
    neonNoteBorder: "rgba(223, 190, 119, 0.72)",
    neonText: "#FFFBEB",
    whiteboardInk: "#8C6514",
    whiteboardGlow: "rgba(140, 101, 20, 0.18)",
    whiteboardNoteBg: "#FEF9C3",
    whiteboardNoteBorder: "#B48624",
    whiteboardText: "#422006",
  },
  green: {
    key: "green",
    label: "Emerald Mint",
    swatchHex: "#34D399",
    neonInk: "#34D399",
    neonGlow: "rgba(52, 211, 153, 0.65)",
    neonNoteBg: "rgba(8, 44, 42, 0.92)",
    neonNoteBorder: "rgba(52, 211, 153, 0.65)",
    neonText: "#ECFDF5",
    whiteboardInk: "#059669",
    whiteboardGlow: "rgba(5, 150, 105, 0.18)",
    whiteboardNoteBg: "#D1FAE5",
    whiteboardNoteBorder: "#059669",
    whiteboardText: "#064E3B",
  },
};

export const STUDIO_COLOR_LIST: StudioColorPaletteEntry[] = [
  STUDIO_COLORS.white,
  STUDIO_COLORS.cyan,
  STUDIO_COLORS.violet,
  STUDIO_COLORS.pink,
  STUDIO_COLORS.gold,
  STUDIO_COLORS.green,
];

export const STROKE_THICKNESS_OPTIONS = [
  { value: 2, label: "Fine (2px)" },
  { value: 4, label: "Medium (4px)" },
  { value: 8, label: "Bold (8px)" },
  { value: 14, label: "Broad (14px)" },
];

export function broadcastStudioSync(payload: {
  boardId: string;
  activePageId: string;
  surface: "neon" | "whiteboard";
  pages: StudioPage[];
  pointerPos?: { x: number; y: number } | null;
}) {
  if (typeof window === "undefined") return;
  try {
    const ch = new BroadcastChannel("waypoint_studio_sync");
    ch.postMessage(payload);
    ch.close();
  } catch {}
  try {
    localStorage.setItem(
      `waypoint_studio_audience_${payload.boardId}`,
      JSON.stringify({ ...payload, ts: Date.now() })
    );
  } catch {}
}

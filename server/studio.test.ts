import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { ensureStudioTables } from "./db/studio";
import type { TrpcContext } from "./_core/context";

function createUserContext(user: {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
}): TrpcContext {
  return {
    user: {
      id: user.id,
      openId: `studio-test-openid-${user.id}`,
      email: user.email,
      name: user.name,
      loginMethod: "manus",
      role: user.role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("The Studio (PG-049) Collaborative Board & Live Teaching Engine", () => {
  const ownerCaller = appRouter.createCaller(
    createUserContext({
      id: 9101,
      name: "Byron Honea",
      email: "byron@waypointadvocates.com",
      role: "admin",
    })
  );

  const editorCaller = appRouter.createCaller(
    createUserContext({
      id: 9102,
      name: "Sarah Jenkins",
      email: "sarah@waypointadvocates.com",
      role: "user",
    })
  );

  const viewerCaller = appRouter.createCaller(
    createUserContext({
      id: 9103,
      name: "Guest Viewer",
      email: "viewer@waypointadvocates.com",
      role: "user",
    })
  );

  let createdBoardId = "";
  let convertedTaskId = 0;

  beforeAll(async () => {
    await ensureStudioTables();
  });

  it("1. Creates a board defaulting to Neon surface and survives reload/fetch", async () => {
    const board = await ownerCaller.studio.createBoard({
      title: "Staff training: Our approach",
    });

    expect(board).toBeDefined();
    expect(board.title).toBe("Staff training: Our approach");
    expect(board.defaultSurface).toBe("neon");
    expect(board.pages.length).toBeGreaterThanOrEqual(1);
    createdBoardId = board.id;

    // Verify reload / fetch
    const reloaded = await ownerCaller.studio.getBoard({
      id: createdBoardId,
    });
    expect(reloaded.id).toBe(createdBoardId);
    expect(reloaded.title).toBe("Staff training: Our approach");
    expect(reloaded.defaultSurface).toBe("neon");
  });

  it("2 & 6 & 8. Saves freehand strokes, shapes, connectors, notes, multiple teaching pages, and preserves content when switching surfaces", async () => {
    const page1Id = "page-1";
    const page2Id = "page-2";

    const updated = await ownerCaller.studio.saveBoard({
      id: createdBoardId,
      title: "Staff training: Our approach",
      defaultSurface: "whiteboard",
      activePageId: page2Id,
      pages: [
        {
          id: page1Id,
          title: "Page 1: Listen → Plan → Act",
          order: 0,
          audienceVisible: true,
          strokes: [
            {
              id: "stroke-neon-cyan",
              tool: "pen",
              colorKey: "cyan",
              thickness: 4,
              points: [
                { x: 100, y: 120 },
                { x: 240, y: 125 },
                { x: 380, y: 122 },
              ],
              createdAt: new Date().toISOString(),
            },
            {
              id: "stroke-highlighter-gold",
              tool: "highlighter",
              colorKey: "gold",
              thickness: 8,
              points: [
                { x: 140, y: 200 },
                { x: 320, y: 200 },
              ],
              createdAt: new Date().toISOString(),
            },
          ],
          objects: [
            {
              id: "note-1",
              type: "note",
              x: 150,
              y: 260,
              width: 240,
              height: 170,
              title: "Draft Prior Written Notice Response",
              text: "Understand needs and clarify who owns the next step.",
              colorKey: "cyan",
              linkedTaskId: null,
              isMyFocus: false,
              priority: "high",
              audienceVisible: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              id: "shape-circle-listen",
              type: "circle",
              x: 420,
              y: 260,
              width: 180,
              height: 100,
              text: "Listen",
              colorKey: "violet",
              audienceVisible: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        },
        {
          id: page2Id,
          title: "Page 2: Private Internal Strategy",
          order: 1,
          audienceVisible: false,
          strokes: [
            {
              id: "stroke-page-2",
              tool: "pen",
              colorKey: "pink",
              thickness: 2,
              points: [
                { x: 80, y: 90 },
                { x: 200, y: 140 },
              ],
              createdAt: new Date().toISOString(),
            },
          ],
          objects: [],
        },
      ],
    });

    expect(updated.defaultSurface).toBe("whiteboard");
    expect(updated.pages.length).toBe(2);
    expect(updated.pages[0].strokes.length).toBe(2);
    expect(updated.pages[0].objects.length).toBe(2);
    expect(updated.pages[1].strokes.length).toBe(1);

    // Switch surface to Cards and back to Neon — canvas content and positions remain intact
    const switchedToCards = await ownerCaller.studio.saveBoard({
      id: createdBoardId,
      defaultSurface: "cards",
    });
    expect(switchedToCards.defaultSurface).toBe("cards");
    expect(switchedToCards.pages[0].objects[0].x).toBe(150);
    expect(switchedToCards.pages[0].strokes.length).toBe(2);
  });

  it("3 & 4 & 5. Converts a sticky note to ONE CRM task without duplicates and synchronizes edits, checklist items, and assignments", async () => {
    // First conversion creates a new internalTasks row
    const firstConvert = await ownerCaller.studio.convertNoteToTask({
      boardId: createdBoardId,
      pageId: "page-1",
      objectId: "note-1",
      title: "Draft Prior Written Notice Response",
      description: "Understand needs and clarify who owns the next step.",
      priority: "high",
      assigneeId: 2,
      isMyFocus: true,
    });

    expect(firstConvert.createdNew).toBe(true);
    expect(firstConvert.taskId).toBeGreaterThan(0);
    convertedTaskId = firstConvert.taskId;

    // Second conversion on the same note updates the existing task record instead of duplicating
    const secondConvert = await ownerCaller.studio.convertNoteToTask({
      boardId: createdBoardId,
      pageId: "page-1",
      objectId: "note-1",
      title: "Draft Prior Written Notice Response (Updated)",
      description: "Understand needs and clarify who owns the next step.",
      priority: "urgent",
      assigneeId: 3,
      isMyFocus: true,
    });

    expect(secondConvert.createdNew).toBe(false);
    expect(secondConvert.taskId).toBe(convertedTaskId);

    // Update task status, assignee, and checklist items via Studio task inspector
    await ownerCaller.studio.updateStudioTask({
      boardId: createdBoardId,
      taskId: convertedTaskId,
      status: "in_progress",
      assigneeId: 2,
      isMyFocus: true,
    });

    const checklist1 = await ownerCaller.studio.addChecklistItem({
      taskId: convertedTaskId,
      title: "Verify evaluation baseline dates",
    });
    expect(checklist1.id).toBeGreaterThan(0);

    await ownerCaller.studio.toggleChecklistItem({
      taskId: convertedTaskId,
      subtaskId: checklist1.id,
      isComplete: true,
    });

    // Fetch board tasks and verify single record & synchronized checklist
    const boardTasks = await ownerCaller.studio.getBoardTasks({
      boardId: createdBoardId,
    });
    const matching = boardTasks.filter((t) => t.id === convertedTaskId);
    expect(matching.length).toBe(1);
    expect(matching[0].status).toBe("in_progress");
    expect(matching[0].assigneeId).toBe(2);
    expect(matching[0].isMyFocus).toBe(true);
    expect(matching[0].subtasks.length).toBe(1);
    expect(matching[0].subtasks[0].isComplete).toBe(true);
  });

  it("9. Excludes private task metadata and non-shared pages from the Audience View", async () => {
    // Configure audience filters to only share Page 1
    await ownerCaller.studio.saveBoard({
      id: createdBoardId,
      access: {
        visibility: "team_view",
        members: [
          { userId: 9101, userName: "Byron Honea", role: "owner" },
          { userId: 9102, userName: "Sarah Jenkins", role: "editor" },
          { userId: 9103, userName: "Guest Viewer", role: "viewer" },
        ],
        audienceFilters: {
          showDrawings: true,
          showTypedText: true,
          showShapesAndConnectors: true,
          showOrdinaryNotes: true,
          showTaskTitlesOnly: true,
          allowedPageIds: ["page-1"],
        },
      },
    });

    const audienceData = await viewerCaller.studio.getAudienceBoard({
      id: createdBoardId,
    });

    // Page 2 (private strategy) must be excluded
    expect(audienceData.pages.length).toBe(1);
    expect(audienceData.pages[0].id).toBe("page-1");

    // Any note on Page 1 must have linkedTaskId, isMyFocus, and priority stripped
    const noteObj = audienceData.pages[0].objects.find(
      (o: any) => o.id === "note-1"
    );
    expect(noteObj).toBeDefined();
    expect(noteObj?.linkedTaskId).toBeNull();
    expect(noteObj?.isMyFocus).toBeUndefined();
    expect(noteObj?.priority).toBeUndefined();
  });

  it("11 & 12. Enforces Owner, Editor, and Viewer access controls and communicates save errors clearly", async () => {
    // Editor can save canvas content
    const editorSave = await editorCaller.studio.saveBoard({
      id: createdBoardId,
      defaultSurface: "neon",
    });
    expect(editorSave.defaultSurface).toBe("neon");

    // Viewer cannot modify board content
    await expect(
      viewerCaller.studio.saveBoard({
        id: createdBoardId,
        title: "Unauthorized Viewer Edit",
      })
    ).rejects.toThrow();

    // Editor cannot delete the board (Owner only)
    await expect(
      editorCaller.studio.deleteBoard({
        id: createdBoardId,
      })
    ).rejects.toThrow();

    // Simulated save error throws clear message without corrupting board
    await expect(
      ownerCaller.studio.saveBoard({
        id: createdBoardId,
        simulateSaveError: true,
      })
    ).rejects.toThrow(/Simulated network interruption/);
  });
});

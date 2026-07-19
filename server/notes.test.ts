import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {
        origin: "http://localhost:3000",
      },
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

function createClientContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "client-user",
    email: "client@example.com",
    name: "Client User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {
        origin: "http://localhost:3000",
      },
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("Notes Feature", () => {
  let projectId = 1; // Assuming project ID 1 exists from other tests

  describe("Admin Notes Operations", () => {
    it("should create a note", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.notes.create({
        projectId,
        title: "Test Note",
        content: "This is a test note",
        isVisibleToClient: false,
      });

      expect(result).toBeDefined();
    });

    it("should list notes for a project", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const notes = await caller.notes.list({ projectId });
      expect(Array.isArray(notes)).toBe(true);
    });

    it("should update a note", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // First create a note
      const createResult = await caller.notes.create({
        projectId,
        title: "Note to Update",
        content: "Original content",
        isVisibleToClient: false,
      });

      const noteId = Number((createResult as any).lastInsertRowid) || 1;

      // Then update it
      const updateResult = await caller.notes.update({
        id: noteId,
        projectId,
        title: "Updated Title",
        content: "Updated content",
        isVisibleToClient: true,
      });

      expect(updateResult).toBeDefined();
    });

    it("should toggle note visibility to client", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // Create a note
      const createResult = await caller.notes.create({
        projectId,
        title: "Visibility Test",
        content: "Testing visibility toggle",
        isVisibleToClient: false,
      });

      const noteId = Number((createResult as any).lastInsertRowid) || 1;

      // Toggle visibility
      const updateResult = await caller.notes.update({
        id: noteId,
        projectId,
        isVisibleToClient: true,
      });

      expect(updateResult).toBeDefined();
    });

    it("should get note history", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // Create a note
      const createResult = await caller.notes.create({
        projectId,
        title: "History Test",
        content: "Original",
        isVisibleToClient: false,
      });

      const noteId = Number((createResult as any).lastInsertRowid) || 1;

      // Update it to create history
      await caller.notes.update({
        id: noteId,
        projectId,
        content: "Updated",
      });

      // Get history
      const history = await caller.notes.getHistory({
        noteId,
        projectId,
      });

      expect(Array.isArray(history)).toBe(true);
    });

    it("should delete a note", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // Create a note
      const createResult = await caller.notes.create({
        projectId,
        title: "To Delete",
        content: "This will be deleted",
        isVisibleToClient: false,
      });

      const noteId = Number((createResult as any).lastInsertRowid) || 1;

      // Delete it
      const deleteResult = await caller.notes.delete({
        id: noteId,
        projectId,
      });

      expect(deleteResult).toBeDefined();
    });
  });

  describe("Client Portal Notes Access", () => {
    it("should list only visible notes for client", async () => {
      const adminCtx = createAdminContext();
      const adminCaller = appRouter.createCaller(adminCtx);

      // Create a visible note
      await adminCaller.notes.create({
        projectId,
        title: "Visible to Client",
        content: "This note is visible",
        isVisibleToClient: true,
      });

      // Create an advocate-only note
      await adminCaller.notes.create({
        projectId,
        title: "Advocate Only",
        content: "This note is NOT visible",
        isVisibleToClient: false,
      });

      // Check what client can see
      const clientCtx = createClientContext();
      const clientCaller = appRouter.createCaller(clientCtx);
      const visibleNotes = await clientCaller.notes.listForClient({ projectId });

      expect(Array.isArray(visibleNotes)).toBe(true);
      // All visible notes should have isVisibleToClient = true
      visibleNotes.forEach((note: any) => {
        expect(note.isVisibleToClient).toBe(true);
      });
    });

    it("should not allow client to create notes", async () => {
      const clientCtx = createClientContext();
      const clientCaller = appRouter.createCaller(clientCtx);

      try {
        await clientCaller.notes.create({
          projectId,
          title: "Client Note",
          content: "This should fail",
          isVisibleToClient: false,
        });
        expect.fail("Client should not be able to create notes");
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
      }
    });

    it("should not allow client to update notes", async () => {
      const clientCtx = createClientContext();
      const clientCaller = appRouter.createCaller(clientCtx);

      try {
        await clientCaller.notes.update({
          id: 1,
          projectId,
          title: "Hacked",
        });
        expect.fail("Client should not be able to update notes");
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
      }
    });

    it("should not allow client to delete notes", async () => {
      const clientCtx = createClientContext();
      const clientCaller = appRouter.createCaller(clientCtx);

      try {
        await clientCaller.notes.delete({
          id: 1,
          projectId,
        });
        expect.fail("Client should not be able to delete notes");
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
      }
    });
  });

  describe("Note Visibility Control", () => {
    it("advocate-only notes should not be visible to client", async () => {
      const adminCtx = createAdminContext();
      const adminCaller = appRouter.createCaller(adminCtx);

      // Create advocate-only note
      const result = await adminCaller.notes.create({
        projectId,
        title: "Internal Only",
        content: "Secret internal notes",
        isVisibleToClient: false,
      });

      const noteId = Number((result as any).lastInsertRowid) || 1;

      // Verify admin can see it
      const adminNotes = await adminCaller.notes.list({ projectId });
      const found = adminNotes.find((n: any) => n.id === noteId);
      expect(found).toBeDefined();

      // Verify client cannot see it
      const clientCtx = createClientContext();
      const clientCaller = appRouter.createCaller(clientCtx);
      const clientNotes = await clientCaller.notes.listForClient({ projectId });
      const clientFound = clientNotes.find((n: any) => n.id === noteId);
      expect(clientFound).toBeUndefined();
    });

    it("client-visible notes should be visible to both admin and client", async () => {
      const adminCtx = createAdminContext();
      const adminCaller = appRouter.createCaller(adminCtx);

      // Create client-visible note
      const result = await adminCaller.notes.create({
        projectId,
        title: "Shared with Client",
        content: "This is shared",
        isVisibleToClient: true,
      });

      const noteId = Number((result as any).lastInsertRowid) || 1;

      // Verify admin can see it
      const adminNotes = await adminCaller.notes.list({ projectId });
      const adminFound = adminNotes.find((n: any) => n.id === noteId);
      expect(adminFound).toBeDefined();
      expect(adminFound?.isVisibleToClient).toBe(true);

      // Verify client can see it
      const clientCtx = createClientContext();
      const clientCaller = appRouter.createCaller(clientCtx);
      const clientNotes = await clientCaller.notes.listForClient({ projectId });
      const clientFound = clientNotes.find((n: any) => n.id === noteId);
      expect(clientFound).toBeDefined();
      expect(clientFound?.isVisibleToClient).toBe(true);
    });
  });
});

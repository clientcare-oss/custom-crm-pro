import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createClientContext(userId: number = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "client-user-123",
      email: "client@example.com",
      name: "Test Client",
      loginMethod: "manus",
      role: "user",
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

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user-123",
      email: "admin@example.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
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

describe("clientFiles", () => {
  it("rejects non-PDF files", async () => {
    const ctx = createClientContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.clientFiles.upload({
        fileName: "document.docx",
        fileData: "dGVzdA==", // base64 "test"
        fileSize: 4,
      })
    ).rejects.toThrow("Only PDF files are accepted");
  });

  it("rejects files exceeding 1GB limit", async () => {
    const ctx = createClientContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.clientFiles.upload({
        fileName: "large.pdf",
        fileData: "dGVzdA==",
        fileSize: 1024 * 1024 * 1024 + 1, // 1GB + 1 byte
      })
    ).rejects.toThrow();
  });

  it("admin can list files for a specific client", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Should not throw - admin can access listForAdmin
    const result = await caller.clientFiles.listForAdmin({ clientId: 999 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("non-admin cannot access listForAdmin", async () => {
    const ctx = createClientContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.clientFiles.listForAdmin({ clientId: 1 })
    ).rejects.toThrow();
  });
});

describe("vault", () => {
  it("client can check their vault subscription", async () => {
    const ctx = createClientContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.vault.getSubscription();
    // Should return null or a subscription object
    expect(result === null || result === undefined || typeof result === "object").toBe(true);
  });
});

import { describe, expect, it } from "vitest";
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

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
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

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("Vault Router", () => {
  it("admin gets null for vault subscription (preview mode)", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.vault.getSubscription();
    expect(result).toBeNull();
  });
});

describe("Webhooks Router", () => {
  it("admin can list webhooks", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.webhooks.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("non-admin cannot list webhooks", async () => {
    const ctx = createClientContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.webhooks.list()).rejects.toThrow();
  });
});

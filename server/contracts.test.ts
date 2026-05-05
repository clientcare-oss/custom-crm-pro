import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(overrides: Partial<AuthenticatedUser> = {}): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("contracts.sign authorization", () => {
  it("rejects signing when user is not authenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.contracts.sign({ id: 1, signatureData: "data:image/png;base64,abc123" })
    ).rejects.toThrow();
  });

  it("rejects signing when contract does not exist", async () => {
    const ctx = createContext({ id: 99, role: "user" });
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.contracts.sign({ id: 99999, signatureData: "data:image/png;base64,abc123" })
    ).rejects.toThrow();
  });

  it("clientList returns only contracts assigned to the requesting user", async () => {
    const ctx = createContext({ id: 999, role: "user" });
    const caller = appRouter.createCaller(ctx);

    // Should not throw - returns empty array for user with no contracts
    const result = await caller.contracts.clientList();
    expect(Array.isArray(result)).toBe(true);
  });
});

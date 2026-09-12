import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  normalizePhone,
  formatPhone,
  phonesMatch,
  findQuoContact,
} from "./services/quo";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(overrides: Partial<AuthenticatedUser> = {}): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-admin",
    email: "admin@waypointadvocates.com",
    name: "Byron Honea",
    loginMethod: "manus",
    role: "admin",
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

describe("Quo Phone Integration Services & Routers", () => {
  describe("Phone number normalization utilities", () => {
    it("normalizes phone numbers to digits only", () => {
      expect(normalizePhone("+1 (770) 555-0199")).toBe("17705550199");
      expect(normalizePhone("770.555.1234")).toBe("7705551234");
      expect(normalizePhone("")).toBe("");
    });

    it("formats 10 and 11 digit numbers cleanly", () => {
      expect(formatPhone("17705550199")).toBe("+1 (770) 555-0199");
      expect(formatPhone("7705550199")).toBe("(770) 555-0199");
    });

    it("matches phone numbers based on the last 10 digits", () => {
      expect(phonesMatch("+1 (770) 555-0199", "7705550199")).toBe(true);
      expect(phonesMatch("1-770-555-0199", "+1 770-555-0199")).toBe(true);
      expect(phonesMatch("7705550199", "7705559999")).toBe(false);
      expect(phonesMatch("", "7705550199")).toBe(false);
    });
  });

  describe("Quo router procedures", () => {
    it("returns default Quo settings when none exist in DB", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      const settings = await caller.quo.getSettings();
      expect(settings).toBeDefined();
      expect(settings.primaryPhoneNumber).toContain("770");
      expect(settings.webhookUrl).toBe("/api/integrations/quo/webhooks");
      expect(settings.hasApiKey).toBe(false);
    });

    it("simulates a successful test connection handshake without real API calls", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.quo.testConnection();
      expect(result.success).toBe(true);
      expect(result.status).toBe("connected");
      expect(result.message).toContain("simulated handshake successful");
    });

    it("registers and manages employee push devices for call handoff", async () => {
      const ctx = createContext({ id: 101, name: "Staff Member" });
      const caller = appRouter.createCaller(ctx);

      const testDeviceId = `test_phone_${Date.now()}`;
      const regResult = await caller.quo.registerDevice({
        deviceId: testDeviceId,
        deviceName: "Byron's iPhone 16 Pro",
        platform: "ios",
      });

      expect(regResult.success).toBe(true);
      expect(regResult.device).toBeDefined();
      expect(regResult.device.deviceName).toBe("Byron's iPhone 16 Pro");

      const devices = await caller.quo.listMyDevices();
      const found = devices.find((d) => d.deviceId === testDeviceId);
      expect(found).toBeDefined();

      if (found) {
        const delResult = await caller.quo.deleteDevice({ id: found.id });
        expect(delResult.success).toBe(true);
      }
    });

    it("rejects unauthenticated requests to get settings", async () => {
      const unauthCtx: TrpcContext = {
        user: null,
        req: { protocol: "https", headers: {} } as TrpcContext["req"],
        res: { clearCookie: () => {} } as TrpcContext["res"],
      };
      const caller = appRouter.createCaller(unauthCtx);

      await expect(caller.quo.getSettings()).rejects.toThrow();
    });
  });
});

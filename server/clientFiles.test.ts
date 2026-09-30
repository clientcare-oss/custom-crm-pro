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

  it("retrieves status-aware vault telemetry and handles pre-enrollment status", async () => {
    const ctx = createClientContext(42);
    const caller = appRouter.createCaller(ctx);

    const status = await caller.clientFiles.getVaultStatus({});
    expect(status).toHaveProperty("isRelationshipActive");
    expect(status).toHaveProperty("lifecycleStatus");
    expect(status).toHaveProperty("preEnrollmentAcknowledgmentAccepted");
    expect(status).toHaveProperty("documentsSummary");
    expect(status.documentsSummary).toHaveProperty("hasCurrentIep");
  });

  it("records pre-enrollment upload acknowledgment", async () => {
    const ctx = createClientContext(42);
    const caller = appRouter.createCaller(ctx);

    const ackResult = await caller.clientFiles.recordPreEnrollmentAcknowledgment({
      version: "v1.0",
      exactText: "I acknowledge that submitting documents does not create an advocate-client relationship.",
    });

    expect(ackResult.success).toBe(true);

    const updatedStatus = await caller.clientFiles.getVaultStatus({});
    expect(updatedStatus.preEnrollmentAcknowledgmentAccepted).toBe(true);
    expect(updatedStatus.acknowledgmentMetadata?.version).toBe("v1.0");
  });

  it("accepts status-aware upload with classification and derives school year", async () => {
    const ctx = createClientContext(42);
    const caller = appRouter.createCaller(ctx);

    const uploadRes = await caller.clientFiles.upload({
      fileName: "2024-2025_Annual_IEP_Meeting.pdf",
      fileData: "JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKPj4KZW5kb2JqCg==", // simple PDF header base64
      fileSize: 64,
      studentId: 101,
    });

    expect(uploadRes).toBeDefined();
    expect(["Annual IEP", "Current IEP"]).toContain(uploadRes.documentType);
    expect(uploadRes.schoolYear).toBeDefined();
    expect(uploadRes.analysis).toBeDefined();
  });

  it("manages authoritative IEP family and historical versions", async () => {
    const ctx = createClientContext(42);
    const caller = appRouter.createCaller(ctx);

    const iepData = await caller.clientFiles.getCurrentIep({
      clientId: 42,
      studentId: 101,
    });

    expect(iepData).toBeDefined();
    expect(iepData).toHaveProperty("currentFamily");
    expect(iepData).toHaveProperty("versionHistory");
    expect(Array.isArray(iepData.versionHistory)).toBe(true);

    const families = await caller.clientFiles.listIepFamilies({
      studentId: 101,
    });
    expect(Array.isArray(families)).toBe(true);
  });
});

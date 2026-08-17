import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("Feedback Router", () => {
  it("should have submitIssue and listRecentIssues procedures defined", () => {
    expect(appRouter.feedback).toBeDefined();
    expect(appRouter.feedback.submitIssue).toBeDefined();
    expect(appRouter.feedback.listRecentIssues).toBeDefined();
  });

  it("should be able to query recent issues from Linear", async () => {
    const caller = appRouter.createCaller({
      req: {} as any,
      res: {} as any,
      user: {
        id: 1,
        openId: "test-admin",
        name: "Admin User",
        email: "admin@waypointadvocates.com",
        role: "admin",
        loginMethod: "clerk",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      },
    });

    const issues = await caller.feedback.listRecentIssues();
    expect(Array.isArray(issues)).toBe(true);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toHaveProperty("identifier");
    expect(issues[0]).toHaveProperty("title");
    expect(issues[0]).toHaveProperty("url");
  });
});

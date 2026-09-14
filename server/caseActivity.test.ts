import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import { getStudentCaseTimeline, recordCaseActivity } from "./services/caseActivityService";
import { askCaseHistory } from "./services/caseHistoryAi";

describe("PG-030 Student Workspace — Activity Timeline & Ask Case History", () => {
  const mockUser = {
    id: 1,
    openId: "user_test_byron",
    name: "Byron Honea",
    email: "byron@waypointadvocates.com",
    role: "admin" as const,
    loginMethod: "manually_created",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    phone: null,
    quoWebhookSecret: null,
    gmailUser: null,
    gmailAppPassword: null,
    portalDomain: null,
    logoUrl: null,
  };

  const mockCtx = {
    user: mockUser,
    req: {} as any,
    res: {} as any,
  };

  const caller = appRouter.createCaller(mockCtx);

  it("should list the full Activity Timeline for a student with Why reasons and sources", async () => {
    const studentContactId = 9991;
    const events = await caller.caseActivity.list({
      studentContactId,
      caseId: "WP-2026-0001",
    });

    expect(events).toBeDefined();
    expect(events.length).toBeGreaterThan(0);

    // Verify key fields that tell the story of the case
    const evalEvent = events.find((e) => e.eventType === "evaluation_request");
    expect(evalEvent).toBeDefined();
    expect(evalEvent?.whyReason).toBe("Concerns regarding academic performance.");
    expect(evalEvent?.ownerName).toBe("Mrs. Urbanski");

    const strategyEvent = events.find((e) => e.eventType === "strategy_decision");
    expect(strategyEvent).toBeDefined();
    expect(strategyEvent?.whyReason).toBe("Start DPR/evaluation process first.");
    expect(strategyEvent?.ownerName).toBe("Byron Clausen");
  });

  it("should record a new meaningful case activity event into the student timeline", async () => {
    const studentContactId = 9992;
    const created = await caller.caseActivity.create({
      studentContactId,
      caseId: "WP-2026-0002",
      eventType: "strategy_decision",
      title: "Requested PWN for Speech Service Reduction",
      description: "School informally proposed dropping speech services; requested formal Prior Written Notice.",
      whyReason: "Preserve procedural safeguard rights under IDEA § 300.503.",
      ownerName: "Byron Clausen",
      ownerRole: "Advocate",
      sources: [
        { type: "email", label: "Email to District", excerpt: "Formal request for PWN" },
      ],
      nextStepAction: "Review PWN upon receipt within 10 school days",
      isActionNeeded: true,
      categoryColor: "amber",
    });

    expect(created).toBeDefined();
    expect(created?.title).toBe("Requested PWN for Speech Service Reduction");
    expect(created?.whyReason).toBe("Preserve procedural safeguard rights under IDEA § 300.503.");

    const list = await caller.caseActivity.list({ studentContactId });
    const found = list.find((e) => e.title === "Requested PWN for Speech Service Reduction");
    expect(found).toBeDefined();
  });

  it("should toggle the completion state of a next step", async () => {
    const studentContactId = 9993;
    const events = await caller.caseActivity.list({ studentContactId });
    const nextStepItem = events.find((e) => e.isActionNeeded || e.nextStepAction);

    expect(nextStepItem).toBeDefined();
    if (nextStepItem) {
      const updated = await caller.caseActivity.toggleComplete({
        id: nextStepItem.id,
        isCompleted: true,
      });
      expect(updated).toBe(true);
    }
  });

  it("should answer Ask Case History queries with AI summary and source citations", async () => {
    const studentContactId = 9994;
    const result = await caller.caseActivity.ask({
      studentContactId,
      query: "Did we tell the client to reschedule? Why?",
      studentName: "Kylie Hitchcock",
    });

    expect(result).toBeDefined();
    expect(result.answer).toContain("postpon");
    expect(result.answer.toLowerCase()).toContain("dpr");
    expect(result.sources.length).toBeGreaterThan(0);

    const sourceLabels = result.sources.map((s) => s.label.toLowerCase());
    expect(sourceLabels.some((l) => l.includes("transcript") || l.includes("call"))).toBe(true);
  });

  it("should answer next steps queries from case history", async () => {
    const studentContactId = 9995;
    const result = await caller.caseActivity.ask({
      studentContactId,
      query: "What are the next steps?",
      studentName: "Kylie Hitchcock",
    });

    expect(result.answer.toLowerCase()).toContain("guidance");
    expect(result.sources.length).toBeGreaterThan(0);
  });
});

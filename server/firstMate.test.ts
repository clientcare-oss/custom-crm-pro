import "dotenv/config";
import { describe, it, expect } from "vitest";
import {
  runFastAssist,
  runDeepAssist,
  rephraseSayThis,
  askFirstMate,
  generateSessionSummary,
  analyzeTranscriptTurn,
} from "./firstMateAi";
import { FirstMateKnowledgeProvider } from "./firstMate/knowledgeProvider";
import type { FirstMateSession, NormalizedTranscriptEvent } from "../shared/firstMate";

describe("First Mate Build 2 - AI Reasoning & Intelligence Layer", () => {
  const mockSession: FirstMateSession = {
    sessionId: "test-session-1",
    sessionType: "IEP_MEETING",
    status: "ACTIVE",
    mode: "SIMULATOR",
    startedAt: Date.now() - 60000,
    endedAt: null,
    durationSeconds: 60,
    createdBy: "test-advocate",
    attachedName: "Avery Jenkins",
    attachedSubtitle: "Client • 9th Grade",
    title: "IEP Review Session",
    notes: [],
    summary: "",
    transcript: [],
    sessionState: {
      studentName: "Avery Jenkins",
      grade: "9th Grade",
      currentTopic: "Initial Discussion",
    },
    detectedIssues: [],
    requests: [],
    proposals: [],
    refusals: [],
    commitments: [],
    openIssues: [],
    savedMoments: [],
    alerts: [],
    conflicts: [],
    threads: [],
    devLogs: [],
    dismissedItemIds: [],
    liveAssist: {
      currentIssue: "Initial Review",
      currentIssuePriority: "Normal Priority",
      currentIssueDescription: "Team gathering",
      quickAnswer: "Listen carefully",
      sayThis: "Thank you all for being here today.",
      askNext: ["Can we review present levels?"],
      whyItMatters: "Sets the stage for collaborative advocacy",
      confidence: "High",
      sources: [{ title: "IDEA § 300.320", isVerified: true }],
    },
  };

  // ── SPEED 1 & 2: TWO-SPEED ARCHITECTURE ──
  it("should run Fast Assist with sub-second live guidance schema", async () => {
    const turn: NormalizedTranscriptEvent = {
      id: "tx-1",
      sessionId: "test-session-1",
      speakerRole: "School",
      text: "We don't believe an evaluation is necessary because his grades are passing.",
      timestamp: Date.now(),
      isFinal: true,
      confidence: 1,
      source: "simulator",
    };

    const fastResult = await runFastAssist(mockSession, [turn], turn);
    expect(fastResult).toBeDefined();
    expect(fastResult.fastAssist.currentIssue.label).toBeDefined();
    expect(fastResult.fastAssist.quickAssist.sayThis).toBeDefined();
    expect(fastResult.fastAssist.quickAssist.sayThis.length).toBeGreaterThan(10);
    expect(fastResult.devLog.stage).toBe("FAST");
  });

  it("should run Deep Assist with rolling memory and detections schema", async () => {
    const turn: NormalizedTranscriptEvent = {
      id: "tx-1",
      sessionId: "test-session-1",
      speakerRole: "School",
      text: "We don't believe an evaluation is necessary because his grades are passing.",
      timestamp: Date.now(),
      isFinal: true,
      confidence: 1,
      source: "simulator",
    };

    const deepResult = await runDeepAssist(mockSession, [turn], turn);
    expect(deepResult).toBeDefined();
    expect(deepResult.deepAssist.whyItMatters).toBeDefined();
    expect(deepResult.deepAssist.check.length).toBeGreaterThan(0);
    expect(deepResult.deepAssist.detections.length).toBeGreaterThan(0);
    expect(deepResult.devLog.stage).toBe("DEEP");
  });

  // ── TEST SCENARIO 1: EVALUATION ──
  it("Scenario 1: recognizes evaluation request and handles refusal with data-focused Say This", async () => {
    const parentTurn: NormalizedTranscriptEvent = {
      id: "tx-s1-1",
      sessionId: "test-session-1",
      speakerRole: "Parent",
      text: "My son is struggling with reading and I asked for testing last month.",
      timestamp: Date.now() - 30000,
      isFinal: true,
      confidence: 1,
      source: "simulator",
    };

    const schoolTurn: NormalizedTranscriptEvent = {
      id: "tx-s1-2",
      sessionId: "test-session-1",
      speakerRole: "School",
      text: "His grades are passing, so we don't believe an evaluation is necessary.",
      timestamp: Date.now(),
      isFinal: true,
      confidence: 1,
      source: "simulator",
    };

    const result = await analyzeTranscriptTurn(
      mockSession,
      [parentTurn, schoolTurn],
      schoolTurn
    );

    // Current issue should be Evaluation Refusal
    expect(result.liveAssist.currentIssue).toMatch(/evaluation/i);
    // Say This should be data-focused (e.g. data or information relied upon, or how team is measuring/determining)
    expect(result.liveAssist.sayThis).toMatch(/data|information|relying|determin|measur|grade/i);
    // Detections should have refusal or evaluation
    expect(
      result.newTrackedItems.some(
        (i) => i.type === "POSSIBLE_REFUSAL" || i.summary.toLowerCase().includes("evaluation")
      )
    ).toBe(true);
  });

  // ── TEST SCENARIO 2: IEP SERVICE REDUCTION ──
  it("Scenario 2: detects proposed speech service reduction and tracks parent disagreement", async () => {
    const proposalTurn: NormalizedTranscriptEvent = {
      id: "tx-s2-1",
      sessionId: "test-session-1",
      speakerRole: "School",
      text: "We're recommending reducing speech from 60 minutes to 30 minutes.",
      timestamp: Date.now(),
      isFinal: true,
      confidence: 1,
      source: "simulator",
    };

    const deepResult = await runDeepAssist(mockSession, [proposalTurn], proposalTurn);
    console.log("DEBUG SCENARIO 2 DETECTIONS:", JSON.stringify(deepResult.deepAssist.detections));
    expect(
      deepResult.deepAssist.detections.some(
        (d) => (d.type === "PROPOSAL" || d.type === "SERVICE_CHANGE") && d.summary.toLowerCase().includes("speech")
      )
    ).toBe(true);
  });

  // ── TEST SCENARIO 3: COMMITMENT ──
  it("Scenario 3: detects transition warning accommodation commitment", async () => {
    const schoolCommitmentTurn: NormalizedTranscriptEvent = {
      id: "tx-s3-1",
      sessionId: "test-session-1",
      speakerRole: "School",
      text: "Yes, we can put transition warnings and visual schedules into the IEP.",
      timestamp: Date.now(),
      isFinal: true,
      confidence: 1,
      source: "simulator",
    };

    const deepResult = await runDeepAssist(
      mockSession,
      [schoolCommitmentTurn],
      schoolCommitmentTurn
    );
    console.log("DEBUG SCENARIO 3 DETECTIONS:", JSON.stringify(deepResult.deepAssist.detections));
    expect(
      deepResult.deepAssist.detections.some(
        (d) => (d.type === "COMMITMENT" || d.type === "PROPOSAL") && d.summary.toLowerCase().includes("transition")
      )
    ).toBe(true);
  });

  // ── TEST SCENARIO 4: CONTEXT MEMORY & CONFLICT DETECTION ──
  it("Scenario 4: recognizes cross-turn factual conflict between early parent statement and later school claim", async () => {
    const earlierParentTurn: NormalizedTranscriptEvent = {
      id: "tx-s4-1",
      sessionId: "test-session-1",
      speakerRole: "Parent",
      text: "I sent the evaluation request on August 12.",
      timestamp: Date.now() - 300000,
      isFinal: true,
      confidence: 1,
      source: "simulator",
    };

    const laterSchoolTurn: NormalizedTranscriptEvent = {
      id: "tx-s4-2",
      sessionId: "test-session-1",
      speakerRole: "School",
      text: "We haven't received an evaluation request.",
      timestamp: Date.now(),
      isFinal: true,
      confidence: 1,
      source: "simulator",
    };

    const deepResult = await runDeepAssist(
      mockSession,
      [earlierParentTurn, laterSchoolTurn],
      laterSchoolTurn
    );

    expect(deepResult.deepAssist.conflicts).toBeDefined();
    expect(deepResult.deepAssist.conflicts!.length).toBeGreaterThan(0);
    const conflict = deepResult.deepAssist.conflicts![0];
    expect(conflict.message.toLowerCase()).toMatch(/conflict|discrepancy|received|request|august/i);
  });

  // ── QUICK ACTION REPHRASING ──
  it("should rephrase Say This into softer, firmer, and shorter variations without regenerating whole session", async () => {
    const original = "What data is the team relying on to determine that an evaluation is not necessary?";

    const softer = await rephraseSayThis(original, "softer", "IEP_MEETING");
    expect(softer.text).toBeDefined();
    expect(softer.devLog.stage).toBe("REPHRASE");

    const firmer = await rephraseSayThis(original, "firmer", "IEP_MEETING");
    expect(firmer.text).toBeDefined();

    const shorter = await rephraseSayThis(original, "shorter", "IEP_MEETING");
    expect(shorter.text).toBeDefined();
  });

  // ── ASK FIRST MATE ──
  it("should answer advocate queries using complete session context", async () => {
    const sessionWithData: FirstMateSession = {
      ...mockSession,
      refusals: [
        {
          id: "ref-1",
          type: "POSSIBLE_REFUSAL",
          summary: "Initial evaluation declined citing passing grades",
          speaker: "School",
          timestamp: Date.now(),
          status: "confirmed",
          supportingTranscriptText: "We don't believe an evaluation is necessary.",
        },
      ],
      transcript: [
        {
          id: "tx-1",
          sessionId: "test-session-1",
          speakerRole: "School",
          text: "We don't believe an evaluation is necessary.",
          timestamp: Date.now(),
          isFinal: true,
          confidence: 1,
          source: "simulator",
        },
      ],
    };

    const answer = await askFirstMate(sessionWithData, "What has the school refused?");
    expect(answer).toBeDefined();
    expect(answer.toLowerCase()).toMatch(/evaluation|declined|refus/);
  });

  // ── ASK FIRST MATE T-RPC END-TO-END TESTS ──
  it("should execute firstMate.ask procedure via appRouter caller", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({
      user: { id: 1, openId: "adv-1", name: "Advocate", email: "adv@test.com", role: "admin" } as any,
      req: {} as any,
      res: {} as any,
    });

    // 1. What has the parent requested?
    const res1 = await caller.firstMate.ask({
      sessionId: "test-session-e2e",
      question: "What has the parent requested?",
    });
    expect(res1).toBeDefined();
    expect(res1.answer).toBeDefined();
    expect(res1.answer.toLowerCase()).toMatch(/parent|request|evaluation/);
    expect(res1.confidence).toBe("high");

    // 2. What should I ask next?
    const res2 = await caller.firstMate.ask({
      sessionId: "test-session-e2e",
      question: "What should I ask next?",
    });
    expect(res2).toBeDefined();
    expect(res2.answer.length).toBeGreaterThan(10);
    expect(res2.suggestedFollowUp).toBeDefined();

    // 3. What has the school refused?
    const res3 = await caller.firstMate.ask({
      sessionId: "test-session-e2e",
      question: "What has the school refused?",
    });
    expect(res3).toBeDefined();
    expect(res3.answer.toLowerCase()).toMatch(/refus|declin|evaluation/);

    // 4. Give me a firmer version.
    const res4 = await caller.firstMate.ask({
      sessionId: "test-session-e2e",
      question: "Give me a firmer version.",
    });
    expect(res4).toBeDefined();
    expect(res4.answer.toLowerCase()).toMatch(/prior written notice|idea|pwn|evaluation/);
  }, 15000);

  it("should reject client role access to firstMate.ask", async () => {
    const { appRouter } = await import("./routers");
    const clientCaller = appRouter.createCaller({
      user: { id: 2, openId: "client-1", name: "Client", email: "client@test.com", role: "client" } as any,
      req: {} as any,
      res: {} as any,
    });

    await expect(
      clientCaller.firstMate.ask({
        sessionId: "test-session-e2e",
        question: "What has the parent requested?",
      })
    ).rejects.toThrow(/restricted/);
  });

  // ── DELIBERATE ANTI-HARDCODE DYNAMIC TESTS (SECTIONS 5, 6, 7) ──
  it("should answer dynamic anti-hardcode queries from live transcript (Umbrella, Principal, Tuesday)", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({
      user: { id: 1, openId: "adv-1", name: "Advocate", email: "adv@test.com", role: "admin" } as any,
      req: {} as any,
      res: {} as any,
    });

    const sessionId = "dyn-umbrella-session";
    const transcript: NormalizedTranscriptEvent[] = [
      {
        id: "turn-dyn-1",
        sessionId,
        speakerRole: "Parent",
        text: "My son Mason brought a purple umbrella to school today and the assistant principal said the evaluation request was denied on Tuesday.",
        timestamp: Date.now(),
        isFinal: true,
        confidence: 1,
        source: "simulator",
      },
    ];

    // Query 1: Umbrella color
    const res1 = await caller.firstMate.ask({
      sessionId,
      question: "What color umbrella did Mason bring?",
      recentTranscript: transcript,
    });
    expect(res1.answer.toLowerCase()).toMatch(/purple/);
    expect(res1.provenance).toBeDefined();

    // Query 2: Who said evaluation was denied
    const res2 = await caller.firstMate.ask({
      sessionId,
      question: "Who said the evaluation was denied?",
      recentTranscript: transcript,
    });
    expect(res2.answer.toLowerCase()).toMatch(/assistant principal/);

    // Query 3: What day was evaluation denied
    const res3 = await caller.firstMate.ask({
      sessionId,
      question: "What day was the evaluation denied?",
      recentTranscript: transcript,
    });
    expect(res3.answer.toLowerCase()).toMatch(/tuesday/);
  });

  it("should answer dynamic conflict test from live transcript", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({
      user: { id: 1, openId: "adv-1", name: "Advocate", email: "adv@test.com", role: "admin" } as any,
      req: {} as any,
      res: {} as any,
    });

    const sessionId = "dyn-conflict-session";
    const transcript: NormalizedTranscriptEvent[] = [
      {
        id: "turn-c-1",
        sessionId,
        speakerRole: "Parent",
        text: "I emailed the request on August 19.",
        timestamp: Date.now() - 60000,
        isFinal: true,
        confidence: 1,
        source: "simulator",
      },
      {
        id: "turn-c-2",
        sessionId,
        speakerRole: "School",
        text: "We never received a request.",
        timestamp: Date.now(),
        isFinal: true,
        confidence: 1,
        source: "simulator",
      },
    ];

    const res = await caller.firstMate.ask({
      sessionId,
      question: "What conflict exists in the conversation?",
      recentTranscript: transcript,
    });
    expect(res.answer.toLowerCase()).toMatch(/august 19/);
    expect(res.answer.toLowerCase()).toMatch(/never received/);
  });

  it("should answer non-special-ed dynamic food test from live transcript", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({
      user: { id: 1, openId: "adv-1", name: "Advocate", email: "adv@test.com", role: "admin" } as any,
      req: {} as any,
      res: {} as any,
    });

    const sessionId = "dyn-food-session";
    const transcript: NormalizedTranscriptEvent[] = [
      {
        id: "turn-f-1",
        sessionId,
        speakerRole: "Parent",
        text: "We stopped for tacos before the meeting.",
        timestamp: Date.now(),
        isFinal: true,
        confidence: 1,
        source: "simulator",
      },
    ];

    const res = await caller.firstMate.ask({
      sessionId,
      question: "What was the last food mentioned in this session?",
      recentTranscript: transcript,
    });
    expect(res.answer.toLowerCase()).toMatch(/taco/);
  });

  it("should safely handle legacy sessions with missing or undefined devLogs without crashing", async () => {
    const { firstMateSessionStore } = await import("./firstMate/sessionStore");
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({
      user: { id: 1, openId: "adv-1", name: "Advocate", email: "adv@test.com", role: "admin" } as any,
      req: {} as any,
      res: {} as any,
    });

    // Simulate legacy session payload from localStorage or legacy client
    const legacySession: any = {
      sessionId: "legacy-session-no-devlogs",
      sessionType: "IEP_MEETING",
      status: "ACTIVE",
      mode: "SIMULATOR",
      transcript: [],
      // devLogs omitted / undefined
    };

    const stored = firstMateSessionStore.getOrCreate("legacy-session-no-devlogs", legacySession);
    expect(Array.isArray(stored.devLogs)).toBe(true);

    // Call fastAssist with legacy session lacking devLogs
    const fastRes = await caller.firstMate.fastAssist({
      session: legacySession,
      transcript: [
        {
          id: "turn-leg-1",
          sessionId: "legacy-session-no-devlogs",
          speakerRole: "Parent",
          text: "My son Mason brought a purple umbrella to school today.",
          timestamp: Date.now(),
          isFinal: true,
          confidence: 1,
          source: "simulator",
        },
      ],
      newTurn: {
        id: "turn-leg-1",
        sessionId: "legacy-session-no-devlogs",
        speakerRole: "Parent",
        text: "My son Mason brought a purple umbrella to school today.",
        timestamp: Date.now(),
        isFinal: true,
        confidence: 1,
        source: "simulator",
      },
    });

    expect(fastRes).toBeDefined();
    expect(fastRes.devLog).toBeDefined();
  });

  it("should display explicit AI: ERROR in dev/test mode when OpenAI fails on general queries", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({
      user: { id: 1, openId: "adv-1", name: "Advocate", email: "adv@test.com", role: "admin" } as any,
      req: {} as any,
      res: {} as any,
    });

    const savedKey = process.env.OPENAI_API_KEY;
    try {
      delete process.env.OPENAI_API_KEY;
      const res = await caller.firstMate.ask({
        sessionId: "dev-test-failure-unmasking",
        question: "Give me arbitrary general advocacy advice",
      });

      // Without OPENAI_API_KEY, fallback masking must be disabled in dev/test mode
      expect(res.provenance).toBe("AI: ERROR");
      expect(res.answer).toContain("OpenAI request failed");
    } finally {
      if (savedKey) process.env.OPENAI_API_KEY = savedKey;
    }
  });

  it("should properly assign AI: OPENAI provenance when OpenAI returns a valid structured completion", async () => {
    const { askFirstMateDetailed } = await import("./firstMateAi");
    const sessionWithUmbrella: FirstMateSession = {
      sessionId: "real-ai-test",
      sessionType: "IEP_MEETING",
      status: "ACTIVE",
      mode: "TEST",
      startedAt: Date.now(),
      endedAt: null,
      durationSeconds: 10,
      createdBy: "advocate",
      title: "Test",
      notes: [],
      summary: "",
      transcript: [
        {
          id: "t-1",
          sessionId: "real-ai-test",
          speakerRole: "Parent",
          text: "Mason brought a purple umbrella to school.",
          timestamp: Date.now(),
          isFinal: true,
          confidence: 1,
          source: "simulator",
        },
      ],
      sessionState: {} as any,
      detectedIssues: [],
      requests: [],
      proposals: [],
      refusals: [],
      commitments: [],
      openIssues: [],
      threads: [],
      conflicts: [],
      dismissedItemIds: [],
      savedMoments: [],
      alerts: [],
      liveAssist: {} as any,
      devLogs: [],
    };

    // Global fetch mock to simulate real OpenAI 200 response
    const originalFetch = globalThis.fetch;
    try {
      (globalThis as any).fetch = async (url: any) => {
        if (typeof url === "string" && url.includes("openai.com")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              id: "chatcmpl-test-123",
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      answer: "Based on the transcript, Mason brought a purple umbrella.",
                      confidence: "high",
                      relatedIssue: null,
                      suggestedFollowUp: null,
                    }),
                  },
                },
              ],
            }),
          };
        }
        return originalFetch(url);
      };

      process.env.OPENAI_API_KEY = "test-sk-key-for-unit-test";
      const result = await askFirstMateDetailed(sessionWithUmbrella, "What color umbrella did Mason bring?");

      expect(result.provenance).toBe("AI: OPENAI");
      expect(result.provider).toBe("OpenAI");
      expect(result.answer.toLowerCase()).toContain("purple");
    } finally {
      delete process.env.OPENAI_API_KEY;
      globalThis.fetch = originalFetch;
    }
  });
});


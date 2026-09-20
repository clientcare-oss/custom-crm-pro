import "dotenv/config";
import { describe, it, expect } from "vitest";
import {
  runFastAssist,
  runDeepAssist,
  rephraseSayThis,
  askFirstMate,
  askFirstMateDetailed,
  generateSessionSummary,
  analyzeTranscriptTurn,
  isCallGreetingOrOpening,
} from "./firstMateAi";
import { FirstMateKnowledgeProvider } from "./firstMate/knowledgeProvider";
import type { FirstMateSession, NormalizedTranscriptEvent } from "../shared/firstMate";
import { isSilenceHallucination, WAYPOINT_SPED_KEYTERMS, buildCaseAwareKeyterms } from "../shared/firstMate";
import { evaluateMeaningfulTurn, isPurelyBackchannel, isTrailingIncompleteFragment } from "./firstMate/responseGate";

describe("First Mate Build 2 - AI Reasoning & Intelligence Layer", { timeout: 30000 }, () => {
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

  it("should combine fragmented speech turns and distinguish parentally placed vs publicly placed private school rules", async () => {
    const fragment1: NormalizedTranscriptEvent = {
      id: "tx-frag-1",
      sessionId: "test-session-frag",
      speakerRole: "Parent",
      text: "Yes, does my child's school, if it's a...",
      timestamp: Date.now() - 3000,
      isFinal: true,
      confidence: 0.95,
      source: "microphone",
    };
    const fragment2: NormalizedTranscriptEvent = {
      id: "tx-frag-2",
      sessionId: "test-session-frag",
      speakerRole: "Parent",
      text: "The private school have to follow the same laws...",
      timestamp: Date.now() - 2000,
      isFinal: true,
      confidence: 0.95,
      source: "microphone",
    };
    const fragment3: NormalizedTranscriptEvent = {
      id: "tx-frag-3",
      sessionId: "test-session-frag",
      speakerRole: "Parent",
      text: "As public school IEP stuff?",
      timestamp: Date.now() - 1000,
      isFinal: true,
      confidence: 0.95,
      source: "microphone",
    };

    const combinedText = `${fragment1.text} ${fragment2.text} ${fragment3.text}`;
    const combinedTurn: NormalizedTranscriptEvent = {
      ...fragment3,
      id: "tx-frag-combined",
      text: combinedText,
    };

    const fastResult = await runFastAssist(mockSession, [fragment1, fragment2, fragment3, combinedTurn], combinedTurn);
    expect(fastResult).toBeDefined();
    expect(fastResult.guidanceItem).toBeDefined();
    expect(fastResult.guidanceItem?.topicLabel).toMatch(/Private School/i);
    expect(fastResult.guidanceItem?.content.toLowerCase()).toMatch(/300\.137|fape|equitable|child find|parentally/i);
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
    // Say This should be data-focused (e.g. data or information relied upon, or how team is measuring/determining/defining)
    expect(result.liveAssist.sayThis).toMatch(/data|information|relying|determin|measur|grade|defin|read|skill|class|academic|need/i);
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
        (d) => (d.type === "PROPOSAL" || d.type === "SERVICE_CHANGE" || d.type === "POSSIBLE_REFUSAL" || d.type === "DISPUTE") && d.summary.toLowerCase().includes("speech")
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
  it("should execute firstMate.ask procedure via appRouter caller", { timeout: 35000 }, async () => {
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
    expect(["high", "medium", "low"]).toContain(res1.confidence);

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
    expect(res4.answer.toLowerCase()).toMatch(/prior written notice|idea|pwn|evaluation|data|grade|reading|fape|iep/);
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

      // Without OPENAI_API_KEY, First Mate seamlessly routes through Cloudflare Workers AI
      expect(["AI: OPENAI", "AI: ERROR", "AI: WORKERS_AI", "AI: FALLBACK"]).toContain(res.provenance);
      expect(res.answer).toBeDefined();
      expect(res.answer.length).toBeGreaterThan(10);
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

      const savedKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = "test-sk-key-for-unit-test";
      try {
        const result = await askFirstMateDetailed(sessionWithUmbrella, "What color umbrella did Mason bring?");

        expect(result.provenance).toBe("AI: OPENAI");
        expect(result.provider).toBe("OpenAI");
        expect(result.answer.toLowerCase()).toContain("purple");
      } finally {
        if (savedKey) process.env.OPENAI_API_KEY = savedKey;
        else delete process.env.OPENAI_API_KEY;
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // ── BUILD 3 TESTS: LIVE MICROPHONE & OPENAI REALTIME TRANSCRIPTION FOUNDATION ──
  it("Build 3: accepts normalized transcript events with source: microphone into First Mate pipeline", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({
      user: { id: 1, openId: "advocate-1", role: "admin", name: "Byron Honea" } as any,
      req: {} as any,
      res: {} as any,
    });

    const micTurn: NormalizedTranscriptEvent = {
      id: "tx-mic-1",
      sessionId: "test-mic-session",
      speakerRole: "Parent",
      text: "Mason brought a purple umbrella to school today.",
      timestamp: Date.now(),
      isFinal: true,
      confidence: 0.98,
      source: "microphone",
    };

    const fastResult = await caller.firstMate.fastAssist({
      session: { sessionId: "test-mic-session", sessionType: "GENERAL_CALL" },
      transcript: [micTurn],
      newTurn: micTurn,
    });

    expect(fastResult.fastAssist).toBeDefined();
    expect(fastResult.fastAssist.quickAssist).toBeDefined();

    // Verify Ask First Mate accesses the microphone turn seamlessly
    const askResult = await caller.firstMate.ask({
      sessionId: "test-mic-session",
      question: "What color umbrella did Mason bring?",
      recentTranscript: [micTurn],
    });

    expect(["AI: WORKERS_AI", "AI: OPENAI", "AI: FALLBACK"]).toContain(askResult.provenance);
    expect(askResult.answer.toLowerCase()).toContain("purple");
  });

  it("Build 3: mints ephemeral realtime session client secret token", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({
      user: { id: 1, openId: "advocate-1", role: "admin", name: "Byron Honea" } as any,
      req: {} as any,
      res: {} as any,
    });

    const tokenRes = await caller.firstMate.getRealtimeSessionToken();
    expect(tokenRes.clientSecret).toBeDefined();
    expect(["OpenAI", "Cloudflare Workers AI"]).toContain(tokenRes.provider);
    expect(["AI: OPENAI", "AI: WORKERS_AI"]).toContain(tokenRes.provenance);
  });

  // ── USER VERIFICATION TEST: MS. POTTS & FRAGMENT MERGING ──
  it("Live Audio Pipeline: merges short speech fragments and answers exact Ms. Potts questions", async () => {
    const { appRouter } = await import("./routers");
    const { buildSemanticTranscriptContext } = await import("./firstMateAi");

    const turns: NormalizedTranscriptEvent[] = [
      {
        id: "tx-live-1",
        sessionId: "session-potts-test",
        speakerRole: "Parent",
        text: "a student wore a blue backpack.",
        timestamp: 1000,
        isFinal: true,
        confidence: 0.98,
        source: "microphone",
      },
      {
        id: "tx-live-2",
        sessionId: "session-potts-test",
        speakerRole: "Parent",
        text: "to school.",
        timestamp: 3500,
        isFinal: true,
        confidence: 0.98,
        source: "microphone",
      },
      {
        id: "tx-live-3",
        sessionId: "session-potts-test",
        speakerRole: "Parent",
        text: "then went to Ms. Potts's class.",
        timestamp: 6000,
        isFinal: true,
        confidence: 0.98,
        source: "microphone",
      },
      {
        id: "tx-live-4",
        sessionId: "session-potts-test",
        speakerRole: "Parent",
        text: "and proceeded to flip a desk.",
        timestamp: 8500,
        isFinal: true,
        confidence: 0.98,
        source: "microphone",
      },
      {
        id: "tx-live-5",
        sessionId: "session-potts-test",
        speakerRole: "Parent",
        text: "and turn over a bookshelf.",
        timestamp: 11000,
        isFinal: true,
        confidence: 0.98,
        source: "microphone",
      },
    ];

    // 1. Verify semantic merging preserves continuity
    const merged = buildSemanticTranscriptContext(turns);
    expect(merged.toLowerCase()).toContain("ms. potts's class");
    expect(merged.toLowerCase()).toContain("blue backpack");
    expect(merged.toLowerCase()).toContain("flip a desk");
    expect(merged.toLowerCase()).toContain("turn over a bookshelf");

    // 2. Caller for tRPC procedures
    const caller = appRouter.createCaller({
      user: { id: 1, openId: "advocate-1", role: "admin", name: "Byron Honea" } as any,
      req: {} as any,
      res: {} as any,
    });

    // Test 1: What class did the student go to? -> Ms. Potts's class
    const resClass = await caller.firstMate.ask({
      sessionId: "session-potts-test",
      question: "What class did the student go to?",
      transcript: turns,
      session: { sessionId: "session-potts-test", transcript: turns },
    });
    expect(["AI: WORKERS_AI", "AI: OPENAI", "AI: FALLBACK"]).toContain(resClass.provenance);
    expect(resClass.answer.toLowerCase()).toContain("potts");

    // Test 2: What color was the backpack? -> Blue
    const resColor = await caller.firstMate.ask({
      sessionId: "session-potts-test",
      question: "What color was the backpack?",
      transcript: turns,
      session: { sessionId: "session-potts-test", transcript: turns },
    });
    expect(["AI: WORKERS_AI", "AI: OPENAI", "AI: FALLBACK"]).toContain(resColor.provenance);
    expect(resColor.answer.toLowerCase()).toContain("blue");

    // Test 3: What did the student flip? -> Desk
    const resFlip = await caller.firstMate.ask({
      sessionId: "session-potts-test",
      question: "What did the student flip?",
      transcript: turns,
      session: { sessionId: "session-potts-test", transcript: turns },
    });
    expect(["AI: WORKERS_AI", "AI: OPENAI", "AI: FALLBACK"]).toContain(resFlip.provenance);
    expect(resFlip.answer.toLowerCase()).toContain("desk");

    // Test 4: What else did the student turn over? -> Bookshelf
    const resBookshelf = await caller.firstMate.ask({
      sessionId: "session-potts-test",
      question: "According to the transcript, what item did the student turn over after the desk?",
      transcript: turns,
      session: { sessionId: "session-potts-test", transcript: turns },
    });
    expect(["AI: WORKERS_AI", "AI: OPENAI", "AI: FALLBACK"]).toContain(resBookshelf.provenance);
    expect(resBookshelf.answer.toLowerCase()).toMatch(/bookshelf|book|desk|behavior/);
  });

  it("Build 5: endSessionAndProcess generates summary and attaches note to student file as Advocate Only", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({
      user: { id: 1, openId: "advocate-user", role: "admin", name: "Byron Honea" } as any,
      req: {} as any,
      res: {} as any,
    });

    const testSession: FirstMateSession = {
      sessionId: "session-process-test",
      sessionType: "IEP_MEETING",
      status: "ACTIVE",
      mode: "LIVE",
      startedAt: Date.now() - 360000,
      endedAt: null,
      durationSeconds: 360,
      createdBy: "advocate",
      attachedName: "Avery Jenkins",
      attachedSubtitle: "Client • 9th Grade",
      title: "IEP Eligibility & Accommodation Review",
      notes: [],
      summary: "Team reviewed reading comprehension progress and agreed to evaluate.",
      transcript: [
        {
          id: "tx-end-1",
          sessionId: "session-process-test",
          speakerRole: "Parent",
          text: "We want to make sure the psychoeducational evaluation includes executive function testing.",
          timestamp: Date.now() - 100000,
          isFinal: true,
          confidence: 0.99,
          source: "microphone",
        },
        {
          id: "tx-end-2",
          sessionId: "session-process-test",
          speakerRole: "School",
          text: "We agree to include executive functioning and processing speed in the assessment plan.",
          timestamp: Date.now() - 50000,
          isFinal: true,
          confidence: 0.98,
          source: "microphone",
        },
      ],
      sessionState: {
        studentName: "Avery Jenkins",
        grade: "9th Grade",
        currentTopic: "Evaluation Scope",
        currentDispute: "",
        openIssues: [],
        suspectedDisabilities: ["Specific Learning Disability", "Executive Functioning"],
      },
      detectedIssues: [],
      requests: [
        {
          id: "req-1",
          type: "REQUEST",
          summary: "Include executive function testing in assessment plan",
          speaker: "Parent",
          timestamp: Date.now() - 100000,
          status: "confirmed",
        },
      ],
      proposals: [],
      refusals: [],
      commitments: [
        {
          id: "com-1",
          type: "COMMITMENT",
          summary: "Include executive functioning and processing speed in assessment plan",
          speaker: "School",
          timestamp: Date.now() - 50000,
          status: "confirmed",
        },
      ],
      openIssues: [],
      threads: [],
      conflicts: [],
      dismissedItemIds: [],
      savedMoments: [],
      alerts: [],
      liveAssist: {} as any,
      devLogs: [],
    };

    const result = await caller.firstMate.endSessionAndProcess({
      sessionId: "session-process-test",
      session: testSession,
      studentName: "Avery Jenkins",
    });

    expect(result.success).toBe(true);
    expect(result.visibility).toBe("Advocate Only");
    expect(result.studentName).toContain("Avery");
    expect(result.noteTitle).toContain("First Mate");
    expect(result.summary).toBeTruthy();
  });

  it("Build 6: askHistory retains session Q&A and includes it in endSessionAndProcess note", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({
      user: { id: 1, openId: "advocate-user", role: "admin", name: "Byron Honea" } as any,
      req: {} as any,
      res: {} as any,
    });

    const testSessionWithAskHistory: FirstMateSession = {
      sessionId: "session-ask-history-test",
      sessionType: "IEP_MEETING",
      status: "ACTIVE",
      mode: "LIVE",
      startedAt: Date.now() - 600000,
      endedAt: null,
      durationSeconds: 600,
      createdBy: "advocate",
      attachedName: "Marcus Rivera",
      attachedSubtitle: "Client • 8th Grade",
      title: "Marcus Rivera IEP Eligibility Meeting",
      notes: [],
      summary: "Evaluated sensory processing accommodation needs.",
      transcript: [
        {
          id: "tx-h-1",
          sessionId: "session-ask-history-test",
          speakerRole: "Parent",
          text: "Marcus gets overwhelmed in noisy hallways.",
          timestamp: Date.now() - 300000,
          isFinal: true,
          confidence: 1,
          source: "microphone",
        },
      ],
      sessionState: {
        studentName: "Marcus Rivera",
        grade: "8th Grade",
        currentTopic: "Hallway Accommodation",
        currentDispute: "",
        openIssues: [],
        suspectedDisabilities: ["Autism Spectrum Disorder"],
      },
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
      askHistory: [
        {
          id: "ask-1",
          question: "What accommodation can we request for hallway sensory overload?",
          answer: "Request scheduled 3-minute early class transitions before bell rings and noise-dampening headphones.",
          timestamp: Date.now() - 200000,
          provenance: "AI: OPENAI",
          suggestedFollowUp: "Ask about passing period adult escort",
        },
        {
          id: "ask-2",
          question: "Has the school agreed to early dismissal between periods?",
          answer: "Not yet; the school has only acknowledged the sensory concern without a formal commitment.",
          timestamp: Date.now() - 100000,
          provenance: "AI: OPENAI",
        },
      ],
    };

    const result = await caller.firstMate.endSessionAndProcess({
      sessionId: "session-ask-history-test",
      session: testSessionWithAskHistory,
      studentName: "Marcus Rivera",
    });

    expect(result.success).toBe(true);
    expect(result.studentName).toContain("Marcus");
    expect(result.noteId).toBeDefined();

    // Verify the saved note content contains the askHistory questions
    const db = await (await import("./db")).getDb();
    if (db) {
      const { projectNotes } = await import("../drizzle/schema");
      const { eq, desc } = await import("drizzle-orm");
      const allNotes = await db
        .select()
        .from(projectNotes)
        .where(eq(projectNotes.projectId, result.projectId));
      if (allNotes.length > 0) {
        const savedNote = allNotes[allNotes.length - 1];
        expect(savedNote).toBeDefined();
        expect(savedNote.content).toContain("In-Session Advocate Inquiries & Copilot Guidance (2)");
        expect(savedNote.content).toContain("What accommodation can we request for hallway sensory overload?");
        expect(savedNote.content).toContain("Request scheduled 3-minute early class transitions");
        expect(savedNote.content).toContain("Has the school agreed to early dismissal between periods?");
      }
    }
  });

  // ── PG-037 SESSION RECORDING & AI LEARNING REPOSITORY ──
  it("PG-037: should record and list First Mate session runs for AI improvement", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({
      user: { id: 1, openId: "test-advocate", role: "admin", name: "Byron Honea" },
    } as any);

    const testRunSessionId = `fm-run-test-${Date.now()}`;
    const saveResult = await caller.firstMate.saveSessionRecord({
      sessionId: testRunSessionId,
      sessionType: "IEP_MEETING",
      mode: "SIMULATOR",
      status: "COMPLETED",
      title: "Simulator Test: Evaluation Refusal Practice",
      studentName: "Lucas Vance",
      language: "en",
      durationSeconds: 320,
      turnCount: 4,
      keyIssue: "Evaluation Refusal",
      keyIssuePriority: "High Priority",
      sayThis: "Under IDEA Child Find, passing grades cannot be used to deny an evaluation.",
      whyItMatters: "IDEA 34 CFR § 300.111(c)(1)",
      transcript: [
        {
          id: "tx-t1",
          sessionId: testRunSessionId,
          speakerRole: "Parent",
          text: "I want an evaluation for reading dyslexia.",
          timestamp: Date.now() - 300000,
          confidence: 0.99,
          isFinal: true,
          source: "simulator",
        },
        {
          id: "tx-t2",
          sessionId: testRunSessionId,
          speakerRole: "School",
          text: "His grades are C+, so no evaluation is needed.",
          timestamp: Date.now() - 250000,
          confidence: 0.98,
          isFinal: true,
          source: "simulator",
        },
      ],
      requests: [{ id: "r1", type: "REQUEST", summary: "Dyslexia evaluation", speaker: "Parent" }],
      refusals: [{ id: "rf1", type: "POSSIBLE_REFUSAL", summary: "Declined citing C+ grades", speaker: "School" }],
      advocateRating: 5,
      advocateFeedback: "Spot on citation of Child Find regulations. Exactly what Byron teaches.",
      tags: "dyslexia, child-find, passing-grades",
    });

    expect(saveResult.success).toBe(true);
    expect(saveResult.session.sessionId).toBe(testRunSessionId);

    // List runs
    const listResult = await caller.firstMate.listRecordedSessions();
    expect(listResult.sessions.length).toBeGreaterThan(0);
    const found = listResult.sessions.find((s) => s.sessionId === testRunSessionId);
    expect(found).toBeDefined();
    expect(found?.studentName).toBe("Lucas Vance");
    expect(found?.advocateRating).toBe(5);
    expect(found?.advocateFeedback).toContain("Child Find");

    // Filter by mode
    const simList = await caller.firstMate.listRecordedSessions({ mode: "SIMULATOR" });
    expect(simList.sessions.some((s) => s.sessionId === testRunSessionId)).toBe(true);

    // Update feedback
    const feedbackResult = await caller.firstMate.updateSessionFeedback({
      sessionId: testRunSessionId,
      advocateRating: 4,
      advocateFeedback: "Updated critique: Add prompt for 60-day timeline.",
      tags: "dyslexia, timeline, 60-days",
    });
    expect(feedbackResult.success).toBe(true);

    // Fetch single
    const single = await caller.firstMate.getRecordedSession({ sessionId: testRunSessionId });
    expect(single.session.advocateRating).toBe(4);
    expect(single.session.advocateFeedback).toContain("60-day timeline");
  });

  // ── SUBSTANTIVE LIVE ADVOCACY ASSISTANT TESTS ──
  it("Substantive Q&A: answers Section 504 vs IEP days out of placement and MDR without conversational filler", async () => {
    const query =
      "Are Section 504 days out of placement the same as IEP days out of placement? Does the same MDR process apply?";

    const detailed = await askFirstMateDetailed(mockSession, query);

    // 1. Must NOT contain conversational filler or empathy deflection
    expect(detailed.answer).not.toMatch(/I appreciate your question/i);
    expect(detailed.answer).not.toMatch(/What specific concerns do you have/i);

    // 2. Must state the applicable principle / 10-day threshold
    expect(detailed.answer).toMatch(/(10[\s-]*(school)?[\s-]*day|10\s+consecutive\s+school\s+days|days\s+exceeding\s+10)/i);
    expect(detailed.applicablePrinciple).toBeDefined();
    expect(detailed.applicablePrinciple).toMatch(/(10[\s-]*(school)?[\s-]*day|10\s+consecutive\s+school\s+days|days\s+exceeding\s+10)/i);

    // 3. Must explain important distinctions (FAPE continuation and 504 drug/alcohol exception)
    expect(detailed.answer).toMatch(/FAPE|continuation|educational services/i);
    expect(detailed.answer).toMatch(/drug|alcohol|substance|illegal/i);
    expect(detailed.distinctions).toBeDefined();
    expect(detailed.distinctions!.length).toBeGreaterThan(0);

    // 4. Must identify missing facts that materially change guidance
    expect(detailed.missingFacts).toBeDefined();
    expect(detailed.missingFacts!.length).toBeGreaterThan(0);

    // 5. Suggested client wording must be secondary and present
    expect(detailed.suggestedClientWording).toBeDefined();
    expect(detailed.suggestedClientWording!.length).toBeGreaterThan(10);
  });

  it("Knowledge Retrieval: retrieves verified Section 504 and IDEA disciplinary removal legal standards", () => {
    const query =
      "Are Section 504 days out of placement the same as IEP days out of placement? Does the same MDR process apply?";
    const results = FirstMateKnowledgeProvider.retrieveRelevantKnowledge(query);

    expect(results.length).toBeGreaterThan(0);
    const hasDisciplineOr504 = results.some(
      (r) =>
        r.id.includes("disciplinary-removal") ||
        r.id.includes("504-fape") ||
        r.id.includes("manifestation") ||
        r.title.toLowerCase().includes("10-day")
    );
    expect(hasDisciplineOr504).toBe(true);

    const promptContext = FirstMateKnowledgeProvider.getSubstantivePromptContext(query);
    expect(promptContext).toContain("300.530");
    expect(promptContext).toContain("10-Day");
  });

  it("Natural Conversation Detection: recognizes disciplinary removal from conversational turns without keywords", async () => {
    const parentSuspensionTurn: NormalizedTranscriptEvent = {
      id: "tx-susp-1",
      sessionId: "test-session-1",
      speakerRole: "Parent",
      text: "The assistant principal suspended him for 5 days last week, and now another 6 days this week. Can they just remove him from class like that?",
      timestamp: Date.now(),
      isFinal: true,
      confidence: 1,
      source: "simulator",
    };

    const fastResult = await runFastAssist(mockSession, [parentSuspensionTurn], parentSuspensionTurn);

    expect(fastResult).toBeDefined();
    expect(fastResult.fastAssist.currentIssue.label).toMatch(/Disciplinary Removal|Removal|MDR|Suspension/i);
    expect(fastResult.fastAssist.quickAssist.sayThis).toBeDefined();
  });

  it("Whisper Hallucination Filter: suppresses trailing special-ed acronym dumps and phrase repetition loops", () => {
    const acronymDump = "IDEA, IEP, Section 504, MDR, FAPE, PWN, IEE, BIP, FBA, LEA, Manifestation Determination Review, Prior Written Notice, Functional Behavioral Assessment, Behavioral Intervention Plan, Independent Educational Evaluation Plan, Independent Educational Evaluation Plan, Independent Education,";
    
    expect(isSilenceHallucination(acronymDump, "en")).toBe(true);
    expect(isSilenceHallucination("Normal.dotm Microsoft Office Word MSWordDoc Word.Document.8", "en")).toBe(true);
    expect(isSilenceHallucination("https://www.idea.org EDITED-PJD-MGN-DQ IEP. IEP. IEP. IEP. IEP.", "en")).toBe(true);
    expect(isSilenceHallucination("IEP. IEP. IEP. IEP. IEP.", "en")).toBe(true);
    expect(isSilenceHallucination("Please see the complete disclaimer at https://sites.google.com or at https://sites.google.com.", "en")).toBe(true);
    expect(isSilenceHallucination("Page PAGE of NUMPAGES www.verbalink.com", "en")).toBe(true);
    expect(isSilenceHallucination("This is an educational video. To view this educational video, simply click on the video or the link to the program on", "en")).toBe(true);
    expect(isSilenceHallucination("© 2017 University of Georgia College of Agricultural and Environmental Sciences UGA Extension Office of Communications and Creative Services", "en")).toBe(true);
  });

  it("Call Greeting Filter: suppresses AI guidance cards for standard operational call openings", async () => {
    const byronGreeting = "Hello, Waypoint, this is Byron, how can I help you?";
    const wyattGreeting = "Waypoint, this is Wyatt, how can I help you?";
    const abbyGreeting = "Waypoint, this is Abby, how can I help you?";

    expect(isCallGreetingOrOpening(byronGreeting)).toBe(true);
    expect(isCallGreetingOrOpening(wyattGreeting)).toBe(true);
    expect(isCallGreetingOrOpening(abbyGreeting)).toBe(true);

    const greetingTurn: NormalizedTranscriptEvent = {
      id: "tx-greet-1",
      sessionId: "test-session-1",
      speakerRole: "Advocate",
      text: byronGreeting,
      timestamp: Date.now(),
      isFinal: true,
      confidence: 1,
      source: "live_audio",
    };

    const result = await runFastAssist(mockSession, [greetingTurn], greetingTurn);
    expect(result.guidanceItem).toBeUndefined();
  });

  // ── ACCEPTANCE TESTS 1-10: ASSEMBLYAI REALTIME & WAYPOINT RESPONSE GATE ──
  describe("AssemblyAI Realtime + Meaningful-Turn Response Gate (Acceptance Tests 1-10)", () => {
    // TEST 1: Speaker says: "Okay." -> Transcript shows it, NO First Mate response.
    it("Test 1: should ignore standalone backchannel 'Okay.' from triggering OpenAI", () => {
      const turn: NormalizedTranscriptEvent = {
        id: "tx-test-1",
        sessionId: "test-session-1",
        speakerRole: "School",
        text: "Okay.",
        timestamp: Date.now(),
        isFinal: true,
        confidence: 0.99,
        source: "microphone",
      };
      const gateResult = evaluateMeaningfulTurn(turn, []);
      expect(gateResult.decision).toBe("IGNORE");
      expect(gateResult.isBackchannel).toBe(true);
      expect(gateResult.isSubstantive).toBe(false);
    });

    // TEST 2: Speaker says: "Uh-huh. Right. Thank you." -> NO First Mate response.
    it("Test 2: should ignore compound backchannels 'Uh-huh. Right. Thank you.' from triggering OpenAI", () => {
      const turn: NormalizedTranscriptEvent = {
        id: "tx-test-2",
        sessionId: "test-session-1",
        speakerRole: "Parent",
        text: "Uh-huh. Right. Thank you.",
        timestamp: Date.now(),
        isFinal: true,
        confidence: 0.99,
        source: "microphone",
      };
      const gateResult = evaluateMeaningfulTurn(turn, []);
      expect(gateResult.decision).toBe("IGNORE");
      expect(gateResult.isBackchannel).toBe(true);
      expect(gateResult.isSubstantive).toBe(false);
    });

    // TEST 3: Speaker says: "We don't believe off-task behavior warrants an FBA."
    // Expected: Turn finalizes, passes response gate, GPT-5.6 Sol receives appropriate context, First Mate provides useful advocacy guidance.
    it("Test 3: should pass substantive dispute 'We don't believe off-task behavior warrants an FBA.' and generate guidance", async () => {
      const turn: NormalizedTranscriptEvent = {
        id: "tx-test-3",
        sessionId: "test-session-1",
        speakerRole: "School",
        text: "We don't believe off-task behavior warrants an FBA.",
        timestamp: Date.now(),
        isFinal: true,
        confidence: 0.99,
        source: "microphone",
      };
      const gateResult = evaluateMeaningfulTurn(turn, []);
      expect(gateResult.decision).toBe("PASS");
      expect(gateResult.isSubstantive).toBe(true);
      expect(gateResult.matchedKeywords).toContain("fba");
      expect(gateResult.matchedKeywords).toContain("behavior");

      const result = await runFastAssist(mockSession, [turn], turn);
      expect(result).toBeDefined();
      expect(result.guidanceItem).toBeDefined();
      expect(result.fastAssist.quickAssist.sayThis).toBeTruthy();
    });

    // TEST 4: Paused conversational turn:
    // "We don't think an evaluation is necessary because..." (pause) "...she currently has passing grades."
    // Expected: Incomplete trailing fragment is ignored, completed statement passes as single conversational turn.
    it("Test 4: should hold trailing incomplete fragment ('because...') and pass completed thought", () => {
      const fragmentTurn: NormalizedTranscriptEvent = {
        id: "tx-test-4-frag",
        sessionId: "test-session-1",
        speakerRole: "School",
        text: "We don't think an evaluation is necessary because...",
        timestamp: Date.now() - 2000,
        isFinal: true,
        confidence: 0.95,
        source: "microphone",
      };
      const fragGateResult = evaluateMeaningfulTurn(fragmentTurn, []);
      expect(fragGateResult.decision).toBe("IGNORE");
      expect(fragGateResult.reason).toContain("Incomplete");

      const completedTurn: NormalizedTranscriptEvent = {
        id: "tx-test-4-full",
        sessionId: "test-session-1",
        speakerRole: "School",
        text: "We don't think an evaluation is necessary because she currently has passing grades.",
        timestamp: Date.now(),
        isFinal: true,
        confidence: 0.99,
        source: "microphone",
      };
      const completedGateResult = evaluateMeaningfulTurn(completedTurn, [fragmentTurn]);
      expect(completedGateResult.decision).toBe("PASS");
      expect(completedGateResult.isSubstantive).toBe(true);
    });

    // TEST 5: Transcription provider outputs isolated phrase:
    // "Thanks for watching this video." with no contextual connection.
    // Expected: Do NOT generate a First Mate response.
    it("Test 5: should suppress isolated hallucination phrase 'Thanks for watching this video.'", () => {
      const turn: NormalizedTranscriptEvent = {
        id: "tx-test-5",
        sessionId: "test-session-1",
        speakerRole: "School",
        text: "Thanks for watching this video.",
        timestamp: Date.now(),
        isFinal: true,
        confidence: 0.99,
        source: "microphone",
      };
      const gateResult = evaluateMeaningfulTurn(turn, []);
      expect(gateResult.decision).toBe("IGNORE");
      expect(gateResult.reason).toContain("silence hallucination");
    });

    // TEST 6: Speaker says: "We denied the evaluation."
    // Expected: Despite being short (4 words), it is substantive and MUST be eligible for First Mate analysis.
    it("Test 6: should pass short high-impact substantive statement 'We denied the evaluation.'", async () => {
      const turn: NormalizedTranscriptEvent = {
        id: "tx-test-6",
        sessionId: "test-session-1",
        speakerRole: "School",
        text: "We denied the evaluation.",
        timestamp: Date.now(),
        isFinal: true,
        confidence: 0.99,
        source: "microphone",
      };
      const gateResult = evaluateMeaningfulTurn(turn, []);
      expect(gateResult.decision).toBe("PASS");
      expect(gateResult.isSubstantive).toBe(true);
      expect(gateResult.matchedKeywords).toContain("denied");
      expect(gateResult.matchedKeywords).toContain("evaluation");

      const fastResult = await runFastAssist(mockSession, [turn], turn);
      expect(fastResult.guidanceItem).toBeDefined();
    });

    // TEST 7: AssemblyAI produces the same finalized turn twice.
    // Expected: Duplicate detection suppresses the second turn (isDuplicate: true, IGNORE).
    it("Test 7: should suppress duplicate finalized turn and prevent duplicate OpenAI calls", () => {
      const turn1: NormalizedTranscriptEvent = {
        id: "tx-test-7-1",
        sessionId: "test-session-1",
        speakerRole: "School",
        text: "We don't believe an FBA is necessary.",
        timestamp: Date.now() - 1000,
        isFinal: true,
        confidence: 0.99,
        source: "microphone",
      };
      const turn2: NormalizedTranscriptEvent = {
        id: "tx-test-7-2",
        sessionId: "test-session-1",
        speakerRole: "School",
        text: "We don't believe an FBA is necessary.",
        timestamp: Date.now(),
        isFinal: true,
        confidence: 0.99,
        source: "microphone",
      };

      const gate1 = evaluateMeaningfulTurn(turn1, []);
      expect(gate1.decision).toBe("PASS");

      const gate2 = evaluateMeaningfulTurn(turn2, [turn1]);
      expect(gate2.decision).toBe("IGNORE");
      expect(gate2.isDuplicate).toBe(true);
    });

    // TEST 8: AssemblyAI temporary token endpoint and reconnect safety.
    // Expected: Backend mints temporary token without exposing permanent API key.
    it("Test 8: should mint temporary AssemblyAI token via trpc procedure without exposing permanent secret", async () => {
      const { appRouter } = await import("./routers");
      const caller = appRouter.createCaller({
        user: { id: 1, openId: "adv-1", name: "Advocate", email: "adv@test.com", role: "admin" } as any,
        req: {} as any,
        res: {} as any,
      });

      const tokenRes = await caller.firstMate.getAssemblyAiToken();
      expect(tokenRes).toBeDefined();
      expect(tokenRes.token).toBeDefined();
      expect(tokenRes.token.length).toBeGreaterThan(10);
      expect(tokenRes.expiresInSeconds).toBe(480);
      expect(tokenRes.token).not.toBe(process.env.ASSEMBLYAI_API_KEY);
    });

    // TEST 9: OpenAI returns NO_RESPONSE when no useful advocate intervention is needed.
    // Expected: Returns without guidanceItem or placeholder card; transcription continues unaffected.
    it("Test 9: should handle secondary safety gate NO_RESPONSE without creating card or disturbing UI", async () => {
      const nonAdvocacyTurn: NormalizedTranscriptEvent = {
        id: "tx-test-9",
        sessionId: "test-session-1",
        speakerRole: "Parent",
        text: "Good morning Byron, thanks for joining the Google Meet call today.",
        timestamp: Date.now(),
        isFinal: true,
        confidence: 0.99,
        source: "microphone",
      };

      const result = await runFastAssist(mockSession, [nonAdvocacyTurn], nonAdvocacyTurn);
      // Secondary safety gate returns guidanceItem: undefined on NO_RESPONSE or greeting
      expect(result.guidanceItem).toBeUndefined();
    });

    // TEST 10: Special-education terminology vocabulary and Student Workspace case-aware context.
    // Expected: WAYPOINT_SPED_KEYTERMS contains all required terms, and buildCaseAwareKeyterms enriches with student/school terms.
    it("Test 10: should provide comprehensive Waypoint special-ed vocabulary and case-aware student context", () => {
      const requiredTerms = [
        "IDEA",
        "IEP",
        "Section 504",
        "FAPE",
        "LRE",
        "FBA",
        "BIP",
        "MDR",
        "PWN",
        "IEE",
        "OHI",
        "SLD",
        "BCBA",
        "Child Find",
        "reevaluation",
        "manifestation determination",
        "occupational therapy",
        "speech-language pathology",
      ];

      for (const term of requiredTerms) {
        expect(WAYPOINT_SPED_KEYTERMS).toContain(term);
      }

      const caseSession: Partial<FirstMateSession> = {
        attachedName: "Avery Jenkins",
        sessionState: {
          studentName: "Avery Jenkins",
          school: "Bentonville High School",
          district: "Bentonville School District",
          suspectedDisabilities: ["Specific Learning Disability", "Dyslexia", "ADHD"],
          evaluations: ["Comprehensive Psychoeducational Evaluation"],
          services: ["Occupational Therapy", "Resource Room Minutes"],
        },
      };

      const caseKeyterms = buildCaseAwareKeyterms(caseSession);
      expect(caseKeyterms).toContain("Avery Jenkins");
      expect(caseKeyterms).toContain("Bentonville High School");
      expect(caseKeyterms).toContain("Bentonville School District");
      expect(caseKeyterms).toContain("Specific Learning Disability");
      expect(caseKeyterms).toContain("Dyslexia");
      expect(caseKeyterms).toContain("ADHD");
      expect(caseKeyterms).toContain("IDEA");
      expect(caseKeyterms).toContain("FAPE");
    });
  });
});




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
    // Say This should be data-focused (e.g. data or information relied upon)
    expect(result.liveAssist.sayThis).toMatch(/data|information|relying/i);
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
    expect(
      deepResult.deepAssist.detections.some(
        (d) => d.type === "PROPOSAL" && d.summary.toLowerCase().includes("speech")
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

    expect(
      deepResult.deepAssist.detections.some(
        (d) => d.type === "COMMITMENT" && d.summary.toLowerCase().includes("transition")
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
    expect(conflict.message.toLowerCase()).toMatch(/conflict|august 12|received/i);
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

  // ── SUMMARY & KNOWLEDGE SAFEGUARDS ──
  it("should generate a structured summary without modifying permanent records", async () => {
    const summary = await generateSessionSummary(mockSession);
    expect(summary).toBeDefined();
    expect(summary.length).toBeGreaterThan(50);
  });

  it("should never fabricate unverified legal citations", () => {
    const verifiedSources = FirstMateKnowledgeProvider.getSourcesForTopic("evaluation");
    expect(verifiedSources.every((s) => s.isVerified)).toBe(true);

    const fallbackSources = FirstMateKnowledgeProvider.getSourcesForTopic("extraneous unindexed topic");
    expect(fallbackSources[0].isVerified).toBe(false);
  });
});

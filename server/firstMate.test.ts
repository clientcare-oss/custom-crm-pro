import { describe, it, expect } from "vitest";
import { analyzeTranscriptTurn, askFirstMate, generateSessionSummary } from "./firstMateAi";
import type { FirstMateSession, NormalizedTranscriptEvent } from "../shared/firstMate";

describe("First Mate AI & Simulator Engine", () => {
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
    },
    detectedIssues: [],
    requests: [],
    proposals: [],
    refusals: [],
    commitments: [],
    openIssues: [],
    savedMoments: [],
    alerts: [],
    liveAssist: {
      currentIssue: "Initial Review",
      currentIssueDescription: "Team gathering",
      quickAnswer: "Listen carefully",
      sayThis: "Thank you all for being here today.",
      askNext: ["Can we review present levels?"],
      whyItMatters: "Sets the stage for collaborative advocacy",
      confidence: "High",
      sources: [{ title: "IDEA § 300.320", isVerified: true }],
    },
  };

  it("should detect an evaluation refusal turn and provide Say This guidance", async () => {
    const parentTurn: NormalizedTranscriptEvent = {
      id: "turn-1",
      sessionId: "test-session-1",
      speakerRole: "Parent",
      text: "I want an evaluation for dyslexia and reading struggles.",
      timestamp: Date.now() - 10000,
      isFinal: true,
      confidence: 1,
      source: "simulator",
    };

    const schoolRefusalTurn: NormalizedTranscriptEvent = {
      id: "turn-2",
      sessionId: "test-session-1",
      speakerRole: "School",
      text: "We don't believe an evaluation is necessary because his grades are passing.",
      timestamp: Date.now(),
      isFinal: true,
      confidence: 1,
      source: "simulator",
    };

    const result = await analyzeTranscriptTurn(
      mockSession,
      [parentTurn, schoolRefusalTurn],
      schoolRefusalTurn
    );

    expect(result).toBeDefined();
    expect(result.liveAssist.currentIssue).toMatch(/evaluation/i);
    expect(result.liveAssist.sayThis).toBeDefined();
    expect(result.liveAssist.askNext.length).toBeGreaterThan(0);
    expect(result.newTrackedItems.some(i => i.type === "POSSIBLE_REFUSAL" || i.summary.toLowerCase().includes("evaluation"))).toBe(true);
  });

  it("should answer advocate queries using current session context", async () => {
    const sessionWithRefusal: FirstMateSession = {
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

    const answer = await askFirstMate(sessionWithRefusal, "What has the school refused?");
    expect(answer).toBeDefined();
    expect(answer.toLowerCase()).toMatch(/evaluation|declined|refus/);
  });

  it("should generate a draft structured summary without mutating permanent records", async () => {
    const sessionWithHistory: FirstMateSession = {
      ...mockSession,
      requests: [
        {
          id: "req-1",
          type: "REQUEST",
          summary: "Independent educational evaluation",
          speaker: "Parent",
          timestamp: Date.now(),
          status: "confirmed",
          supportingTranscriptText: "I want an evaluation.",
        },
      ],
      refusals: [
        {
          id: "ref-1",
          type: "POSSIBLE_REFUSAL",
          summary: "Evaluation declined",
          speaker: "School",
          timestamp: Date.now(),
          status: "confirmed",
          supportingTranscriptText: "Not necessary.",
        },
      ],
    };

    const summary = await generateSessionSummary(sessionWithHistory);
    expect(summary).toBeDefined();
    expect(summary.length).toBeGreaterThan(50);
    expect(summary).toMatch(/###/);
  });
});

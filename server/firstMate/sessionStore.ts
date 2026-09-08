import type { FirstMateSession, FirstMateSessionType } from "../../shared/firstMate";

// Server-side in-memory active session store
const sessionStore = new Map<string, FirstMateSession>();

export function createInitialSession(sessionId: string, initialType?: FirstMateSessionType): FirstMateSession {
  return {
    sessionId,
    sessionType: initialType || "IEP_MEETING",
    status: "ACTIVE",
    mode: "SIMULATOR",
    startedAt: Date.now() - 754000,
    endedAt: null,
    durationSeconds: 754,
    createdBy: "advocate",
    attachedName: "Avery Jenkins",
    attachedSubtitle: "Client • 9th Grade",
    title: "IEP Meeting Live Guidance",
    notes: [],
    summary: "",
    transcript: [
      {
        id: "tx-init-1",
        sessionId,
        speakerRole: "Parent",
        text: "I asked for a full comprehensive psychoeducational evaluation last month because Avery is struggling with reading comprehension.",
        timestamp: Date.now() - 300000,
        isFinal: true,
        confidence: 0.98,
        source: "simulator",
      },
      {
        id: "tx-init-2",
        sessionId,
        speakerRole: "School",
        text: "We reviewed Avery's current grades and report card. His grades are passing with Bs and Cs, so the district does not believe a formal special education evaluation is necessary at this time.",
        timestamp: Date.now() - 240000,
        isFinal: true,
        confidence: 0.99,
        source: "simulator",
      },
    ],
    sessionState: {
      studentName: "Avery Jenkins",
      grade: "9th Grade",
      currentTopic: "Initial Evaluation Discussion",
      currentDispute: "Evaluation Refusal based on passing grades",
      openIssues: ["Formal Prior Written Notice (PWN)"],
      suspectedDisabilities: ["Specific Learning Disability - Reading", "Anxiety"],
    },
    detectedIssues: ["Evaluation Refusal"],
    requests: [
      {
        id: "req-1",
        type: "REQUEST",
        summary: "Comprehensive psychoeducational evaluation",
        speaker: "Parent",
        timestamp: Date.now() - 300000,
        status: "confirmed",
        supportingTranscriptText: "I asked for a full comprehensive psychoeducational evaluation last month.",
      },
    ],
    proposals: [],
    refusals: [
      {
        id: "ref-1",
        type: "POSSIBLE_REFUSAL",
        summary: "Evaluation declined citing passing grades",
        speaker: "School",
        timestamp: Date.now() - 240000,
        status: "confirmed",
        supportingTranscriptText: "His grades are passing with Bs and Cs, so the district does not believe a formal special education evaluation is necessary at this time.",
      },
    ],
    commitments: [],
    openIssues: [],
    threads: [],
    conflicts: [],
    dismissedItemIds: [],
    savedMoments: [],
    alerts: [],
    liveAssist: {
      currentIssue: "Evaluation Refusal based on passing grades",
      currentIssuePriority: "High Priority",
      currentIssueDescription:
        "The school is using passing grades to deny an evaluation request. Under IDEA, passing grades alone cannot be the sole basis for refusing an initial evaluation.",
      quickAnswer: "Request formal Prior Written Notice (PWN) with evaluation criteria.",
      sayThis:
        "Can the district clarify the specific evaluative data and screening criteria used to determine Avery does not need an evaluation, and will you be providing formal Prior Written Notice detailing this refusal?",
      askNext: [
        "Has Avery received tiered RTI/MTSS reading interventions with documented progress monitoring?",
        "What specific objective diagnostic assessments were administered prior to this decision?",
      ],
      whyItMatters:
        "IDEA 34 CFR § 300.111(c)(1) explicitly clarifies Child Find applies to children advancing from grade to grade who are suspected of having a disability.",
      confidence: "High",
      sources: [
        {
          title: "34 CFR § 300.111(c)(1) — Child find applies to children advancing from grade to grade",
          isVerified: true,
        },
      ],
    },
    devLogs: [],
  };
}

export const firstMateSessionStore = {
  get(sessionId: string): FirstMateSession | undefined {
    return sessionStore.get(sessionId);
  },

  set(sessionId: string, session: FirstMateSession): void {
    sessionStore.set(sessionId, session);
  },

  getOrCreate(sessionId: string, fallback?: Partial<FirstMateSession>): FirstMateSession {
    let existing = sessionStore.get(sessionId);
    if (!existing) {
      const initial = createInitialSession(sessionId, fallback?.sessionType);
      existing = {
        ...initial,
        ...(fallback || {}),
        sessionId,
        devLogs: Array.isArray(fallback?.devLogs) ? fallback.devLogs : initial.devLogs,
        transcript: Array.isArray(fallback?.transcript) ? fallback.transcript : initial.transcript,
        requests: Array.isArray(fallback?.requests) ? fallback.requests : initial.requests,
        refusals: Array.isArray(fallback?.refusals) ? fallback.refusals : initial.refusals,
        commitments: Array.isArray(fallback?.commitments) ? fallback.commitments : initial.commitments,
        proposals: Array.isArray(fallback?.proposals) ? fallback.proposals : initial.proposals,
        openIssues: Array.isArray(fallback?.openIssues) ? fallback.openIssues : initial.openIssues,
        threads: Array.isArray(fallback?.threads) ? fallback.threads : initial.threads,
        conflicts: Array.isArray(fallback?.conflicts) ? fallback.conflicts : initial.conflicts,
        alerts: Array.isArray(fallback?.alerts) ? fallback.alerts : initial.alerts,
        notes: Array.isArray(fallback?.notes) ? fallback.notes : initial.notes,
        dismissedItemIds: Array.isArray(fallback?.dismissedItemIds) ? fallback.dismissedItemIds : initial.dismissedItemIds,
        savedMoments: Array.isArray(fallback?.savedMoments) ? fallback.savedMoments : initial.savedMoments,
      };
      sessionStore.set(sessionId, existing);
    }
    return existing;
  },

  update(sessionId: string, partial: Partial<FirstMateSession>): FirstMateSession {
    const current = this.getOrCreate(sessionId);
    const updated: FirstMateSession = {
      ...current,
      ...partial,
      sessionId,
      sessionState: {
        ...current.sessionState,
        ...(partial.sessionState || {}),
      },
      devLogs: Array.isArray(partial.devLogs) ? partial.devLogs : (current.devLogs || []),
      transcript: Array.isArray(partial.transcript) ? partial.transcript : (current.transcript || []),
    };
    sessionStore.set(sessionId, updated);
    return updated;
  },

  delete(sessionId: string): boolean {
    return sessionStore.delete(sessionId);
  },
};

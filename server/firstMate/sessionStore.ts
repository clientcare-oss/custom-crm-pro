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

export interface RecordedSessionRun {
  sessionId: string;
  sessionType: string;
  mode: "LIVE" | "SIMULATOR";
  status: string;
  title: string;
  studentName?: string;
  studentContactId?: number;
  language?: string;
  durationSeconds: number;
  turnCount: number;
  keyIssue?: string;
  keyIssuePriority?: string;
  quickAnswer?: string;
  sayThis?: string;
  whyItMatters?: string;
  summary?: string;
  liveAssist?: any;
  transcript: any[];
  requests?: any[];
  refusals?: any[];
  commitments?: any[];
  askHistory?: any[];
  notes?: any[];
  aiModel?: string;
  aiLatencyMs?: number;
  advocateRating?: number; // 1-5
  advocateFeedback?: string;
  tags?: string;
  createdAt: number;
  updatedAt: number;
}

// In-memory archival store for recorded runs
const recordedRunsStore = new Map<string, RecordedSessionRun>();

// Seed with an initial demonstration simulator run for immediate inspection
const demoRun: RecordedSessionRun = {
  sessionId: "fm-demo-eval-refusal",
  sessionType: "IEP_MEETING",
  mode: "SIMULATOR",
  status: "COMPLETED",
  title: "IEP Meeting Live Guidance — Avery Jenkins",
  studentName: "Avery Jenkins",
  language: "en",
  durationSeconds: 754,
  turnCount: 6,
  keyIssue: "Evaluation Refusal based on passing grades",
  keyIssuePriority: "High Priority",
  quickAnswer: "Request formal Prior Written Notice (PWN) with evaluation criteria.",
  sayThis: "Can the district clarify the specific evaluative data and screening criteria used to determine Avery does not need an evaluation, and will you be providing formal Prior Written Notice detailing this refusal?",
  whyItMatters: "IDEA 34 CFR § 300.111(c)(1) explicitly clarifies Child Find applies to children advancing from grade to grade who are suspected of having a disability.",
  summary: "### First Mate IEP Review Summary\n**Key Issue:** Evaluation Refusal based on passing grades.\n**Advocate Action:** Prompted school for Prior Written Notice (PWN) under IDEA 34 CFR § 300.503.\n**Outcome:** District agreed to review MTSS tiered intervention data and schedule formal eligibility meeting.",
  liveAssist: {
    currentIssue: "Evaluation Refusal based on passing grades",
    currentIssuePriority: "High Priority",
    quickAnswer: "Request formal Prior Written Notice (PWN) with evaluation criteria.",
    sayThis: "Can the district clarify the specific evaluative data and screening criteria used to determine Avery does not need an evaluation, and will you be providing formal Prior Written Notice detailing this refusal?",
    askNext: [
      "Has Avery received tiered RTI/MTSS reading interventions with documented progress monitoring?",
      "What specific objective diagnostic assessments were administered prior to this decision?",
    ],
    whyItMatters: "IDEA 34 CFR § 300.111(c)(1) explicitly clarifies Child Find applies to children advancing from grade to grade who are suspected of having a disability.",
    confidence: "High",
  },
  transcript: [
    {
      id: "tx-demo-1",
      sessionId: "fm-demo-eval-refusal",
      speakerRole: "Parent",
      text: "I asked for a full comprehensive psychoeducational evaluation last month because Avery is struggling with reading comprehension.",
      timestamp: Date.now() - 600000,
      isFinal: true,
      confidence: 0.98,
      source: "simulator",
    },
    {
      id: "tx-demo-2",
      sessionId: "fm-demo-eval-refusal",
      speakerRole: "School",
      text: "We reviewed Avery's current grades and report card. His grades are passing with Bs and Cs, so the district does not believe a formal special education evaluation is necessary at this time.",
      timestamp: Date.now() - 540000,
      isFinal: true,
      confidence: 0.99,
      source: "simulator",
    },
    {
      id: "tx-demo-3",
      sessionId: "fm-demo-eval-refusal",
      speakerRole: "Advocate",
      text: "Under IDEA Child Find regulations, passing grades alone cannot be the sole basis for refusing an evaluation. Will the district be issuing formal Prior Written Notice for this refusal?",
      timestamp: Date.now() - 480000,
      isFinal: true,
      confidence: 0.99,
      source: "simulator",
    },
  ],
  requests: [
    {
      id: "req-demo-1",
      type: "REQUEST",
      summary: "Comprehensive psychoeducational evaluation",
      speaker: "Parent",
      timestamp: Date.now() - 600000,
      status: "confirmed",
    },
  ],
  refusals: [
    {
      id: "ref-demo-1",
      type: "POSSIBLE_REFUSAL",
      summary: "Evaluation declined citing passing grades",
      speaker: "School",
      timestamp: Date.now() - 540000,
      status: "confirmed",
    },
  ],
  commitments: [],
  askHistory: [
    {
      id: "ask-demo-1",
      question: "What regulation prevents them from denying an evaluation just because grades are okay?",
      answer: "34 CFR § 300.111(c)(1) explicitly clarifies Child Find applies to children advancing from grade to grade who are suspected of having a disability. Ask for formal Prior Written Notice under 34 CFR § 300.503.",
      timestamp: Date.now() - 500000,
    },
  ],
  aiModel: "@cf/meta/llama-3.1-8b-instruct",
  aiLatencyMs: 420,
  advocateRating: 5,
  advocateFeedback: "First Mate nailed the Child Find citation (34 CFR § 300.111). The PWN prompt immediately made the district pause and reconsider.",
  tags: "evaluation-refusal, pwn, child-find, passing-grades",
  createdAt: Date.now() - 754000,
  updatedAt: Date.now() - 100000,
};
recordedRunsStore.set(demoRun.sessionId, demoRun);

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

  // ── RECORDED RUNS ARCHIVAL METHODS ──
  recordRun(run: Partial<RecordedSessionRun> & { sessionId: string }): RecordedSessionRun {
    const existing = recordedRunsStore.get(run.sessionId);
    const updated: RecordedSessionRun = {
      sessionId: run.sessionId,
      sessionType: run.sessionType || existing?.sessionType || "IEP_MEETING",
      mode: (run.mode as any) || existing?.mode || "LIVE",
      status: run.status || existing?.status || "COMPLETED",
      title: run.title || existing?.title || `First Mate Run (${new Date().toLocaleDateString()})`,
      studentName: run.studentName || existing?.studentName || "Student",
      studentContactId: run.studentContactId || existing?.studentContactId,
      language: run.language || existing?.language || "en",
      durationSeconds: run.durationSeconds !== undefined ? run.durationSeconds : (existing?.durationSeconds || 0),
      turnCount: run.turnCount !== undefined ? run.turnCount : (run.transcript?.length || existing?.turnCount || 0),
      keyIssue: run.keyIssue || existing?.keyIssue || "General Discussion",
      keyIssuePriority: run.keyIssuePriority || existing?.keyIssuePriority,
      quickAnswer: run.quickAnswer || existing?.quickAnswer,
      sayThis: run.sayThis || existing?.sayThis,
      whyItMatters: run.whyItMatters || existing?.whyItMatters,
      summary: run.summary || existing?.summary,
      liveAssist: run.liveAssist || existing?.liveAssist,
      transcript: Array.isArray(run.transcript) ? run.transcript : (existing?.transcript || []),
      requests: Array.isArray(run.requests) ? run.requests : (existing?.requests || []),
      refusals: Array.isArray(run.refusals) ? run.refusals : (existing?.refusals || []),
      commitments: Array.isArray(run.commitments) ? run.commitments : (existing?.commitments || []),
      askHistory: Array.isArray(run.askHistory) ? run.askHistory : (existing?.askHistory || []),
      notes: Array.isArray(run.notes) ? run.notes : (existing?.notes || []),
      aiModel: run.aiModel || existing?.aiModel || "@cf/meta/llama-3.1-8b-instruct",
      aiLatencyMs: run.aiLatencyMs !== undefined ? run.aiLatencyMs : (existing?.aiLatencyMs || 350),
      advocateRating: run.advocateRating !== undefined ? run.advocateRating : existing?.advocateRating,
      advocateFeedback: run.advocateFeedback !== undefined ? run.advocateFeedback : existing?.advocateFeedback,
      tags: run.tags || existing?.tags,
      createdAt: run.createdAt || existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    recordedRunsStore.set(run.sessionId, updated);
    return updated;
  },

  listRecordedRuns(filters?: { mode?: string; search?: string; limit?: number }): RecordedSessionRun[] {
    let runs = Array.from(recordedRunsStore.values());

    if (filters?.mode && filters.mode !== "ALL") {
      runs = runs.filter((r) => r.mode === filters.mode);
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      runs = runs.filter(
        (r) =>
          r.title?.toLowerCase().includes(q) ||
          r.studentName?.toLowerCase().includes(q) ||
          r.keyIssue?.toLowerCase().includes(q) ||
          r.sayThis?.toLowerCase().includes(q) ||
          r.advocateFeedback?.toLowerCase().includes(q)
      );
    }

    runs.sort((a, b) => b.createdAt - a.createdAt);

    if (filters?.limit) {
      runs = runs.slice(0, filters.limit);
    }

    return runs;
  },

  getRecordedRun(sessionId: string): RecordedSessionRun | undefined {
    return recordedRunsStore.get(sessionId);
  },

  updateRunFeedback(
    sessionId: string,
    feedback: { advocateRating?: number; advocateFeedback?: string; tags?: string }
  ): RecordedSessionRun | undefined {
    const existing = recordedRunsStore.get(sessionId);
    if (!existing) return undefined;

    const updated: RecordedSessionRun = {
      ...existing,
      advocateRating: feedback.advocateRating !== undefined ? feedback.advocateRating : existing.advocateRating,
      advocateFeedback: feedback.advocateFeedback !== undefined ? feedback.advocateFeedback : existing.advocateFeedback,
      tags: feedback.tags !== undefined ? feedback.tags : existing.tags,
      updatedAt: Date.now(),
    };
    recordedRunsStore.set(sessionId, updated);
    return updated;
  },

  deleteRecordedRun(sessionId: string): boolean {
    return recordedRunsStore.delete(sessionId);
  },
};


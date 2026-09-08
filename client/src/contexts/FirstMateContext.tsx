import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import type {
  FirstMateSession,
  FirstMateSessionType,
  FirstMateSessionStatus,
  FirstMateSessionMode,
  SpeakerRole,
  NormalizedTranscriptEvent,
  TrackedItem,
  FirstMateAlert,
  LiveAssistPanelData,
  SayThisStyle,
  ConflictDetection,
  FirstMateDevLogEntry,
  FirstMateProvenanceMeta,
} from "../../../shared/firstMate";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const STORAGE_KEY = "waypoint_first_mate_session";
const CHANNEL_NAME = "waypoint_first_mate_sync";

const INITIAL_LIVE_ASSIST: LiveAssistPanelData = {
  currentIssue: "Evaluation Refusal",
  currentIssuePriority: "High Priority",
  currentIssueDescription: "School is declining to conduct an evaluation despite parent concerns.",
  quickAnswer: "Passing grades alone do not disqualify a student from an initial evaluation under IDEA § 300.301.",
  sayThis: "What data is the team relying on to determine that an evaluation is not necessary?",
  askNext: [
    "When did you last review his progress data?",
    "What specific measures show no educational impact?",
    "Have you considered a full and individual evaluation in all areas of suspected need?",
  ],
  whyItMatters:
    "Parents have the right to request an evaluation at any time. The school must consider the request and cannot deny it without a proper review of all available data.",
  confidence: "High",
  sources: [
    { title: "IDEA § 300.301 – Initial Evaluations", url: "https://sites.ed.gov/idea/regs/b/d/300.301", isVerified: true },
    { title: "Parental Rights – Requesting an Evaluation", url: "https://www.parentcenterhub.org/evaluation/", isVerified: true },
  ],
  provenanceMeta: {
    provenance: "AI: MOCK",
    provider: "Initial Scenario Template",
    model: "scenario-1-evaluation",
    latencyMs: 0,
    timestamp: Date.now() - 754000,
    procedureName: "template.init",
    rawStructuredOutput: {
      currentIssue: "Evaluation Refusal",
      sayThis: "What data is the team relying on to determine that an evaluation is not necessary?",
      note: "Pre-loaded initial simulator scenario",
    },
  },
};

const INITIAL_TRANSCRIPT: NormalizedTranscriptEvent[] = [
  {
    id: "tx-1",
    sessionId: "default",
    speakerRole: "Parent",
    text: "I'm concerned because he's been struggling with reading, and I think he needs more support in school.",
    timestamp: Date.now() - 180000,
    isFinal: true,
    confidence: 0.98,
    source: "simulator",
  },
  {
    id: "tx-2",
    sessionId: "default",
    speakerRole: "School",
    text: "We've seen improvement in his grades, so we don't believe an evaluation is necessary at this time.",
    timestamp: Date.now() - 120000,
    isFinal: true,
    confidence: 0.99,
    source: "simulator",
  },
  {
    id: "tx-3",
    sessionId: "default",
    speakerRole: "Parent",
    text: "But he's still behind grade level and gets very anxious in class.",
    timestamp: Date.now() - 90000,
    isFinal: true,
    confidence: 0.97,
    source: "simulator",
  },
  {
    id: "tx-4",
    sessionId: "default",
    speakerRole: "Advocate",
    text: "Can you share what data you're using to make this decision?",
    timestamp: Date.now() - 60000,
    isFinal: true,
    confidence: 0.99,
    source: "simulator",
  },
  {
    id: "tx-5",
    sessionId: "default",
    speakerRole: "School",
    text: "We use classroom performance and teacher observations. Right now, we don't see educational impact.",
    timestamp: Date.now() - 30000,
    isFinal: true,
    confidence: 0.98,
    source: "simulator",
  },
  {
    id: "tx-6",
    sessionId: "default",
    speakerRole: "Parent",
    text: "I don't agree. He's having a hard time keeping up, and it's affecting his confidence.",
    timestamp: Date.now() - 10000,
    isFinal: true,
    confidence: 0.99,
    source: "simulator",
  },
];

function createDefaultSession(): FirstMateSession {
  return {
    sessionId: `fm-${Date.now()}`,
    sessionType: "IEP_MEETING",
    status: "ACTIVE",
    mode: "SIMULATOR",
    startedAt: Date.now() - 754000, // 00:12:34 elapsed for initial experience matching mockup
    endedAt: null,
    durationSeconds: 754,
    createdBy: "advocate",
    attachedName: "Avery Jenkins",
    attachedSubtitle: "Client • 9th Grade",
    title: "IEP Meeting Live Guidance",
    notes: [],
    summary: "",
    transcript: INITIAL_TRANSCRIPT,
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
        timestamp: Date.now() - 180000,
        status: "confirmed",
        supportingTranscriptText: "I think he needs more support in school.",
      },
    ],
    proposals: [],
    refusals: [
      {
        id: "ref-1",
        type: "POSSIBLE_REFUSAL",
        summary: "Evaluation declined citing passing grades",
        speaker: "School",
        timestamp: Date.now() - 120000,
        status: "confirmed",
        supportingTranscriptText: "We don't believe an evaluation is necessary at this time.",
      },
    ],
    commitments: [],
    openIssues: [],
    threads: [
      {
        id: "th-1",
        name: "Initial Evaluation",
        status: "active",
        startedAt: Date.now() - 180000,
        lastUpdated: Date.now(),
        summary: "Discussion regarding dyslexia testing and school progress observations",
      },
    ],
    conflicts: [],
    dismissedItemIds: [],
    savedMoments: [],
    alerts: [
      {
        id: "alt-1",
        type: "POSSIBLE_REFUSAL",
        title: "Evaluation Refusal Logged",
        message: "School declining evaluation request based on passing grades. Request PWN.",
        timestamp: Date.now() - 120000,
        dismissed: false,
      },
    ],
    liveAssist: INITIAL_LIVE_ASSIST,
    devLogs: [],
  };
}

export function normalizeSession(raw: any): FirstMateSession {
  const def = createDefaultSession();
  if (!raw || typeof raw !== "object") return def;

  return {
    ...def,
    ...raw,
    sessionId: raw.sessionId || def.sessionId,
    sessionType: raw.sessionType || def.sessionType,
    status: raw.status || def.status,
    mode: raw.mode || def.mode,
    startedAt: typeof raw.startedAt === "number" ? raw.startedAt : def.startedAt,
    endedAt: typeof raw.endedAt === "number" ? raw.endedAt : null,
    durationSeconds: typeof raw.durationSeconds === "number" ? raw.durationSeconds : def.durationSeconds,
    createdBy: raw.createdBy || def.createdBy,
    attachedLeadId: raw.attachedLeadId ?? null,
    attachedClientId: raw.attachedClientId ?? null,
    attachedStudentId: raw.attachedStudentId ?? null,
    attachedName: raw.attachedName ?? def.attachedName,
    attachedSubtitle: raw.attachedSubtitle ?? def.attachedSubtitle,
    title: raw.title || def.title,
    notes: Array.isArray(raw.notes) ? raw.notes : [],
    summary: typeof raw.summary === "string" ? raw.summary : "",
    transcript: Array.isArray(raw.transcript) ? raw.transcript : [],
    sessionState: {
      ...def.sessionState,
      ...(raw.sessionState || {}),
      openIssues: Array.isArray(raw.sessionState?.openIssues) ? raw.sessionState.openIssues : [],
      suspectedDisabilities: Array.isArray(raw.sessionState?.suspectedDisabilities)
        ? raw.sessionState.suspectedDisabilities
        : [],
    },
    detectedIssues: Array.isArray(raw.detectedIssues) ? raw.detectedIssues : [],
    requests: Array.isArray(raw.requests) ? raw.requests : [],
    proposals: Array.isArray(raw.proposals) ? raw.proposals : [],
    refusals: Array.isArray(raw.refusals) ? raw.refusals : [],
    commitments: Array.isArray(raw.commitments) ? raw.commitments : [],
    openIssues: Array.isArray(raw.openIssues) ? raw.openIssues : [],
    threads: Array.isArray(raw.threads) ? raw.threads : [],
    conflicts: Array.isArray(raw.conflicts) ? raw.conflicts : [],
    dismissedItemIds: Array.isArray(raw.dismissedItemIds) ? raw.dismissedItemIds : [],
    savedMoments: Array.isArray(raw.savedMoments) ? raw.savedMoments : [],
    alerts: Array.isArray(raw.alerts) ? raw.alerts : [],
    liveAssist: {
      ...def.liveAssist,
      ...(raw.liveAssist || {}),
      askNext: Array.isArray(raw.liveAssist?.askNext) ? raw.liveAssist.askNext : [],
      detections: Array.isArray(raw.liveAssist?.detections) ? raw.liveAssist.detections : [],
      sources: Array.isArray(raw.liveAssist?.sources) ? raw.liveAssist.sources : [],
    },
    devLogs: Array.isArray(raw.devLogs) ? raw.devLogs : [],
  };
}

interface FirstMateContextValue {
  session: FirstMateSession;
  isAnalyzing: boolean;
  isFastAnalyzing: boolean;
  isDeepAnalyzing: boolean;
  isRephrasing: boolean;
  startSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => void;
  resetSession: (newType?: FirstMateSessionType) => void;
  setSessionType: (type: FirstMateSessionType) => void;
  setMode: (mode: FirstMateSessionMode) => void;
  attachRecord: (record: { id: number; type: "lead" | "client"; name: string; subtitle: string }) => void;
  addTranscriptTurn: (speakerRole: SpeakerRole, text: string) => Promise<void>;
  rephraseSayThis: (style: SayThisStyle) => Promise<void>;
  updateTrackedItem: (id: string, status: TrackedItem["status"], userNote?: string) => void;
  dismissAlert: (id: string) => void;
  dismissConflict: (id: string) => void;
  addNote: (note: string) => void;
  saveMoment: (note: string) => void;
  askQuestion: (query: string) => Promise<string>;
  generateSummary: () => Promise<string>;
  clearTranscript: () => void;
  lastAskMeta: FirstMateProvenanceMeta | null;
}

const FirstMateContext = createContext<FirstMateContextValue | null>(null);

export function FirstMateProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<FirstMateSession>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return normalizeSession(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Failed to load First Mate session from localStorage:", e);
    }
    return createDefaultSession();
  });

  const [isFastAnalyzing, setIsFastAnalyzing] = useState(false);
  const [isDeepAnalyzing, setIsDeepAnalyzing] = useState(false);
  const [isRephrasing, setIsRephrasing] = useState(false);
  const [lastAskMeta, setLastAskMeta] = useState<FirstMateProvenanceMeta | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Sync state to localStorage & BroadcastChannel
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      channelRef.current?.postMessage({ type: "SYNC_SESSION", session });
    } catch (e) {
      console.warn("Failed to save First Mate session:", e);
    }
  }, [session]);

  // Setup BroadcastChannel for cross-view synchronization (pop-out support)
  useEffect(() => {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current = channel;

      channel.onmessage = (event) => {
        if (event.data?.type === "SYNC_SESSION" && event.data?.session) {
          setSession(normalizeSession(event.data.session));
        }
      };

      return () => {
        channel.close();
      };
    }
  }, []);

  // Timer: increment durationSeconds when ACTIVE
  useEffect(() => {
    if (session.status !== "ACTIVE") return;

    const timer = setInterval(() => {
      setSession((prev) => {
        if (prev.status !== "ACTIVE") return prev;
        return {
          ...prev,
          durationSeconds: prev.durationSeconds + 1,
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session.status]);

  // tRPC Mutations
  const fastAssistMutation = trpc.firstMate.fastAssist.useMutation();
  const deepAssistMutation = trpc.firstMate.deepAssist.useMutation();
  const rephraseMutation = trpc.firstMate.rephraseSayThis.useMutation();
  const askMutation = trpc.firstMate.ask.useMutation();
  const generateSummaryMutation = trpc.firstMate.generateSummary.useMutation();

  const startSession = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      status: "ACTIVE",
      startedAt: prev.startedAt || Date.now(),
    }));
    toast.success("First Mate session listening");
  }, []);

  const pauseSession = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      status: "PAUSED",
    }));
    toast.info("Session paused");
  }, []);

  const resumeSession = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      status: "ACTIVE",
    }));
    toast.success("Session resumed");
  }, []);

  const endSession = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      status: "ENDED",
      endedAt: Date.now(),
    }));
    toast.info("Session ended");
  }, []);

  const resetSession = useCallback((newType?: FirstMateSessionType) => {
    const fresh = createDefaultSession();
    if (newType) {
      fresh.sessionType = newType;
    }
    setSession(fresh);
    toast.success("Started new clean First Mate session");
  }, []);

  const setSessionType = useCallback((type: FirstMateSessionType) => {
    setSession((prev) => ({
      ...prev,
      sessionType: type,
    }));
  }, []);

  const setMode = useCallback((mode: FirstMateSessionMode) => {
    setSession((prev) => ({
      ...prev,
      mode,
    }));
  }, []);

  const attachRecord = useCallback((record: { id: number; type: "lead" | "client"; name: string; subtitle: string }) => {
    setSession((prev) => ({
      ...prev,
      attachedLeadId: record.type === "lead" ? record.id : null,
      attachedClientId: record.type === "client" ? record.id : null,
      attachedName: record.name,
      attachedSubtitle: record.subtitle,
      sessionState: {
        ...prev.sessionState,
        studentName: record.name,
      },
    }));
    toast.success(`Attached to ${record.name}`);
  }, []);

  /**
   * TWO-SPEED PIPELINE EXECUTION
   * 1. Instantly append turn to transcript
   * 2. Fast Assist: runs immediately to update Say This, Ask Next, and Current Issue
   * 3. Deep Assist: runs in background to enrich working memory, detections, threads, and conflicts
   */
  const addTranscriptTurn = useCallback(
    async (speakerRole: SpeakerRole, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const newTurn: NormalizedTranscriptEvent = {
        id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sessionId: session.sessionId,
        speakerRole,
        text: trimmed,
        timestamp: Date.now(),
        isFinal: true,
        confidence: 1.0,
        source: "simulator",
      };

      const updatedTranscript = [...(session.transcript || []), newTurn];

      // Immediately append turn to state for responsive UI
      setSession((prev) => ({
        ...prev,
        transcript: updatedTranscript,
      }));

      // ── SPEED 1: FAST ASSIST ──
      setIsFastAnalyzing(true);
      try {
        const fastResult = await fastAssistMutation.mutateAsync({
          session,
          transcript: updatedTranscript,
          newTurn,
        });

        setSession((prev) => {
          const newAlerts = [...(prev.alerts || [])];
          if (fastResult.fastAssist.alert) {
            newAlerts.unshift({
              id: `alert-${Date.now()}`,
              type: fastResult.fastAssist.alert.type,
              title: fastResult.fastAssist.alert.message,
              message: fastResult.fastAssist.alert.message,
              timestamp: Date.now(),
              dismissed: false,
            });
          }

          return {
            ...prev,
            liveAssist: {
              ...prev.liveAssist,
              currentIssue: fastResult.fastAssist.currentIssue.label,
              currentIssuePriority: fastResult.fastAssist.currentIssue.priority || "High Priority",
              currentIssueDescription: fastResult.fastAssist.currentIssue.description,
              sayThis: fastResult.fastAssist.quickAssist.sayThis,
              askNext: [
                fastResult.fastAssist.quickAssist.askNext,
                ...(prev.liveAssist?.askNext || []).slice(0, 2),
              ].filter(Boolean),
              confidence: fastResult.fastAssist.confidence,
              provenanceMeta: {
                provenance: fastResult.devLog.provenance || "AI: FALLBACK",
                provider: fastResult.devLog.provider || "Local Fallback Heuristics",
                model: fastResult.devLog.model || "offline-heuristics",
                latencyMs: fastResult.devLog.latencyMs,
                timestamp: fastResult.devLog.timestamp,
                procedureName: "firstMate.fastAssist",
                sessionId: prev.sessionId,
                rawStructuredOutput: fastResult.fastAssist,
              },
            },
            alerts: newAlerts,
            devLogs: [fastResult.devLog, ...(prev.devLogs || [])].slice(0, 30),
          };
        });
      } catch (err) {
        console.warn("[FirstMateContext] Fast Assist error:", err);
      } finally {
        setIsFastAnalyzing(false);
      }

      // ── SPEED 2: DEEP ASSIST (Background reasoning & rolling memory) ──
      setIsDeepAnalyzing(true);
      try {
        const deepResult = await deepAssistMutation.mutateAsync({
          session,
          transcript: updatedTranscript,
          newTurn,
        });

        setSession((prev) => {
          const newRequests = [...(prev.requests || [])];
          const newRefusals = [...(prev.refusals || [])];
          const newCommitments = [...(prev.commitments || [])];
          const newProposals = [...(prev.proposals || [])];
          const newOpenIssues = [...(prev.openIssues || [])];

          // Filter out any dismissed item summaries
          for (const item of (deepResult.deepAssist.detections || [])) {
            if ((prev.dismissedItemIds || []).includes(item.summary)) continue;

            const trackedItem: TrackedItem = {
              id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              type: item.type,
              summary: item.summary,
              speaker: newTurn.speakerRole,
              timestamp: Date.now(),
              status: "detected",
              supportingTranscriptText: item.supportingTranscriptText || newTurn.text,
            };

            if (item.type === "REQUEST") newRequests.push(trackedItem);
            else if (item.type === "POSSIBLE_REFUSAL") newRefusals.push(trackedItem);
            else if (item.type === "COMMITMENT") newCommitments.push(trackedItem);
            else if (item.type === "PROPOSAL") newProposals.push(trackedItem);
            else newOpenIssues.push(trackedItem);
          }

          // Handle active thread updating
          let updatedThreads = [...(prev.threads || [])];
          if (deepResult.deepAssist.activeThreadName) {
            const threadName = deepResult.deepAssist.activeThreadName;
            const existing = updatedThreads.find((t) => t.name.toLowerCase() === threadName.toLowerCase());
            if (existing) {
              existing.status = "active";
              existing.lastUpdated = Date.now();
            } else {
              // mark others open
              updatedThreads = updatedThreads.map((t) => (t.status === "active" ? { ...t, status: "open" as const } : t));
              updatedThreads.push({
                id: `th-${Date.now()}`,
                name: threadName,
                status: "active",
                startedAt: Date.now(),
                lastUpdated: Date.now(),
              });
            }
          }

          // Handle conflict detection
          const newConflicts = [...(prev.conflicts || [])];
          if (deepResult.deepAssist.conflicts && deepResult.deepAssist.conflicts.length > 0) {
            for (const c of deepResult.deepAssist.conflicts) {
              newConflicts.unshift({
                id: `conflict-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                title: c.title,
                message: c.message,
                earlierStatement: c.earlierStatement,
                currentStatement: c.currentStatement,
                timestamp: Date.now(),
                resolved: false,
              });
            }
          }

          return {
            ...prev,
            liveAssist: {
              ...prev.liveAssist,
              whyItMatters: deepResult.deepAssist.whyItMatters,
              sources: deepResult.deepAssist.sources?.length ? deepResult.deepAssist.sources : prev.liveAssist?.sources,
            },
            sessionState: {
              ...prev.sessionState,
              ...deepResult.deepAssist.sessionStateUpdates,
            },
            requests: newRequests,
            refusals: newRefusals,
            commitments: newCommitments,
            proposals: newProposals,
            openIssues: newOpenIssues,
            threads: updatedThreads,
            conflicts: newConflicts,
            devLogs: [deepResult.devLog, ...(prev.devLogs || [])].slice(0, 30),
          };
        });
      } catch (err) {
        console.warn("[FirstMateContext] Deep Assist background error:", err);
      } finally {
        setIsDeepAnalyzing(false);
      }
    },
    [session, fastAssistMutation, deepAssistMutation]
  );

  /**
   * REPHRASE SAY THIS
   */
  const rephraseSayThis = useCallback(
    async (style: SayThisStyle) => {
      const current = session.liveAssist?.sayThis;
      if (!current) return;

      setIsRephrasing(true);
      try {
        const res = await rephraseMutation.mutateAsync({
          currentSayThis: current,
          style,
          sessionType: session.sessionType,
        });

        setSession((prev) => ({
          ...prev,
          liveAssist: {
            ...prev.liveAssist,
            sayThis: res.text,
          },
          devLogs: [res.devLog, ...(prev.devLogs || [])].slice(0, 30),
        }));
        toast.success(`Adapted phrasing (${style})`);
      } catch (err: any) {
        toast.error("Failed to rephrase: " + err.message);
      } finally {
        setIsRephrasing(false);
      }
    },
    [session.liveAssist?.sayThis, session.sessionType, rephraseMutation]
  );

  const updateTrackedItem = useCallback((id: string, status: TrackedItem["status"], userNote?: string) => {
    setSession((prev) => {
      const updater = (list: TrackedItem[] = []) =>
        list.map((item) => (item.id === id ? { ...item, status, userNote: userNote ?? item.userNote } : item));

      // If dismissed, record summary to avoid immediate regeneration
      let dismissedIds = [...(prev.dismissedItemIds || [])];
      const target = [
        ...(prev.requests || []),
        ...(prev.refusals || []),
        ...(prev.commitments || []),
        ...(prev.proposals || []),
      ].find((i) => i.id === id);
      if (status === "dismissed" && target && !dismissedIds.includes(target.summary)) {
        dismissedIds.push(target.summary);
      }

      return {
        ...prev,
        requests: updater(prev.requests || []),
        refusals: updater(prev.refusals || []),
        commitments: updater(prev.commitments || []),
        proposals: updater(prev.proposals || []),
        openIssues: updater(prev.openIssues || []),
        dismissedItemIds: dismissedIds,
      };
    });
    toast.info(`Updated item status: ${status}`);
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setSession((prev) => ({
      ...prev,
      alerts: (prev.alerts || []).map((a) => (a.id === id ? { ...a, dismissed: true } : a)),
    }));
  }, []);

  const dismissConflict = useCallback((id: string) => {
    setSession((prev) => ({
      ...prev,
      conflicts: (prev.conflicts || []).map((c) => (c.id === id ? { ...c, resolved: true } : c)),
    }));
  }, []);

  const addNote = useCallback((note: string) => {
    if (!note.trim()) return;
    setSession((prev) => ({
      ...prev,
      notes: [...(prev.notes || []), note.trim()],
    }));
    toast.success("Note added to session");
  }, []);

  const saveMoment = useCallback(
    (note: string) => {
      const transcript = session.transcript || [];
      const lastTurn = transcript[transcript.length - 1];
      setSession((prev) => ({
        ...prev,
        savedMoments: [
          ...(prev.savedMoments || []),
          {
            id: `moment-${Date.now()}`,
            timestamp: Date.now(),
            transcriptExcerpt: lastTurn ? `[${lastTurn.speakerRole}] "${lastTurn.text}"` : "Session Bookmark",
            note: note || "Key advocacy milestone",
          },
        ],
      }));
      toast.success("Moment saved to session timeline");
    },
    [session.transcript]
  );

  const askQuestion = useCallback(
    async (query: string): Promise<string> => {
      if (!query.trim()) return "";
      try {
        const res = await askMutation.mutateAsync({
          sessionId: session.sessionId,
          question: query.trim(),
          sessionType: session.sessionType,
          currentIssue: session.liveAssist?.currentIssue,
          recentTranscript: (session.transcript || []).slice(-10),
          sessionState: session.sessionState,
          session,
        });

        const meta: FirstMateProvenanceMeta = {
          provenance: (res.provenance as any) || "AI: FALLBACK",
          provider: res.provider || "Local Fallback Heuristics",
          model: res.model || "offline-heuristics",
          latencyMs: res.latencyMs || 0,
          timestamp: res.timestamp || Date.now(),
          sessionId: session.sessionId,
          procedureName: "firstMate.ask",
          rawStructuredOutput: res.rawAiOutput || {
            answer: res.answer,
            confidence: res.confidence,
            relatedIssue: res.relatedIssue,
            suggestedFollowUp: res.suggestedFollowUp,
          },
        };
        setLastAskMeta(meta);

        return res.answer;
      } catch (err: any) {
        console.error("[FirstMateContext] askQuestion backend error:", err);
        const errMeta: FirstMateProvenanceMeta = {
          provenance: "AI: ERROR",
          provider: "OpenAI / First Mate",
          model: "offline-heuristics",
          latencyMs: 0,
          timestamp: Date.now(),
          sessionId: session.sessionId,
          procedureName: "firstMate.ask",
          rawStructuredOutput: { error: err.message },
        };
        setLastAskMeta(errMeta);
        toast.error("First Mate is temporarily unavailable.");
        return "First Mate is temporarily unavailable.";
      }
    },
    [session, askMutation]
  );

  const generateSummary = useCallback(async (): Promise<string> => {
    try {
      const res = await generateSummaryMutation.mutateAsync({ session });
      return res.summary;
    } catch (err: any) {
      toast.error("Failed to generate summary: " + err.message);
      return "Summary generation failed. Check connection.";
    }
  }, [session, generateSummaryMutation]);

  const clearTranscript = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      transcript: [],
      requests: [],
      refusals: [],
      commitments: [],
      proposals: [],
      alerts: [],
      conflicts: [],
      threads: [],
      devLogs: Array.isArray(prev.devLogs) ? prev.devLogs : [],
    }));
    toast.info("Transcript cleared for fresh test");
  }, []);

  return (
    <FirstMateContext.Provider
      value={{
        session,
        isAnalyzing: isFastAnalyzing || isDeepAnalyzing,
        isFastAnalyzing,
        isDeepAnalyzing,
        isRephrasing,
        startSession,
        pauseSession,
        resumeSession,
        endSession,
        resetSession,
        setSessionType,
        setMode,
        attachRecord,
        addTranscriptTurn,
        rephraseSayThis,
        updateTrackedItem,
        dismissAlert,
        dismissConflict,
        addNote,
        saveMoment,
        askQuestion,
        generateSummary,
        clearTranscript,
        lastAskMeta,
      }}
    >
      {children}
    </FirstMateContext.Provider>
  );
}

export function useFirstMate() {
  const ctx = useContext(FirstMateContext);
  if (!ctx) {
    throw new Error("useFirstMate must be used within a FirstMateProvider");
  }
  return ctx;
}

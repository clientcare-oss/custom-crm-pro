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
  FirstMateWorkingMemory,
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
  };
}

interface FirstMateContextValue {
  session: FirstMateSession;
  isAnalyzing: boolean;
  startSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => void;
  resetSession: (newType?: FirstMateSessionType) => void;
  setSessionType: (type: FirstMateSessionType) => void;
  setMode: (mode: FirstMateSessionMode) => void;
  attachRecord: (record: { id: number; type: "lead" | "client"; name: string; subtitle: string }) => void;
  addTranscriptTurn: (speakerRole: SpeakerRole, text: string) => Promise<void>;
  updateTrackedItem: (id: string, status: TrackedItem["status"], userNote?: string) => void;
  dismissAlert: (id: string) => void;
  addNote: (note: string) => void;
  saveMoment: (note: string) => void;
  askQuestion: (query: string) => Promise<string>;
  generateSummary: () => Promise<string>;
  clearTranscript: () => void;
}

const FirstMateContext = createContext<FirstMateContextValue | null>(null);

export function FirstMateProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<FirstMateSession>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Failed to load First Mate session from localStorage:", e);
    }
    return createDefaultSession();
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
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
          setSession(event.data.session);
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
  const analyzeTurnMutation = trpc.firstMate.analyzeTurn.useMutation();
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

      const updatedTranscript = [...session.transcript, newTurn];

      // Immediately append turn to state for instant responsive UI
      setSession((prev) => ({
        ...prev,
        transcript: updatedTranscript,
      }));

      setIsAnalyzing(true);
      try {
        const analysis = await analyzeTurnMutation.mutateAsync({
          session,
          transcript: updatedTranscript,
          newTurn,
        });

        setSession((prev) => {
          const newRequests = [...prev.requests];
          const newRefusals = [...prev.refusals];
          const newCommitments = [...prev.commitments];
          const newProposals = [...prev.proposals];
          const newOpenIssues = [...prev.openIssues];

          for (const item of analysis.newTrackedItems) {
            if (item.type === "REQUEST") newRequests.push(item);
            else if (item.type === "POSSIBLE_REFUSAL") newRefusals.push(item);
            else if (item.type === "COMMITMENT") newCommitments.push(item);
            else if (item.type === "PROPOSAL") newProposals.push(item);
            else newOpenIssues.push(item);
          }

          return {
            ...prev,
            liveAssist: analysis.liveAssist,
            sessionState: {
              ...prev.sessionState,
              ...analysis.workingMemoryDelta,
            },
            requests: newRequests,
            refusals: newRefusals,
            commitments: newCommitments,
            proposals: newProposals,
            openIssues: newOpenIssues,
            alerts: [...analysis.newAlerts, ...prev.alerts],
          };
        });
      } catch (err: any) {
        console.warn("[FirstMateContext] Error analyzing turn:", err);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [session, analyzeTurnMutation]
  );

  const updateTrackedItem = useCallback((id: string, status: TrackedItem["status"], userNote?: string) => {
    setSession((prev) => {
      const updater = (list: TrackedItem[]) =>
        list.map((item) => (item.id === id ? { ...item, status, userNote: userNote ?? item.userNote } : item));

      return {
        ...prev,
        requests: updater(prev.requests),
        refusals: updater(prev.refusals),
        commitments: updater(prev.commitments),
        proposals: updater(prev.proposals),
        openIssues: updater(prev.openIssues),
      };
    });
    toast.info(`Updated item status: ${status}`);
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setSession((prev) => ({
      ...prev,
      alerts: prev.alerts.map((a) => (a.id === id ? { ...a, dismissed: true } : a)),
    }));
  }, []);

  const addNote = useCallback((note: string) => {
    if (!note.trim()) return;
    setSession((prev) => ({
      ...prev,
      notes: [...prev.notes, note.trim()],
    }));
    toast.success("Note added to session");
  }, []);

  const saveMoment = useCallback((note: string) => {
    const lastTurn = session.transcript[session.transcript.length - 1];
    setSession((prev) => ({
      ...prev,
      savedMoments: [
        ...prev.savedMoments,
        {
          id: `moment-${Date.now()}`,
          timestamp: Date.now(),
          transcriptExcerpt: lastTurn ? `[${lastTurn.speakerRole}] "${lastTurn.text}"` : "Session Bookmark",
          note: note || "Key advocacy milestone",
        },
      ],
    }));
    toast.success("Moment saved to session timeline");
  }, [session.transcript]);

  const askQuestion = useCallback(
    async (query: string): Promise<string> => {
      if (!query.trim()) return "";
      try {
        const res = await askMutation.mutateAsync({
          session,
          query: query.trim(),
        });
        return res.answer;
      } catch (err: any) {
        toast.error("Failed to query First Mate: " + err.message);
        return "First Mate was unable to answer at this moment. Check active connection.";
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
    }));
    toast.info("Transcript cleared for fresh test");
  }, []);

  return (
    <FirstMateContext.Provider
      value={{
        session,
        isAnalyzing,
        startSession,
        pauseSession,
        resumeSession,
        endSession,
        resetSession,
        setSessionType,
        setMode,
        attachRecord,
        addTranscriptTurn,
        updateTrackedItem,
        dismissAlert,
        addNote,
        saveMoment,
        askQuestion,
        generateSummary,
        clearTranscript,
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

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
  AudioInputStatus,
  TranscriptionProviderStatus,
  MicrophoneDiagnostics,
  FirstMateAskHistoryEntry,
} from "../../../shared/firstMate";
import {
  isSilenceHallucination,
  SUPPORTED_LANGUAGES,
} from "../../../shared/firstMate";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { BrowserMicrophoneAudioProvider } from "../lib/firstMate/audio/BrowserMicrophoneAudioProvider";
import { OpenAIRealtimeTranscriptionProvider } from "../lib/firstMate/transcription/OpenAIRealtimeTranscriptionProvider";

const STORAGE_KEY = "waypoint_first_mate_session";
const PREVIOUS_STORAGE_KEY = "waypoint_first_mate_previous_session";
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
    status: "READY",
    mode: "LIVE",
    language: (typeof window !== "undefined" ? localStorage.getItem("fm_preferred_language") : null) || "en",
    startedAt: null,
    endedAt: null,
    durationSeconds: 0,
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
    askHistory: [],
    devLogs: [],
  };
}

export function createCleanSession(type: FirstMateSessionType = "IEP_MEETING"): FirstMateSession {
  return {
    sessionId: `fm-${Date.now()}`,
    sessionType: type,
    status: "READY",
    mode: "LIVE",
    language: (typeof window !== "undefined" ? localStorage.getItem("fm_preferred_language") : null) || "en",
    startedAt: null,
    endedAt: null,
    durationSeconds: 0,
    createdBy: "advocate",
    attachedName: "",
    attachedSubtitle: "",
    title: "New Advocacy Session",
    notes: [],
    summary: "",
    transcript: [],
    sessionState: {
      studentName: "",
      grade: "",
      currentTopic: "Initial Discussion",
      currentDispute: "",
      openIssues: [],
      suspectedDisabilities: [],
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
    liveAssist: {
      currentIssue: "Ready for conversation",
      currentIssuePriority: "Standard",
      currentIssueDescription: "Listening for speaker statements.",
      quickAnswer: "Waiting for speech audio or transcript input.",
      sayThis: "Thank you for convening today's meeting. Before we begin, can we review the agenda?",
      askNext: [
        "What baseline evaluation data will be reviewed today?",
        "Can we confirm the goals and agenda items for this discussion?",
      ],
      whyItMatters: "Setting an explicit agenda and baseline metrics establishes advocate control.",
      confidence: "High",
      sources: [],
      provenanceMeta: {
        provenance: "AI: MOCK",
        provider: "First Mate Clean Template",
        model: "clean-session",
        latencyMs: 0,
        timestamp: Date.now(),
        procedureName: "session.clean",
      },
    },
    askHistory: [],
    devLogs: [],
  };
}

function normalizeSession(raw: any): FirstMateSession {
  const def = createDefaultSession();
  if (!raw || typeof raw !== "object") return def;

  return {
    ...def,
    ...raw,
    sessionId: raw.sessionId || def.sessionId,
    sessionType: raw.sessionType || def.sessionType,
    status: raw.status || def.status,
    mode: raw.mode || def.mode,
    language: typeof raw.language === "string" ? raw.language : def.language || "en",
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
    transcript: (Array.isArray(raw.transcript) ? raw.transcript : []).filter(
      (t: any) => t && typeof t.text === "string" && !isSilenceHallucination(t.text, raw.language || def.language || "en")
    ),
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
    askHistory: Array.isArray(raw.askHistory) ? raw.askHistory : [],
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
  language: string;
  setLanguage: (lang: string) => void;
  attachRecord: (record: { id: number; type: "lead" | "client"; name: string; subtitle: string }) => void;
  addTranscriptTurn: (speakerRole: SpeakerRole, text: string, source?: "simulator" | "live_audio" | "manual" | "microphone") => Promise<void>;
  deleteTranscriptTurn: (turnId: string) => void;
  purgeForeignHallucinations: () => void;
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

  // ── BUILD 3: LIVE AUDIO & MICROPHONE ABSTRACTION ──
  audioInputStatus: AudioInputStatus;
  transcriptionStatus: TranscriptionProviderStatus;
  interimTranscript: string;
  selectedSpeaker: SpeakerRole;
  setSelectedSpeaker: (role: SpeakerRole) => void;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  pauseListening: () => void;
  resumeListening: () => void;
  retryMicrophonePermission: () => Promise<void>;
  microphoneDiagnostics: MicrophoneDiagnostics;
  audioDevices: Array<{ deviceId: string; label: string }>;
  selectedAudioDevice: string;
  setSelectedAudioDevice: (deviceId: string) => Promise<void>;

  // ── BUILD 4: POP-OUT & CROSS-VIEW SYNCHRONIZATION ──
  openPopoutWindow: () => void;
  isPopout: boolean;
  startNewSession: (newType?: FirstMateSessionType) => void;
  continuePreviousSession: () => boolean;
  hasPreviousSession: boolean;
  endSessionAndProcess: (options?: { studentId?: number; studentName?: string }) => Promise<{
    success: boolean;
    summary?: string;
    studentName?: string;
    noteTitle?: string;
  }>;
  isProcessingEndSession: boolean;
  clearAskHistory: () => void;
}

const FirstMateContext = createContext<FirstMateContextValue | null>(null);

export function FirstMateProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<FirstMateSession>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const loaded = normalizeSession(JSON.parse(saved));
        if (loaded.status === "ACTIVE" || loaded.status === "PAUSED") {
          return { ...loaded, status: "READY" };
        }
        return loaded;
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
  const [duplicatesSuppressed, setDuplicatesSuppressed] = useState<number>(0);
  const [hasPreviousSession, setHasPreviousSession] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem(PREVIOUS_STORAGE_KEY));
    } catch {
      return false;
    }
  });
  const channelRef = useRef<BroadcastChannel | null>(null);
  const sessionRef = useRef<FirstMateSession>(session);

  const isPopout = typeof window !== "undefined" && window.location.pathname.includes("/first-mate/popout");

  const openPopoutWindow = useCallback(() => {
    if (typeof window === "undefined") return;
    const targetUrl = `${window.location.origin}/first-mate/popout`;

    let width = 460;
    let height = 780;
    try {
      const savedDims = localStorage.getItem("waypoint_first_mate_popout_dims");
      if (savedDims) {
        const parsed = JSON.parse(savedDims);
        if (parsed.width >= 350 && parsed.width <= 1200) width = parsed.width;
        if (parsed.height >= 500 && parsed.height <= 1400) height = parsed.height;
      }
    } catch (e) {}

    const left = Math.max(0, window.screen.availWidth - width - 40);
    const top = 60;
    const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no,location=no`;

    const popout = window.open(targetUrl, "WaypointFirstMatePopout", features);
    if (popout) {
      popout.focus();
      toast.success("First Mate pop-out copilot opened");
    } else {
      toast.error("Pop-up blocked. Please allow pop-ups for this site.");
    }
  }, []);

  // Keep sessionRef always updated with latest authoritative session
  useEffect(() => {
    sessionRef.current = session;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      channelRef.current?.postMessage({ type: "SYNC_SESSION", session });
    } catch (e) {
      console.warn("Failed to save First Mate session:", e);
    }
  }, [session]);

  // Setup BroadcastChannel & localStorage storage event for cross-view synchronization (pop-out support)
  useEffect(() => {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current = channel;

      channel.onmessage = (event) => {
        if (event.data?.type === "SYNC_SESSION" && event.data?.session) {
          setSession(normalizeSession(event.data.session));
        } else if (event.data?.type === "START_NEW_SESSION" && event.data?.session) {
          setSession(normalizeSession(event.data.session));
          setHasPreviousSession(true);
        } else if (event.data?.type === "CONTINUE_PREVIOUS_SESSION" && event.data?.session) {
          setSession(normalizeSession(event.data.session));
        } else if (event.data?.type === "REQUEST_SYNC") {
          // Authoritative main window responds to pop-out request
          if (sessionRef.current) {
            channel.postMessage({ type: "SYNC_SESSION", session: sessionRef.current });
          }
        } else if (event.data?.type === "CONTROL_ACTION" && !isPopout) {
          // Authoritative main window executes hardware audio actions requested by pop-out
          const act = event.data.action;
          if (act === "PAUSE_LISTENING" || act === "PAUSE_SESSION") {
            audioProviderRef.current?.pause();
            setSession((prev) => ({ ...prev, status: "PAUSED" }));
          } else if (act === "RESUME_LISTENING" || act === "RESUME_SESSION") {
            audioProviderRef.current?.resume();
            setSession((prev) => ({ ...prev, status: "ACTIVE" }));
          } else if (act === "STOP_LISTENING" || act === "END_SESSION") {
            audioProviderRef.current?.stop();
            transcriptionProviderRef.current?.disconnect();
            setInterimTranscript("");
            setAudioInputLevel(0);
            setSession((prev) => ({ ...prev, status: "ENDED", endedAt: Date.now() }));
          }
        }
      };

      // Pop-out asks for immediate full session state on load
      if (isPopout) {
        channel.postMessage({ type: "REQUEST_SYNC" });
      }

      return () => {
        channel.close();
      };
    }
  }, [isPopout]);

  // Multi-tab storage fallback
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setSession(normalizeSession(parsed));
        } catch (err) {}
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
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

  // tRPC Mutations & Utilities
  const trpcUtils = trpc.useUtils();
  const fastAssistMutation = trpc.firstMate.fastAssist.useMutation();
  const deepAssistMutation = trpc.firstMate.deepAssist.useMutation();
  const rephraseMutation = trpc.firstMate.rephraseSayThis.useMutation();
  const askMutation = trpc.firstMate.ask.useMutation();
  const generateSummaryMutation = trpc.firstMate.generateSummary.useMutation();
  const endSessionAndProcessMutation = trpc.firstMate.endSessionAndProcess.useMutation();
  const [isProcessingEndSession, setIsProcessingEndSession] = useState(false);

  // ── BUILD 3: LIVE AUDIO & MICROPHONE ABSTRACTION STATE ──
  const [audioInputStatus, setAudioInputStatus] = useState<AudioInputStatus>("inactive");
  const [transcriptionStatus, setTranscriptionStatus] = useState<TranscriptionProviderStatus>("disconnected");
  const [audioInputLevel, setAudioInputLevel] = useState<number>(0);
  const [diagMetrics, setDiagMetrics] = useState<Partial<MicrophoneDiagnostics>>({});
  const [normalizedEventCreated, setNormalizedEventCreated] = useState<"YES" | "NO">("NO");
  const [sessionTranscriptUpdated, setSessionTranscriptUpdated] = useState<"YES" | "NO">("NO");
  const [transcriptLengthBefore, setTranscriptLengthBefore] = useState<number>(0);
  const [transcriptLengthAfter, setTranscriptLengthAfter] = useState<number>(0);
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [selectedSpeaker, setSelectedSpeaker] = useState<SpeakerRole>("Parent");
  const [lastTranscriptText, setLastTranscriptText] = useState<string>("");
  const [lastTranscriptLatencyMs, setLastTranscriptLatencyMs] = useState<number>(0);
  const [lastMicError, setLastMicError] = useState<string | undefined>(undefined);

  const [audioDevices, setAudioDevices] = useState<Array<{ deviceId: string; label: string }>>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");

  // ── LANGUAGE CONFIGURATION STATE ──
  const [language, setLanguageState] = useState<string>(() => {
    try {
      return localStorage.getItem("fm_preferred_language") || session.language || "en";
    } catch {
      return session.language || "en";
    }
  });

  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("fm_preferred_language", lang);
    } catch {}

    setSession((prev) => {
      const next = { ...prev, language: lang };
      sessionRef.current = next;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        channelRef.current?.postMessage({ type: "SYNC_SESSION", session: next });
      } catch {}
      return next;
    });

    if (transcriptionProviderRef.current) {
      transcriptionProviderRef.current.setLanguage(lang);
    }

    const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
    toast.success(`First Mate language set to ${langObj ? `${langObj.flag} ${langObj.name}` : lang}`);
  }, []);

  // Automatically purge foreign hallucinations from session transcript on mount or language change
  useEffect(() => {
    const activeLang = session.language || language || "en";
    setSession((prev) => {
      const current = prev.transcript || [];
      const hasHallucination = current.some((t) => isSilenceHallucination(t.text, activeLang));
      if (!hasHallucination) return prev;
      const cleaned = current.filter((t) => !isSilenceHallucination(t.text, activeLang));
      const next = {
        ...prev,
        transcript: cleaned,
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        channelRef.current?.postMessage({ type: "SYNC_SESSION", session: next });
      } catch {}
      return next;
    });
  }, [session.language, language]);

  const audioProviderRef = useRef<BrowserMicrophoneAudioProvider | null>(null);
  const transcriptionProviderRef = useRef<OpenAIRealtimeTranscriptionProvider | null>(null);
  const addTranscriptTurnRef = useRef<((speakerRole: SpeakerRole, text: string, source?: any) => Promise<void>) | null>(null);

  // Load available audio devices
  useEffect(() => {
    BrowserMicrophoneAudioProvider.getAudioInputDevices().then((devs) => {
      if (devs.length > 0) {
        setAudioDevices(devs);
        setSelectedAudioDevice((prev) => prev || devs[0].deviceId);
      }
    });
  }, []);

  const setSelectedAudioDeviceHandler = useCallback(async (deviceId: string) => {
    setSelectedAudioDevice(deviceId);
    if (audioProviderRef.current) {
      audioProviderRef.current.setDeviceId(deviceId);
      if (audioInputStatus === "listening") {
        await audioProviderRef.current.stop();
        await audioProviderRef.current.start();
        toast.success("Switched microphone device");
      }
    }
  }, [audioInputStatus]);

  // Initialize or update providers
  useEffect(() => {
    if (!audioProviderRef.current) {
      const audioProv = new BrowserMicrophoneAudioProvider({ deviceId: selectedAudioDevice });
      audioProviderRef.current = audioProv;
      audioProv.onStatusChange((st) => setAudioInputStatus(st));
      audioProv.onAudioLevel((lvl) => setAudioInputLevel(lvl));
      audioProv.onError((err) => {
        setLastMicError(err.message);
        if (err.name === "NotAllowedError" || err.message?.includes("Permission denied")) {
          setAudioInputStatus("permission_denied");
        }
      });
    }

    const activeLanguage = session.language || language || "en";

    if (!transcriptionProviderRef.current) {
      transcriptionProviderRef.current = new OpenAIRealtimeTranscriptionProvider({
        trpcClient: trpcUtils.client,
        sessionId: session.sessionId,
        speakerRole: selectedSpeaker,
        language: activeLanguage,
      });
    } else {
      transcriptionProviderRef.current.setSpeaker(selectedSpeaker);
      transcriptionProviderRef.current.setLanguage(activeLanguage);
    }
  }, [session.sessionId, session.language, language, selectedSpeaker, trpcUtils.client, selectedAudioDevice]);

  // Connect audio provider chunks to transcription provider
  useEffect(() => {
    if (!audioProviderRef.current || !transcriptionProviderRef.current) return;

    transcriptionProviderRef.current.setCallbacks({
      onInterimTranscript: (text) => {
        setInterimTranscript(text);
      },
      onFinalTranscript: (text, latencyMs) => {
        setInterimTranscript("");
        setLastTranscriptText(text);
        setLastTranscriptLatencyMs(latencyMs);
        // Automatically feed finalized turn into First Mate session engine!
        if (addTranscriptTurnRef.current) {
          addTranscriptTurnRef.current(selectedSpeaker, text, "microphone");
        }
      },
      onStatusChange: (st) => {
        setTranscriptionStatus(st);
      },
      onDiagnosticsUpdate: (metrics) => {
        setDiagMetrics((prev) => ({ ...prev, ...metrics }));
      },
      onError: (err) => {
        setLastMicError(err.message);
      },
    });

    const unsubscribeChunks = audioProviderRef.current.onAudioChunk((blob, mimeType) => {
      transcriptionProviderRef.current?.handleAudioChunk(blob, mimeType);
    });

    return () => {
      unsubscribeChunks();
    };
  }, [selectedSpeaker]);

  const startListening = useCallback(async () => {
    try {
      setLastMicError(undefined);
      if (!audioProviderRef.current) {
        const audioProv = new BrowserMicrophoneAudioProvider({ deviceId: selectedAudioDevice });
        audioProviderRef.current = audioProv;
        audioProv.onStatusChange((st) => setAudioInputStatus(st));
        audioProv.onAudioLevel((lvl) => setAudioInputLevel(lvl));
      } else if (selectedAudioDevice) {
        audioProviderRef.current.setDeviceId(selectedAudioDevice);
      }

      await audioProviderRef.current.start();
      await transcriptionProviderRef.current?.connect();

      // Refresh device labels now that permission has been granted
      BrowserMicrophoneAudioProvider.getAudioInputDevices().then((devs) => {
        if (devs.length > 0) {
          setAudioDevices(devs);
        }
      });

      setSession((prev) => ({
        ...prev,
        status: "ACTIVE",
        mode: prev.mode === "TEST" ? "TEST" : "LIVE",
        startedAt: prev.startedAt || Date.now(),
      }));
      toast.success("First Mate is listening to microphone");
    } catch (err: any) {
      console.warn("[FirstMateContext] Failed to start microphone:", err?.message);
      setLastMicError(err?.message);
      if (err.name === "NotAllowedError" || err.message?.includes("Permission denied")) {
        setAudioInputStatus("permission_denied");
      } else {
        setAudioInputStatus("error");
      }
    }
  }, []);

  const pauseListening = useCallback(() => {
    if (isPopout) {
      channelRef.current?.postMessage({ type: "CONTROL_ACTION", action: "PAUSE_LISTENING" });
      setSession((prev) => ({ ...prev, status: "PAUSED" }));
      toast.info("Microphone paused");
      return;
    }
    audioProviderRef.current?.pause();
    setSession((prev) => ({ ...prev, status: "PAUSED" }));
    toast.info("Microphone paused");
  }, [isPopout]);

  const resumeListening = useCallback(async () => {
    if (isPopout) {
      channelRef.current?.postMessage({ type: "CONTROL_ACTION", action: "RESUME_LISTENING" });
      setSession((prev) => ({ ...prev, status: "ACTIVE" }));
      toast.success("Microphone resumed");
      return;
    }
    if (audioInputStatus !== "listening" && audioInputStatus !== "paused") {
      await startListening();
      return;
    }
    audioProviderRef.current?.resume();
    setSession((prev) => ({ ...prev, status: "ACTIVE" }));
    toast.success("Microphone resumed");
  }, [isPopout, audioInputStatus, startListening]);

  const stopListening = useCallback(async () => {
    if (isPopout) {
      channelRef.current?.postMessage({ type: "CONTROL_ACTION", action: "STOP_LISTENING" });
      setSession((prev) => ({
        ...prev,
        status: "ENDED",
        endedAt: Date.now(),
      }));
      toast.info("Listening stopped");
      return;
    }
    await audioProviderRef.current?.stop();
    transcriptionProviderRef.current?.disconnect();
    setInterimTranscript("");
    setAudioInputLevel(0);
    setSession((prev) => ({
      ...prev,
      status: "ENDED",
      endedAt: Date.now(),
    }));
    toast.info("Listening stopped");
  }, [isPopout]);

  const retryMicrophonePermission = useCallback(async () => {
    await startListening();
  }, [startListening]);

  const listeningStatus: MicrophoneDiagnostics["listeningStatus"] =
    audioInputStatus === "error" || transcriptionStatus === "error" || diagMetrics.openAiAuth === "FAIL"
      ? "TRANSCRIPTION ERROR"
      : audioInputStatus === "listening" && (transcriptionStatus === "connected" || transcriptionStatus === "transcribing")
      ? "LISTENING"
      : audioInputStatus === "listening" && transcriptionStatus === "connecting"
      ? "CONNECTING TO TRANSCRIPTION"
      : audioInputStatus === "listening"
      ? "MICROPHONE READY"
      : "INACTIVE";

  const microphoneDiagnostics: MicrophoneDiagnostics = {
    permission:
      audioInputStatus === "permission_denied"
        ? "DENIED"
        : audioInputStatus === "listening" || audioInputStatus === "paused"
        ? "GRANTED"
        : audioInputStatus === "error"
        ? "ERROR"
        : "UNKNOWN",
    audioTrack: audioInputStatus === "listening" ? "ACTIVE" : "INACTIVE",
    audioTrackState: audioProviderRef.current?.getTrackState() || "none",
    audioInputLevel,
    realtimeSessionCreated: diagMetrics.realtimeSessionCreated || "NO",
    transport: diagMetrics.transport || "None",
    realtimeConnection:
      transcriptionStatus === "connected" || transcriptionStatus === "transcribing"
        ? "CONNECTED"
        : transcriptionStatus === "connecting"
        ? "CONNECTING"
        : transcriptionStatus === "error"
        ? "ERROR"
        : "DISCONNECTED",
    connectionState:
      transcriptionStatus === "connected" || transcriptionStatus === "transcribing"
        ? "CONNECTED"
        : transcriptionStatus === "connecting"
        ? "CONNECTING"
        : transcriptionStatus === "error"
        ? "ERROR"
        : "CLOSED",
    openAiAuth: diagMetrics.openAiAuth || "PENDING",
    transcriptionModel: "whisper-1",
    audioChunksCaptured: diagMetrics.audioChunksCaptured || 0,
    audioChunksSent: diagMetrics.audioChunksSent || 0,
    totalAudioBytesSent: diagMetrics.totalAudioBytesSent || 0,
    openAiEventsReceived: diagMetrics.openAiEventsReceived || "NO",
    interimTranscriptCount: diagMetrics.interimTranscriptCount || 0,
    finalTranscriptCount: diagMetrics.finalTranscriptCount || 0,
    lastTranscriptEvent: diagMetrics.lastTranscriptEvent || "",
    lastFinalTranscript: lastTranscriptText || diagMetrics.lastFinalTranscript || "",
    lastTranscriptLatencyMs,
    normalizedEventCreated,
    sessionTranscriptUpdated,
    transcriptLengthBefore,
    transcriptLengthAfter,
    listeningStatus,
    selectedSpeaker,
    duplicatesSuppressed,
    lastError: lastMicError || diagMetrics.lastError,
  };


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
    setSession((prev) => {
      const ended: FirstMateSession = {
        ...prev,
        status: "ENDED",
        endedAt: Date.now(),
      };
      sessionRef.current = ended;
      try {
        localStorage.setItem(PREVIOUS_STORAGE_KEY, JSON.stringify(ended));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ended));
        setHasPreviousSession(true);
        channelRef.current?.postMessage({ type: "SYNC_SESSION", session: ended });
      } catch (e) {}
      return ended;
    });
    toast.info("Session ended");
  }, []);

  const endSessionAndProcess = useCallback(
    async (options?: { studentId?: number; studentName?: string }) => {
      setIsProcessingEndSession(true);

      // Stop audio hardware / realtime transcription immediately
      if (!isPopout) {
        audioProviderRef.current?.stop();
        transcriptionProviderRef.current?.disconnect();
        setInterimTranscript("");
        setAudioInputLevel(0);
      } else {
        channelRef.current?.postMessage({
          type: "CONTROL_ACTION",
          action: "STOP_LISTENING",
        });
      }

      try {
        const cur = sessionRef.current;
        const result = await endSessionAndProcessMutation.mutateAsync({
          sessionId: cur.sessionId,
          session: cur,
          studentId: options?.studentId || cur.attachedStudentId || cur.attachedClientId || undefined,
          studentName: options?.studentName || cur.sessionState?.studentName || cur.attachedName || undefined,
        });

        const endedSession: FirstMateSession = {
          ...cur,
          status: "ENDED",
          endedAt: Date.now(),
          summary: result.summary || cur.summary,
        };

        sessionRef.current = endedSession;
        setSession(endedSession);

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(endedSession));
          localStorage.setItem(PREVIOUS_STORAGE_KEY, JSON.stringify(endedSession));
          setHasPreviousSession(true);
          channelRef.current?.postMessage({ type: "SYNC_SESSION", session: endedSession });
        } catch (e) {}

        toast.success(
          `Session ended & processed! Attached summary & full transcript to ${result.studentName}'s notes (Advocate Only).`
        );

        return {
          success: true,
          summary: result.summary,
          studentName: result.studentName,
          noteTitle: result.noteTitle,
        };
      } catch (err: any) {
        console.error("[FirstMate] Failed to end session and process:", err);
        // Fallback: still end session locally even if backend encountered an error
        const endedSession: FirstMateSession = {
          ...sessionRef.current,
          status: "ENDED",
          endedAt: Date.now(),
        };
        sessionRef.current = endedSession;
        setSession(endedSession);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(endedSession));
          localStorage.setItem(PREVIOUS_STORAGE_KEY, JSON.stringify(endedSession));
          setHasPreviousSession(true);
          channelRef.current?.postMessage({ type: "SYNC_SESSION", session: endedSession });
        } catch (e) {}

        toast.error(err?.message || "Failed to process session notes to student file.");
        return { success: false };
      } finally {
        setIsProcessingEndSession(false);
      }
    },
    [isPopout, endSessionAndProcessMutation]
  );

  const startNewSession = useCallback((newType?: FirstMateSessionType) => {
    const cur = sessionRef.current;
    if (cur && (cur.transcript.length > 0 || cur.durationSeconds > 0 || cur.notes.length > 0)) {
      try {
        localStorage.setItem(PREVIOUS_STORAGE_KEY, JSON.stringify(cur));
        setHasPreviousSession(true);
      } catch (e) {
        console.warn("Failed to archive previous session:", e);
      }
    }

    if (!isPopout) {
      audioProviderRef.current?.stop();
      transcriptionProviderRef.current?.disconnect();
      setInterimTranscript("");
      setAudioInputLevel(0);
    } else {
      channelRef.current?.postMessage({
        type: "CONTROL_ACTION",
        action: "STOP_LISTENING",
      });
    }

    const clean = createCleanSession(newType || cur?.sessionType || "IEP_MEETING");
    sessionRef.current = clean;
    setSession(clean);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
      channelRef.current?.postMessage({ type: "SYNC_SESSION", session: clean });
      channelRef.current?.postMessage({ type: "START_NEW_SESSION", session: clean });
    } catch (e) {}

    toast.success("Started new clean First Mate session");
  }, [isPopout]);

  const continuePreviousSession = useCallback(() => {
    const cur = sessionRef.current;
    if (cur && cur.status === "ENDED") {
      const resumed: FirstMateSession = {
        ...cur,
        status: "READY",
        endedAt: null,
      };
      sessionRef.current = resumed;
      setSession(resumed);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(resumed));
        channelRef.current?.postMessage({ type: "SYNC_SESSION", session: resumed });
      } catch (e) {}
      toast.success(`Resumed session (${resumed.transcript.length} turns)`);
      return true;
    }

    try {
      const savedPrev = localStorage.getItem(PREVIOUS_STORAGE_KEY);
      if (!savedPrev) {
        toast.info("No previous session found to restore");
        return false;
      }
      const prevSession = normalizeSession(JSON.parse(savedPrev));

      if (cur && (cur.transcript.length > 0 || cur.durationSeconds > 0)) {
        localStorage.setItem(PREVIOUS_STORAGE_KEY, JSON.stringify(cur));
        setHasPreviousSession(true);
      }

      const restored: FirstMateSession = {
        ...prevSession,
        status: prevSession.status === "ACTIVE" ? "READY" : prevSession.status,
        endedAt: null,
      };
      sessionRef.current = restored;
      setSession(restored);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
        channelRef.current?.postMessage({ type: "SYNC_SESSION", session: restored });
        channelRef.current?.postMessage({ type: "CONTINUE_PREVIOUS_SESSION", session: restored });
      } catch (e) {}
      toast.success(`Restored previous session (${restored.transcript.length} turns)`);
      return true;
    } catch (e) {
      console.error("Failed to restore previous session:", e);
      toast.error("Could not load previous session");
      return false;
    }
  }, []);

  const resetSession = useCallback((newType?: FirstMateSessionType) => {
    startNewSession(newType);
  }, [startNewSession]);

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
    async (speakerRole: SpeakerRole, text: string, source: "simulator" | "live_audio" | "manual" | "microphone" = "simulator") => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const currentSession = sessionRef.current;
      const currentTranscript = currentSession.transcript || [];
      const prevLength = currentTranscript.length;

      // ── DEDUPLICATION & SILENCE HALLUCINATION REJECTION (Rules 7 & 8) ──
      const lowerClean = trimmed.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").trim();
      const lastTurn = currentTranscript[currentTranscript.length - 1];

      // Detect immediate repetition from same speaker
      const isRepetition =
        lastTurn &&
        lastTurn.speakerRole === speakerRole &&
        lastTurn.text.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").trim() === lowerClean &&
        Date.now() - lastTurn.timestamp < 12000;

      // Detect multi-lingual Whisper silence hallucination artifacts (e.g. "ご視聴ありがとうございました", "Thank you for watching", etc.)
      const isWhisperSilence = isSilenceHallucination(trimmed, currentSession.language || language || "en");

      if (isRepetition || isWhisperSilence || (lowerClean.length < 2 && audioInputLevel < 0.08)) {
        console.log("[FirstMateContext] Suppressing duplicate/silence hallucination turn:", trimmed);
        setDuplicatesSuppressed((prev) => prev + 1);
        return;
      }

      setTranscriptLengthBefore(prevLength);
      setNormalizedEventCreated("YES");

      const newTurn: NormalizedTranscriptEvent = {
        id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sessionId: currentSession.sessionId,
        speakerRole,
        text: trimmed,
        timestamp: Date.now(),
        isFinal: true,
        confidence: 0.98,
        source,
      };

      const updatedTranscript = [...currentTranscript, newTurn];
      const updatedSession: FirstMateSession = {
        ...currentSession,
        transcript: updatedTranscript,
      };

      sessionRef.current = updatedSession;
      setSession(updatedSession);
      setSessionTranscriptUpdated("YES");
      setTranscriptLengthAfter(updatedTranscript.length);

      // ── SPEED 1: FAST ASSIST ──
      setIsFastAnalyzing(true);
      try {
        const fastResult = await fastAssistMutation.mutateAsync({
          session: sessionRef.current,
          transcript: updatedTranscript,
          newTurn,
        });

        setSession((prev) => {
          const nextSession = {
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
            devLogs: [fastResult.devLog, ...(prev.devLogs || [])].slice(0, 30),
          };
          sessionRef.current = nextSession;
          return nextSession;
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

  useEffect(() => {
    addTranscriptTurnRef.current = addTranscriptTurn;
  }, [addTranscriptTurn]);

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
        const currentSession = sessionRef.current;
        const currentTranscript = currentSession.transcript || [];

        const res = await askMutation.mutateAsync({
          sessionId: currentSession.sessionId,
          question: query.trim(),
          sessionType: currentSession.sessionType,
          currentIssue: currentSession.liveAssist?.currentIssue,
          transcript: currentTranscript,
          recentTranscript: currentTranscript,
          sessionState: currentSession.sessionState,
          session: currentSession,
        });

        const lastTurn = currentTranscript[currentTranscript.length - 1];
        const meta: FirstMateProvenanceMeta = {
          provenance: (res.provenance as any) || "AI: FALLBACK",
          provider: res.provider || "Local Fallback Heuristics",
          model: res.model || "offline-heuristics",
          latencyMs: res.latencyMs || 0,
          timestamp: res.timestamp || Date.now(),
          sessionId: currentSession.sessionId,
          procedureName: "firstMate.ask",
          askContextEventCount: res.askContextEventCount ?? currentTranscript.length,
          lastAskContextEvent:
            res.lastAskContextEvent ||
            (lastTurn ? `[${lastTurn.speakerRole}]: "${lastTurn.text}"` : "None"),
          rawStructuredOutput: res.rawAiOutput || {
            answer: res.answer,
            confidence: res.confidence,
            relatedIssue: res.relatedIssue,
            suggestedFollowUp: res.suggestedFollowUp,
          },
        };
        setLastAskMeta(meta);

        // Append to session askHistory so the ask box retains full Q&A history during this session
        const historyEntry: FirstMateAskHistoryEntry = {
          id: `ask-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          question: query.trim(),
          answer: res.answer,
          timestamp: Date.now(),
          confidence: res.confidence,
          relatedIssue: res.relatedIssue,
          suggestedFollowUp: res.suggestedFollowUp,
          provenance: (res.provenance as any) || "AI: FALLBACK",
          provider: res.provider || "OpenAI",
          model: res.model,
        };

        setSession((prev) => {
          const updated: FirstMateSession = {
            ...prev,
            askHistory: [...(prev.askHistory || []), historyEntry],
          };
          sessionRef.current = updated;
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            channelRef.current?.postMessage({ type: "SYNC_SESSION", session: updated });
          } catch (e) {}
          return updated;
        });

        return res.answer;
      } catch (err: any) {
        console.error("[FirstMateContext] askQuestion backend error:", err);
        const errMeta: FirstMateProvenanceMeta = {
          provenance: "AI: ERROR",
          provider: "OpenAI / First Mate",
          model: "offline-heuristics",
          latencyMs: 0,
          timestamp: Date.now(),
          sessionId: sessionRef.current.sessionId,
          procedureName: "firstMate.ask",
          rawStructuredOutput: { error: err.message },
        };
        setLastAskMeta(errMeta);

        const errorAnswer = err?.message || "First Mate is temporarily unavailable.";
        const historyEntry: FirstMateAskHistoryEntry = {
          id: `ask-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          question: query.trim(),
          answer: errorAnswer,
          timestamp: Date.now(),
          provenance: "AI: ERROR",
        };

        setSession((prev) => {
          const updated: FirstMateSession = {
            ...prev,
            askHistory: [...(prev.askHistory || []), historyEntry],
          };
          sessionRef.current = updated;
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            channelRef.current?.postMessage({ type: "SYNC_SESSION", session: updated });
          } catch (e) {}
          return updated;
        });

        toast.error("First Mate is temporarily unavailable.");
        return errorAnswer;
      }
    },
    [askMutation]
  );

  const clearAskHistory = useCallback(() => {
    setSession((prev) => {
      const updated: FirstMateSession = {
        ...prev,
        askHistory: [],
      };
      sessionRef.current = updated;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        channelRef.current?.postMessage({ type: "SYNC_SESSION", session: updated });
      } catch (e) {}
      return updated;
    });
    toast.info("Ask First Mate history cleared for this session.");
  }, []);

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
    setSession((prev) => {
      const next = {
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
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        channelRef.current?.postMessage({ type: "SYNC_SESSION", session: next });
      } catch {}
      return next;
    });
    toast.info("Transcript cleared");
  }, []);

  const deleteTranscriptTurn = useCallback((turnId: string) => {
    setSession((prev) => {
      const next = {
        ...prev,
        transcript: (prev.transcript || []).filter((t) => t.id !== turnId),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        channelRef.current?.postMessage({ type: "SYNC_SESSION", session: next });
      } catch {}
      return next;
    });
    toast.success("Turn deleted from transcript");
  }, []);

  const purgeForeignHallucinations = useCallback(() => {
    setSession((prev) => {
      const activeLang = prev.language || language || "en";
      const cleaned = (prev.transcript || []).filter(
        (t) => t && typeof t.text === "string" && !isSilenceHallucination(t.text, activeLang)
      );
      const removedCount = (prev.transcript || []).length - cleaned.length;
      if (removedCount > 0) {
        toast.success(`Removed ${removedCount} foreign/hallucinated turns`);
      } else {
        toast.info("No foreign language hallucinations found");
      }
      const next = {
        ...prev,
        transcript: cleaned,
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        channelRef.current?.postMessage({ type: "SYNC_SESSION", session: next });
      } catch {}
      return next;
    });
  }, [language]);

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
        language: session.language || language || "en",
        setLanguage,
        attachRecord,
        addTranscriptTurn,
        deleteTranscriptTurn,
        purgeForeignHallucinations,
        rephraseSayThis,
        updateTrackedItem,
        dismissAlert,
        dismissConflict,
        addNote,
        saveMoment,
        askQuestion,
        clearAskHistory,
        generateSummary,
        clearTranscript,
        lastAskMeta,
        audioInputStatus,
        transcriptionStatus,
        interimTranscript,
        selectedSpeaker,
        setSelectedSpeaker,
        startListening,
        stopListening,
        pauseListening,
        resumeListening,
        retryMicrophonePermission,
        microphoneDiagnostics,
        audioDevices,
        selectedAudioDevice,
        setSelectedAudioDevice: setSelectedAudioDeviceHandler,
        openPopoutWindow,
        isPopout,
        startNewSession,
        continuePreviousSession,
        hasPreviousSession,
        endSessionAndProcess,
        isProcessingEndSession,
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

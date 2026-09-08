export type FirstMateSessionType =
  | "IEP_MEETING"
  | "SECTION_504_MEETING"
  | "DISCOVERY_CALL"
  | "PARENT_STRATEGY_CALL"
  | "SCHOOL_CALL"
  | "CLIENT_CALL"
  | "GENERAL_CALL"
  | "INTERNAL_CALL"
  | "SIMULATOR";

export type FirstMateSessionStatus =
  | "READY"
  | "ACTIVE"
  | "PAUSED"
  | "ENDED"
  | "REVIEWED";

export type FirstMateSessionMode = "TEST" | "SIMULATOR" | "LIVE";

export type SpeakerRole =
  | "Parent"
  | "Student"
  | "School"
  | "Teacher"
  | "Administrator"
  | "Case Manager"
  | "Special Education Teacher"
  | "General Education Teacher"
  | "School Psychologist"
  | "SLP"
  | "OT"
  | "PT"
  | "BCBA"
  | "Advocate"
  | "Receptionist"
  | "Other";

export type TranscriptSource = "simulator" | "live_audio" | "manual" | "microphone";

export interface NormalizedTranscriptEvent {
  id: string;
  sessionId: string;
  speakerId?: string;
  speakerRole: SpeakerRole;
  text: string;
  timestamp: number;
  isFinal: boolean;
  confidence: number;
  source: TranscriptSource;
}

export type AudioInputStatus =
  | "inactive"
  | "requesting_permission"
  | "permission_denied"
  | "listening"
  | "paused"
  | "error";

export type TranscriptionProviderStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "transcribing"
  | "error";

export interface MicrophoneDiagnostics {
  permission: "GRANTED" | "DENIED" | "ERROR" | "UNKNOWN";
  audioTrack: "ACTIVE" | "INACTIVE";
  audioTrackState: "live" | "ended" | "none";
  audioInputLevel: number; // 0.00 - 1.00
  realtimeSessionCreated: "YES" | "NO";
  transport: "WebRTC" | "WebSocket" | "Chunked Whisper" | "None";
  realtimeConnection: "CONNECTED" | "CONNECTING" | "DISCONNECTED" | "ERROR";
  connectionState: "CONNECTING" | "CONNECTED" | "ERROR" | "CLOSED";
  openAiAuth: "SUCCESS" | "FAIL" | "PENDING";
  transcriptionModel: string;
  audioChunksCaptured: number;
  audioChunksSent: number;
  totalAudioBytesSent: number;
  openAiEventsReceived: "YES" | "NO";
  interimTranscriptCount: number;
  finalTranscriptCount: number;
  lastTranscriptEvent?: string;
  lastFinalTranscript: string;
  lastTranscriptLatencyMs: number;
  normalizedEventCreated: "YES" | "NO";
  sessionTranscriptUpdated: "YES" | "NO";
  transcriptLengthBefore: number;
  transcriptLengthAfter: number;
  listeningStatus:
    | "MICROPHONE READY"
    | "CONNECTING TO TRANSCRIPTION"
    | "LISTENING"
    | "TRANSCRIPTION ERROR"
    | "INACTIVE";
  selectedSpeaker: SpeakerRole;
  duplicatesSuppressed?: number;
  lastError?: string;
}

export type TrackedItemType =
  | "REQUEST"
  | "POSSIBLE_REFUSAL"
  | "PROPOSAL"
  | "COMMITMENT"
  | "SERVICE_CHANGE"
  | "DATA_ISSUE"
  | "OPEN_ISSUE"
  | "IMPORTANT_DATE";

export type TrackedItemStatus = "detected" | "confirmed" | "dismissed" | "edited";

export interface TrackedItem {
  id: string;
  type: TrackedItemType;
  summary: string;
  speaker: SpeakerRole;
  timestamp: number;
  status: TrackedItemStatus;
  supportingTranscriptText: string;
  userNote?: string;
}

export type AlertType =
  | "POSSIBLE_REFUSAL"
  | "PROPOSED_CHANGE"
  | "SERVICE_REDUCTION"
  | "ACCOMMODATION_REMOVAL"
  | "PARENT_REQUEST_DETECTED"
  | "TEAM_COMMITMENT"
  | "DATA_BASIS_UNCLEAR"
  | "OPEN_ISSUE"
  | "FOLLOW_UP_NEEDED"
  | "POSSIBLE_CONFLICT";

export interface FirstMateAlert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  timestamp: number;
  dismissed?: boolean;
}

export interface RelatedSource {
  title: string;
  url?: string;
  isVerified: boolean;
}

export type FirstMateProvenance =
  | "AI: OPENAI"
  | "AI: MOCK"
  | "AI: FALLBACK"
  | "AI: RULE"
  | "AI: ERROR";

export interface FirstMateProvenanceMeta {
  provenance: FirstMateProvenance;
  provider: string;
  model: string;
  latencyMs: number;
  timestamp: number;
  sessionId?: string;
  procedureName?: string;
  requestId?: string;
  askContextEventCount?: number;
  lastAskContextEvent?: string;
  rawStructuredOutput?: any;
}

export interface FirstMateAskHistoryEntry {
  id: string;
  question: string;
  answer: string;
  timestamp: number;
  confidence?: string;
  relatedIssue?: string | null;
  suggestedFollowUp?: string | null;
  provenance?: FirstMateProvenance;
  provider?: string;
  model?: string;
}

export interface LiveAssistPanelData {
  currentIssue: string;
  currentIssuePriority?: "High Priority" | "Medium Priority" | "Standard";
  currentIssueDescription: string;
  quickAnswer: string;
  sayThis: string;
  askNext: string[];
  whyItMatters: string;
  confidence: "High" | "Medium" | "Low";
  sources: RelatedSource[];
  sourceVerificationNote?: string;
  provenanceMeta?: FirstMateProvenanceMeta;
}

export interface ConversationThread {
  id: string;
  name: string;
  status: "active" | "open" | "resolved";
  startedAt: number;
  lastUpdated: number;
  summary?: string;
}

export interface ConflictDetection {
  id: string;
  title: string;
  message: string;
  earlierStatement: string;
  currentStatement: string;
  timestamp: number;
  resolved?: boolean;
}

export type SayThisStyle =
  | "softer"
  | "firmer"
  | "shorter"
  | "another_version"
  | "followup_question";

export interface FirstMateDevLogEntry {
  id: string;
  timestamp: number;
  stage: "FAST" | "DEEP" | "REPHRASE" | "ASK" | "SUMMARY";
  latencyMs: number;
  model: string;
  success: boolean;
  itemCount?: number;
  notes?: string;
  provenance?: FirstMateProvenance;
  provider?: string;
  rawStructuredOutput?: any;
}

export interface FastAssistOutput {
  currentIssue: {
    label: string;
    description: string;
    priority?: "High Priority" | "Medium Priority" | "Standard";
    confidence: "High" | "Medium" | "Low";
  };
  quickAssist: {
    sayThis: string;
    askNext: string;
  };
  alert: {
    type: AlertType;
    severity: "info" | "attention" | "critical";
    message: string;
  } | null;
  confidence: "High" | "Medium" | "Low";
}

export interface DeepAssistOutput {
  whyItMatters: string;
  check: string[];
  detections: Array<{
    type: TrackedItemType;
    summary: string;
    confidence: "High" | "Medium" | "Low";
    supportingTranscriptText: string;
  }>;
  sessionStateUpdates: Partial<FirstMateWorkingMemory>;
  followUp: string[];
  activeThreadName?: string;
  conflicts: ConflictDetection[];
  sources?: RelatedSource[];
}

export interface FirstMateWorkingMemory {
  studentName?: string;
  parentName?: string;
  school?: string;
  district?: string;
  state?: string;
  grade?: string;
  currentPlan?: string;
  eligibility?: string;
  suspectedDisabilities?: string[];
  evaluations?: string[];
  services?: string[];
  accommodations?: string[];
  goals?: string[];
  parentConcerns?: string[];
  requestsMade?: string[];
  schoolResponses?: string[];
  importantDates?: string[];
  documentsMentioned?: string[];
  currentTopic?: string;
  currentDispute?: string;
  teamCommitments?: string[];
  openIssues?: string[];
  questionsUnanswered?: string[];
  potentialIdeaIssues?: string[];
  potential504Issues?: string[];
  followUpActions?: string[];
}

export interface FirstMateSession {
  sessionId: string;
  sessionType: FirstMateSessionType;
  status: FirstMateSessionStatus;
  mode: FirstMateSessionMode;
  startedAt: number | null;
  endedAt: number | null;
  durationSeconds: number;
  createdBy: string;
  attachedLeadId?: number | null;
  attachedClientId?: number | null;
  attachedStudentId?: number | null;
  attachedName?: string;
  attachedSubtitle?: string;
  title: string;
  notes: string[];
  summary: string;
  transcript: NormalizedTranscriptEvent[];
  sessionState: FirstMateWorkingMemory;
  detectedIssues: string[];
  requests: TrackedItem[];
  proposals: TrackedItem[];
  refusals: TrackedItem[];
  commitments: TrackedItem[];
  openIssues: TrackedItem[];
  threads: ConversationThread[];
  conflicts: ConflictDetection[];
  dismissedItemIds: string[];
  savedMoments: Array<{
    id: string;
    timestamp: number;
    transcriptExcerpt: string;
    note: string;
  }>;
  alerts: FirstMateAlert[];
  liveAssist: LiveAssistPanelData;
  askHistory?: FirstMateAskHistoryEntry[];
  devLogs: FirstMateDevLogEntry[];
}

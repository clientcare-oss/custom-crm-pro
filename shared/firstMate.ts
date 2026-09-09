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

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇧🇷" },
  { code: "ht", name: "Haitian Creole", nativeName: "Kreyòl Ayisyen", flag: "🇭🇹" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", flag: "🇻🇳" },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦" },
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹" },
  { code: "tl", name: "Tagalog", nativeName: "Tagalog / Filipino", flag: "🇵🇭" },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺" },
  { code: "auto", name: "Auto-Detect", nativeName: "Auto Detect", flag: "🌐" },
];

/**
 * Detects whether a string contains characters from a foreign writing system that does not
 * belong in a session of the given target language.
 * (e.g., Japanese Hiragana/Katakana, Kanji, Hangul, Cyrillic, Arabic appearing in an English meeting)
 */
export function containsForeignScriptMismatch(text: string, targetLanguage: string = "en"): boolean {
  if (!text) return false;
  const lang = (targetLanguage || "en").toLowerCase();

  // If target language is NOT Japanese, any Japanese Hiragana or Katakana is a foreign hallucination
  const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\uFF65-\uFF9F]/.test(text);
  if (hasJapanese && lang !== "ja") return true;

  // If target language is NOT Chinese and NOT Japanese, CJK ideographs (Kanji/Hanzi) are foreign
  const hasCJK = /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/.test(text);
  if (hasCJK && lang !== "zh" && lang !== "ja") return true;

  // If target language is NOT Korean, any Hangul is foreign
  const hasHangul = /[\uAC00-\uD7AF\u1100-\u11FF]/.test(text);
  if (hasHangul && lang !== "ko") return true;

  // If target language is NOT Arabic, any Arabic script is foreign
  const hasArabic = /[\u0600-\u06FF\u0750-\u077F]/.test(text);
  if (hasArabic && lang !== "ar") return true;

  // If target language is NOT Russian, any Cyrillic script is foreign
  const hasCyrillic = /[\u0400-\u04FF]/.test(text);
  if (hasCyrillic && lang !== "ru") return true;

  return false;
}

/**
 * Detects known Whisper silence & background-noise hallucinations across languages
 * (e.g. YouTube subtitle artifacts like "ご視聴ありがとうございました", "Thank you for watching", "Subtitles by", etc.)
 */
export function isSilenceHallucination(text: string, targetLanguage: string = "en"): boolean {
  if (!text) return true;

  // Check foreign script mismatch (e.g. Japanese text in an English/Spanish/French session)
  if (containsForeignScriptMismatch(text, targetLanguage)) {
    return true;
  }

  const clean = text
    .toLowerCase()
    .trim()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()？?！!。、・「」『』]/g, "")
    .trim();

  if (clean.length < 2) return true;

  // Japanese Whisper hallucinations on silence / hiss
  if (
    clean.includes("ご視聴") ||
    clean.includes("視聴ありがとう") ||
    clean.includes("チャンネル登録") ||
    clean.includes("ご覧いただき") ||
    clean.includes("高評価") ||
    clean.includes("お疲れ様") ||
    clean.includes("ありがとうございました") ||
    clean.includes("おやすみなさい")
  ) {
    return true;
  }

  // Chinese Whisper hallucinations on silence
  if (
    clean.includes("谢谢观看") ||
    clean.includes("謝謝觀看") ||
    clean.includes("感谢收看") ||
    clean.includes("感謝收看") ||
    clean.includes("请订阅") ||
    clean.includes("請訂閱")
  ) {
    return true;
  }

  // Korean Whisper hallucinations
  if (
    clean.includes("시청해 주셔서") ||
    clean.includes("구독과 좋아요") ||
    (clean.includes("감사합니다") && clean.length < 10)
  ) {
    return true;
  }

  // English & common subtitle credits hallucinations
  const englishHallucinations = [
    "you",
    "thank you",
    "thanks",
    "thank you for watching",
    "thanks for watching",
    "thank you so much for watching",
    "thank you for listening",
    "thanks for listening",
    "bye",
    "goodbye",
    "subscribe",
    "please subscribe",
    "the end",
    "subtitles by",
    "subtitles",
    "captions by",
    "amaraorg",
    "watching",
  ];

  if (englishHallucinations.includes(clean)) {
    return true;
  }

  return false;
}

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
  | "AI: WORKERS_AI"
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
  language?: string;
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

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

  // English & common subtitle credits / website URL / software metadata hallucinations
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
    "normaldotm",
    "microsoft office word",
    "msworddoc",
    "worddocument8",
    "worddocument",
    "please see the complete disclaimer",
    "please see the complete disclaimer at",
    "sitesgooglecom",
    "httpssitesgooglecom",
    "verbalink",
    "verbalinkcom",
    "wwwverbalinkcom",
    "page page of numpages",
    "page page of numpages wwwverbalinkcom",
    "this is an educational video",
    "to view this educational video simply click on the video",
    "uga extension office",
    "university of georgia college of agricultural",
    "for more information please visit wwwideaorg",
    "for more information visit wwwideaorg",
    "for more information please visit wwwideagov",
    "for more information visit wwwideagov",
    "for more information visit ideaorg",
    "for more information visit ideagov",
    "for more information please visit",
    "for more information visit",
    "please visit wwwideaorg",
    "visit wwwideaorg",
    "mdr",
    "manifestation determination review",
    "pwn",
    "prior written notice",
    "child find",
    "fape",
    "fba",
    "bip",
    "iee",
    "lea",
  ];

  if (
    englishHallucinations.includes(clean) ||
    clean.includes("thanks for watching") ||
    clean.includes("thank you for watching") ||
    clean.includes("watching this video") ||
    clean.includes("dont forget to subscribe") ||
    clean.includes("subscribe to my channel") ||
    clean.includes("normaldotm") ||
    clean.includes("microsoft office word") ||
    clean.includes("msworddoc") ||
    clean.includes("worddocument") ||
    clean.includes("edited-pjd") ||
    clean.includes("editedpjd") ||
    clean.includes("sites.google.com") ||
    clean.includes("sitesgooglecom") ||
    clean.includes("complete disclaimer") ||
    clean.includes("disclaimer at http") ||
    clean.includes("verbalink") ||
    clean.includes("page of numpages") ||
    clean.includes("educational video") ||
    clean.includes("uga extension") ||
    clean.includes("university of georgia") ||
    clean.includes("for more information visit") ||
    clean.includes("for more information please visit") ||
    clean.includes("visit wwwidea") ||
    clean.includes("visit ideagov") ||
    clean.includes("visit ideaorg") ||
    (clean.includes("for more information") && (clean.includes("ideaorg") || clean.includes("ideagov") || clean.includes("visit")))
  ) {
    return true;
  }

  // 1. Detect Whisper Acronym List Dumps (e.g., "IDEA, IEP, Section 504, MDR, FAPE, PWN, IEE, BIP, FBA, LEA...")
  const acronymList = ["idea", "iep", "section 504", "504", "mdr", "fape", "pwn", "iee", "bip", "fba", "lea"];
  const foundAcronyms = acronymList.filter((a) => clean.includes(a));
  if (
    foundAcronyms.length >= 4 &&
    !clean.includes(" is ") &&
    !clean.includes(" are ") &&
    !clean.includes(" have ") &&
    !clean.includes(" should ") &&
    !clean.includes(" question ") &&
    !clean.includes(" student ") &&
    !clean.includes(" school ")
  ) {
    return true;
  }

  // 2. Detect repeated single acronym / word loops (e.g. "IEP. IEP. IEP. IEP. IEP." or "504 504 504 504")
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 3) {
    const firstWord = words[0];
    if (words.every((w) => w === firstWord)) {
      return true;
    }
  }

  // 3. Detect Whisper Phrase Repetition Loops (e.g., "Independent Educational Evaluation Plan, Independent Educational Evaluation Plan")
  const parts = clean.split(/[,;\n\r]+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    for (let i = 0; i < parts.length - 1; i++) {
      if (parts[i].length > 10 && parts[i] === parts[i + 1]) {
        return true;
      }
    }
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
  applicablePrinciple?: string | null;
  distinctions?: string[] | null;
  conditions?: string[] | null;
  missingFacts?: string[] | null;
  suggestedClientWording?: string | null;
  advocateNextAction?: string | null;
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
  applicablePrinciple?: string;
  distinctions?: string[];
  conditions?: string[];
  missingFacts?: string[];
  suggestedClientWording?: string;
  advocateNextAction?: string;
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
    applicablePrinciple?: string;
    distinctions?: string[];
    missingFacts?: string[];
    suggestedClientWording?: string;
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
  guidanceFeed?: FirstMateGuidanceItem[];
  autoScroll?: boolean;
  askHistory?: FirstMateAskHistoryEntry[];
  devLogs: FirstMateDevLogEntry[];
}

export interface FirstMateGuidanceItem {
  id: string;
  sessionId: string;
  timestamp: number;
  source: "auto" | "ask" | "action";
  topicLabel?: string;
  heading?: string;
  content: string;
  sources?: RelatedSource[];
  suggestedClientWording?: string;
  expandedExplanation?: string;
  isExplainingMore?: boolean;
  isWordingVisible?: boolean;
  areSourcesVisible?: boolean;
  correctionNote?: string;
  confidence?: "High" | "Medium" | "Low";
  userQuestion?: string;
  triggerQuote?: string;
  provenanceMeta?: FirstMateProvenanceMeta;
}

export type TranscriptionProviderType = "assemblyai" | "whisper";

export interface AssemblyAiTokenResponse {
  token: string;
  expiresInSeconds: number;
}

export type GateDecision = "PASS" | "IGNORE";

export interface ResponseGateResult {
  decision: GateDecision;
  reason: string;
  isSubstantive: boolean;
  isBackchannel: boolean;
  isDuplicate: boolean;
  matchedKeywords?: string[];
}

/**
 * Reusable Waypoint special-education transcription vocabulary.
 * Boosts AssemblyAI recognition for special-education law, procedures, and clinical terminology.
 */
export const WAYPOINT_SPED_KEYTERMS: string[] = [
  "IDEA",
  "IEP",
  "Section 504",
  "504 Plan",
  "FAPE",
  "LRE",
  "Child Find",
  "FBA",
  "BIP",
  "MDR",
  "manifestation determination",
  "prior written notice",
  "PWN",
  "IEE",
  "independent educational evaluation",
  "reevaluation",
  "eligibility",
  "accommodations",
  "modifications",
  "paraprofessional",
  "occupational therapy",
  "OT",
  "physical therapy",
  "PT",
  "speech-language pathology",
  "SLP",
  "AAC",
  "assistive technology",
  "AT",
  "ESY",
  "extended school year",
  "functional behavior assessment",
  "behavior intervention plan",
  "procedural safeguards",
  "related services",
  "specific learning disability",
  "SLD",
  "other health impairment",
  "OHI",
  "dyslexia",
  "MTSS",
  "RTI",
  "progress monitoring",
  "baseline",
  "annual goal",
  "measurable annual goal",
  "present levels",
  "PLAAFP",
  "placement",
  "least restrictive environment",
  "comparable services",
  "transition services",
  "state complaint",
  "due process",
  "mediation",
  "facilitated IEP",
  "independent evaluator",
  "school psychologist",
  "BCBA",
  "behavior analyst",
];

/**
 * Supplements general Waypoint vocabulary with relevant case terms when available from Student Workspace
 */
export function buildCaseAwareKeyterms(session?: Partial<FirstMateSession>): string[] {
  const terms = new Set<string>(WAYPOINT_SPED_KEYTERMS);

  if (!session) return Array.from(terms);

  // Student name
  if (session.attachedName) terms.add(session.attachedName);
  if (session.sessionState?.studentName) terms.add(session.sessionState.studentName);

  // School & District
  if (session.sessionState?.school) terms.add(session.sessionState.school);
  if (session.sessionState?.district) terms.add(session.sessionState.district);

  // Suspected disabilities & diagnoses
  if (Array.isArray(session.sessionState?.suspectedDisabilities)) {
    session.sessionState.suspectedDisabilities.forEach((d) => {
      if (d && typeof d === "string") terms.add(d.trim());
    });
  }

  // Evaluations
  if (Array.isArray(session.sessionState?.evaluations)) {
    session.sessionState.evaluations.forEach((e) => {
      if (e && typeof e === "string") terms.add(e.trim());
    });
  }

  // Services & Accommodations
  if (Array.isArray(session.sessionState?.services)) {
    session.sessionState.services.forEach((s) => {
      if (s && typeof s === "string") terms.add(s.trim());
    });
  }

  return Array.from(terms);
}


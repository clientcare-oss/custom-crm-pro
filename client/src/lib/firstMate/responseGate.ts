import {
  isSilenceHallucination,
  type NormalizedTranscriptEvent,
  type ResponseGateResult,
} from "../../../../shared/firstMate";

/**
 * Common low-value conversational backchannels and conversational fillers
 */
const BACKCHANNEL_EXACT_PHRASES = new Set([
  "okay",
  "ok",
  "k",
  "yep",
  "yeah",
  "yes",
  "uhhuh",
  "uh huh",
  "right",
  "alright",
  "all right",
  "thank you",
  "thanks",
  "thank you so much",
  "sounds good",
  "got it",
  "sure",
  "cool",
  "mhm",
  "mmhmm",
  "mm hmm",
  "ah",
  "oh",
  "uh",
  "um",
  "i see",
  "understood",
  "no problem",
  "you're welcome",
  "great",
  "perfect",
  "good",
  "fine",
  "bye",
  "goodbye",
]);

/**
 * Routine meeting logistics phrases that do not warrant advocate intervention
 */
const LOGISTICS_PHRASES = [
  "let me pull that up",
  "give me a second",
  "one second",
  "just a moment",
  "can everyone hear me",
  "can you hear me",
  "hello can you hear me",
  "can you see my screen",
  "good morning everyone",
  "good afternoon everyone",
  "let me share my screen",
  "i am here",
  "i'm here",
  "testing one two",
  "mic check",
];

/**
 * High-impact substantive keywords. If any of these are present in a finalized turn,
 * the statement is treated as SUBSTANTIVE even if it is short (e.g. "We denied the evaluation.").
 */
const SUBSTANTIVE_KEYWORDS = [
  // Legal & Special-Ed Concepts
  "iep",
  "504",
  "section 504",
  "fape",
  "lre",
  "child find",
  "fba",
  "bip",
  "mdr",
  "manifestation",
  "pwn",
  "prior written notice",
  "iee",
  "independent educational evaluation",
  "reevaluation",
  "evaluation",
  "assess",
  "assessment",
  "eligibility",
  "accommodation",
  "modifications",
  "paraprofessional",
  "para",
  "speech",
  "slp",
  "occupational therapy",
  "ot",
  "physical therapy",
  "pt",
  "bcba",
  "behavior",
  "placement",
  "special education",
  "gen ed",
  "general education",
  "general ed",
  "resource room",
  "self-contained",
  "co-teach",
  "inclusion",
  "dyslexia",
  "autism",
  "adhd",
  "sld",
  "ohi",
  "minutes",
  "goals",
  "present levels",
  "plaafp",
  "transition",
  "compensatory",
  "due process",
  "state complaint",
  "safeguards",
  "procedural safeguards",
  "consent",
  // High-Impact Action & Dispute Verbs
  "denied",
  "deny",
  "refuse",
  "refused",
  "decline",
  "declined",
  "reject",
  "rejected",
  "reduce",
  "reducing",
  "reduction",
  "remove",
  "removed",
  "removal",
  "suspend",
  "suspended",
  "suspension",
  "expel",
  "expulsion",
  "agree",
  "agreed",
  "disagree",
  "disagreed",
  "dispute",
  "disputing",
  "request",
  "requested",
  "insist",
  "insisted",
  "promise",
  "promised",
  "commit",
  "committed",
  "propose",
  "proposed",
  "will not",
  "wont",
  "won't",
  "cannot",
  "can't",
  "not necessary",
  "no need",
  "data shows",
  "progress",
  "regression",
];

/**
 * Multi-word backchannel combinations and conversational fillers (ordered longest first)
 */
const BACKCHANNEL_MULTIWORD_LIST = [
  "thank you very much",
  "thank you so much",
  "thank you",
  "thanks a lot",
  "thanks so much",
  "thanks",
  "you're welcome",
  "you are welcome",
  "no problem",
  "sounds good",
  "sounds great",
  "all right",
  "alright",
  "uh huh",
  "uh-huh",
  "mm hmm",
  "mm-hmm",
  "mmhmm",
  "i see",
  "got it",
  "makes sense",
  "that makes sense",
  "okay",
  "ok",
  "k",
  "yep",
  "yeah",
  "yes",
  "right",
  "sure",
  "cool",
  "mhm",
  "ah",
  "oh",
  "uh",
  "um",
  "huh",
  "understood",
  "great",
  "perfect",
  "good",
  "fine",
  "bye",
  "goodbye",
  "hello",
  "hi",
  "hey",
];

export function isPurelyBackchannel(text: string): boolean {
  let remaining = (text || "").toLowerCase();
  for (const phrase of BACKCHANNEL_MULTIWORD_LIST) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");
    remaining = remaining.replace(regex, " ");
  }
  const cleanRemaining = remaining.replace(/[.,/#!$%^&*;:{}=\-_`~()？?！!"'\s]/g, "");
  return cleanRemaining.length === 0;
}

const INCOMPLETE_TRAILING_TOKENS = new Set([
  "because",
  "and",
  "or",
  "if",
  "so",
  "but",
  "although",
  "since",
]);

export function isTrailingIncompleteFragment(text: string): boolean {
  const trimmed = (text || "").trim();
  if (trimmed.endsWith("...") || trimmed.endsWith("—") || trimmed.endsWith("-")) {
    return true;
  }
  // If it ends with question mark or exclamation mark, it is a complete utterance
  if (trimmed.endsWith("?") || trimmed.endsWith("!")) {
    return false;
  }
  const cleanWords = cleanTextForGate(trimmed).split(" ").filter(Boolean);
  if (cleanWords.length > 0) {
    const lastWord = cleanWords[cleanWords.length - 1];
    if (INCOMPLETE_TRAILING_TOKENS.has(lastWord)) {
      return true;
    }
  }
  return false;
}

export function cleanTextForGate(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()？?！!"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Evaluates a finalized conversational turn before sending to OpenAI.
 * Determines whether the turn is substantive enough to warrant AI reasoning.
 */
export function evaluateMeaningfulTurn(
  turn: NormalizedTranscriptEvent | { text: string; speakerRole?: string },
  recentTurns: NormalizedTranscriptEvent[] = []
): ResponseGateResult {
  const rawText = (turn.text || "").trim();
  const clean = cleanTextForGate(rawText);

  // 1. Empty or virtually empty text
  if (!clean || clean.length < 2) {
    return {
      decision: "IGNORE",
      reason: "Empty or sub-2-character text",
      isSubstantive: false,
      isBackchannel: true,
      isDuplicate: false,
    };
  }

  // 2. Known Whisper silence / subtitle / software metadata hallucinations
  if (isSilenceHallucination(rawText, "en")) {
    return {
      decision: "IGNORE",
      reason: "Detected silence hallucination or metadata dump",
      isSubstantive: false,
      isBackchannel: false,
      isDuplicate: false,
    };
  }

  // 3. Duplicate Detection against recent finalized turns
  if (recentTurns.length > 0) {
    const recentWindow = recentTurns.slice(-6);
    for (const pastTurn of recentWindow) {
      // Don't compare a turn against itself!
      if (pastTurn === turn) continue;
      if ((turn as any).id && pastTurn.id && (turn as any).id === pastTurn.id) continue;

      const pastClean = cleanTextForGate(pastTurn.text);
      if (pastClean === clean) {
        return {
          decision: "IGNORE",
          reason: "Identical to recent finalized turn",
          isSubstantive: false,
          isBackchannel: false,
          isDuplicate: true,
        };
      }
    }
  }

  // 4. Backchannel Check (e.g. "Okay.", "Uh-huh. Right. Thank you.")
  if (isPurelyBackchannel(rawText)) {
    return {
      decision: "IGNORE",
      reason: `Compound or standalone backchannel acknowledgment ("${clean}")`,
      isSubstantive: false,
      isBackchannel: true,
      isDuplicate: false,
    };
  }

  // 5. Incomplete trailing fragment check (e.g. "We don't think an evaluation is necessary because...")
  // Wait for the full thought to complete before triggering advocate reasoning!
  if (isTrailingIncompleteFragment(rawText)) {
    return {
      decision: "IGNORE",
      reason: "Incomplete conversational clause ending with trailing conjunction or ellipsis",
      isSubstantive: false,
      isBackchannel: false,
      isDuplicate: false,
    };
  }

  // 6. Check for substantive special-education and dispute keywords
  const matchedKeywords: string[] = [];
  for (const kw of SUBSTANTIVE_KEYWORDS) {
    const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (regex.test(clean)) {
      matchedKeywords.push(kw);
    }
  }

  const hasSubstantiveKeywords = matchedKeywords.length > 0;

  // 7. Routine Logistics Check (only when no substantive special-ed keywords are present)
  for (const logPhrase of LOGISTICS_PHRASES) {
    if (clean.includes(logPhrase) && !hasSubstantiveKeywords) {
      return {
        decision: "IGNORE",
        reason: `Routine meeting logistics ("${logPhrase}")`,
        isSubstantive: false,
        isBackchannel: true,
        isDuplicate: false,
      };
    }
  }

  // 8. Substantive Statements: If has substantive keywords, immediately PASS!
  if (hasSubstantiveKeywords) {
    return {
      decision: "PASS",
      reason: `Contains substantive keywords: [${matchedKeywords.slice(0, 3).join(", ")}]`,
      isSubstantive: true,
      isBackchannel: false,
      isDuplicate: false,
      matchedKeywords,
    };
  }

  // 9. Statements without special-ed keywords:
  // If words < 4 and no substantive keyword, treat as brief conversational noise
  const words = clean.split(" ").filter(Boolean);
  if (words.length < 4) {
    return {
      decision: "IGNORE",
      reason: `Short non-substantive statement (${words.length} words)`,
      isSubstantive: false,
      isBackchannel: true,
      isDuplicate: false,
    };
  }

  // 10. Standard meaningful conversational statement
  return {
    decision: "PASS",
    reason: "Conversational statement eligible for First Mate review",
    isSubstantive: true,
    isBackchannel: false,
    isDuplicate: false,
  };
}

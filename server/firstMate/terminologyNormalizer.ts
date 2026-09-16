/**
 * Special Education Terminology Normalizer for First Mate.
 * 
 * Accurately interprets phonetic ASR approximations and transcription errors
 * (e.g., "child fine" -> "Child Find", "eye ee pee" -> "IEP", "five oh four" -> "Section 504")
 * using conversation context, while preserving the verbatim recorded transcript separately.
 */

export interface TerminologyNormalizationResult {
  normalizedText: string;
  detectedTerms: string[];
  corrections: Array<{ original: string; corrected: string; reason: string }>;
}

export const WHISPER_SPED_VOCABULARY_PROMPT =
  "The following is a clear transcript of a special education meeting discussing student progress, accommodations, evaluation requests, IEP goals, and school services.";

/**
 * Checks if the context or text indicates special education, disability law, or school meetings.
 */
function isSpEdContext(text: string, context: string = ""): boolean {
  const combined = `${text} ${context}`.toLowerCase();
  const spedKeywords = [
    "idea",
    "iep",
    "504",
    "special ed",
    "special education",
    "disability",
    "accommodat",
    "evaluation",
    "school",
    "district",
    "student",
    "advocate",
    "services",
    "placement",
    "suspens",
    "discipline",
    "fape",
    "manifestation",
    "mdr",
    "pwn",
    "speech",
    "ot",
    "slp",
    "bcba",
    "psychologist",
    "grades",
    "testing",
  ];
  return spedKeywords.some((k) => combined.includes(k));
}

/**
 * Normalizes speech transcript text for analysis and knowledge retrieval without altering the verbatim transcript.
 */
export function normalizeTranscriptText(
  text: string,
  surroundingContext: string = ""
): TerminologyNormalizationResult {
  if (!text) {
    return { normalizedText: "", detectedTerms: [], corrections: [] };
  }

  let normalized = text;
  const detectedTerms: string[] = [];
  const corrections: Array<{ original: string; corrected: string; reason: string }> = [];

  const contextActive = isSpEdContext(text, surroundingContext);

  // 0. Strip out Whisper ASR silence/trailing URL hallucinations (e.g. "For more information, visit www.idea.org.")
  const urlHallucinationRegex = /\s*(?:for\s+more\s+information,?\s*)?(?:please\s*)?visit\s+(?:www\.)?[a-z0-9-]+\.(?:org|gov|com|edu|net)\.?,?/gi;
  if (urlHallucinationRegex.test(normalized)) {
    normalized = normalized.replace(urlHallucinationRegex, "").trim();
  }

  // 1. "child fine" / "child fight" -> "Child Find"
  // When context includes IDEA, special ed, law, school, testing, or evaluation
  if (contextActive || /idea|law|school|eval|test|disabilit/i.test(text)) {
    const childFineRegex = /\bchild\s+(?:fine|fight|found|finds)\b/gi;
    if (childFineRegex.test(normalized)) {
      normalized = normalized.replace(childFineRegex, (match) => {
        corrections.push({
          original: match,
          corrected: "Child Find",
          reason: "Context indicates IDEA special education Child Find statutory mandate.",
        });
        return "Child Find";
      });
      detectedTerms.push("Child Find");
    }
  }

  // 2. "eye ee pee" / "i e p" / "eye-ee-pee" -> "IEP"
  const iepRegex = /\b(?:eye\s*ee\s*pee|eye-ee-pee|i\s*\.\s*e\s*\.\s*p\b|i\s+e\s+p\b)/gi;
  if (iepRegex.test(normalized)) {
    normalized = normalized.replace(iepRegex, (match) => {
      corrections.push({
        original: match,
        corrected: "IEP",
        reason: "Phonetic expansion of IEP acronym.",
      });
      return "IEP";
    });
    detectedTerms.push("IEP");
  }

  // 3. "five oh four" / "5 0 4" / "five-oh-four" -> "Section 504"
  const section504Regex = /\b(?:five\s*oh\s*four|five-oh-four|5\s*0\s*4)\b/gi;
  if (section504Regex.test(normalized)) {
    normalized = normalized.replace(section504Regex, (match) => {
      corrections.push({
        original: match,
        corrected: "Section 504",
        reason: "Spoken representation of Section 504 of the Rehabilitation Act.",
      });
      return "Section 504";
    });
    detectedTerms.push("Section 504");
  }

  // 4. "m d r" / "m.d.r." -> "MDR"
  const mdrRegex = /\b(?:m\s*\.\s*d\s*\.\s*r\b|m\s+d\s+r\b)/gi;
  if (mdrRegex.test(normalized)) {
    normalized = normalized.replace(mdrRegex, (match) => {
      corrections.push({
        original: match,
        corrected: "MDR",
        reason: "Acronym for Manifestation Determination Review.",
      });
      return "MDR";
    });
    detectedTerms.push("MDR");
  }

  // 5. "p w n" / "prior written notes" / "pre written notice" -> "Prior Written Notice"
  const pwnRegex = /\b(?:p\s*\.\s*w\s*\.\s*n\b|p\s+w\s+n\b|prior\s+written\s+notes|pre\s+written\s+notice)\b/gi;
  if (pwnRegex.test(normalized)) {
    normalized = normalized.replace(pwnRegex, (match) => {
      corrections.push({
        original: match,
        corrected: "Prior Written Notice",
        reason: "Prior Written Notice (PWN) procedural safeguard.",
      });
      return "Prior Written Notice";
    });
    detectedTerms.push("Prior Written Notice");
  }

  // 6. "f b a" / "f.b.a." -> "FBA"
  const fbaRegex = /\b(?:f\s*\.\s*b\s*\.\s*a\b|f\s+b\s+a\b)/gi;
  if (fbaRegex.test(normalized)) {
    normalized = normalized.replace(fbaRegex, (match) => {
      corrections.push({
        original: match,
        corrected: "FBA",
        reason: "Functional Behavioral Assessment acronym.",
      });
      return "FBA";
    });
    detectedTerms.push("FBA");
  }

  // 7. "b i p" / "b.i.p." -> "BIP"
  const bipRegex = /\b(?:b\s*\.\s*i\s*\.\s*p\b|b\s+i\s+p\b)/gi;
  if (bipRegex.test(normalized)) {
    normalized = normalized.replace(bipRegex, (match) => {
      corrections.push({
        original: match,
        corrected: "BIP",
        reason: "Behavior Intervention Plan acronym.",
      });
      return "BIP";
    });
    detectedTerms.push("BIP");
  }

  // 8. "i e e" / "i.e.e." -> "IEE"
  const ieeRegex = /\b(?:i\s*\.\s*e\s*\.\s*e\b|i\s+e\s+e\b)/gi;
  if (ieeRegex.test(normalized)) {
    normalized = normalized.replace(ieeRegex, (match) => {
      corrections.push({
        original: match,
        corrected: "IEE",
        reason: "Independent Educational Evaluation acronym.",
      });
      return "IEE";
    });
    detectedTerms.push("IEE");
  }

  // 9. "faith" -> "FAPE" when discussing denial, provision, or rights
  if (/\b(?:denial\s+of\s+faith|provide\s+faith|entitled\s+to\s+faith|right\s+to\s+faith)\b/i.test(normalized)) {
    normalized = normalized.replace(/\bfaith\b/gi, (match) => {
      corrections.push({
        original: match,
        corrected: "FAPE",
        reason: "Free Appropriate Public Education (FAPE) phonetic transcription error.",
      });
      return "FAPE";
    });
    detectedTerms.push("FAPE");
  }

  // Also collect already-present canonical terms
  const canonicalPatterns: Array<[RegExp, string]> = [
    [/\bChild Find\b/i, "Child Find"],
    [/\bIEP\b/i, "IEP"],
    [/\bSection 504\b/i, "Section 504"],
    [/\bMDR\b|\bManifestation\b/i, "MDR"],
    [/\bPrior Written Notice\b|\bPWN\b/i, "Prior Written Notice"],
    [/\bFBA\b/i, "FBA"],
    [/\bBIP\b/i, "BIP"],
    [/\bFAPE\b/i, "FAPE"],
    [/\bIEE\b/i, "IEE"],
    [/\b10\s*days?\b|\bten\s*days?\b/i, "10-Day Rule"],
    [/\bsuspension\b|\bexpulsion\b|\bremoval\b/i, "Disciplinary Removal"],
  ];

  for (const [pattern, term] of canonicalPatterns) {
    if (pattern.test(normalized) && !detectedTerms.includes(term)) {
      detectedTerms.push(term);
    }
  }

  return {
    normalizedText: normalized,
    detectedTerms,
    corrections,
  };
}

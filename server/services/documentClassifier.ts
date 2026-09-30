/**
 * Smart Document Identification & Classification Service
 * Automatically identifies document types, destination vault folders, extracted dates,
 * and whether a document represents a Current IEP or 504 Plan.
 */

export interface ClassifiedDocumentResult {
  documentType: string;
  category: string;
  categoryName: string;
  extractedDate: string | null;
  isCurrentPlanCandidate: boolean;
  confidence: "high" | "medium" | "low";
  suggestedTitle: string;
}

export function classifyDocument(fileName: string, snippetText?: string): ClassifiedDocumentResult {
  const lowerName = fileName.toLowerCase();
  const lowerSnippet = (snippetText || "").toLowerCase();
  const combined = `${lowerName} ${lowerSnippet}`;

  // 1. Date extraction heuristic
  let extractedDate: string | null = null;
  // Look for formats: YYYY-MM-DD, MM/DD/YYYY, Month DD YYYY, or just 4-digit years 2020-2030
  const isoMatch = combined.match(/\b(202[0-9]-[0-1][0-9]-[0-3][0-9])\b/);
  const slashMatch = combined.match(/\b([0-1]?[0-9][\/\-][0-3]?[0-9][\/\-](?:20)?2[0-9])\b/);
  const monthMatch = combined.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+([0-3]?[0-9]),?\s+(202[0-9])\b/i);
  const yearMatch = combined.match(/\b(202[0-9])\b/);

  if (monthMatch) {
    extractedDate = `${monthMatch[1].slice(0, 3)} ${monthMatch[2]}, ${monthMatch[3]}`;
  } else if (isoMatch) {
    extractedDate = isoMatch[1];
  } else if (slashMatch) {
    extractedDate = slashMatch[1];
  } else if (yearMatch) {
    extractedDate = yearMatch[1];
  }

  // 2. Classification rules
  // IEP vs 504
  if (combined.includes("504") || combined.includes("section 504") || combined.includes("accommodation plan")) {
    return {
      documentType: "504 Plan",
      category: "ieps-504s",
      categoryName: "IEPs & 504s",
      extractedDate,
      isCurrentPlanCandidate: true,
      confidence: "high",
      suggestedTitle: fileName,
    };
  }

  if (
    combined.includes("iep") ||
    combined.includes("individualized education") ||
    combined.includes("individual education") ||
    combined.includes("annual review")
  ) {
    return {
      documentType: "Current IEP",
      category: "ieps-504s",
      categoryName: "IEPs & 504s",
      extractedDate,
      isCurrentPlanCandidate: true,
      confidence: "high",
      suggestedTitle: fileName,
    };
  }

  // Functional Behavior Assessment & BIP
  if (
    combined.includes("fba") ||
    combined.includes("bip") ||
    combined.includes("functional behavior") ||
    combined.includes("behavior intervention") ||
    combined.includes("behavior plan")
  ) {
    return {
      documentType: "Behavior Plan (FBA / BIP)",
      category: "behavior-fba",
      categoryName: "Behavior / FBA / BIP",
      extractedDate,
      isCurrentPlanCandidate: false,
      confidence: "high",
      suggestedTitle: fileName,
    };
  }

  // Evaluations & Assessments
  if (
    combined.includes("eval") ||
    combined.includes("psychoed") ||
    combined.includes("psycho-ed") ||
    combined.includes("psychological") ||
    combined.includes("speech") ||
    combined.includes("occupational") ||
    combined.includes("ot assessment") ||
    combined.includes("pt assessment") ||
    combined.includes("assessment") ||
    combined.includes("wechsler") ||
    combined.includes("wj-") ||
    combined.includes("woodcock")
  ) {
    return {
      documentType: "Evaluation / Assessment",
      category: "evaluations",
      categoryName: "Evaluations",
      extractedDate,
      isCurrentPlanCandidate: false,
      confidence: "high",
      suggestedTitle: fileName,
    };
  }

  // Prior Written Notice (PWN)
  if (
    combined.includes("pwn") ||
    combined.includes("prior written notice") ||
    combined.includes("written notice")
  ) {
    return {
      documentType: "Prior Written Notice (PWN)",
      category: "communication",
      categoryName: "Communication & PWN",
      extractedDate,
      isCurrentPlanCandidate: false,
      confidence: "high",
      suggestedTitle: fileName,
    };
  }

  // Progress Reports
  if (
    combined.includes("progress report") ||
    combined.includes("goal progress") ||
    combined.includes("quarterly progress") ||
    combined.includes("progress mark")
  ) {
    return {
      documentType: "Progress Report",
      category: "progress-reports",
      categoryName: "Progress Reports",
      extractedDate,
      isCurrentPlanCandidate: false,
      confidence: "high",
      suggestedTitle: fileName,
    };
  }

  // School Records, Report Cards, Transcripts
  if (
    combined.includes("report card") ||
    combined.includes("transcript") ||
    combined.includes("grades") ||
    combined.includes("attendance") ||
    combined.includes("discipline") ||
    combined.includes("suspension") ||
    combined.includes("mdr")
  ) {
    return {
      documentType: "School Record / Report Card",
      category: "school-records",
      categoryName: "School Records",
      extractedDate,
      isCurrentPlanCandidate: false,
      confidence: "high",
      suggestedTitle: fileName,
    };
  }

  // Medical & Outside Therapy
  if (
    combined.includes("medical") ||
    combined.includes("doctor") ||
    combined.includes("pediatrician") ||
    combined.includes("neurolog") ||
    combined.includes("therapy") ||
    combined.includes("clinical") ||
    combined.includes("diagnosis")
  ) {
    return {
      documentType: "Medical & Therapy Records",
      category: "medical-therapy",
      categoryName: "Medical & Therapy",
      extractedDate,
      isCurrentPlanCandidate: false,
      confidence: "medium",
      suggestedTitle: fileName,
    };
  }

  // Fallback
  return {
    documentType: "General Student Document",
    category: "school-records",
    categoryName: "School Records",
    extractedDate,
    isCurrentPlanCandidate: false,
    confidence: "low",
    suggestedTitle: fileName,
  };
}

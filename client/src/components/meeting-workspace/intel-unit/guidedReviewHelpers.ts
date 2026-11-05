import type { IepIntelFinding } from "../types";
import {
  type IntelDocumentIndex,
  type IntelBoundingBox,
  sortFindingsInIepDocumentOrder,
} from "./intelUnitTypes";

function normalizeConservativeLocal(input: string): string {
  return input
    .replace(/[\u2018\u2019\u201A\u201B`']/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F"]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s*\|\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function findBoundingBoxesOnIndexedPage(
  textItems: Array<{ text: string; box: IntelBoundingBox }>,
  excerpt: string
): IntelBoundingBox[] {
  const normTarget = normalizeConservativeLocal(excerpt);
  if (!normTarget || textItems.length === 0) return [];

  const direct: IntelBoundingBox[] = [];
  for (const item of textItems) {
    const normItem = normalizeConservativeLocal(item.text);
    if (!normItem) continue;
    if (
      normItem.includes(normTarget) ||
      (normTarget.length >= 12 &&
        normItem.length >= 6 &&
        normTarget.includes(normItem))
    ) {
      direct.push(item.box);
    }
  }
  if (direct.length > 0) return direct.slice(0, 10);

  let combined = "";
  const offsets: Array<{ start: number; end: number; idx: number }> = [];
  for (let i = 0; i < textItems.length; i++) {
    const tok = normalizeConservativeLocal(textItems[i].text);
    if (!tok) continue;
    if (combined.length > 0) combined += " ";
    const start = combined.length;
    combined += tok;
    offsets.push({ start, end: combined.length, idx: i });
  }

  const matchIdx = combined.indexOf(normTarget);
  if (matchIdx === -1) return [];
  const matchEnd = matchIdx + normTarget.length;
  return offsets
    .filter((o) => o.end > matchIdx && o.start < matchEnd)
    .map((o) => textItems[o.idx].box)
    .slice(0, 10);
}

function classifyIepLineSection(line: string): {
  category: string;
  section: string;
  explanationPrefix: string;
  questionTemplate: (pageNum: number) => string;
} {
  const lower = line.toLowerCase();
  if (
    /\b(goal|mastery|criterion|consecutive|trials|by the end of the iep)\b/i.test(
      lower
    )
  ) {
    return {
      category: "Goals",
      section: "Annual Goals",
      explanationPrefix:
        "Annual goal or mastery criterion documented in the IEP",
      questionTemplate: (p) =>
        `Looking at the goal language on PDF page ${p}, what numeric baseline and progress monitoring schedule will track mastery?`,
    };
  }
  if (
    /\b(accommodat|extended time|preferential|small group|read aloud|headphones|sensory|break|visual schedule|cue)\b/i.test(
      lower
    )
  ) {
    return {
      category: "Accommodations",
      section: "Accommodations / Supports",
      explanationPrefix:
        "Instructional or testing accommodation provision documented in the IEP",
      questionTemplate: (p) =>
        `How will the accommodation on PDF page ${p} be implemented consistently across general and special education settings?`,
    };
  }
  if (
    /\b(service|minutes|weekly|monthly|consult|direct|therapy|speech|occupational|co-taught|resource)\b/i.test(
      lower
    )
  ) {
    return {
      category: "Services",
      section: "Related Services / Service Grid",
      explanationPrefix:
        "Special education or related service grid provision in the IEP",
      questionTemplate: (p) =>
        `Regarding the service provision on PDF page ${p}, is the documented frequency, duration, and setting sufficient to support annual goal progress?`,
    };
  }
  if (
    /\b(placement|least restrictive|lre|general education|regular class|separate class)\b/i.test(
      lower
    )
  ) {
    return {
      category: "Placement",
      section: "Placement / LRE",
      explanationPrefix:
        "Least Restrictive Environment (LRE) placement provision in the IEP",
      questionTemplate: (p) =>
        `How do the placement provisions on PDF page ${p} ensure maximum appropriate access to the general education environment?`,
    };
  }
  if (/\b(behavior|fba|bip|elopement|de-escalation|replacement)\b/i.test(lower)) {
    return {
      category: "Behavior supports",
      section: "Behavior Supports",
      explanationPrefix: "Behavioral observation or support provision in the IEP",
      questionTemplate: (p) =>
        `Based on the behavior notes on PDF page ${p}, what proactive positive behavior supports are in place?`,
    };
  }
  return {
    category: "Present levels",
    section: "Present Levels / Baselines",
    explanationPrefix:
      "Present Levels baseline, evaluation summary, or student performance data in the IEP",
    questionTemplate: (p) =>
      `How is the baseline data on PDF page ${p} connected to measurable annual goals and classroom accommodations in this IEP?`,
  };
}

/**
 * Deterministically builds source-verified, document-ordered Guided Review suggestions
 * directly from the indexed Current IEP pages and any active evaluation comparison connections.
 */
export function buildGuidedReviewSequence(params: {
  savedFindings: IepIntelFinding[];
  documentIndex: IntelDocumentIndex | null;
  comparisonConnections?: Array<{
    id: string;
    iepSection: string;
    evalFindingOrRecommendation: string;
    status: "Addressed" | "Partially addressed" | "Not located" | "Needs review";
    explanation: string;
    proposedMeetingQuestion: string;
    evalSource: {
      fileId: number;
      fileName: string;
      recordGroup: "school_evaluation" | "outside_evaluation";
      documentDate: string | null;
      pdfPageNumber: number | null;
      printedPageLabel: string | null;
      excerpt: string;
      boundingBoxes: IntelBoundingBox[];
      verificationStatus: "verified" | "page_only" | "unverified";
    };
    iepPassage: {
      fileId: number;
      fileName: string;
      documentDate: string | null;
      pdfPageNumber: number | null;
      printedPageLabel: string | null;
      excerpt: string | null;
      boundingBoxes: IntelBoundingBox[];
      verificationStatus: "verified" | "page_only" | "unverified";
    } | null;
  }>;
  decisionsMap: Record<
    string,
    "pending" | "saved" | "reviewed" | "dismissed"
  >;
}): IepIntelFinding[] {
  const {
    savedFindings,
    documentIndex,
    comparisonConnections = [],
    decisionsMap,
  } = params;

  const byId = new Map<string, IepIntelFinding>();
  const seenExcerpts = new Set<string>();

  // 1. Keep all advocate-saved findings first (preserving user edits)
  for (const f of savedFindings) {
    const decision =
      decisionsMap[f.id] ||
      f.reviewDecision ||
      (f.status === "dismiss"
        ? "dismissed"
        : f.advocateConfirmed
        ? "saved"
        : "pending");
    byId.set(f.id, {
      ...f,
      reviewDecision: decision,
    });
    if (f.sourceRef?.excerpt) {
      seenExcerpts.add(
        `${f.sourceRef.pdfPageNumber || 0}:${normalizeConservativeLocal(
          f.sourceRef.excerpt
        ).slice(0, 60)}`
      );
    }
  }

  // Find representative section pages in the Current IEP for "Not located" evaluation items
  const sectionPageMap = new Map<string, number>();
  if (documentIndex?.pages) {
    for (const page of documentIndex.pages) {
      if (!page.extractedText) continue;
      const cls = classifyIepLineSection(page.extractedText);
      if (!sectionPageMap.has(cls.category.toLowerCase())) {
        sectionPageMap.set(cls.category.toLowerCase(), page.pdfPageNumber);
      }
    }
  }

  // 2. Extract salient document-ordered passages directly from the indexed Current IEP
  if (documentIndex?.pages && documentIndex.readablePageCount > 0) {
    for (const page of documentIndex.pages) {
      if (!page.extractedText) continue;
      const lines = page.extractedText
        .split(/\n|(?<=[.?!])\s+/)
        .map((l) => l.replace(/\s+/g, " ").trim())
        .filter(
          (l) =>
            l.length >= 28 &&
            l.length <= 240 &&
            !/^(page \d+|paulding county|\d+ of \d+)/i.test(l)
        );

      let addedOnPage = 0;
      for (const line of lines) {
        const isSalient =
          /\b(\d+%|\d{2,3}|wj-iv|baseline|accuracy|multiplication|comprehension|goal|accommodat|service|minutes|placement|behavior|evaluation|assessed)\b/i.test(
            line
          );
        if (!isSalient && documentIndex.pageCount > 4) continue;

        const key = `${page.pdfPageNumber}:${normalizeConservativeLocal(
          line
        ).slice(0, 60)}`;
        if (seenExcerpts.has(key)) continue;
        seenExcerpts.add(key);

        const boxes = findBoundingBoxesOnIndexedPage(page.textItems, line);
        const cls = classifyIepLineSection(line);
        const syntheticId = `guided-iep-${documentIndex.fileId}-p${
          page.pdfPageNumber
        }-${addedOnPage + 1}`;

        if (!byId.has(syntheticId) && !byId.has(`fnd-${syntheticId}`)) {
          const decision = decisionsMap[syntheticId] || "pending";
          byId.set(syntheticId, {
            id: syntheticId,
            category: cls.category,
            section: cls.section,
            text: `${cls.explanationPrefix} on PDF p. ${page.pdfPageNumber}: "${line}"`,
            quote: `PDF p. ${page.pdfPageNumber}: "${line}"`,
            status: decision === "dismissed" ? "dismiss" : "keep",
            aiGeneratedDraft: true,
            advocateConfirmed: decision === "saved",
            reviewDecision: decision,
            proposedQuestion: cls.questionTemplate(page.pdfPageNumber),
            sourceRef: {
              documentId: documentIndex.fileId,
              fileName: documentIndex.fileName,
              contentFingerprint: documentIndex.contentFingerprint,
              pdfPageNumber: page.pdfPageNumber,
              printedPageLabel: page.printedPageLabel,
              excerpt: line,
              boundingBoxes: boxes,
              verificationStatus: boxes.length > 0 ? "verified" : "page_only",
            },
          });
        }

        addedOnPage++;
        if (addedOnPage >= 2) break;
      }
    }
  }

  // 3. Include evaluation-to-IEP comparison connections (both located and "Not located")
  for (const conn of comparisonConnections) {
    const fndId = `fnd-${conn.id}`;
    if (byId.has(fndId)) continue;
    const decision = decisionsMap[fndId] || "pending";
    const relevantSectionPage =
      conn.iepPassage?.pdfPageNumber ||
      sectionPageMap.get(conn.iepSection.toLowerCase()) ||
      (documentIndex?.pageCount ? 1 : null);

    byId.set(fndId, {
      id: fndId,
      category: conn.iepSection,
      section: conn.iepSection,
      text: `${conn.evalFindingOrRecommendation} — ${conn.explanation}`,
      quote: conn.iepPassage?.excerpt
        ? `Current IEP p. ${conn.iepPassage.pdfPageNumber}: "${conn.iepPassage.excerpt}"`
        : `${conn.evalSource.fileName} p. ${
            conn.evalSource.pdfPageNumber || 1
          }: "${conn.evalSource.excerpt}"`,
      status: decision === "dismissed" ? "dismiss" : "keep",
      aiGeneratedDraft: true,
      advocateConfirmed: decision === "saved",
      reviewDecision: decision,
      proposedQuestion: conn.proposedMeetingQuestion,
      iepLocateStatus: conn.status,
      relevantIepSectionPage: relevantSectionPage,
      sourceRef: conn.iepPassage
        ? {
            documentId: conn.iepPassage.fileId,
            fileName: conn.iepPassage.fileName,
            pdfPageNumber: conn.iepPassage.pdfPageNumber,
            printedPageLabel: conn.iepPassage.printedPageLabel,
            excerpt: conn.iepPassage.excerpt,
            boundingBoxes: conn.iepPassage.boundingBoxes,
            verificationStatus: conn.iepPassage.verificationStatus,
          }
        : undefined,
      evalSourceRef: {
        documentId: conn.evalSource.fileId,
        fileName: conn.evalSource.fileName,
        recordGroup: conn.evalSource.recordGroup,
        documentDate: conn.evalSource.documentDate,
        pdfPageNumber: conn.evalSource.pdfPageNumber,
        printedPageLabel: conn.evalSource.printedPageLabel,
        excerpt: conn.evalSource.excerpt,
        boundingBoxes: conn.evalSource.boundingBoxes,
        verificationStatus: conn.evalSource.verificationStatus,
      },
    });
  }

  return sortFindingsInIepDocumentOrder(
    Array.from(byId.values()),
    documentIndex?.fileId ?? null
  );
}


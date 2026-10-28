/**
 * Waypoint Advocates — Federal Education Law & Guidance Domain Engine
 * Handles retrieval, searching, bidirectional cross-referencing, case note recording,
 * and First Mate legal assistance for Federal Education Law and Official Guidance.
 */

import * as db from "../db";
import { recordCaseActivity } from "../services/caseActivityService";
import type {
  FederalLegalProvisionData,
} from "../../shared/federalEducationLawData";
import type {
  FederalGuidanceDocumentData,
  GuidanceLawLinkData,
} from "../../shared/federalGuidanceArchiveData";
import type { LegalReference } from "../../shared/stateEducationLawData";

// In-memory runtime cache for Cloudflare Worker CPU optimization
let memoryProvisions: FederalLegalProvisionData[] | null = null;
let memoryGuidance: FederalGuidanceDocumentData[] | null = null;
let memoryLinks: GuidanceLawLinkData[] | null = null;

export async function getFederalCompendium() {
  if (!memoryProvisions || !memoryGuidance || !memoryLinks) {
    const lawData = await import("../../shared/federalEducationLawData");
    const guidanceData = await import("../../shared/federalGuidanceArchiveData");

    memoryProvisions = [...lawData.VERIFIED_FEDERAL_LEGAL_PROVISIONS];
    memoryGuidance = [...guidanceData.VERIFIED_FEDERAL_GUIDANCE_DOCUMENTS];
    memoryLinks = [...guidanceData.VERIFIED_GUIDANCE_LAW_LINKS];
  }

  return {
    provisions: memoryProvisions,
    guidance: memoryGuidance,
    links: memoryLinks,
  };
}

/**
 * List federal legal provisions with multi-dimensional filtering
 */
export async function listFederalProvisions(filter?: {
  act?: string;
  subpart?: string;
  topic?: string;
  search?: string;
  authorityType?: string;
}) {
  const { provisions } = await getFederalCompendium();
  let results = [...provisions];

  if (filter?.act && filter.act !== "All") {
    results = results.filter((p) => p.act === filter.act);
  }

  if (filter?.subpart && filter.subpart !== "All") {
    results = results.filter((p) => p.subpart === filter.subpart);
  }

  if (filter?.authorityType && filter.authorityType !== "All") {
    results = results.filter((p) => p.authorityType === filter.authorityType);
  }

  if (filter?.topic && filter.topic !== "All") {
    results = results.filter((p) => p.topics.includes(filter.topic!));
  }

  if (filter?.search && filter.search.trim()) {
    const terms = filter.search.toLowerCase().trim().split(/\s+/).filter(Boolean);
    results = results.filter((p) => {
      const haystack = [
        p.title,
        p.sectionCitation,
        p.plainLanguageExplanation,
        p.act,
        p.subpart,
        p.advocacyTips,
        ...(p.keyPoints || []),
        ...(p.topics || []),
      ]
        .join(" ")
        .toLowerCase();

      return terms.every((t) => haystack.includes(t));
    });
  }

  return results;
}

/**
 * Get a single federal provision by ID with attached related guidance documents
 */
export async function getFederalProvisionById(id: string) {
  const { provisions, guidance, links } = await getFederalCompendium();
  const provision = provisions.find((p) => p.id === id);
  if (!provision) return null;

  // Find related guidance documents
  const matchingLinks = links.filter(
    (l) => l.provisionId === id || l.sectionCitation === provision.sectionCitation
  );
  const matchingGuidanceIds = new Set(matchingLinks.map((l) => l.guidanceId));

  // Also match by section citation mentions in guidance.relatedCitations
  guidance.forEach((g) => {
    if (g.relatedCitations.some((c) => c.includes(provision.sectionCitation) || provision.sectionCitation.includes(c))) {
      matchingGuidanceIds.add(g.id);
    }
  });

  const relatedGuidance = guidance
    .filter((g) => matchingGuidanceIds.has(g.id))
    .map((g) => {
      const link = matchingLinks.find((l) => l.guidanceId === g.id);
      return {
        ...g,
        relationshipType: link?.relationshipType || "interprets",
        relationshipNotes: link?.notes || undefined,
      };
    });

  return {
    ...provision,
    relatedGuidance,
  };
}

/**
 * List federal guidance documents with rich filtering
 */
export async function listFederalGuidance(filter?: {
  issuingOffice?: string;
  documentType?: string;
  year?: number;
  topic?: string;
  search?: string;
  guidanceStatus?: string;
}) {
  const { guidance } = await getFederalCompendium();
  let results = [...guidance];

  if (filter?.issuingOffice && filter.issuingOffice !== "All") {
    results = results.filter((g) => g.issuingOffice === filter.issuingOffice);
  }

  if (filter?.documentType && filter.documentType !== "All") {
    results = results.filter((g) => g.documentType === filter.documentType);
  }

  if (filter?.guidanceStatus && filter.guidanceStatus !== "All") {
    results = results.filter((g) => g.guidanceStatus === filter.guidanceStatus);
  }

  if (filter?.year) {
    results = results.filter((g) => g.publicationYear === filter.year);
  }

  if (filter?.topic && filter.topic !== "All") {
    results = results.filter((g) => g.topics.includes(filter.topic!));
  }

  if (filter?.search && filter.search.trim()) {
    const terms = filter.search.toLowerCase().trim().split(/\s+/).filter(Boolean);
    results = results.filter((g) => {
      const haystack = [
        g.title,
        g.documentNumber || "",
        g.summary,
        g.issuingOffice,
        g.documentType,
        g.guidanceStatus,
        g.publicationYear.toString(),
        ...(g.relatedLaws || []),
        ...(g.relatedCitations || []),
        ...(g.keyPoints || []),
        ...(g.topics || []),
      ]
        .join(" ")
        .toLowerCase();

      return terms.every((t) => haystack.includes(t));
    });
  }

  return results;
}

/**
 * Get a single federal guidance document by ID with attached related federal law provisions
 */
export async function getFederalGuidanceById(id: string) {
  const { guidance, provisions, links } = await getFederalCompendium();
  const doc = guidance.find((g) => g.id === id);
  if (!doc) return null;

  // Find linked provisions
  const matchingLinks = links.filter((l) => l.guidanceId === id);
  const matchingProvisionIds = new Set(matchingLinks.map((l) => l.provisionId));

  // Also match by citations in doc.relatedCitations
  provisions.forEach((p) => {
    if (doc.relatedCitations.some((c) => c.includes(p.sectionCitation) || p.sectionCitation.includes(c))) {
      matchingProvisionIds.add(p.id);
    }
  });

  const relatedProvisions = provisions
    .filter((p) => matchingProvisionIds.has(p.id))
    .map((p) => {
      const link = matchingLinks.find((l) => l.provisionId === p.id);
      return {
        ...p,
        relationshipType: link?.relationshipType || "interprets",
        relationshipNotes: link?.notes || undefined,
      };
    });

  return {
    ...doc,
    relatedProvisions,
  };
}

/**
 * Unified cross-jurisdiction legal search: State Law + Federal Law + Federal Guidance
 */
export interface UnifiedSearchResult {
  id: string;
  sourceCategory: "federal_law" | "federal_guidance" | "state_law";
  authorityType:
    | "Binding Statute"
    | "Binding Federal Regulation"
    | "Official Agency Guidance"
    | "Historical Guidance"
    | "State Law / Regulation";
  isBindingLaw: boolean;
  jurisdiction: string; // e.g. "Federal", "GA", "TX", "ED / OSEP", "OCR"
  title: string;
  citation: string;
  summary: string;
  officialUrl: string;
  pdfUrl?: string;
  topics: string[];
  status: string;
  relevanceScore: number;
}

export async function unifiedLegalSearch(params: {
  query: string;
  categoryFilter?: "all" | "federal_law" | "federal_guidance" | "state_law";
  authorityFilter?: "all" | "binding_only" | "guidance_only";
  jurisdictionFilter?: string; // "all", "US", "GA", "TX", etc.
  limit?: number;
}) {
  const { provisions, guidance } = await getFederalCompendium();
  const stateData = await import("../../shared/stateEducationLawData");
  const stateReferences = stateData.VERIFIED_LEGAL_REFERENCES;

  const rawQuery = params.query.toLowerCase().trim();
  const terms = rawQuery.split(/\s+/).filter(Boolean);
  const results: UnifiedSearchResult[] = [];

  // Helper score calculator
  function computeScore(title: string, citation: string, summary: string, topics: string[]): number {
    if (!terms.length) return 1;
    let score = 0;
    const lowerTitle = title.toLowerCase();
    const lowerCitation = citation.toLowerCase();
    const lowerSummary = summary.toLowerCase();

    if (lowerCitation.includes(rawQuery)) score += 50;
    if (lowerTitle.includes(rawQuery)) score += 30;

    for (const term of terms) {
      if (lowerCitation.includes(term)) score += 15;
      if (lowerTitle.includes(term)) score += 10;
      if (lowerSummary.includes(term)) score += 5;
      if (topics.some((t) => t.toLowerCase().includes(term))) score += 8;
    }
    return score;
  }

  // 1. Process Federal Law Provisions
  if (!params.categoryFilter || params.categoryFilter === "all" || params.categoryFilter === "federal_law") {
    if (params.authorityFilter !== "guidance_only") {
      if (!params.jurisdictionFilter || params.jurisdictionFilter === "all" || params.jurisdictionFilter === "US") {
        for (const prov of provisions) {
          const score = computeScore(prov.title, prov.sectionCitation, prov.plainLanguageExplanation, prov.topics);
          if (score > 0 || !terms.length) {
            results.push({
              id: prov.id,
              sourceCategory: "federal_law",
              authorityType: prov.authorityType === "Statute" ? "Binding Statute" : "Binding Federal Regulation",
              isBindingLaw: true,
              jurisdiction: "Federal Law",
              title: prov.title,
              citation: prov.sectionCitation,
              summary: prov.plainLanguageExplanation,
              officialUrl: prov.officialUrl,
              topics: prov.topics,
              status: prov.verificationStatus,
              relevanceScore: score,
            });
          }
        }
      }
    }
  }

  // 2. Process Federal Guidance Documents
  if (!params.categoryFilter || params.categoryFilter === "all" || params.categoryFilter === "federal_guidance") {
    if (params.authorityFilter !== "binding_only") {
      if (!params.jurisdictionFilter || params.jurisdictionFilter === "all" || params.jurisdictionFilter === "US") {
        for (const doc of guidance) {
          const score = computeScore(doc.title, doc.documentNumber || doc.issuingOffice, doc.summary, doc.topics);
          if (score > 0 || !terms.length) {
            const isHistorical = doc.guidanceStatus === "Historical" || doc.guidanceStatus.includes("Withdrawn");
            results.push({
              id: doc.id,
              sourceCategory: "federal_guidance",
              authorityType: isHistorical ? "Historical Guidance" : "Official Agency Guidance",
              isBindingLaw: false,
              jurisdiction: `${doc.issuingOffice} (${doc.publicationYear})`,
              title: doc.title,
              citation: doc.documentNumber || `${doc.documentType} (${doc.dateIssued})`,
              summary: doc.summary,
              officialUrl: doc.officialSourceUrl,
              pdfUrl: doc.pdfUrl,
              topics: doc.topics,
              status: doc.guidanceStatus,
              relevanceScore: score,
            });
          }
        }
      }
    }
  }

  // 3. Process State Law References
  if (!params.categoryFilter || params.categoryFilter === "all" || params.categoryFilter === "state_law") {
    if (params.authorityFilter !== "guidance_only") {
      for (const ref of stateReferences) {
        if (
          params.jurisdictionFilter &&
          params.jurisdictionFilter !== "all" &&
          ref.state.toUpperCase() !== params.jurisdictionFilter.toUpperCase()
        ) {
          continue;
        }

        const score = computeScore(ref.title, ref.citation, ref.plainLanguageExplanation, [ref.category]);
        if (score > 0 || !terms.length) {
          results.push({
            id: ref.id,
            sourceCategory: "state_law",
            authorityType: "State Law / Regulation",
            isBindingLaw: true,
            jurisdiction: `${ref.stateName} (${ref.state})`,
            title: ref.title,
            citation: ref.citation,
            summary: ref.plainLanguageExplanation,
            officialUrl: ref.officialUrl,
            topics: [ref.category],
            status: ref.verificationStatus,
            relevanceScore: score,
          });
        }
      }
    }
  }

  // Sort by relevance score descending
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);

  const limit = params.limit || 50;
  return results.slice(0, limit);
}

/**
 * Save federal legal provision to student case notes and timeline
 */
export async function saveFederalProvisionToCaseNote(params: {
  studentContactId: number;
  provisionId: string;
  advocateCustomNote?: string;
}) {
  const provision = await getFederalProvisionById(params.provisionId);
  if (!provision) {
    throw new Error(`Federal legal provision ${params.provisionId} not found.`);
  }

  const database = await db.getDb();
  if (!database) {
    throw new Error("Database unavailable");
  }

  const { contacts } = await import("../../drizzle/schema");
  const { eq: dbEq } = await import("drizzle-orm");

  const [student] = await database
    .select()
    .from(contacts)
    .where(dbEq(contacts.id, params.studentContactId));

  if (!student) {
    throw new Error(`Student contact ${params.studentContactId} not found.`);
  }

  const nowStr = new Date().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const formattedNote = [
    `\n\n[FEDERAL LEGAL CITATION — ${nowStr}]`,
    `Authority: ${provision.sectionCitation} (${provision.act} — ${provision.authorityType})`,
    `Title: ${provision.title}`,
    `Explanation: ${provision.plainLanguageExplanation}`,
    provision.statutoryTimeline ? `Statutory Timeline: ${provision.statutoryTimeline}` : null,
    params.advocateCustomNote ? `Advocate Case Context: ${params.advocateCustomNote}` : null,
    `Official Source: ${provision.officialUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const existingNotes = student.notes || "";
  const updatedNotes = existingNotes ? `${existingNotes}\n${formattedNote}` : formattedNote;

  await database
    .update(contacts)
    .set({ notes: updatedNotes })
    .where(dbEq(contacts.id, params.studentContactId));

  try {
    await recordCaseActivity({
      studentContactId: params.studentContactId,
      caseId: student.caseId || `WP-${params.studentContactId}`,
      eventType: "note",
      title: `Federal Authority Cited: ${provision.sectionCitation}`,
      description: `${provision.title}\n\n${provision.plainLanguageExplanation}${
        params.advocateCustomNote ? `\n\nAdvocate Context: ${params.advocateCustomNote}` : ""
      }\n\nOfficial Source: ${provision.officialUrl}`,
      whyReason: `Referenced binding federal legal authority (${provision.sectionCitation}) in student workspace.`,
      ownerName: "Lead Advocate",
      ownerRole: "Special Education Advocate",
      sources: [
        {
          type: "document",
          label: provision.sectionCitation,
          url: provision.officialUrl,
          excerpt: provision.title,
        },
      ],
      isActionNeeded: false,
      isCompleted: true,
      categoryColor: "blue",
    });
  } catch (err) {
    console.warn("[saveFederalProvisionToCaseNote] Timeline event notice:", err);
  }

  return {
    success: true,
    studentName: `${student.firstName} ${student.lastName}`.trim(),
    citation: provision.sectionCitation,
  };
}

/**
 * Save federal guidance document citation to student case notes and timeline
 */
export async function saveFederalGuidanceToCaseNote(params: {
  studentContactId: number;
  guidanceId: string;
  advocateCustomNote?: string;
}) {
  const guidance = await getFederalGuidanceById(params.guidanceId);
  if (!guidance) {
    throw new Error(`Federal guidance document ${params.guidanceId} not found.`);
  }

  const database = await db.getDb();
  if (!database) {
    throw new Error("Database unavailable");
  }

  const { contacts } = await import("../../drizzle/schema");
  const { eq: dbEq } = await import("drizzle-orm");

  const [student] = await database
    .select()
    .from(contacts)
    .where(dbEq(contacts.id, params.studentContactId));

  if (!student) {
    throw new Error(`Student contact ${params.studentContactId} not found.`);
  }

  const nowStr = new Date().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const formattedNote = [
    `\n\n[FEDERAL GUIDANCE CITATION — ${nowStr}]`,
    `Issuing Office: ${guidance.issuingOffice} (${guidance.dateIssued})`,
    `Document: ${guidance.title}`,
    guidance.documentNumber ? `Reference: ${guidance.documentNumber}` : null,
    `Status: ${guidance.guidanceStatus}`,
    `Summary: ${guidance.summary}`,
    params.advocateCustomNote ? `Advocate Case Context: ${params.advocateCustomNote}` : null,
    `Official Source: ${guidance.officialSourceUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const existingNotes = student.notes || "";
  const updatedNotes = existingNotes ? `${existingNotes}\n${formattedNote}` : formattedNote;

  await database
    .update(contacts)
    .set({ notes: updatedNotes })
    .where(dbEq(contacts.id, params.studentContactId));

  try {
    await recordCaseActivity({
      studentContactId: params.studentContactId,
      caseId: student.caseId || `WP-${params.studentContactId}`,
      eventType: "note",
      title: `Federal Guidance Cited: ${guidance.issuingOffice} (${guidance.publicationYear})`,
      description: `${guidance.title}\n\n${guidance.summary}${
        params.advocateCustomNote ? `\n\nAdvocate Context: ${params.advocateCustomNote}` : ""
      }\n\nOfficial Source: ${guidance.officialSourceUrl}`,
      whyReason: `Referenced official agency guidance (${guidance.issuingOffice}) in student workspace. Note: Agency guidance clarifies policy but does not independently establish new statutory obligations.`,
      ownerName: "Lead Advocate",
      ownerRole: "Special Education Advocate",
      sources: [
        {
          type: "document",
          label: guidance.documentNumber || guidance.title,
          url: guidance.officialSourceUrl,
          excerpt: guidance.summary.slice(0, 150),
        },
      ],
      isActionNeeded: false,
      isCompleted: true,
      categoryColor: "purple",
    });
  } catch (err) {
    console.warn("[saveFederalGuidanceToCaseNote] Timeline event notice:", err);
  }

  return {
    success: true,
    studentName: `${student.firstName} ${student.lastName}`.trim(),
    title: guidance.title,
  };
}

/**
 * Admin: Upsert Federal Guidance Document
 */
export async function upsertFederalGuidance(data: Partial<FederalGuidanceDocumentData> & { id: string; title: string }) {
  const { guidance } = await getFederalCompendium();
  const existingIdx = guidance.findIndex((g) => g.id === data.id);

  const merged: FederalGuidanceDocumentData = {
    id: data.id,
    documentNumber: data.documentNumber,
    title: data.title,
    issuingOffice: data.issuingOffice || "OSEP",
    dateIssued: data.dateIssued || new Date().toISOString().slice(0, 10),
    publicationYear: data.publicationYear || new Date().getFullYear(),
    documentType: data.documentType || "Dear Colleague Letter",
    relatedLaws: data.relatedLaws || ["IDEA Part B"],
    relatedCitations: data.relatedCitations || [],
    summary: data.summary || "",
    keyPoints: data.keyPoints || [],
    officialSourceUrl: data.officialSourceUrl || "https://sites.ed.gov/idea/",
    pdfUrl: data.pdfUrl,
    topics: data.topics || ["FAPE"],
    guidanceStatus: data.guidanceStatus || "Current / Verified",
    statusNotice: data.statusNotice,
    supersededBy: data.supersededBy,
    rescissionDate: data.rescissionDate,
    lastVerifiedDate: data.lastVerifiedDate || new Date().toISOString().slice(0, 10),
    verificationNotes: data.verificationNotes,
  };

  if (existingIdx >= 0) {
    guidance[existingIdx] = merged;
  } else {
    guidance.push(merged);
  }

  return merged;
}

/**
 * First Mate live meeting legal assist retrieval:
 * Retrieves verified federal authorities and explicitly marks binding vs non-binding guidance
 */
export async function firstMateFederalSearch(query: string) {
  const searchResults = await unifiedLegalSearch({
    query,
    limit: 6,
  });

  return {
    query,
    totalMatches: searchResults.length,
    results: searchResults.map((r) => ({
      title: r.title,
      citation: r.citation,
      authorityType: r.authorityType,
      isBindingLaw: r.isBindingLaw,
      legalStatusText: r.isBindingLaw
        ? "BINDING LEGAL AUTHORITY (Statute / Federal Regulation)"
        : `OFFICIAL AGENCY GUIDANCE (${r.status}) — Does not independently create new legal obligations`,
      summary: r.summary,
      officialSource: r.officialUrl,
      topics: r.topics,
    })),
  };
}

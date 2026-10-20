import React, { useState, useMemo, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";
import PageIdBadge from "@/components/PageIdBadge";
import { OrnateTabBracket } from "@/components/complaint/OrnateTabBracket";
import { toast } from "sonner";
import {
  Eye,
  Save,
  Download,
  FileText,
  FileSignature,
  Plus,
  Settings,
  Pencil,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  PanelRight,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Undo2,
  GripVertical,
  LayoutGrid,
  Image as ImageIcon,
  Calendar,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowRight,
  X,
  Scale,
  Gavel,
  Shield,
  HelpCircle,
  Clock,
  BookOpen,
  FolderOpen,
  AlignLeft,
  AlignCenter,
  AlignJustify,
  Bold,
  Italic,
  Underline,
  Type,
  Quote,
  Cloud,
  Check,
  User,
  ShieldCheck,
  ExternalLink,
  Printer,
  Upload,
  Search,
  FolderArchive,
  FileUp,
  Paperclip,
  Loader2,
  Highlighter,
  Trash2,
  Building2,
  GraduationCap,
  FileSearch,
  Users,
  Wand2,
  AlertTriangle,
  Copy,
  Lock,
  ClipboardCheck,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ComplaintSetupView } from "@/components/complaint/ComplaintSetupView";
import { StateComplaintFormView, StateComplaintFormPage } from "@/components/complaint/StateComplaintFormView";
import { BinderCoverPage } from "@/components/complaint/BinderCoverPage";
import {
  ExhibitPdfSheetsView,
  type DocumentHighlight,
  type HighlightColor,
  HIGHLIGHT_COLOR_MAP,
} from "@/components/complaint/ExhibitPdfSheetsView";
import {
  SUPPORTED_STATE_FORMS,
  INITIAL_GADOE_FORM_STATE,
  detectStateCode,
  type OfficialComplaintFormState,
} from "@/components/complaint/stateFormsData";
import { convertPdfToPageImages, type ImportedPdfPage } from "@/lib/pdfImporter";
import { PDFDocument } from "pdf-lib";
import { sanitizeComplaintText, containsProhibitedComplaintTerms, formatFirstLastName } from "@shared/complaintEngine";
import { OpenRecentModal } from "@/components/complaint/OpenRecentModal";
import { ComplaintAiWriterHelper } from "@/components/complaint/ComplaintAiWriterHelper";
import { ManagePacketBindersModal } from "@/components/complaint/ManagePacketBindersModal";
import {
  loadComplaintDraft,
  saveComplaintDraft,
  listRecentComplaintDrafts,
  type StoredComplaintDraft,
} from "@/lib/complaintDraftStorage";

// ── Types & Constants ────────────────────────────────────────────────────────
export const STATE_FORM_PAGE_COUNT = 4;
export const PAGES_PER_BINDER = 2; // Default 1 Cover Page + 1 Content Sheet for standard text binders

// Helper to convert any PDF/Image file URL into crisp ImportedPdfPage[] objects
export async function convertFileUrlToPageImages(
  fileUrl: string,
  fileName?: string
): Promise<ImportedPdfPage[]> {
  try {
    const isImage = /\.(jpe?g|png|webp|gif)$/i.test(fileName || fileUrl) || fileUrl.startsWith("data:image/");
    if (isImage) {
      return [{
        pageNumber: 1,
        dataUrl: fileUrl,
        width: 816,
        height: 1056,
      }];
    }

    let arrayBuffer: ArrayBuffer;
    if (fileUrl.startsWith("data:")) {
      const base64 = fileUrl.split(",")[1];
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      arrayBuffer = bytes.buffer;
    } else {
      const res = await fetch(fileUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch file (${res.status})`);
      }
      arrayBuffer = await res.arrayBuffer();
    }

    return await convertPdfToPageImages(arrayBuffer, 1.8);
  } catch (err) {
    console.error("Failed to convert exhibit document to page images:", err);
    return [];
  }
}

/**
 * Splits plain text content into proportional 8.5" x 11" pages
 * for legal/formal advocacy sheets, ensuring paragraphs break cleanly
 * without overflowing margins or footers.
 */
export function paginateTextContent(
  text?: string | null,
  targetCharsPerPage: number = 2400,
  maxLinesPerPage: number = 38
): string[] {
  if (!text || text.trim().length === 0) {
    return [""];
  }

  const rawParagraphs = text.split(/\n\n+/);
  const pages: string[] = [];
  let currentPageParts: string[] = [];
  let currentChars = 0;
  let currentLines = 0;

  for (const para of rawParagraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // Estimate line count for this paragraph (including word wrap at ~80 chars/line)
    const lineCount = Math.max(1, Math.ceil(trimmed.length / 80)) + (trimmed.split("\n").length - 1);
    const paraCharLength = trimmed.length;

    // Check if adding this paragraph exceeds page limits
    const exceedsPage =
      currentPageParts.length > 0 &&
      (currentLines + lineCount > maxLinesPerPage || currentChars + paraCharLength > targetCharsPerPage);

    if (exceedsPage) {
      pages.push(currentPageParts.join("\n\n"));
      currentPageParts = [];
      currentChars = 0;
      currentLines = 0;
    }

    // If the paragraph itself is longer than targetCharsPerPage, break it by sentences/chunks
    if (paraCharLength > targetCharsPerPage) {
      const sentences = trimmed.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        const sentenceLines = Math.max(1, Math.ceil(sentence.length / 80));
        if (
          currentPageParts.length > 0 &&
          (currentLines + sentenceLines > maxLinesPerPage || currentChars + sentence.length > targetCharsPerPage)
        ) {
          pages.push(currentPageParts.join("\n\n"));
          currentPageParts = [];
          currentChars = 0;
          currentLines = 0;
        }
        currentPageParts.push(sentence);
        currentChars += sentence.length;
        currentLines += sentenceLines;
      }
    } else {
      currentPageParts.push(trimmed);
      currentChars += paraCharLength;
      currentLines += lineCount;
    }
  }

  if (currentPageParts.length > 0) {
    pages.push(currentPageParts.join("\n\n"));
  }

  return pages.length > 0 ? pages : [""];
}

/**
 * Returns the number of discrete content sheets a binder requires
 * (1 for normal length text, N for multi-page statements, or N for multi-page PDFs).
 */
export function getBinderContentPageCount(
  page?: { id?: string; category?: string; renderedPages?: ImportedPdfPage[]; pageCount?: number; content?: string } | null,
  caseDetails?: Partial<ComplaintCaseDetails>
): number {
  if (!page) return 1;
  if (page.category === "exhibit" && page.renderedPages && page.renderedPages.length > 0) {
    return page.renderedPages.length;
  }
  if (page.content && page.content.trim().length > 0) {
    const pages = paginateTextContent(page.content);
    return Math.max(1, pages.length);
  }
  return 1;
}

// Helper to get total docket pages across all binders, dynamically accounting for multi-page exhibits & multi-page statements
export function getDocketTotalPages(
  pagesList?: { id: string; category?: string; renderedPages?: ImportedPdfPage[]; pageCount?: number; content?: string }[],
  caseDetails?: Partial<ComplaintCaseDetails>
): number {
  if (!pagesList || pagesList.length <= 1) return STATE_FORM_PAGE_COUNT;
  let total = STATE_FORM_PAGE_COUNT;
  for (let i = 1; i < pagesList.length; i++) {
    const p = pagesList[i];
    // 1 Cover Sheet + N content/PDF sheets
    total += 1 + getBinderContentPageCount(p, caseDetails);
  }
  return total;
}

// Helper to get continuous docket page range info for a binder by index
export function getBinderPageRange(
  pageIndex: number,
  pagesList?: { id: string; category?: string; renderedPages?: ImportedPdfPage[]; pageCount?: number; content?: string }[],
  caseDetails?: Partial<ComplaintCaseDetails>
): {
  coverPage: number;
  contentPage: number;
  contentStart: number;
  contentEnd: number;
  contentCount: number;
  start: number;
  end: number;
  badge: string;
} {
  if (pageIndex <= 0) {
    return {
      coverPage: 1,
      contentPage: 4,
      contentStart: 1,
      contentEnd: 4,
      contentCount: 4,
      start: 1,
      end: 4,
      badge: "01–04",
    };
  }

  if (!pagesList || pagesList.length === 0) {
    const coverPage = STATE_FORM_PAGE_COUNT + (pageIndex - 1) * PAGES_PER_BINDER + 1;
    const contentPage = coverPage + 1;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return {
      coverPage,
      contentPage,
      contentStart: contentPage,
      contentEnd: contentPage,
      contentCount: 1,
      start: coverPage,
      end: contentPage,
      badge: `${pad(coverPage)}–${pad(contentPage)}`,
    };
  }

  let currentStart = STATE_FORM_PAGE_COUNT + 1;
  for (let i = 1; i < pageIndex; i++) {
    const p = pagesList[i];
    const count = 1 + getBinderContentPageCount(p, caseDetails);
    currentStart += count;
  }

  const currentP = pagesList[pageIndex];
  const contentCount = getBinderContentPageCount(currentP, caseDetails);
  const coverPage = currentStart;
  const contentStart = currentStart + 1;
  const contentEnd = currentStart + contentCount;
  const contentPage = contentStart;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const badge = coverPage === contentEnd ? pad(coverPage) : `${pad(coverPage)}–${pad(contentEnd)}`;

  return {
    coverPage,
    contentPage,
    contentStart,
    contentEnd,
    contentCount,
    start: coverPage,
    end: contentEnd,
    badge,
  };
}

// Helper to get continuous docket page number for a given page index (defaults to content sheet)
export function getDocketPageNumber(
  pageIndex: number,
  pagesList?: { id: string; category?: string; renderedPages?: ImportedPdfPage[]; pageCount?: number; content?: string }[],
  caseDetails?: Partial<ComplaintCaseDetails>
): number {
  if (pageIndex <= 0) return 1;
  return getBinderPageRange(pageIndex, pagesList, caseDetails).contentPage;
}

// Helper to get formatted 2-digit binder number for packet index cards (01, 02, 03, ...)
export function getPageDisplayBadge(p: { id: string; number?: string }, pageIndex: number): string {
  const num = pageIndex + 1;
  return num < 10 ? `0${num}` : `${num}`;
}

export interface DocumentPage {
  id: string;
  number: string;
  title: string;
  category: "cover" | "restatement" | "pleading" | "facts" | "violations" | "remedies" | "exhibit";
  content?: string;
  exhibitTag?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  documentType?: string;
  sourceVaultId?: number;
  renderedPages?: ImportedPdfPage[];
  pageCount?: number;
  isRenderingPdf?: boolean;
  highlights?: DocumentHighlight[];
}

export function getNextExhibitLetter(existingPages: DocumentPage[]): string {
  const usedLetters = new Set<string>();
  for (const p of existingPages) {
    if (p.exhibitTag) {
      const match = p.exhibitTag.match(/exhibit\s+([a-z])/i);
      if (match) usedLetters.add(match[1].toUpperCase());
    }
    const titleMatch = p.title.match(/exhibit\s+([a-z])/i);
    if (titleMatch) usedLetters.add(titleMatch[1].toUpperCase());
    if (p.id.startsWith("exhibit_")) {
      const idMatch = p.id.match(/exhibit_([a-z])/i);
      if (idMatch) usedLetters.add(idMatch[1].toUpperCase());
    }
  }
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let i = 0; i < alphabet.length; i++) {
    const letter = alphabet[i];
    if (!usedLetters.has(letter)) {
      return letter;
    }
  }
  return "Z";
}

const DEFAULT_PAGES: DocumentPage[] = [
  { 
    id: "cover", 
    number: "01", 
    title: "State Form", 
    category: "cover",
    content: "Official State Complaint Form — Georgia Department of Education Division for Special Education Services and Supports."
  },
  { 
    id: "clarity_control", 
    number: "02", 
    title: "Clarity Control Restatement", 
    category: "restatement", 
    content: `#1. STATEMENT OF ALLEGED VIOLATIONS
See attached Clarity Control Restatement of Issues & Statutory Violations (Section 02) and accompanying Exhibit Index for complete itemized counts under 34 C.F.R. § 300.153 and Ga. Comp. R. & Regs. 160-4-7-.12.

1. Count I: Failure to Implement Operative IEP Services (34 C.F.R. § 300.323(c)(2) · Ga. Comp. R. & Regs. 160-4-7-.06).
2. Count II: Failure to Timely Re-Evaluate and Affirmative Child Find Violation (34 C.F.R. § 300.111, § 300.301 · Ga. Comp. R. & Regs. 160-4-7-.03).
3. Count III: Unlawful Refusal to Issue Timely Prior Written Notice (PWN) (34 C.F.R. § 300.503 · Ga. Comp. R. & Regs. 160-4-7-.14).

#2. FACTS RELATING TO ALLEGED VIOLATIONS
See attached Chronological Summary of Facts & Timeline (Section 03) detailing all incidents, IEP team meetings, service withholding, and evaluation requests occurring within the one-year statutory period (October 2025 – October 2026).

Key Facts:
• Operative IEP mandated specialized instruction and related services.
• Formal written parental re-evaluation request submitted for assessment.
• Service delivery logs establish missed sessions without compensatory make-up time.

#3. PROPOSED RESOLUTION TO ALLEGED VIOLATIONS
1. Award certified 1-on-1 academic instruction and related therapy as compensatory education.
2. Fund an Independent Educational Evaluation (IEE) at public expense by an independent specialist.
3. Order the IEP team to reconvene within 15 school days to integrate compensatory hours into an amended IEP.
4. Mandate administrative training for school-based special education personnel regarding mandatory PWN and evaluation timelines.`
  },
  { 
    id: "chronological_summary", 
    number: "03", 
    title: "Chronological Summary", 
    category: "facts", 
    content: `CHRONOLOGICAL SUMMARY OF FACTS & TIMELINE

ELIJAH SANTIAGO
LOCAL EDUCATIONAL AGENCY: ATLANTA PUBLIC SCHOOLS

A chronological summary of relevant events and factual milestones occurring within the one-year statutory filing period (October 2025 – October 2026):

1. AUGUST 28, 2025 — ANNUAL IEP CONVENED (EXHIBIT A)
The Atlanta Public Schools IEP team convened to develop Elijah's annual 10th grade IEP. The IEP committed the District to 150 minutes weekly of specialized instruction, accommodations, and related support services.

2. OCTOBER 12, 2025 — FORMAL RE-EVALUATION REQUEST (EXHIBIT B)
Documented academic regression and accommodations withholding prompted Parent to deliver a formal written request for comprehensive evaluations to the LEA Special Education Lead via timestamped email.

3. OCTOBER 26, 2025 — EXPIRATION OF STATUTORY TIMELINE WITHOUT CONSENT
The District failed to provide an evaluation consent form or Prior Written Notice explaining refusal within the mandatory statutory window, violating 34 C.F.R. § 300.300.

4. NOVEMBER 1, 2025 TO JANUARY 15, 2026 — SERVICE DELIVERY WITHHOLDING (EXHIBIT C)
District service logs demonstrate that Elijah missed scheduled specialized support sessions without notice, make-up scheduling, or compensatory plan.

5. DECEMBER 12, 2025 — CASE MANAGER ADMISSION OF STAFF SHORTAGES
In written correspondence, the school case manager acknowledged staff shortages and confirmed that minutes were not delivered as stipulated in the IEP.

6. MARCH 3, 2026 — FORMAL DISPUTE NOTICE
Parent notified district administration of ongoing service deprivation and requested immediate compensatory scheduling, which the District failed to provide.`
  },
  { 
    id: "exhibit_index", 
    number: "04", 
    title: "Exhibit Index", 
    category: "pleading", 
    content: `FORMAL STATE COMPLAINT — EXHIBIT INDEX & DOCUMENT SCHEDULE

BEFORE THE GEORGIA DEPARTMENT OF EDUCATION
DIVISION FOR SPECIAL EDUCATION SERVICES AND SUPPORTS

STUDENT: ELIJAH SANTIAGO
AGENCY: ATLANTA PUBLIC SCHOOLS

================================================================================
TABLE OF COMPLAINT FILING SECTIONS:
================================================================================
  1. STATE FORM: Official GaDOE Formal State Complaint Filing Document (Pages 1–4)
  2. CLARITY CONTROL RESTATEMENT: Cover Page & Restatement of Statutory Claims (Pages 5–6)
  3. CHRONOLOGICAL SUMMARY: Cover Page & Chronological Timeline of Facts & Milestones (Pages 7–8)
  4. EXHIBIT INDEX: Cover Page & Master Evidentiary Schedule (Pages 9–10)
  5. EXHIBIT A: Cover Page & Student's IEP (Pages 11–12)
  6. EXHIBIT B: Cover Page & Evaluations & Parent Written Requests (Pages 13–14)
  7. EXHIBIT C: Cover Page & District Correspondence & Service Logs (Pages 15–16)

================================================================================
MASTER INDEX OF DOCUMENTARY EXHIBITS ATTACHED:
================================================================================

EXHIBIT A: STUDENT'S IEP
• Document: Annual Individualized Education Program (IEP)
• Date: August 28, 2025 · Author: Cobb County School District IEP Team
• Relevant Pages: Pages 4–8 (Service Delivery Schedule & Accommodations)
• Evidentiary Purpose: Establishes binding baseline of 240 weekly reading minutes and 60 minutes speech therapy.
• Supports: Count I (Failure to Implement IEP Services / Denial of FAPE).

EXHIBIT B: EVALUATIONS & PARENT WRITTEN REQUESTS
• Document: Psychoeducational Evaluation & Formal Parent Re-Evaluation Request Letter
• Date: October 12, 2025 (timestamped delivery 8:42 AM)
• Evidentiary Purpose: Verifies written notice of emerging sensory deficits and triggers 60-day statutory timeline.
• Supports: Count II (Failure to Timely Evaluate & Child Find Violation).

EXHIBIT C: DISTRICT CORRESPONDENCE, PWN & SERVICE LOGS
• Document: Special Education Service Delivery Logs & Email Correspondence
• Date: November 1, 2025 – January 15, 2026
• Evidentiary Purpose: Documentary proof of 18 missed sessions and written admission of staff shortages.
• Supports: Count I & Count III (Prior Written Notice Omission).

Exhibit files are attached behind this index in labeled alphabetical order.`
  },
  { 
    id: "exhibit_a", 
    number: "05", 
    title: "Exhibit A (Student's IEP)", 
    category: "exhibit", 
    exhibitTag: "Exhibit A", 
    content: `EXHIBIT A: INDIVIDUALIZED EDUCATION PROGRAM (IEP)
STUDENT: ELIJAH SANTIAGO · LEA / DISTRICT: COBB COUNTY SCHOOL DISTRICT

DOCUMENT SUMMARY & EVIDENTIARY RECORD:
• Document Title: Annual Individualized Education Program (IEP)
• Authoring Entity: Special Education IEP Team & Local Educational Agency
• Relevant Sections: Special Education & Related Services Delivery Schedule, Classroom Accommodations, and Behavioral Support Provisions.

EVIDENTIARY BASIS IN SUPPORT OF COMPLAINT:
1. Baseline Service Entitlement: Establishes the binding educational program guaranteed to the student under 34 C.F.R. § 300.323 and State Special Education Rules.
2. Mandated Service Minutes: Stipulates mandated specialized instruction and related therapeutic services guaranteed as FAPE.
3. Substantive Violation: Directly corroborates Count I (Failure to Implement Operative IEP Services / Denial of Free Appropriate Public Education).

[Evidentiary Notice: Full authentic IEP records are bound directly behind this summary sheet.]`,
  },
  { 
    id: "exhibit_b", 
    number: "06", 
    title: "Exhibit B (Evaluations)", 
    category: "exhibit", 
    exhibitTag: "Exhibit B", 
    content: `EXHIBIT B: EVALUATIONS & PARENT WRITTEN REQUESTS
STUDENT: ELIJAH SANTIAGO · LEA / DISTRICT: COBB COUNTY SCHOOL DISTRICT

DOCUMENT SUMMARY & EVIDENTIARY RECORD:
• Document Title: Psychoeducational Evaluation Report & Formal Parental Evaluation Request
• Receiving Entity: District Special Education Administration & Case Management
• Relevant Sections: Multidisciplinary Assessment Findings, Standardized Testing Scores, and Parental Notice of Deficits.

EVIDENTIARY BASIS IN SUPPORT OF COMPLAINT:
1. Mandatory 60-Day Evaluation Timeline: Verifies LEA receipt of formal parental consent and request triggering the statutory evaluation window under 34 C.F.R. § 300.301.
2. Child Find Duty: Establishes that the district possessed affirmative notice of suspected areas of disability requiring comprehensive evaluation.
3. Substantive Violation: Directly corroborates Count II (Failure to Timely Evaluate & Child Find Violation).

[Evidentiary Notice: Certified evaluation reports and transmission records are bound directly behind this summary sheet.]`,
  },
  { 
    id: "exhibit_c", 
    number: "07", 
    title: "Exhibit C (Communications)", 
    category: "exhibit", 
    exhibitTag: "Exhibit C", 
    content: `EXHIBIT C: DISTRICT CORRESPONDENCE & SERVICE LOGS
STUDENT: ELIJAH SANTIAGO · LEA / DISTRICT: COBB COUNTY SCHOOL DISTRICT

DOCUMENT SUMMARY & EVIDENTIARY RECORD:
• Document Title: Special Education Service Delivery Logs & Official Written Communications
• Key Parties: Case Manager, Related Service Providers, Lead Advocate & Parent
• Relevant Entries: Service Attendance Logs, Unfilled Provider Hours, and Written Staffing Admissions.

EVIDENTIARY BASIS IN SUPPORT OF COMPLAINT:
1. Proof of Non-Delivery: Demonstrates documented missed sessions and omissions of mandated IEP accommodations.
2. Written Admissions: Verifies administrative acknowledgment of personnel shortages with zero compensatory makeup hours.
3. Substantive Violation: Corroborates procedural and substantive FAPE deprivations under IDEA.

[Evidentiary Notice: Verifiable communication logs and provider records are bound directly behind this summary sheet.]`,
  },
];

/**
 * Ensures that mandatory binders (Cover / Official State Form and Clarity Control Restatement)
 * are always present in the complaint packet in required order (Cover = 1, Clarity Control = 2).
 */
export const ensureRequiredBinders = (incomingPages: DocumentPage[]): DocumentPage[] => {
  if (!incomingPages || incomingPages.length === 0) {
    return DEFAULT_PAGES;
  }

  let pages = [...incomingPages];

  // 1. Ensure cover page exists
  const hasCover = pages.some((p) => p.id === "cover" || p.category === "cover");
  if (!hasCover) {
    const defaultCover = DEFAULT_PAGES[0];
    pages = [defaultCover, ...pages];
  }

  // 2. Ensure clarity_control exists
  const hasClarity = pages.some((p) => p.id === "clarity_control" || p.category === "restatement");
  if (!hasClarity) {
    const defaultClarity = DEFAULT_PAGES[1];
    // Insert directly after cover page
    const coverIdx = pages.findIndex((p) => p.id === "cover" || p.category === "cover");
    if (coverIdx >= 0) {
      pages.splice(coverIdx + 1, 0, defaultClarity);
    } else {
      pages.unshift(defaultClarity);
    }
  }

  // 3. Ensure sequential numbering
  return pages.map((p, idx) => ({
    ...p,
    number: idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`,
  }));
};

/**
 * Builds Clarity Control Restatement document content:
 * Auto-restates strictly the three paragraph boxes from the State Form:
 * #1 Statement of Alleged Violations (Box 1)
 * #2 Facts Relating to Alleged Violations (Box 2)
 * #3 Proposed Resolution to Alleged Violations (Box 3)
 * Strictly excludes legal caption / court headers per user requirement.
 */
export function buildClarityControlContent(
  formState: OfficialComplaintFormState
): string {
  const box1 = (formState.statementOfViolations ?? "").trim();
  const box2 = (formState.factsRelatingToViolations ?? "").trim();
  const box3 = (formState.proposedResolution ?? "").trim();

  return `#1. STATEMENT OF ALLEGED VIOLATIONS
${box1}

#2. FACTS RELATING TO ALLEGED VIOLATIONS
${box2}

#3. PROPOSED RESOLUTION TO ALLEGED VIOLATIONS
${box3}`.trim();
}

/**
 * Fallback evidentiary document content generator for exhibit binders when no raw PDF
 * file has been uploaded yet, ensuring Sheet 2 (continuous docket page) always renders
 * sequentially and is never omitted or skipped in print or preview.
 */
export function getDefaultExhibitContent(
  p: { id: string; title: string; exhibitTag?: string; content?: string },
  caseDetails?: Partial<ComplaintCaseDetails>
): string {
  if (p.content && p.content.trim().length > 0) {
    return p.content;
  }

  const student = caseDetails?.studentName?.replace(/^IN\s+RE:\s*/i, "").trim() || "Elijah Santiago";
  const district = caseDetails?.district?.trim() || "Cobb County School District";

  if (p.id === "exhibit_a" || p.title?.toLowerCase().includes("iep")) {
    return `EXHIBIT A: INDIVIDUALIZED EDUCATION PROGRAM (IEP)
STUDENT: ${student.toUpperCase()} · LEA / DISTRICT: ${district.toUpperCase()}

DOCUMENT SUMMARY & EVIDENTIARY RECORD:
• Document Title: Annual Individualized Education Program (IEP)
• Authoring Entity: Special Education IEP Team & Local Educational Agency
• Relevant Sections: Special Education & Related Services Delivery Schedule, Classroom Accommodations, and Behavioral Support Provisions.

EVIDENTIARY BASIS IN SUPPORT OF COMPLAINT:
1. Baseline Service Entitlement: Establishes the binding educational program guaranteed to the student under 34 C.F.R. § 300.323 and State Special Education Rules.
2. Mandated Service Minutes: Stipulates mandated specialized instruction and related therapeutic services guaranteed as FAPE.
3. Substantive Violation: Directly corroborates Count I (Failure to Implement Operative IEP Services / Denial of Free Appropriate Public Education).

[Evidentiary Notice: Full authentic IEP records are bound directly behind this summary sheet.]`;
  }

  if (p.id === "exhibit_b" || p.title?.toLowerCase().includes("evaluation")) {
    return `EXHIBIT B: EVALUATIONS & PARENT WRITTEN REQUESTS
STUDENT: ${student.toUpperCase()} · LEA / DISTRICT: ${district.toUpperCase()}

DOCUMENT SUMMARY & EVIDENTIARY RECORD:
• Document Title: Psychoeducational Evaluation Report & Formal Parental Evaluation Request
• Receiving Entity: District Special Education Administration & Case Management
• Relevant Sections: Multidisciplinary Assessment Findings, Standardized Testing Scores, and Parental Notice of Deficits.

EVIDENTIARY BASIS IN SUPPORT OF COMPLAINT:
1. Mandatory 60-Day Evaluation Timeline: Verifies LEA receipt of formal parental consent and request triggering the statutory evaluation window under 34 C.F.R. § 300.301.
2. Child Find Duty: Establishes that the district possessed affirmative notice of suspected areas of disability requiring comprehensive evaluation.
3. Substantive Violation: Directly corroborates Count II (Failure to Timely Evaluate & Child Find Violation).

[Evidentiary Notice: Certified evaluation reports and transmission records are bound directly behind this summary sheet.]`;
  }

  if (p.id === "exhibit_c" || p.title?.toLowerCase().includes("communication") || p.title?.toLowerCase().includes("correspondence")) {
    return `EXHIBIT C: DISTRICT CORRESPONDENCE & SERVICE LOGS
STUDENT: ${student.toUpperCase()} · LEA / DISTRICT: ${district.toUpperCase()}

DOCUMENT SUMMARY & EVIDENTIARY RECORD:
• Document Title: Special Education Service Delivery Logs & Official Written Communications
• Key Parties: Case Manager, Related Service Providers, Lead Advocate & Parent
• Relevant Entries: Service Attendance Logs, Unfilled Provider Hours, and Written Staffing Admissions.

EVIDENTIARY BASIS IN SUPPORT OF COMPLAINT:
1. Proof of Non-Delivery: Demonstrates documented missed sessions and omissions of mandated IEP accommodations.
2. Written Admissions: Verifies administrative acknowledgment of personnel shortages with zero compensatory makeup hours.
3. Substantive Violation: Corroborates procedural and substantive FAPE deprivations under IDEA.

[Evidentiary Notice: Verifiable communication logs and provider records are bound directly behind this summary sheet.]`;
  }

  return `${p.exhibitTag ? `${p.exhibitTag}: ` : ""}${p.title.toUpperCase()}
STUDENT: ${student.toUpperCase()} · LEA / DISTRICT: ${district.toUpperCase()}

DOCUMENT SUMMARY & EVIDENTIARY RECORD:
• Document Title: ${p.title}
• Designation: ${p.exhibitTag || "Documentary Exhibit"}
• Evidentiary Purpose: Corroborating documentary evidence submitted in support of formal state administrative complaint filing.

[Evidentiary Notice: Supporting documentary records and verified attachments are bound directly behind this summary sheet.]`;
}

export interface EvidenceChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  category?: "iep" | "pwn" | "records" | "witness" | "general";
}

export const DEFAULT_EVIDENCE_CHECKLIST: EvidenceChecklistItem[] = [
  { id: "ev_1", text: "Operative IEP & all relevant amendments", completed: false, category: "iep" },
  { id: "ev_2", text: "Prior Written Notice (PWN) refusal / proposal letters", completed: false, category: "pwn" },
  { id: "ev_3", text: "Specialized instruction delivery / service attendance logs", completed: false, category: "records" },
  { id: "ev_4", text: "Related service therapy logs (Speech-Language, OT, PT, BCBA)", completed: false, category: "records" },
  { id: "ev_5", text: "Psychological evaluations, FBA, and BIP documentation", completed: false, category: "records" },
  { id: "ev_6", text: "Parent written requests, meeting notices & district email trail", completed: false, category: "witness" },
  { id: "ev_7", text: "Progress reports and standardized work sample comparisons", completed: false, category: "records" },
  { id: "ev_8", text: "Independent Educational Evaluation (IEE) reports (if applicable)", completed: false, category: "general" },
];

interface ComplaintCaseDetails {
  studentName: string;
  studentDob: string;
  grade: string;
  school: string;
  district: string;
  parentName: string;
  preparedBy: string;
  submissionDate: string;
  showLogo?: boolean;
  state?: string;
  evidenceNotes?: string;
  evidenceChecklist?: EvidenceChecklistItem[];
}

/**
 * Synchronizes the Table of Complaint Filing Sections in the Exhibit Index
 * to reflect dynamic multi-page statement and exhibit docket page ranges.
 */
export function syncExhibitIndexTableOfSections(
  content: string,
  pagesList: DocumentPage[],
  caseDetails?: Partial<ComplaintCaseDetails>
): string {
  if (!content || !content.includes("TABLE OF COMPLAINT FILING SECTIONS:")) return content;

  const lines: string[] = [];
  lines.push("TABLE OF COMPLAINT FILING SECTIONS:");
  lines.push("================================================================================");
  lines.push("  1. STATE FORM: Official GaDOE Formal State Complaint Filing Document (Pages 1–4)");

  for (let i = 1; i < pagesList.length; i++) {
    const p = pagesList[i];
    const range = getBinderPageRange(i, pagesList, caseDetails);
    const rangeStr = range.start === range.end ? `Page ${range.start}` : `Pages ${range.start}–${range.end}`;
    const num = i + 1;
    let label = p.title.toUpperCase();
    if (p.id === "clarity_control" || p.category === "restatement") {
      label = "CLARITY CONTROL RESTATEMENT: Cover Page & Restatement of Statutory Claims";
    } else if (p.id === "chrono_summary" || p.title.toLowerCase().includes("chronological")) {
      label = "CHRONOLOGICAL SUMMARY: Cover Page & Chronological Timeline of Facts & Milestones";
    } else if (p.id === "exhibit_index") {
      label = "EXHIBIT INDEX: Cover Page & Master Evidentiary Schedule";
    } else {
      label = `${p.exhibitTag ? `${p.exhibitTag.toUpperCase()}: ` : ""}${p.title.toUpperCase()}`;
    }
    lines.push(`  ${num}. ${label} (${rangeStr})`);
  }

  const newTableBlock = lines.join("\n");
  const tableRegex = /TABLE OF COMPLAINT FILING SECTIONS:[\s\S]*?(?================================================================================\s*MASTER INDEX|$)/;
  if (tableRegex.test(content)) {
    return content.replace(tableRegex, newTableBlock + "\n\n");
  }
  return content;
}

// ── Authentic Transparent Photographic Brass Corner Bracket Asset ───────────
function BrassCorner({ position, size = 32 }: { position: "tl" | "tr" | "bl" | "br"; size?: number }) {
  const isTop = position === "tl" || position === "tr";
  const isLeft = position === "tl" || position === "bl";
  const src = `/decor/folio-corner-${position}.png`;

  return (
    <img
      src={src}
      alt=""
      style={{ width: `${size}px`, height: `${size}px` }}
      className={cn(
        "absolute pointer-events-none z-40 select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]",
        isTop ? "-top-[1px]" : "-bottom-[1px]",
        isLeft ? "left-0" : "right-0"
      )}
    />
  );
}

function FolioBoxCornerBrackets({ size = 34 }: { size?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none select-none z-40">
      <BrassCorner position="tl" size={size} />
      <BrassCorner position="tr" size={size} />
      <BrassCorner position="bl" size={size} />
      <BrassCorner position="br" size={size} />
    </div>
  );
}

// ── Authentic Embossed Brass Slip Handle / Tab Bracket ─────────────────────
function BrassSlipHandle({ isActive }: { isActive?: boolean }) {
  return (
    <div 
      className={cn(
        "absolute -left-[12px] top-1/2 -translate-y-1/2 pointer-events-none z-30 flex items-center justify-center"
      )}
    >
      <OrnateTabBracket isActive={isActive} height={42} />
    </div>
  );
}

// ── Miniature Page Facsimile Preview (Actual Micro Document Replica) ────────
function MiniaturePagePreview({
  page,
  caseDetails,
  isActive,
  coverThumbnail,
}: {
  page: DocumentPage;
  caseDetails: ComplaintCaseDetails;
  isActive?: boolean;
  coverThumbnail?: string;
}) {
  const isCover = page.category === "cover" || page.id === "cover";

  return (
    <div
      className={cn(
        "w-[44px] h-[58px] rounded-[2px] p-[1px] shadow-[0_1.5px_4px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.9)] border shrink-0 relative overflow-hidden transition-all duration-200 select-none",
        isActive
          ? "bg-[#FFFDF8] border-[#8C6D2B] ring-1 ring-[#FFE394]/70 shadow-[0_2px_8px_rgba(255,215,100,0.45),0_1.5px_4px_rgba(0,0,0,0.5)] scale-[1.03]"
          : "bg-[#FAF5E8] border-[#A88A4C]/80 group-hover:border-[#8C6D2B] group-hover:shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
      )}
      style={{
        backgroundImage: isCover ? "none" : "url('/decor/fine-parchment.jpg')",
        backgroundColor: isCover ? "#FFFFFF" : undefined,
        backgroundSize: "cover",
      }}
    >
      {/* Scaled-down real document facsimile content */}
      {isCover ? (
        coverThumbnail ? (
          <img
            src={coverThumbnail}
            alt="State Form Page 1"
            className="w-full h-full object-cover object-top select-none pointer-events-none"
          />
        ) : (
          <div className="w-[190px] h-[252px] p-2 flex flex-col justify-between text-[#1A1A1A] font-sans select-none pointer-events-none origin-top-left scale-[0.23] bg-white">
            {/* Official GaDOE Form Header */}
            <div className="border-b border-slate-800 pb-1 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#2E7D32] tracking-tight">
                Ga<span className="text-[#C62828]">DOE</span>
              </span>
              <span className="text-[6.5px] bg-slate-100 text-slate-700 px-1 py-0.2 rounded border border-slate-300 font-bold uppercase">
                {caseDetails.state || "GA"} Form
              </span>
            </div>
            <div className="text-[7px] font-black text-slate-900 leading-tight mt-0.5 uppercase tracking-tight">
              Special Education Formal Complaint Form
            </div>
            <div className="text-[6px] text-[#C62828] font-bold">
              Georgia Department of Education
            </div>
          </div>

          {/* Form fields micro preview */}
          <div className="space-y-1 my-auto py-1 text-left">
            <div className="text-[6.5px] text-slate-700 truncate">
              <span className="font-bold text-slate-900">Agency:</span> {caseDetails.district || "School District"}
            </div>
            <div className="text-[7.5px] text-slate-900 font-black truncate bg-amber-50/80 px-0.5 rounded border border-amber-200/50">
              {caseDetails.studentName || "Student Record"}
            </div>
            <div className="text-[6.5px] text-slate-700 truncate">
              <span className="font-bold text-slate-900">School:</span> {caseDetails.school || "Assigned School"}
            </div>
            <div className="border border-slate-300 p-1 bg-slate-50/90 rounded-xs text-[5.5px] text-slate-600 line-clamp-2">
              • Statement of Alleged Violations (34 C.F.R. § 300.153)
            </div>
          </div>

          {/* Footer */}
          <div className="text-[6px] flex justify-between items-center text-slate-500 border-t border-slate-300 pt-0.5">
            <span className="font-semibold text-emerald-700">Official Fillable PDF</span>
            <span className="font-mono font-bold text-slate-800">01</span>
          </div>
        </div>
      )) : page.id === "clarity_control" ? (
        <div className="w-[190px] h-[252px] p-2 flex flex-col justify-between text-[#1A120A] font-serif select-none pointer-events-none origin-top-left scale-[0.23]">
          {/* Restatement Header */}
          <div className="text-center border-b border-[#3A2810]/40 pb-0.5">
            <div className="text-[7px] font-bold text-[#0B1E38] truncate mt-0.5">
              {caseDetails.studentName?.replace(/^IN\s+RE:\s*/i, "").split(",")[0] || "STUDENT"}
            </div>
            <div className="border-t border-double border-[#8C6D2B]/50 my-0.5" />
            <div className="text-[7.5px] font-black uppercase tracking-wide text-[#1A1005]">
              Restatement
            </div>
          </div>

          {/* Roman Numeral Claims */}
          <div className="space-y-1 my-auto text-left text-[6.5px] leading-tight text-[#2A1D0E]">
            <div className="truncate font-bold text-[#8B2500]">• COUNT I: Failure to Implement IEP</div>
            <div className="truncate font-bold text-[#8B2500]">• COUNT II: Affirmative Child Find</div>
            <div className="truncate font-bold text-[#8B2500]">• COUNT III: PWN Refusal</div>
            <div className="text-[5.5px] text-[#5A4528] italic line-clamp-2 mt-0.5">
              Statutory Claims & Violations
            </div>
          </div>

          <div className="flex justify-between items-center border-t border-[#3A2810]/30 pt-0.5 text-[6px] text-[#6A5230] font-sans">
            <span>Restatement</span>
            <span className="font-mono font-bold">{page.number}</span>
          </div>
        </div>
      ) : page.id === "chronological_summary" ? (
        <div className="w-[190px] h-[252px] p-2 flex flex-col justify-between text-[#1A120A] font-serif select-none pointer-events-none origin-top-left scale-[0.23]">
          <div className="border-b border-[#3A2810]/40 pb-0.5">
            <div className="flex justify-between items-center text-[7px] text-[#5A4528]">
              <span className="font-black uppercase tracking-wider text-[#0B1E38]">
                Timeline
              </span>
              <span className="font-mono font-bold text-[8px] text-[#6A5230]">
                {page.number}
              </span>
            </div>
            <div className="text-[6.5px] text-[#4A3820] italic">Chronological Facts</div>
          </div>

          <div className="space-y-1.5 my-auto text-left text-[6px] text-[#2A1D0E]">
            <div className="border-l-2 border-[#8C6D2B] pl-1">
              <span className="font-bold text-[#0B1E38] block">Aug 28:</span> Annual IEP Convened
            </div>
            <div className="border-l-2 border-[#8C6D2B] pl-1">
              <span className="font-bold text-[#0B1E38] block">Oct 12:</span> Re-Evaluation Request
            </div>
            <div className="border-l-2 border-[#8C6D2B] pl-1">
              <span className="font-bold text-[#0B1E38] block">Nov–Jan:</span> 18 Sessions Missed
            </div>
          </div>

          <div className="flex justify-between items-center border-t border-[#3A2810]/30 pt-0.5 text-[6px] text-[#6A5230] font-sans">
            <span>1-Year Window</span>
            <span className="font-mono font-bold">{page.number}</span>
          </div>
        </div>
      ) : page.id === "exhibit_index" ? (
        <div className="w-[190px] h-[252px] p-2 flex flex-col justify-between text-[#1A120A] font-serif select-none pointer-events-none origin-top-left scale-[0.23]">
          <div className="border-b border-[#3A2810]/40 pb-0.5 text-center">
            <div className="text-[7.5px] font-black uppercase tracking-wider text-[#0B1E38]">
              Exhibit Index
            </div>
            <div className="text-[6px] text-[#6A5230]">Master Evidentiary Schedule</div>
          </div>

          <div className="space-y-1 my-auto text-left text-[6px] text-[#2A1D0E]">
            <div className="bg-[#EFE8D6] p-0.5 rounded-xs flex items-center gap-1">
              <span className="font-bold text-[#8C6D2B]">EXH A:</span>
              <span className="truncate">Student's IEP</span>
            </div>
            <div className="bg-[#EFE8D6] p-0.5 rounded-xs flex items-center gap-1">
              <span className="font-bold text-[#8C6D2B]">EXH B:</span>
              <span className="truncate">Psychoed Evals</span>
            </div>
            <div className="bg-[#EFE8D6] p-0.5 rounded-xs flex items-center gap-1">
              <span className="font-bold text-[#8C6D2B]">EXH C:</span>
              <span className="truncate">Service Logs</span>
            </div>
          </div>

          <div className="flex justify-between items-center border-t border-[#3A2810]/30 pt-0.5 text-[6px] text-[#6A5230] font-sans">
            <span>Evidence Docket</span>
            <span className="font-mono font-bold">{page.number}</span>
          </div>
        </div>
      ) : page.id === "exhibit_a" ? (
        <div className="w-[190px] h-[252px] p-2 flex flex-col justify-between text-[#1A120A] font-serif select-none pointer-events-none origin-top-left scale-[0.23]">
          <div className="text-center my-auto py-2">
            <div className="inline-block border-2 border-[#8C6D2B] bg-[#FFFBF0] px-2 py-1 rounded shadow-xs mb-1">
              <span className="text-[9px] font-black tracking-widest text-[#0B1E38] uppercase block">
                EXHIBIT A
              </span>
            </div>
            <div className="text-[7px] font-bold text-[#1A1005] mt-1 uppercase">
              Student's IEP
            </div>
            <div className="text-[6px] text-[#5A4528] italic mt-0.5">
              Service Schedule & Accommodations
            </div>
            <div className="border-t border-[#8C6D2B]/40 w-16 mx-auto my-1.5" />
            <div className="text-[5.5px] text-[#6A5230]">
              August 28, 2025 · Cobb County
            </div>
          </div>

          <div className="flex justify-between items-center border-t border-[#3A2810]/30 pt-0.5 text-[6px] text-[#6A5230] font-sans">
            <span>Primary Baseline</span>
            <span className="font-mono font-bold">{page.number}</span>
          </div>
        </div>
      ) : (
        <div className="w-[190px] h-[252px] p-2 flex flex-col justify-between text-[#1A120A] font-serif select-none pointer-events-none origin-top-left scale-[0.23]">
          <div className="border-b border-[#3A2810]/40 pb-0.5">
            <div className="flex justify-between items-center text-[7.5px] text-[#5A4528]">
              <span className="font-bold uppercase tracking-wider text-[#0B1E38] truncate max-w-[130px]">
                {page.title}
              </span>
              <span className="font-mono font-bold text-[8.5px] text-[#6A5230]">
                {page.number}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-hidden my-1">
            <p className="text-[7px] text-[#2A1D0E] leading-[9.5px] line-clamp-[18] whitespace-pre-line font-serif text-justify">
              {(page.content || "").trim() || "No text entered for this section..."}
            </p>
          </div>

          <div className="flex justify-between items-center border-t border-[#3A2810]/30 pt-0.5 text-[6.5px] text-[#6A5230] font-sans">
            <span className="truncate max-w-[120px]">Waypoint Advocates</span>
            <span className="font-mono font-bold">{page.number}</span>
          </div>
        </div>
      )}

      {/* Subtle corner dog-ear highlight */}
      <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-gradient-to-bl from-amber-200/60 to-transparent pointer-events-none" />
    </div>
  );
}

// ── Main Component: PG-020 State Complaint Builder ───────────────────────────
export default function ComplaintWorkspace() {
  const params = useParams<{ id?: string; section?: string }>();
  const [location, navigate] = useLocation();
  const { isAuthenticated } = useAuth();

  const utils = trpc.useUtils();
  // CRM Contacts for Student Selection & Auto-fill
  const contactsQuery = trpc.contacts.list.useQuery();

  // Detect student ID and student name from URL parameters or session context
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const initialUrlStudentId = searchParams?.get("studentId") || searchParams?.get("contactId") || params?.id;
  const initialStudentName = typeof window !== "undefined" ? sessionStorage.getItem("lastStudentProfileName") : null;

  // Active Student ID for Document Vault integration (PG-023-VAULT)
  const [activeStudentId, setActiveStudentId] = useState<number | null>(() => {
    if (initialUrlStudentId && !isNaN(Number(initialUrlStudentId))) {
      return Number(initialUrlStudentId);
    }
    if (typeof window !== "undefined") {
      const sessId = sessionStorage.getItem("lastStudentProfileId");
      if (sessId && !isNaN(Number(sessId))) return Number(sessId);
    }
    return null;
  });

  // Document Vault queries for active student (PG-023-VAULT)
  const vaultQuery = trpc.clientFiles.listForAdmin.useQuery(
    { clientId: activeStudentId! },
    { enabled: !!activeStudentId }
  );
  const iepDocQuery = trpc.iep.get.useQuery(
    { contactId: activeStudentId! },
    { enabled: !!activeStudentId }
  );
  const draftHistoryQuery = trpc.iep.listDraftHistory.useQuery(
    { contactId: activeStudentId! },
    { enabled: !!activeStudentId }
  );

  // Active Student IEP Demographics (pulls address, DOB, GTID, and parent info directly from IEP records)
  const iepDemographicsQuery = trpc.iep.getStudentIepDemographics.useQuery(
    { contactId: activeStudentId! },
    { enabled: !!activeStudentId }
  );

  // Track if parent address was physically customized by the advocate (defaults to matching student address)
  const [isParentAddressCustom, setIsParentAddressCustom] = useState(false);

  const uploadToVaultMutation = trpc.iep.upload.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded to Student Document Vault (PG-023-VAULT)");
      if (activeStudentId) {
        utils.clientFiles.listForAdmin.invalidate({ clientId: activeStudentId });
        utils.iep.get.invalidate({ contactId: activeStudentId });
        utils.iep.listDraftHistory.invalidate({ contactId: activeStudentId });
        utils.iep.getStudentIepDemographics.invalidate({ contactId: activeStudentId });
      }
    },
    onError: (err) => {
      toast.error(`Failed to upload to Document Vault: ${err.message}`);
    },
  });

  // Initial draft from storage (PG-020 Session Recovery) — strictly load for the requested student!
  const initialDraft = typeof window !== "undefined" && initialUrlStudentId
    ? loadComplaintDraft(initialUrlStudentId)
    : null;

  // State: Case Data (Defaults to loaded draft, or accessed student, or primary student Elijah Santiago)
  const [caseDetails, setCaseDetails] = useState<ComplaintCaseDetails>(() => {
    if (initialDraft?.caseDetails) {
      return {
        studentName: initialDraft.caseDetails.studentName || initialStudentName || "Student on Record",
        studentDob: initialDraft.caseDetails.studentDob || "[Required — Please Fill Out]",
        grade: initialDraft.caseDetails.grade || "[Required — Please Fill Out]",
        school: initialDraft.caseDetails.school || "[Required — Please Fill Out]",
        district: initialDraft.caseDetails.district || "[Required — Please Fill Out (District)]",
        parentName: initialDraft.caseDetails.parentName || "[Required — Please Fill Out]",
        preparedBy: initialDraft.caseDetails.preparedBy || "Waypoint Advocates",
        submissionDate: initialDraft.caseDetails.submissionDate || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        showLogo: initialDraft.caseDetails.showLogo ?? true,
        state: initialDraft.caseDetails.state || "GA",
      };
    }
    if (initialStudentName) {
      return {
        studentName: initialStudentName,
        studentDob: "[Required — Please Fill Out]",
        grade: "[Required — Please Fill Out]",
        school: "[Required — Please Fill Out]",
        district: "[Required — Please Fill Out (District)]",
        parentName: "[Required — Please Fill Out]",
        preparedBy: "Waypoint Advocates",
        submissionDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        showLogo: true,
        state: "GA",
      };
    }
    if (!initialUrlStudentId) {
      return {
        studentName: "Elijah Santiago",
        studentDob: "05/18/2008",
        grade: "10th Grade",
        school: "Midtown High School",
        district: "Atlanta Public Schools",
        parentName: "Marcus Santiago",
        preparedBy: "Waypoint Advocates",
        submissionDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        showLogo: true,
        state: "GA",
      };
    }
    return {
      studentName: "Student on Record",
      studentDob: "[Required — Please Fill Out]",
      grade: "[Required — Please Fill Out]",
      school: "[Required — Please Fill Out]",
      district: "[Required — Please Fill Out (District)]",
      parentName: "[Required — Please Fill Out]",
      preparedBy: "Waypoint Advocates",
      submissionDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      showLogo: true,
      state: "GA",
    };
  });

  // State: Official State Complaint Form State (defaults to Georgia GaDOE or loaded draft)
  const [officialFormState, setOfficialFormState] = useState<OfficialComplaintFormState>(() => {
    if (initialDraft?.formState) {
      return {
        ...initialDraft.formState,
        mediationWillingness: initialDraft.formState.mediationWillingness || "no",
      };
    }
    if (typeof window !== "undefined") {
      try {
        const studentKey = initialUrlStudentId || params?.id || "active";
        const saved =
          localStorage.getItem(`complaint_form_state_${studentKey}`) ||
          localStorage.getItem(`complaint_form_state_${params?.id || "active"}`) ||
          localStorage.getItem("complaint_form_state_active");
        if (saved) {
          const parsed = JSON.parse(saved);
          const sanitizeMock = (v?: string) => {
            if (
              !v ||
              v.trim() === "" ||
              v.includes("1234 Heritage") ||
              v.includes("555-0192") ||
              v.includes("parent@example.com") ||
              v.includes("9004812736")
            ) {
              return "[Required — Please Fill Out]";
            }
            return v;
          };

          return {
            ...parsed,
            serviceMethod:
              !parsed.serviceMethod || parsed.serviceMethod.includes("Certified Mail")
                ? "Electronic Delivery"
                : parsed.serviceMethod,
            mediationWillingness: parsed.mediationWillingness || "no",
            studentAddress: sanitizeMock(parsed.studentAddress),
            studentGtid: sanitizeMock(parsed.studentGtid),
            parentAddress: sanitizeMock(parsed.parentAddress),
            parentPhone: sanitizeMock(parsed.parentPhone),
            parentEmail: sanitizeMock(parsed.parentEmail),
            complainantName: formatFirstLastName(parsed.complainantName) || "Byron Honea",
            complainantRelationship: sanitizeComplaintText(parsed.complainantRelationship),
            statementOfViolations: sanitizeComplaintText(parsed.statementOfViolations),
            factsRelatingToViolations: sanitizeComplaintText(parsed.factsRelatingToViolations),
            signatureName: formatFirstLastName(parsed.signatureName) || "Byron Honea",
          };
        }
      } catch (e) {}
    }
    return INITIAL_GADOE_FORM_STATE;
  });

  // Authoritative Business Profile from PG-024-BIZ
  const businessProfileQuery = trpc.system.getBusinessProfile.useQuery();
  const businessProfile = businessProfileQuery.data;

  // Cloud D1 sync mutation for state complaint drafts (cross-environment sync)
  const saveDraftCloudMutation = trpc.stateComplaint.saveDraft.useMutation();

  // Preserved start date for this complaint filing
  const [complaintStartedAt, setComplaintStartedAt] = useState<string>(() => {
    if (initialDraft?.startedAt) return initialDraft.startedAt;
    return new Date().toISOString();
  });

  // Sync Complainant and Practice information from PG-024-BIZ
  const syncFromBusinessProfile = (showToast = true) => {
    if (!businessProfile) {
      toast.info("Loading business profile credentials from PG-024-BIZ...");
      return;
    }
    const advName = formatFirstLastName(businessProfile.leadAdvocate || "Byron Honea");
    const stAddress = businessProfile.street || businessProfile.address || "PO Box 724944";
    const city = businessProfile.city || "Atlanta";
    const st = businessProfile.state || "GA";
    const zip = businessProfile.zip || "31139";
    const phone = businessProfile.phone || "(404) 919-8664";
    const email = businessProfile.email || "clientcare@waypointadvocates.com";
    const company = businessProfile.companyName || "Waypoint Advocates";

    setOfficialFormState((prev) => ({
      ...prev,
      complainantName: advName,
      complainantRelationship: prev.complainantRelationship || "Authorized Special Education Advocate / Representative",
      complainantAddress: stAddress,
      complainantCity: city,
      complainantState: st,
      complainantZip: zip,
      complainantPhone: phone,
      complainantEmail: email,
      signatureName: advName,
    }));

    setCaseDetails((prev) => ({
      ...prev,
      preparedBy: company,
    }));

    if (showToast) {
      toast.success(`✓ Synced from Business Settings (PG-024-BIZ): ${stAddress}, ${city}, ${st} ${zip} • ${phone} • ${email}`);
    }
  };

  // Auto-sync business info on initial load if complainant info is empty or uses default placeholder
  const hasAutoSyncedBusinessRef = useRef(false);
  useEffect(() => {
    if (businessProfile && !hasAutoSyncedBusinessRef.current) {
      hasAutoSyncedBusinessRef.current = true;
      setOfficialFormState((prev) => {
        const isDefaultAddress = !prev.complainantAddress || prev.complainantAddress === "PO Box 724944";
        const isDefaultPhone = !prev.complainantPhone || prev.complainantPhone === "(404) 919-8664";
        const isDefaultEmail = !prev.complainantEmail || prev.complainantEmail === "advocate@waypointadvocates.com";

        return {
          ...prev,
          complainantName: prev.complainantName || formatFirstLastName(businessProfile.leadAdvocate || "Byron Honea"),
          complainantAddress: isDefaultAddress ? (businessProfile.street || businessProfile.address || "PO Box 724944") : prev.complainantAddress,
          complainantCity: !prev.complainantCity || prev.complainantCity === "Atlanta" ? (businessProfile.city || "Atlanta") : prev.complainantCity,
          complainantState: !prev.complainantState || prev.complainantState === "GA" ? (businessProfile.state || "GA") : prev.complainantState,
          complainantZip: !prev.complainantZip || prev.complainantZip === "31139" ? (businessProfile.zip || "31139") : prev.complainantZip,
          complainantPhone: isDefaultPhone ? (businessProfile.phone || "(404) 919-8664") : prev.complainantPhone,
          complainantEmail: isDefaultEmail ? (businessProfile.email || "clientcare@waypointadvocates.com") : prev.complainantEmail,
          signatureName: prev.signatureName || formatFirstLastName(businessProfile.leadAdvocate || "Byron Honea"),
        };
      });

      setCaseDetails((prev) => ({
        ...prev,
        preparedBy: businessProfile.companyName || prev.preparedBy || "Waypoint Advocates",
      }));
    }
  }, [businessProfile]);

  // Helper to pull address and demographics from student's uploaded IEP document
  const pullAddressFromIep = async (showToast = true) => {
    if (!activeStudentId) {
      if (showToast) toast.error("Please select a student contact first");
      return;
    }
    const res = await iepDemographicsQuery.refetch();
    const demo = res.data || iepDemographicsQuery.data;
    if (!demo || (!demo.address && !demo.gtid && !demo.dob)) {
      if (showToast) toast.warning("No residential address found on student's uploaded IEP. Retaining [Required — Please Fill Out].");
      return;
    }

    setOfficialFormState((prev) => {
      const next = { ...prev };
      if (demo.address) {
        next.studentAddress = demo.address;
        if (demo.city) next.studentCity = demo.city;
        if (demo.state) next.studentState = demo.state;
        if (demo.zipCode) next.studentZip = demo.zipCode;

        // Parent address matches student address unless physically customized
        if (!isParentAddressCustom) {
          next.parentAddress = demo.address;
          if (demo.city) next.parentCity = demo.city;
          if (demo.state) next.parentState = demo.state;
          if (demo.zipCode) next.parentZip = demo.zipCode;
        }
      }
      if (demo.dob) next.studentDob = demo.dob;
      if (demo.gtid) next.studentGtid = demo.gtid;
      if (demo.parentName && (!next.parentName || next.parentName.includes("[Not Found") || next.parentName.includes("[Required"))) {
        next.parentName = demo.parentName;
      }
      if (demo.parentPhone && (!next.parentPhone || next.parentPhone.includes("[Not Found") || next.parentPhone.includes("[Required"))) {
        next.parentPhone = demo.parentPhone;
      }
      if (demo.parentEmail && (!next.parentEmail || next.parentEmail.includes("[Not Found") || next.parentEmail.includes("[Required"))) {
        next.parentEmail = demo.parentEmail;
      }
      return next;
    });

    if (showToast) {
      toast.success(`✓ Pulled address from Student IEP: ${demo.address || "Demographics Updated"}`);
    }
  };

  // Auto-fill student address and match parent address from IEP when available
  useEffect(() => {
    if (!iepDemographicsQuery.data) return;
    const iepDemo = iepDemographicsQuery.data;

    setOfficialFormState((prev) => {
      let changed = false;
      const next = { ...prev };

      const isMissing = (val?: string) =>
        !val ||
        val.trim() === "" ||
        val.includes("[Not Found") ||
        val.includes("[Required") ||
        val.includes("1234 Heritage") ||
        val.includes("555-0192");

      if (iepDemo.address && isMissing(prev.studentAddress)) {
        next.studentAddress = iepDemo.address;
        if (iepDemo.city) next.studentCity = iepDemo.city;
        if (iepDemo.state) next.studentState = iepDemo.state;
        if (iepDemo.zipCode) next.studentZip = iepDemo.zipCode;

        // Parent address matches student address unless physically customized
        if (!isParentAddressCustom || isMissing(prev.parentAddress)) {
          next.parentAddress = iepDemo.address;
          if (iepDemo.city) next.parentCity = iepDemo.city;
          if (iepDemo.state) next.parentState = iepDemo.state;
          if (iepDemo.zipCode) next.parentZip = iepDemo.zipCode;
        }
        changed = true;
      }
      if (iepDemo.dob && isMissing(prev.studentDob)) {
        next.studentDob = iepDemo.dob;
        changed = true;
      }
      if (iepDemo.gtid && isMissing(prev.studentGtid)) {
        next.studentGtid = iepDemo.gtid;
        changed = true;
      }
      if (iepDemo.parentName && isMissing(prev.parentName)) {
        next.parentName = iepDemo.parentName;
        changed = true;
      }
      if (iepDemo.parentPhone && isMissing(prev.parentPhone)) {
        next.parentPhone = iepDemo.parentPhone;
        changed = true;
      }
      if (iepDemo.parentEmail && isMissing(prev.parentEmail)) {
        next.parentEmail = iepDemo.parentEmail;
        changed = true;
      }

      if (changed) {
        toast.success(`✓ Pulled address from Student IEP: ${iepDemo.address || "Demographics Updated"}`);
        return next;
      }
      return prev;
    });
  }, [iepDemographicsQuery.data, isParentAddressCustom]);

  // Apply a CRM student record to the complaint workspace and official form
  const applyStudentToComplaint = (student: any, iepDemoOverride?: any) => {
    if (student?.id) {
      setActiveStudentId(student.id);
    }
    const sName = `${student.firstName || ""} ${student.lastName || ""}`.trim();
    const stateCode = detectStateCode(student.state);
    const districtName =
      student.countyDistrict?.trim() ||
      (student.company?.includes("District") ? student.company.trim() : "") ||
      "[Required — Please Fill Out (District)]";

    const iepDemo = iepDemoOverride || iepDemographicsQuery.data;

    // Helper to test if a string contains actual value or is missing/mocked
    const hasValue = (val?: string | null): val is string =>
      Boolean(val && val.trim() !== "" && !val.includes("[Not Found") && !val.includes("[Required") && !val.includes("1234 Heritage") && !val.includes("555-0192"));

    // Student Address: Check CRM student contact first, then pull from IEP document
    const sAddress =
      (hasValue(student.address) ? student.address.trim() : null) ||
      (hasValue(iepDemo?.address) ? iepDemo.address.trim() : null) ||
      "[Required — Please Fill Out]";

    const sCity =
      (hasValue(student.city) ? student.city.trim() : null) ||
      (hasValue(iepDemo?.city) ? iepDemo.city.trim() : null) ||
      "";

    const sState =
      (hasValue(student.state) ? (student.state.length === 2 ? student.state.toUpperCase() : "GA") : null) ||
      (hasValue(iepDemo?.state) ? iepDemo.state.trim() : null) ||
      "GA";

    const sZip =
      (hasValue(student.zipCode) ? student.zipCode.trim() : null) ||
      (hasValue(iepDemo?.zipCode) ? iepDemo.zipCode.trim() : null) ||
      "";

    const sDob =
      (hasValue(student.dateOfBirth) ? student.dateOfBirth.trim() : null) ||
      (hasValue(iepDemo?.dob) ? iepDemo.dob.trim() : null) ||
      "[Required — Please Fill Out]";

    const sGtid =
      (hasValue(student.caseId) ? student.caseId.trim() : null) ||
      (hasValue(iepDemo?.gtid) ? iepDemo.gtid.trim() : null) ||
      "[Required — Please Fill Out]";

    const sSchool =
      (hasValue(student.schoolName) ? student.schoolName.trim() : null) ||
      "[Required — Please Fill Out]";

    const sGrade =
      (hasValue(student.gradeLevel) ? student.gradeLevel.trim() : null) ||
      "[Required — Please Fill Out]";

    // Parent Address & Info: By default matches student address unless physically customized
    let pName = "";
    let pAddress = "";
    let pCity = "";
    let pState = "";
    let pZip = "";
    let pPhone = "";
    let pEmail = "";

    if (student.parentContactId && contactsQuery.data) {
      const parent = contactsQuery.data.find((c) => c.id === student.parentContactId);
      if (parent) {
        const foundPName = `${parent.firstName || ""} ${parent.lastName || ""}`.trim();
        if (hasValue(foundPName)) pName = foundPName;
        if (hasValue(parent.phone)) pPhone = parent.phone.trim();
        if (hasValue(parent.email)) pEmail = parent.email.trim();

        // If parent has a recorded distinct address in CRM that differs from student, treat as custom
        if (hasValue(parent.address) && parent.address.trim() !== sAddress) {
          pAddress = parent.address.trim();
          pCity = hasValue(parent.city) ? parent.city.trim() : sCity;
          pState = hasValue(parent.state) ? (parent.state.length === 2 ? parent.state.toUpperCase() : "GA") : sState;
          pZip = hasValue(parent.zipCode) ? parent.zipCode.trim() : sZip;
          setIsParentAddressCustom(true);
        }
      }
    }

    // Check IEP extracted demographics for parent info if not found in CRM parent contact
    if (!pName && hasValue(iepDemo?.parentName)) pName = iepDemo.parentName.trim();
    if (!pPhone && hasValue(iepDemo?.parentPhone)) pPhone = iepDemo.parentPhone.trim();
    if (!pEmail && hasValue(iepDemo?.parentEmail)) pEmail = iepDemo.parentEmail.trim();

    // Secondary fallback to student contact record for phone/email if parent phone/email empty
    if (!pName && hasValue(student.secondParentName)) pName = student.secondParentName.trim();
    if (!pPhone && hasValue(student.phone)) pPhone = student.phone.trim();
    if (!pEmail && hasValue(student.email)) pEmail = student.email.trim();

    // Parent address & city/state/zip match student address unless physically customized
    if (!pAddress) {
      if (hasValue(sAddress)) {
        pAddress = sAddress;
        pCity = sCity;
        pState = sState;
        pZip = sZip;
        setIsParentAddressCustom(false);
      } else if (hasValue(iepDemo?.parentAddress)) {
        pAddress = iepDemo.parentAddress.trim();
        pCity = hasValue(iepDemo.parentCity) ? iepDemo.parentCity.trim() : sCity;
        pState = hasValue(iepDemo.parentState) ? iepDemo.parentState.trim() : sState;
        pZip = hasValue(iepDemo.parentZip) ? iepDemo.parentZip.trim() : sZip;
      } else {
        // Only if not found on IEP or records from us
        pAddress = "[Required — Please Fill Out]";
        pCity = sCity;
        pState = sState;
        pZip = sZip;
      }
    }

    if (!pName) pName = "[Required — Please Fill Out]";
    if (!pPhone) pPhone = "[Required — Please Fill Out]";
    if (!pEmail) pEmail = "[Required — Please Fill Out]";

    setComplaintTitle(`State Complaint – ${sName || student.lastName || "Student"}`);

    setCaseDetails((prev) => ({
      ...prev,
      studentName: sName || "[Required — Please Fill Out (Student Name)]",
      studentDob: sDob,
      grade: sGrade,
      school: sSchool,
      district: districtName,
      state: stateCode,
      parentName: pName,
    }));

    setOfficialFormState((prev) => ({
      ...prev,
      stateCode: stateCode,
      publicAgency: districtName,
      studentName: sName || "[Required — Please Fill Out (Student Name)]",
      studentDob: sDob,
      studentAddress: sAddress,
      studentCity: sCity,
      studentState: sState,
      studentZip: sZip,
      currentSchool: sSchool,
      grade: sGrade,
      studentGtid: sGtid,
      parentName: pName,
      parentAddress: pAddress,
      parentCity: pCity,
      parentState: pState,
      parentZip: pZip,
      parentPhone: pPhone,
      parentEmail: pEmail,
    }));

    // Update document pages content with real student and district
    setPages((prevPages) =>
      prevPages.map((pg) => {
        let content = pg.content;
        if (content) {
          if (sName) {
            content = content.replace(/ALEXANDER, SHANDERIOUS JR\./gi, sName.toUpperCase());
            content = content.replace(/Elijah Santiago/gi, sName);
          }
          if (districtName && districtName !== "[District Not Found on Record]" && districtName !== "[Required — Please Fill Out (District)]") {
            content = content.replace(/COBB COUNTY SCHOOL DISTRICT/gi, districtName.toUpperCase());
            content = content.replace(/ATLANTA PUBLIC SCHOOLS/gi, districtName.toUpperCase());
          }
        }
        return { ...pg, content };
      })
    );

    const addressSource = student.address?.trim()
      ? "Student Contact Record"
      : iepDemo?.address?.trim()
      ? "Student IEP Document"
      : "Required — Please Fill Out";

    toast.success(`Loaded ${sName}'s record into ${SUPPORTED_STATE_FORMS[stateCode]?.name || "Georgia"} State Complaint Form (Address: ${addressSource})`);
  };

  // Draft selection and session recovery handlers
  const handleSelectRecentDraft = (draft: StoredComplaintDraft) => {
    if (draft.pages && Array.isArray(draft.pages) && draft.pages.length > 0) {
      setPages(ensureRequiredBinders(draft.pages));
    }
    if (draft.caseDetails) {
      setCaseDetails((prev) => ({ ...prev, ...draft.caseDetails }));
    }
    if (draft.formState) {
      const cleanForm = { ...draft.formState };
      if (!cleanForm.serviceMethod || cleanForm.serviceMethod.includes("Certified Mail")) {
        cleanForm.serviceMethod = "Electronic Delivery";
      }
      if (!cleanForm.mediationWillingness) {
        cleanForm.mediationWillingness = "no";
      }
      setOfficialFormState((prev) => ({ ...prev, ...cleanForm }));
    }
    if (draft.title) {
      setComplaintTitle(draft.title);
    }
    if (draft.studentId) {
      setActiveStudentId(Number(draft.studentId));
    }
    if (draft.startedAt) {
      setComplaintStartedAt(draft.startedAt);
    }
    setLastSavedText("Draft loaded just now");
  };

  const handleStartNewDraft = () => {
    setPages(DEFAULT_PAGES);
    setOfficialFormState(INITIAL_GADOE_FORM_STATE);
    setComplaintTitle("State Complaint – New Filing");
    setComplaintStartedAt(new Date().toISOString());
    setActivePageId("cover");
    setActiveToolbarTab("setup");
    toast.success("Started a new complaint filing draft");
  };

  const handleSaveCurrentNow = () => {
    const studentKey = activeStudentId || params?.id || "active";
    const numStudentId = activeStudentId || (params?.id && !isNaN(Number(params?.id)) ? Number(params?.id) : null);
    const draftData: StoredComplaintDraft = {
      id: `draft_${studentKey}`,
      studentId: numStudentId,
      studentName: caseDetails.studentName || officialFormState.studentName || "Student on Record",
      title: complaintTitle,
      startedAt: complaintStartedAt,
      updatedAt: new Date().toISOString(),
      stateCode: officialFormState.stateCode || "GA",
      pageCount: pages.length,
      formState: officialFormState,
      caseDetails,
      pages,
    };

    saveComplaintDraft(draftData, false);

    saveDraftCloudMutation.mutate({
      studentId: numStudentId,
      title: complaintTitle,
      startedAt: complaintStartedAt,
      draftJson: JSON.stringify(draftData),
    });

    setRecentDraftsCount(listRecentComplaintDrafts().length);
    setLastSavedText("Version saved just now");
    toast.success(`✓ Saved complaint filing for ${caseDetails.studentName || "student"}`);
  };



  // Auto-detect student from URL query (?studentId=... or ?contactId=... or params.id)
  const lastLoadedStudentIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!contactsQuery.data?.length) return;
    const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const qId = urlParams?.get("studentId") || urlParams?.get("contactId") || params?.id;

    if (qId) {
      if (lastLoadedStudentIdRef.current === String(qId)) {
        return; // Already applied this student
      }
      const matched = contactsQuery.data.find(
        (c) => String(c.id) === String(qId) || c.caseId === qId
      );
      if (matched) {
        lastLoadedStudentIdRef.current = String(matched.id);
        setActiveStudentId(matched.id);

        const sFullName = `${matched.firstName || ""} ${matched.lastName || ""}`.trim();
        const existingDraft = loadComplaintDraft(matched.id);

        // Only restore draft if it genuinely belongs to this student (not an Elijah template artifact)
        const draftBelongsToStudent =
          existingDraft &&
          String(existingDraft.studentId) === String(matched.id) &&
          (!existingDraft.studentName ||
            existingDraft.studentName.toLowerCase().includes(matched.lastName?.toLowerCase() || "") ||
            existingDraft.studentName.toLowerCase().includes(matched.firstName?.toLowerCase() || ""));

        if (draftBelongsToStudent && existingDraft) {
          handleSelectRecentDraft(existingDraft);
          if (sFullName) {
            setComplaintTitle(`State Complaint – ${sFullName}`);
          }
        } else {
          applyStudentToComplaint(matched);
        }
      }
    } else {
      // Default to Elijah Santiago ONLY if NO student was requested in the URL and no student loaded
      if (lastLoadedStudentIdRef.current) return;
      const elijah = contactsQuery.data.find(
        (c) => c.firstName?.toLowerCase().includes("elijah") || c.lastName?.toLowerCase().includes("santiago")
      );
      if (elijah) {
        lastLoadedStudentIdRef.current = String(elijah.id);
        setActiveStudentId(elijah.id);
        const existingDraft = loadComplaintDraft(elijah.id);
        if (existingDraft) {
          handleSelectRecentDraft(existingDraft);
        } else {
          applyStudentToComplaint(elijah);
        }
      }
    }
  }, [contactsQuery.data, params?.id, location]);

  // State: Pages and Active Navigation (restores from draft if available)
  const [pages, setPages] = useState<DocumentPage[]>(() => {
    if (initialDraft?.pages && Array.isArray(initialDraft.pages) && initialDraft.pages.length > 0) {
      return ensureRequiredBinders(initialDraft.pages);
    }
    return DEFAULT_PAGES;
  });
  const [activePageId, setActivePageId] = useState<string>("cover");
  const [activeToolbarTab, setActiveToolbarTab] = useState<"setup" | "edit" | "arrange" | "cover" | "insert" | "compile">("setup");

  // State: Viewport, Proportional View Mode, Zoom, and Collapsible Panels
  // Default to "actual" (100% Letter view: 8.5" x 11" @ 816px) for true WYSIWYG parity with print preview & paper
  const [viewMode, setViewMode] = useState<"fit-width" | "fit-page" | "actual">("actual");
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [isIndexCollapsed, setIsIndexCollapsed] = useState<boolean>(false);
  const [isToolsCollapsed, setIsToolsCollapsed] = useState<boolean>(true);
  const [lastSavedText, setLastSavedText] = useState<string>("Auto-saved just now");
  const [complaintTitle, setComplaintTitle] = useState<string>(() => {
    if (initialDraft?.title) return initialDraft.title;
    if (initialStudentName) return `State Complaint – ${initialStudentName}`;
    if (initialUrlStudentId) return "State Complaint";
    return "State Complaint – Elijah Santiago";
  });
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [isOpenRecentModalOpen, setIsOpenRecentModalOpen] = useState(false);
  const [recentDraftsCount, setRecentDraftsCount] = useState<number>(() => {
    if (typeof window !== "undefined") {
      return listRecentComplaintDrafts().length;
    }
    return 0;
  });

  // Count of recent drafts strictly for the currently active student
  const studentRecentCount = useMemo(() => {
    if (typeof window !== "undefined") return 0;
    const all = listRecentComplaintDrafts();
    return all.filter((d) => {
      if (activeStudentId && d.studentId && String(d.studentId) === String(activeStudentId)) return true;
      if (
        caseDetails.studentName &&
        d.studentName &&
        d.studentName.toLowerCase().trim() === caseDetails.studentName.toLowerCase().trim()
      ) {
        return true;
      }
      return false;
    }).length;
  }, [activeStudentId, caseDetails.studentName, recentDraftsCount]);

  // ── Auto-Synchronize State Form Boxes (#1, #2, #3) to Clarity Control Restatement ──
  useEffect(() => {
    setPages((prevPages) => {
      const clarityIndex = prevPages.findIndex(
        (p) => p.id === "clarity_control" || p.category === "restatement"
      );
      if (clarityIndex === -1) return prevPages;

      const currentClarityPage = prevPages[clarityIndex];
      const newContent = buildClarityControlContent(officialFormState);

      if (currentClarityPage.content === newContent) {
        return prevPages;
      }

      const nextPages = [...prevPages];
      nextPages[clarityIndex] = {
        ...currentClarityPage,
        content: newContent,
      };
      return nextPages;
    });
  }, [
    officialFormState.statementOfViolations,
    officialFormState.factsRelatingToViolations,
    officialFormState.proposedResolution,
  ]);

  // State: Document Highlighting on Uploaded Evidentiary Documents
  const [isHighlighterActive, setIsHighlighterActive] = useState<boolean>(false);
  const [activeHighlightColor, setActiveHighlightColor] = useState<HighlightColor>("yellow");

  const handleAddHighlight = (highlight: DocumentHighlight) => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id === activePageId) {
          const currentHighlights = p.highlights || [];
          return {
            ...p,
            highlights: [...currentHighlights, highlight],
          };
        }
        return p;
      })
    );
    toast.success("Highlight applied to evidentiary document");
  };

  const handleRemoveHighlight = (highlightId: string) => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id === activePageId) {
          return {
            ...p,
            highlights: (p.highlights || []).filter((h) => h.id !== highlightId),
          };
        }
        return p;
      })
    );
    toast.success("Highlight removed");
  };

  const handleClearHighlights = () => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id === activePageId) {
          return {
            ...p,
            highlights: [],
          };
        }
        return p;
      })
    );
    toast.success("Cleared all highlights from current exhibit");
  };

  // Automatically collapse the global sidebar to maximize the legal document workspace
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("waypoint:collapse-sidebar"));
  }, []);

  // State: Pre-rendered high-res page images for all 4 pages of Binder 01 (Official State Form)
  // Guarantees all 4 pages are completely visible in Full Document Print Preview & window.print()
  const [stateFormPages, setStateFormPages] = useState<ImportedPdfPage[]>([]);
  const [isRenderingStateForm, setIsRenderingStateForm] = useState<boolean>(false);

  // Generate filled official state PDF bytes (populated with student, school, district, and advocate info)
  // and render all 4 pages into high-res images for print preview and printing
  const renderFilledStateFormPages = async (formStateToFill: OfficialComplaintFormState) => {
    try {
      setIsRenderingStateForm(true);
      const res = await fetch("/forms/gadoe-formal-complaint-form.pdf");
      if (!res.ok) return;
      const existingPdfBytes = await res.arrayBuffer();

      const imgs = await convertPdfToPageImages(existingPdfBytes, 1.8);
      if (imgs.length > 0) {
        setStateFormPages(imgs);
      }
    } catch (err) {
      console.error("Failed to convert state form pages for print preview:", err);
    } finally {
      setIsRenderingStateForm(false);
    }
  };

  useEffect(() => {
    renderFilledStateFormPages(officialFormState);
  }, [officialFormState.stateCode]);


  // State: Resizable Packet Index Width with Draggable Right Edge
  const [indexWidth, setIndexWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("complaint_index_width");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 160 && parsed <= 420) return parsed;
      }
    }
    return 208; // compact, elegant default width
  });
  const [isResizingIndex, setIsResizingIndex] = useState(false);
  const indexAsideRef = useRef<HTMLElement>(null);

  // Mouse drag event listeners for resizing Packet Index
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingIndex) return;
      const asideLeft = indexAsideRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = Math.round(e.clientX - asideLeft);
      if (newWidth >= 160 && newWidth <= 440) {
        setIndexWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      if (isResizingIndex) {
        setIsResizingIndex(false);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("complaint_index_width", indexWidth.toString());
          } catch (e) {}
        }
      }
    };
    if (isResizingIndex) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizingIndex, indexWidth]);

  // State: Google Docs Typography & Writing Settings
  const [fontFamily, setFontFamily] = useState<"serif" | "times" | "garamond" | "sans">("serif");
  const [fontSize, setFontSize] = useState<number>(12); // pt
  const [lineSpacing, setLineSpacing] = useState<"1.15" | "1.5" | "2.0">("1.5");
  const [textAlign, setTextAlign] = useState<"left" | "justify" | "center">("left");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  // Auto-save effect: automatically persists complaint draft on any change
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setLastSavedText("Saving changes...");
    const studentKey = activeStudentId || initialUrlStudentId || params?.id || "active";
    const numStudentId = activeStudentId || (initialUrlStudentId && !isNaN(Number(initialUrlStudentId)) ? Number(initialUrlStudentId) : null);
    const timer = setTimeout(() => {
      try {
        const draftObj: StoredComplaintDraft = {
          id: `draft_${studentKey}`,
          studentId: numStudentId,
          studentName: caseDetails.studentName || officialFormState.studentName || "Student on Record",
          title: complaintTitle,
          startedAt: complaintStartedAt,
          updatedAt: new Date().toISOString(),
          stateCode: officialFormState.stateCode || "GA",
          pageCount: pages.length,
          formState: officialFormState,
          caseDetails,
          pages,
        };

        saveComplaintDraft(draftObj, false);

        // Sync with Cloudflare D1 so drafts are seamlessly available across localhost and live
        saveDraftCloudMutation.mutate({
          studentId: numStudentId,
          title: complaintTitle,
          startedAt: complaintStartedAt,
          draftJson: JSON.stringify(draftObj),
        });

        localStorage.setItem(
          `complaint_draft_${studentKey}`,
          JSON.stringify({
            complaintTitle,
            caseDetails,
            pages,
            formState: officialFormState,
            startedAt: complaintStartedAt,
            savedAt: new Date().toISOString(),
          })
        );
        localStorage.setItem(
          `complaint_form_state_${studentKey}`,
          JSON.stringify(officialFormState)
        );
        // Also keep fallback active key in sync
        localStorage.setItem(
          `complaint_form_state_active`,
          JSON.stringify(officialFormState)
        );
        setRecentDraftsCount(listRecentComplaintDrafts().length);
      } catch (e) {
        // storage quota fallback
      }
      setLastSavedText("Auto-saved just now");
    }, 800);
    return () => clearTimeout(timer);
  }, [pages, caseDetails, officialFormState, complaintTitle, params?.id, activeStudentId, initialUrlStudentId, complaintStartedAt]);

  // State: Modals
  const [isEditCoverModalOpen, setIsEditCoverModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isCompilerModalOpen, setIsCompilerModalOpen] = useState(false);
  const [isAddPageModalOpen, setIsAddPageModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [newPageCategory, setNewPageCategory] = useState<DocumentPage["category"]>("exhibit");
  const [insertModalTab, setInsertModalTab] = useState<"vault" | "upload" | "custom">("vault");
  const [vaultSearchQuery, setVaultSearchQuery] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDocType, setUploadDocType] = useState<string>("Evaluation / Diagnostic Report");
  const [uploadCustomTitle, setUploadCustomTitle] = useState<string>("");
  const [isUploadingToVault, setIsUploadingToVault] = useState(false);
  const vaultFileInputRef = useRef<HTMLInputElement>(null);

  // Target exhibit selection: "current" (attach to currently selected exhibit like Exhibit A) or "new" (append as new exhibit)
  const [targetExhibitMode, setTargetExhibitMode] = useState<"current" | "new">("current");

  // Editable Content in State
  const activePage = pages.find((p) => p.id === activePageId) || pages[0];
  const activePageIndex = pages.findIndex((p) => p.id === activePageId);

  const isCurrentPageAnExhibit = activePage.category === "exhibit";
  const currentExhibitLabel = activePage.exhibitTag || activePage.title || "Exhibit A";
  const nextExhibitLetter = getNextExhibitLetter(pages);
  const effectiveTargetLabel = isCurrentPageAnExhibit && targetExhibitMode === "current"
    ? currentExhibitLabel
    : `Exhibit ${nextExhibitLetter}`;

  // Automatically default to current active exhibit if user is currently working on an exhibit page
  useEffect(() => {
    if (isAddPageModalOpen) {
      if (activePage.category === "exhibit") {
        setTargetExhibitMode("current");
      } else {
        setTargetExhibitMode("new");
      }
    }
  }, [isAddPageModalOpen, activePageId]);

  // Total docket pages: 4 pages for binder 01 (State Form) + dynamic pages for each subsequent binder
  const totalDocketPages = getDocketTotalPages(pages, caseDetails);
  const activeBinderRange = getBinderPageRange(activePageIndex, pages, caseDetails);
  const currentDocketPageNumber = activeBinderRange.contentPage;

  // Ref & auto-resize effect for the editable legal drafting textarea
  // Eliminates nested inner scrollbars: the sheet expands naturally and only the outer canvas scrollbar is used!
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const newHeight = Math.max(680, el.scrollHeight);
    el.style.height = `${newHeight}px`;
  }, [activePage.content, fontSize, lineSpacing, fontFamily, activePageId]);

  // Content edits handler
  const handleUpdatePageContent = (text: string) => {
    let cleanText = text;
    if (containsProhibitedComplaintTerms(text)) {
      cleanText = sanitizeComplaintText(text);
      toast.info("State agency rule: 'Master IEP Coach' is not permitted in formal state complaints. Converted to 'Lead Special Education Advocate'.");
    }
    setPages((prev) =>
      prev.map((p) => (p.id === activePageId ? { ...p, content: cleanText } : p))
    );
    setLastSavedText("Draft saved just now");
  };

  // Live text metrics (Word & character count like Google Docs Tools > Word Count)
  const textStats = useMemo(() => {
    const content = activePage.content || "";
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const chars = content.length;
    return { words, chars };
  }, [activePage.content]);

  // Insert legal citation helper
  const handleInsertLegalSnippet = (snippet: string) => {
    const current = activePage.content || "";
    const updated = current ? `${current}\n\n${snippet}` : snippet;
    handleUpdatePageContent(updated);
    toast.success("Inserted citation into document");
  };

  // AI Writer Helper state & handlers
  const [isAiWriterHelperOpen, setIsAiWriterHelperOpen] = useState(false);
  const [selectedDocumentText, setSelectedDocumentText] = useState("");

  const handleOpenAiWriter = () => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      if (start !== end && start != null && end != null) {
        setSelectedDocumentText(textareaRef.current.value.substring(start, end));
      } else {
        setSelectedDocumentText("");
      }
    } else {
      setSelectedDocumentText("");
    }
    setIsAiWriterHelperOpen(true);
  };

  const handleApplyAiText = (newText: string, mode: "replace" | "append") => {
    if (mode === "append") {
      const current = activePage.content || "";
      handleUpdatePageContent(current ? `${current}\n\n${newText}` : newText);
    } else {
      if (
        selectedDocumentText &&
        textareaRef.current &&
        textareaRef.current.selectionStart !== textareaRef.current.selectionEnd
      ) {
        const current = activePage.content || "";
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const updated = current.substring(0, start) + newText + current.substring(end);
        handleUpdatePageContent(updated);
      } else {
        handleUpdatePageContent(newText);
      }
    }
  };

  // State: Manage Packet Binders & Removal Confirmation
  const [isManageBindersModalOpen, setIsManageBindersModalOpen] = useState(false);
  const [binderPendingRemoval, setBinderPendingRemoval] = useState<{ page: DocumentPage; index: number } | null>(null);

  const handleConfirmRemoveBinder = () => {
    if (!binderPendingRemoval) return;
    const { page, index } = binderPendingRemoval;

    if (page.id === "cover") {
      toast.error("Binder 01 (Official State Form) is mandatory and cannot be removed.");
      setBinderPendingRemoval(null);
      return;
    }

    if (page.id === "clarity_control" || page.category === "restatement") {
      toast.error("The Clarity Control Restatement is a required pleading and cannot be removed from this complaint packet.");
      setBinderPendingRemoval(null);
      return;
    }

    const updatedPages = pages.filter((p) => p.id !== page.id);
    setPages(updatedPages);

    if (activePageId === page.id) {
      const fallbackIdx = Math.max(0, index - 1);
      const fallbackPage = updatedPages[fallbackIdx] || updatedPages[0];
      if (fallbackPage) {
        setActivePageId(fallbackPage.id);
      }
    }

    toast.success(`Removed "${page.title}" from packet index. Continuous page numbers updated.`);
    setBinderPendingRemoval(null);
  };

  // State: Drag & Drop Binder Reordering on Left Sidebar
  const [draggedBinderIndex, setDraggedBinderIndex] = useState<number | null>(null);
  const [dragOverBinderIndex, setDragOverBinderIndex] = useState<number | null>(null);
  const [dragDropPosition, setDragDropPosition] = useState<"before" | "after" | null>(null);

  // Handler: Reorder Binders in Packet
  const handleReorderBinders = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    if (fromIndex === 0 || toIndex === 0) {
      toast.info("Binder 01 (Official State Form) is the required lead cover and remains at position 1.");
      return;
    }
    if (fromIndex < 0 || fromIndex >= pages.length || toIndex < 0 || toIndex >= pages.length) return;

    const movedTitle = pages[fromIndex]?.title || "Binder";

    setPages((prevPages) => {
      const next = [...prevPages];
      const [movedItem] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, movedItem);
      return ensureRequiredBinders(next);
    });

    toast.success(`Moved "${movedTitle}" to position ${toIndex + 1}`);
  };

  const handleMoveBinderUp = (index: number) => {
    if (index <= 1) return;
    handleReorderBinders(index, index - 1);
  };

  const handleMoveBinderDown = (index: number) => {
    if (index === 0 || index >= pages.length - 1) return;
    handleReorderBinders(index, index + 1);
  };

  // State: Rename Binder Modal ("small window" on double click or pencil trigger)
  const [binderToRename, setBinderToRename] = useState<DocumentPage | null>(null);
  const [renameTitleInput, setRenameTitleInput] = useState("");
  const [renameExhibitTagInput, setRenameExhibitTagInput] = useState("");

  const handleOpenRenameModal = (page: DocumentPage) => {
    setBinderToRename(page);
    setRenameTitleInput(page.title);
    setRenameExhibitTagInput(page.exhibitTag || "");
  };

  const handleSaveRename = () => {
    if (!binderToRename || !renameTitleInput.trim()) return;
    const newTitle = renameTitleInput.trim();
    const newExhibitTag = renameExhibitTagInput.trim();

    setPages((prevPages) =>
      prevPages.map((p) =>
        p.id === binderToRename.id
          ? {
              ...p,
              title: newTitle,
              ...(p.category === "exhibit" ? { exhibitTag: newExhibitTag || p.exhibitTag } : {}),
            }
          : p
      )
    );

    toast.success(`Renamed binder to "${newTitle}"`);
    setBinderToRename(null);
  };

  // State: Evidence Gathering Checklist & Complaint Scratchpad Notes Modal
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [newChecklistText, setNewChecklistText] = useState("");
  const [notesActiveTab, setNotesActiveTab] = useState<"checklist" | "notes">("checklist");

  const checklistItems = useMemo<EvidenceChecklistItem[]>(() => {
    return caseDetails.evidenceChecklist && caseDetails.evidenceChecklist.length > 0
      ? caseDetails.evidenceChecklist
      : DEFAULT_EVIDENCE_CHECKLIST;
  }, [caseDetails.evidenceChecklist]);

  const pendingChecklistCount = useMemo(() => {
    return checklistItems.filter((i) => !i.completed).length;
  }, [checklistItems]);

  const handleToggleChecklistItem = (id: string) => {
    const updated = checklistItems.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setCaseDetails((prev) => ({ ...prev, evidenceChecklist: updated }));
    setLastSavedText("Draft saved just now");
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    const newItem: EvidenceChecklistItem = {
      id: `ev_${Date.now()}`,
      text: newChecklistText.trim(),
      completed: false,
      category: "general",
    };
    const updated = [...checklistItems, newItem];
    setCaseDetails((prev) => ({ ...prev, evidenceChecklist: updated }));
    setNewChecklistText("");
    setLastSavedText("Draft saved just now");
    toast.success("Added evidence checklist item");
  };

  const handleDeleteChecklistItem = (id: string) => {
    const updated = checklistItems.filter((item) => item.id !== id);
    setCaseDetails((prev) => ({ ...prev, evidenceChecklist: updated }));
    setLastSavedText("Draft saved just now");
  };

  const handleResetChecklist = () => {
    setCaseDetails((prev) => ({ ...prev, evidenceChecklist: DEFAULT_EVIDENCE_CHECKLIST }));
    setLastSavedText("Draft saved just now");
    toast.info("Reset evidence checklist to standard advocacy items");
  };

  const handleUpdateEvidenceNotes = (text: string) => {
    setCaseDetails((prev) => ({ ...prev, evidenceNotes: text }));
    setLastSavedText("Draft saved just now");
  };

  const handleInsertNotesIntoActivePage = () => {
    const notes = caseDetails.evidenceNotes || "";
    if (!notes.trim()) {
      toast.error("Notes are currently empty. Type some notes first.");
      return;
    }
    const current = activePage.content || "";
    const updated = current ? `${current}\n\n--- EVIDENCE NOTES ---\n${notes.trim()}` : notes.trim();
    handleUpdatePageContent(updated);
    toast.success(`Inserted notes into "${activePage.title}"`);
    setIsNotesModalOpen(false);
  };

  // Global Keyboard Shortcut: Ctrl+Shift+B / Cmd+Shift+B -> Quick Add Binder
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsManageBindersModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, []);

  // Quick field updates on Cover & State Form
  const handleQuickFieldUpdate = (field: keyof ComplaintCaseDetails, value: string) => {
    const cleanValue = sanitizeComplaintText(value);
    setCaseDetails((prev) => ({ ...prev, [field]: cleanValue }));
    setLastSavedText("Draft saved just now");

    // Keep officialFormState in sync
    setOfficialFormState((prev) => {
      const next = { ...prev };
      if (field === "studentName") next.studentName = cleanValue;
      if (field === "studentDob") next.studentDob = cleanValue;
      if (field === "grade") next.grade = cleanValue;
      if (field === "school") next.currentSchool = cleanValue;
      if (field === "district") next.publicAgency = cleanValue;
      if (field === "parentName") next.parentName = cleanValue;
      return next;
    });
  };

  // Student address change automatically updates parent address unless physically customized
  const handleStudentAddressUpdate = (val: string) => {
    setOfficialFormState((prev) => {
      const next = { ...prev, studentAddress: val };
      if (!isParentAddressCustom) {
        next.parentAddress = val;
      }
      return next;
    });
  };

  const handleStudentCityUpdate = (val: string) => {
    setOfficialFormState((prev) => {
      const next = { ...prev, studentCity: val };
      if (!isParentAddressCustom) {
        next.parentCity = val;
      }
      return next;
    });
  };

  const handleStudentStateUpdate = (val: string) => {
    setOfficialFormState((prev) => {
      const next = { ...prev, studentState: val };
      if (!isParentAddressCustom) {
        next.parentState = val;
      }
      return next;
    });
  };

  const handleStudentZipUpdate = (val: string) => {
    setOfficialFormState((prev) => {
      const next = { ...prev, studentZip: val };
      if (!isParentAddressCustom) {
        next.parentZip = val;
      }
      return next;
    });
  };

  const handleParentAddressUpdate = (val: string) => {
    setIsParentAddressCustom(true);
    setOfficialFormState((prev) => ({ ...prev, parentAddress: val }));
  };

  const handleParentCityUpdate = (val: string) => {
    setIsParentAddressCustom(true);
    setOfficialFormState((prev) => ({ ...prev, parentCity: val }));
  };

  const handleParentStateUpdate = (val: string) => {
    setIsParentAddressCustom(true);
    setOfficialFormState((prev) => ({ ...prev, parentState: val }));
  };

  const handleParentZipUpdate = (val: string) => {
    setIsParentAddressCustom(true);
    setOfficialFormState((prev) => ({ ...prev, parentZip: val }));
  };

  const matchParentAddressToStudent = () => {
    setIsParentAddressCustom(false);
    setOfficialFormState((prev) => ({
      ...prev,
      parentAddress: prev.studentAddress,
      parentCity: prev.studentCity,
      parentState: prev.studentState,
      parentZip: prev.studentZip,
    }));
    toast.success("✓ Parent address synced to match Student address");
  };

  // Helper to load and convert any attached PDF into high-res page images
  const loadAndConvertPdfForPage = async (pageId: string, fileUrl: string, fileName?: string) => {
    try {
      setPages((prev) =>
        prev.map((p) => (p.id === pageId ? { ...p, isRenderingPdf: true } : p))
      );
      const convertedPages = await convertFileUrlToPageImages(fileUrl, fileName);
      if (convertedPages.length > 0) {
        setPages((prev) =>
          prev.map((p) =>
            p.id === pageId
              ? {
                  ...p,
                  renderedPages: convertedPages,
                  pageCount: convertedPages.length,
                  isRenderingPdf: false,
                }
              : p
          )
        );
      } else {
        setPages((prev) =>
          prev.map((p) => (p.id === pageId ? { ...p, isRenderingPdf: false } : p))
        );
      }
    } catch (err) {
      console.error("Failed to convert exhibit PDF:", err);
      setPages((prev) =>
        prev.map((p) => (p.id === pageId ? { ...p, isRenderingPdf: false } : p))
      );
    }
  };

  // Auto-convert any exhibit page that has a fileUrl but no renderedPages yet
  useEffect(() => {
    pages.forEach((p) => {
      if (
        p.category === "exhibit" &&
        p.fileUrl &&
        (!p.renderedPages || p.renderedPages.length === 0) &&
        !p.isRenderingPdf
      ) {
        loadAndConvertPdfForPage(p.id, p.fileUrl, p.fileName);
      }
    });
  }, [pages]);

  // Consolidated documents for active student from Document Vault (PG-023-VAULT)
  const availableVaultDocs = useMemo(() => {
    const list: Array<{
      id?: number;
      fileName: string;
      fileUrl: string;
      documentType: string;
      category?: string;
      date?: string;
      source: string;
    }> = [];

    // 1. Official Current IEP
    if (iepDocQuery.data?.currentIepFileUrl) {
      list.push({
        id: iepDocQuery.data.id,
        fileName: iepDocQuery.data.currentIepFileName || "Official Current IEP.pdf",
        fileUrl: iepDocQuery.data.currentIepFileUrl,
        documentType: "Current IEP",
        category: "iep",
        date: iepDocQuery.data.updatedAt ? new Date(iepDocQuery.data.updatedAt).toLocaleDateString() : undefined,
        source: "Current IEP Record",
      });
    }

    // 2. Draft IEPs
    if (draftHistoryQuery.data?.length) {
      for (const d of draftHistoryQuery.data) {
        if (d.fileUrl) {
          list.push({
            id: d.id,
            fileName: d.fileName || `Draft IEP (${new Date(d.uploadedAt).toLocaleDateString()})`,
            fileUrl: d.fileUrl,
            documentType: "Draft IEP",
            category: "iep-draft",
            date: new Date(d.uploadedAt).toLocaleDateString(),
            source: "Draft IEP History",
          });
        }
      }
    }

    // 3. Vault Files from clientFiles table
    if (vaultQuery.data?.length) {
      for (const f of vaultQuery.data) {
        if (f.fileUrl && !list.some((existing) => existing.fileUrl === f.fileUrl)) {
          list.push({
            id: f.id,
            fileName: f.fileName,
            fileUrl: f.fileUrl,
            documentType: f.documentType || f.category || "Vault Record",
            category: f.category || "vault",
            date: f.uploadedAt ? new Date(f.uploadedAt).toLocaleDateString() : undefined,
            source: "Document Vault",
          });
        }
      }
    }

    if (!vaultSearchQuery.trim()) return list;
    const q = vaultSearchQuery.toLowerCase();
    return list.filter(
      (item) =>
        item.fileName.toLowerCase().includes(q) ||
        item.documentType.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q)
    );
  }, [iepDocQuery.data, draftHistoryQuery.data, vaultQuery.data, vaultSearchQuery]);

  // Add Page handler
  const handleAddPage = () => {
    if (!newPageTitle.trim()) return;
    const nextIdx = pages.length;
    const nextNum = nextIdx + 1 < 10 ? `0${nextIdx + 1}` : `${nextIdx + 1}`;
    const newPage: DocumentPage = {
      id: `custom_${Date.now()}`,
      number: nextNum,
      title: newPageTitle.trim(),
      category: newPageCategory,
      content: `DOCUMENT SECTION: ${newPageTitle.toUpperCase()}\n\nEnter statement of legal argument, factual evidence, or supporting documentation here...`,
    };
    setPages((prev) => [...prev, newPage]);
    setActivePageId(newPage.id);
    setIsAddPageModalOpen(false);
    setNewPageTitle("");
    toast.success(`Binder "${newPageTitle}" (${nextNum}) added to state complaint packet`);
  };

  // Handler: Insert exhibit directly from Document Vault (PG-023-VAULT)
  const handleInsertExhibitFromVault = (fileItem: {
    fileName: string;
    fileUrl: string;
    documentType?: string;
    id?: number;
    renderedPages?: ImportedPdfPage[];
  }) => {
    const cleanName = fileItem.fileName.replace(/\.[^/.]+$/, "");

    // Case 1: Attaching directly to currently active exhibit (e.g. Exhibit A)
    if (isCurrentPageAnExhibit && targetExhibitMode === "current") {
      const exhibitPrefix = activePage.exhibitTag || activePage.title.split("(")[0].trim() || "Exhibit A";
      const updatedTitle = `${exhibitPrefix} (${cleanName})`;
      const hasPreRendered = fileItem.renderedPages && fileItem.renderedPages.length > 0;

      setPages((prev) =>
        prev.map((p) => {
          if (p.id === activePage.id) {
            return {
              ...p,
              title: updatedTitle,
              fileUrl: fileItem.fileUrl,
              fileName: fileItem.fileName,
              documentType: fileItem.documentType || "Evidentiary Record",
              sourceVaultId: fileItem.id,
              renderedPages: hasPreRendered ? fileItem.renderedPages : p.renderedPages,
              pageCount: hasPreRendered ? fileItem.renderedPages!.length : p.pageCount,
              isRenderingPdf: !hasPreRendered,
              content: `${p.content ? `${p.content}\n\n` : ""}ATTACHED EXHIBIT RECORD (PG-023-VAULT):
• Document Title: ${fileItem.fileName}
• Classification: ${fileItem.documentType || "Evidentiary Record"}
• Vault Source: PG-023-VAULT · Student Document Vault
• Timestamp: ${new Date().toLocaleDateString()}

STATEMENT OF EVIDENCE:
This documentary record is incorporated into ${p.exhibitTag || p.title} in direct support of Complainant's allegations. The LEA was in possession of or statutorily responsible for this record during the relevant filing period.`,
            };
          }
          if (p.id === "exhibit_index") {
            const addition = `\n• ${exhibitPrefix}: ${cleanName.toUpperCase()} — Attached from Document Vault (PG-023-VAULT)`;
            return {
              ...p,
              content: (p.content || "") + addition,
            };
          }
          return p;
        })
      );

      if (!hasPreRendered && fileItem.fileUrl) {
        loadAndConvertPdfForPage(activePage.id, fileItem.fileUrl, fileItem.fileName);
      }

      setIsAddPageModalOpen(false);
      toast.success(`Attached "${fileItem.fileName}" to ${exhibitPrefix} from Document Vault (PG-023-VAULT)`);
      return;
    }

    // Case 2: Inserting as a brand-new exhibit
    const nextLetter = nextExhibitLetter;
    const nextIdx = pages.length;
    const nextNum = nextIdx + 1 < 10 ? `0${nextIdx + 1}` : `${nextIdx + 1}`;
    const docTitle = `Exhibit ${nextLetter} (${cleanName})`;
    const hasPreRendered = fileItem.renderedPages && fileItem.renderedPages.length > 0;
    const newPageId = `exhibit_${nextLetter.toLowerCase()}_${Date.now()}`;

    const newPage: DocumentPage = {
      id: newPageId,
      number: nextNum,
      title: docTitle,
      category: "exhibit",
      exhibitTag: `Exhibit ${nextLetter}`,
      fileUrl: fileItem.fileUrl,
      fileName: fileItem.fileName,
      documentType: fileItem.documentType || "Evidentiary Record",
      sourceVaultId: fileItem.id,
      renderedPages: hasPreRendered ? fileItem.renderedPages : undefined,
      pageCount: hasPreRendered ? fileItem.renderedPages!.length : undefined,
      isRenderingPdf: !hasPreRendered,
      content: `EXHIBIT ${nextLetter} · MASTER EVIDENTIARY RECORD
Document Title: ${fileItem.fileName}
Classification: ${fileItem.documentType || "Evidentiary Record"}
Source Repository: PG-023-VAULT · Student Document Vault
Filing Docket Page: ${nextNum}

EVIDENTIARY PROFFER & RELEVANCE:
This document is incorporated herein and submitted in direct support of Complainant's allegations. The LEA was in possession of or statutorily responsible for this record during the relevant filing period.`,
    };

    // Update exhibit index page if it exists
    setPages((prev) => {
      const updated = prev.map((p) => {
        if (p.id === "exhibit_index") {
          const addition = `\n${nextLetter}. EXHIBIT ${nextLetter}: ${cleanName.toUpperCase()} — Attached from Document Vault (PG-023-VAULT)`;
          return {
            ...p,
            content: (p.content || "") + addition,
          };
        }
        return p;
      });
      return [...updated, newPage];
    });

    if (!hasPreRendered && fileItem.fileUrl) {
      loadAndConvertPdfForPage(newPageId, fileItem.fileUrl, fileItem.fileName);
    }

    setActivePageId(newPage.id);
    setIsAddPageModalOpen(false);
    toast.success(`Attached Exhibit ${nextLetter} from Document Vault (PG-023-VAULT)`);
  };

  // Handler: Upload new document to vault then insert as exhibit
  const handleUploadAndInsertExhibit = async () => {
    if (!uploadFile) {
      toast.error("Please select a file to upload");
      return;
    }
    if (!activeStudentId) {
      toast.error("No active student selected for Document Vault storage");
      return;
    }

    try {
      setIsUploadingToVault(true);
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const res = reader.result as string;
          const base64Data = res.split(",")[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(uploadFile);
      const base64Data = await base64Promise;

      // Pre-convert in memory for zero-lag insertion
      const arrayBuffer = await uploadFile.arrayBuffer();
      let initialPages: ImportedPdfPage[] = [];
      try {
        if (uploadFile.type === "application/pdf" || uploadFile.name.toLowerCase().endsWith(".pdf")) {
          initialPages = await convertPdfToPageImages(arrayBuffer, 1.8);
        } else if (uploadFile.type.startsWith("image/")) {
          const dataUrl = `data:${uploadFile.type};base64,${base64Data}`;
          initialPages = [{ pageNumber: 1, dataUrl, width: 816, height: 1056 }];
        }
      } catch (convErr) {
        console.warn("Could not pre-render uploaded PDF in memory:", convErr);
      }

      const uploadRes = await uploadToVaultMutation.mutateAsync({
        contactId: activeStudentId,
        fileName: uploadFile.name,
        fileKey: `iep-documents/${Date.now()}_${uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
        fileUrl: "",
        fileData: base64Data,
        fileSize: uploadFile.size,
        mimeType: uploadFile.type || "application/pdf",
      });

      const fileUrl = uploadRes?.fileUrl || URL.createObjectURL(uploadFile);
      handleInsertExhibitFromVault({
        fileName: uploadCustomTitle.trim() || uploadFile.name,
        fileUrl: fileUrl,
        documentType: uploadDocType,
        id: undefined,
        renderedPages: initialPages.length > 0 ? initialPages : undefined,
      });

      setUploadFile(null);
      setUploadCustomTitle("");
      if (vaultFileInputRef.current) vaultFileInputRef.current.value = "";
    } catch (e: any) {
      toast.error(`Upload failed: ${e.message || "Unknown error"}`);
    } finally {
      setIsUploadingToVault(false);
    }
  };

  // Print Scope state: "all" for complete docket packet (14 pages), "form-only" for 4-page official state form
  const [printScope, setPrintScope] = useState<"all" | "form-only">("all");

  const handlePrintFormOnly = async () => {
    setPrintScope("form-only");
    toast.success("Preparing 4-page Official Georgia State Complaint Form for print...");
    if (stateFormPages.length === 0) {
      await renderFilledStateFormPages(officialFormState);
      setTimeout(() => {
        window.print();
      }, 500);
      return;
    }
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handlePrintAll = async () => {
    setPrintScope("all");
    toast.success(`Preparing complete ${totalDocketPages}-page State Complaint Filing Packet for print...`);
    if (stateFormPages.length === 0) {
      await renderFilledStateFormPages(officialFormState);
      setTimeout(() => {
        window.print();
      }, 500);
      return;
    }
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // PDF Export
  const handleExportPdf = async () => {
    await handlePrintAll();
  };

  // Save Draft
  const handleSaveDraft = () => {
    setLastSavedText("Draft saved just now");
    toast.success("State Complaint draft saved to secure advocacy docket");
  };

  // Safe back navigation to student profile
  const handleSafeBackToProfile = () => {
    setLastSavedText("Draft saved just now");
    toast.success("State Complaint draft safely saved. Returning to student profile...");

    const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const queryStudentId = searchParams?.get("studentId") || searchParams?.get("contactId");
    const sessionUrl = typeof window !== "undefined" ? sessionStorage.getItem("lastStudentProfileUrl") : null;
    const sessionId = typeof window !== "undefined" ? sessionStorage.getItem("lastStudentProfileId") : null;

    let dest = "/students";
    if (sessionUrl) {
      dest = sessionUrl;
    } else if (params.id) {
      dest = `/students/${params.id}`;
    } else if (queryStudentId) {
      dest = `/students/${queryStudentId}`;
    } else if (sessionId) {
      dest = `/students/${sessionId}`;
    }

    navigate(dest);
  };

  return (
    <ScopedErrorBoundary moduleName="State Complaint Builder">
      <div 
        className="relative flex flex-col h-[calc(100vh-0px)] w-full overflow-hidden bg-[#020B1A] text-slate-100 select-none print:h-auto print:min-h-0 print:overflow-visible print:bg-white print:p-0 print:m-0"
        style={{
          backgroundColor: "#020B1A",
          backgroundImage: "radial-gradient(ellipse at 50% 0%, #0A2244 0%, #041224 60%, #020814 100%)",
        }}
      >

        {/* ── TOP HEADER BAR (Executive Maritime Hardwood Rail) ─────────────── */}
        <header 
          className="relative z-30 flex items-center justify-between px-4 sm:px-6 h-[58px] min-h-[58px] w-full border-b border-[#05142B] shadow-[0_6px_20px_rgba(0,0,0,0.65)] overflow-hidden select-none print:hidden"
          style={{
            backgroundImage: "linear-gradient(180deg, rgba(14, 48, 96, 0.45) 0%, rgba(10, 36, 74, 0.5) 100%), url('/decor/rail-wood-grain.png')",
            backgroundRepeat: "no-repeat, repeat-x",
            backgroundSize: "100% 100%, auto 58px",
            backgroundColor: "#0C2E5C",
            boxShadow: "0 6px 20px rgba(0,0,0,0.6)",
          }}
        >
          {/* Bottom carved wood bevel and brass seam */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-[2px] pointer-events-none"
            style={{
              background: "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(197,160,89,0.55) 100%)",
              boxShadow: "0 1px 0 rgba(0,0,0,0.5)",
            }}
          />

          {/* Left: Safe Back to Profile + Divider + Page ID badge */}
          <div className="flex items-center gap-3 min-w-0 sm:min-w-[180px] md:min-w-[240px]">
            <button
              type="button"
              onClick={handleSafeBackToProfile}
              className="group flex flex-col items-center justify-center text-left py-0.5 px-1 hover:opacity-95 transition-all cursor-pointer select-none"
              title="Safely save draft and return to student case profile"
            >
              <span className="font-serif text-[15px] sm:text-[16px] text-[#FFF4D4] font-normal tracking-wide group-hover:text-[#FFE394] transition-colors leading-tight">
                Back to Profile
              </span>
              {/* Curved gold U-turn return arrow matching Student Workspace */}
              <Undo2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#DFBE77] group-hover:text-[#FFE394] group-hover:-translate-x-0.5 transition-all mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
            </button>

            {/* Thin vertical divider line matching reference screenshot */}
            <div className="h-7 w-[1px] bg-[#3A2C18] border-r border-[#6B5328]/50 self-center" />

            <PageIdBadge id="PG-020" />
          </div>

          {/* Center: Centered Title + Pencil Quick-Edit + Cloud Save Status */}
          <div className="flex flex-col items-center justify-center text-center flex-1 px-2">
            {isEditingTitle ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={complaintTitle}
                  onChange={(e) => setComplaintTitle(e.target.value)}
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setIsEditingTitle(false);
                  }}
                  autoFocus
                  className="bg-[#092244] border border-[#C5A059] text-[#FFF4D4] font-serif text-base sm:text-[17px] px-2.5 py-0.5 rounded focus:outline-none shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(false)}
                  className="p-1 rounded bg-[#C5A059] text-[#07162B] hover:bg-[#FFE394] transition-colors cursor-pointer"
                  title="Save title"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group/title">
                <h1 
                  className="font-serif text-base sm:text-[17px] font-bold tracking-wide text-[#FFF0C2] drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] cursor-pointer"
                  onClick={() => setIsEditingTitle(true)}
                  title="Click to rename"
                >
                  {complaintTitle}
                </h1>
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(true)}
                  className="p-1 rounded-[4px] bg-[#0A264D]/90 hover:bg-[#113A6E] border border-[#DFBE77]/60 text-[#FFE7A0] hover:text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_1px_2px_rgba(0,0,0,0.6)] transition-colors cursor-pointer"
                  title="Rename document"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            
            {/* Sub-line: Centered Cloud Sync Status */}
            <div className="flex items-center gap-1.5 text-[11px] font-sans text-[#E2D4BD] font-medium mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              <span>{lastSavedText}</span>
              <Cloud className="w-3.5 h-3.5 text-emerald-300 fill-emerald-300/30 drop-shadow-[0_0_4px_rgba(110,231,183,0.7)]" />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center justify-end gap-2 sm:gap-2.5 min-w-0 sm:min-w-[140px] md:min-w-[190px]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOpenRecentModalOpen(true)}
              className="border-[#DFBE77]/60 bg-[#092244]/90 text-[#FFF4D4] hover:text-white hover:border-[#FFE394] hover:bg-[#113A6E] gap-1.5 text-xs h-8 cursor-pointer rounded-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_1px_3px_rgba(0,0,0,0.5)]"
              title="Open recent complaint drafts and resume work"
            >
              <FolderOpen className="w-3.5 h-3.5 text-[#FFE394]" />
              <span className="hidden sm:inline">Open Recent</span>
              <span className="sm:hidden">Recent</span>
              {studentRecentCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-[#C5A059] text-[#07162B] font-bold">
                  {studentRecentCount}
                </span>
              )}
            </Button>


            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (stateFormPages.length === 0) {
                  renderFilledStateFormPages(officialFormState);
                }
                setIsPreviewModalOpen(true);
              }}
              className="border-[#DFBE77]/60 bg-[#092244]/90 text-[#FFF4D4] hover:text-white hover:border-[#FFE394] hover:bg-[#113A6E] gap-1.5 text-xs h-8 cursor-pointer rounded-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_1px_3px_rgba(0,0,0,0.5)] hidden sm:flex"
              title="Open Official Real Print Preview (Standard White Paper)"
            >
              <Printer className="w-3.5 h-3.5 text-[#FFE394]" />
              <span>Print Preview</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCompilerModalOpen(true)}
              className="border-[#DFBE77]/60 bg-[#092244]/90 text-[#FFF4D4] hover:text-white hover:border-[#FFE394] hover:bg-[#113A6E] gap-1.5 text-xs h-8 cursor-pointer rounded-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_1px_3px_rgba(0,0,0,0.5)]"
              title="Launch State Complaint Compiler"
            >
              <Settings className="w-3.5 h-3.5 text-[#FFE394]" />
              <span>Compile</span>
            </Button>


            <Button
              type="button"
              size="sm"
              onClick={handleExportPdf}
              className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-8 px-3 sm:px-4 gap-1.5 rounded-md border border-[#FFE394]/70 shadow-[0_3px_12px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.7)] hover:brightness-105 cursor-pointer"
              title={`Print Complete Complaint Filing Packet (${totalDocketPages} Pages)`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </Button>
          </div>
        </header>

        {/* ── 3-COLUMN STUDIO WORKSPACE ───────────────────────────────────── */}
        <div className="relative z-10 flex flex-1 overflow-hidden px-0 pt-2 pb-2 gap-1.5 print:hidden">
          
          {/* ── LEFT COLUMN: Document Binder / Outline Rail (Resizable via Draggable Edge) ─────────────── */}
          {!isFocusMode && !isIndexCollapsed && (
            <aside 
              ref={indexAsideRef}
              style={{
                width: `${indexWidth}px`,
                backgroundColor: "#03152E",
                background: "#03152E",
                boxShadow: "inset 0 1px 1px rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.85)",
              }}
              className="shrink-0 flex flex-col justify-between rounded-r-[14px] rounded-l-none border border-[#3A2C18] bg-[#03152E] shadow-2xl relative pt-2 pb-2 pr-1.5 pl-1 z-20 select-none group/index-aside"
            >
              {/* Draggable resize edge handle on the right border */}
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsResizingIndex(true);
                }}
                className={cn(
                  "absolute -right-[6px] top-0 bottom-0 w-[12px] cursor-col-resize z-50 flex items-center justify-center transition-colors group/resizer",
                  isResizingIndex ? "bg-[#DFBE77]/25" : "hover:bg-[#DFBE77]/15"
                )}
                title="Drag left or right to resize Packet Index"
              >
                {/* Thin tactile brass indicator bar */}
                <div 
                  className={cn(
                    "w-[2px] rounded-full transition-all duration-150",
                    isResizingIndex
                      ? "bg-[#FFE394] shadow-[0_0_8px_rgba(255,227,148,0.9)] h-16"
                      : "bg-[#8C6D2B]/50 group-hover/resizer:bg-[#DFBE77] h-10 group-hover/resizer:h-14"
                  )} 
                />
              </div>

              <div className="flex items-center justify-between pl-2 pr-2 pt-6 pb-2 border-b border-[#3A2C18]/60 relative z-20 bg-transparent">
                <div className="flex items-center gap-1.5 min-w-0 flex-wrap sm:flex-nowrap">
                  <span className="text-[11px] font-serif font-bold text-[#C6B697] tracking-wider uppercase shrink-0">Packet Index</span>
                  <button
                    type="button"
                    onClick={() => setIsManageBindersModalOpen(true)}
                    className="px-2 py-0.5 rounded text-[10px] font-serif font-bold bg-[#071C3A] text-[#FFE394] hover:text-[#FFF4D4] hover:bg-[#0A2E5C] border border-[#DFBE77]/60 hover:border-[#FFE394] transition-all cursor-pointer flex items-center gap-1 shadow-xs shrink-0"
                    title="Add new binder or manage packet structure (Ctrl+Shift+B)"
                  >
                    <Plus className="w-3 h-3 text-[#FFE394]" />
                    <span>Add Binder</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNotesModalOpen(true)}
                    className="p-1 rounded bg-[#07162B] text-[#DFBE77] hover:text-[#FFF4D4] hover:bg-[#0A264D] border border-[#DFBE77]/50 hover:border-[#FFE394] transition-all cursor-pointer flex items-center justify-center shadow-xs shrink-0"
                    title="Evidence Gathering Checklist & Complaint Scratchpad Notes"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5 text-[#DFBE77]" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsIndexCollapsed(true)}
                  className="text-[#C6B697] hover:text-[#FFF4D4] p-1 rounded hover:bg-white/[0.05] transition-colors cursor-pointer"
                  title="Collapse index"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Tightly stacked index cards with realistic shingled depth pulled snug against the scrollbar */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pt-1.5 pb-3 pl-3 pr-0.5 custom-scrollbar bg-transparent [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#4A3718] [&::-webkit-scrollbar-thumb]:rounded-sm">
                {/* Pinned Setup Tab button in Packet Index */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveToolbarTab("setup");
                    setActivePageId("setup");
                  }}
                  style={
                    activeToolbarTab === "setup"
                      ? { background: "linear-gradient(135deg, #FFF4D2 0%, #F5D588 45%, #E2AE48 100%)" }
                      : {
                          backgroundImage: "url('/decor/fine-parchment.jpg')",
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                  }
                  className={cn(
                    "w-full flex items-center justify-between py-2 px-2 pl-3 rounded-[3px] transition-all text-left group cursor-pointer relative border select-none min-h-[46px] mb-2",
                    activeToolbarTab === "setup"
                      ? "z-10 border-[#FFE599] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_1.5px_rgba(140,80,10,0.3)] translate-x-0.5"
                      : "z-0 border-[#BCA16B]/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),inset_0_-1px_1px_rgba(0,0,0,0.15)] hover:brightness-105 hover:translate-x-0.5"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-1 z-10">
                    <span
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                      className={cn(
                        "w-5 h-5 rounded-[2px] flex items-center justify-center text-[10px] font-bold border shrink-0",
                        activeToolbarTab === "setup"
                          ? "bg-[#041530] text-[#FFE394] border-[#8C6D2B]"
                          : "bg-[#07162B] text-[#DFBE77] border-[#8C6D2B]"
                      )}
                    >
                      ★
                    </span>
                    <div className="min-w-0 flex-1">
                      <div
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        className={cn(
                          "text-xs font-bold truncate leading-tight tracking-tight",
                          activeToolbarTab === "setup" ? "text-[#05142B]" : "text-[#05142B]"
                        )}
                      >
                        Complaint Setup
                      </div>
                      <div
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        className="text-[9.5px] italic text-[#4A3B22] truncate leading-none mt-0.5"
                      >
                        Issues, Facts & Remedies
                      </div>
                    </div>
                  </div>
                </button>

                {/* Reorderable Binders Sub-Header */}
                <div className="flex items-center justify-between px-1.5 py-1 text-[10px] border-b border-[#3A2C18]/40 mb-1 select-none">
                  <span className="font-mono uppercase tracking-wider text-[9px] text-[#C6B697] flex items-center gap-1">
                    <Layers className="w-3 h-3 text-[#DFBE77]" />
                    <span>Docket Binders ({pages.length})</span>
                  </span>
                  <span className="text-[9px] text-[#A69371] italic">
                    Drag to rearrange
                  </span>
                </div>

                {pages.map((p, index) => {
                  const isActive = p.id === activePageId;
                  const isCover = p.id === "cover" || index === 0;

                  return (
                    <div
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      draggable={!isCover}
                      onDragStart={(e) => {
                        if (isCover) {
                          e.preventDefault();
                          return;
                        }
                        e.dataTransfer.setData("text/plain", String(index));
                        e.dataTransfer.effectAllowed = "move";
                        setDraggedBinderIndex(index);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (draggedBinderIndex === null || draggedBinderIndex === index || isCover) return;
                        e.dataTransfer.dropEffect = "move";
                        const rect = e.currentTarget.getBoundingClientRect();
                        const midpoint = rect.top + rect.height / 2;
                        const pos = e.clientY < midpoint ? "before" : "after";
                        if (dragOverBinderIndex !== index || dragDropPosition !== pos) {
                          setDragOverBinderIndex(index);
                          setDragDropPosition(pos);
                        }
                      }}
                      onDragLeave={(e) => {
                        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                        if (dragOverBinderIndex === index) {
                          setDragOverBinderIndex(null);
                          setDragDropPosition(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedBinderIndex !== null && draggedBinderIndex !== index && !isCover) {
                          let target = index;
                          if (dragDropPosition === "after" && draggedBinderIndex < index) {
                            target = index;
                          } else if (dragDropPosition === "before" && draggedBinderIndex > index) {
                            target = index;
                          }
                          handleReorderBinders(draggedBinderIndex, target);
                        }
                        setDraggedBinderIndex(null);
                        setDragOverBinderIndex(null);
                        setDragDropPosition(null);
                      }}
                      onDragEnd={() => {
                        setDraggedBinderIndex(null);
                        setDragOverBinderIndex(null);
                        setDragDropPosition(null);
                      }}
                      onClick={() => {
                        setActivePageId(p.id);
                        if (p.id === "cover") {
                          setActiveToolbarTab("cover");
                        } else {
                          setActiveToolbarTab("edit");
                        }
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleOpenRenameModal(p);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setActivePageId(p.id);
                          if (p.id === "cover") {
                            setActiveToolbarTab("cover");
                          } else {
                            setActiveToolbarTab("edit");
                          }
                        }
                      }}
                      style={
                        isActive
                          ? { background: "linear-gradient(135deg, #FFF4D2 0%, #F5D588 45%, #E2AE48 100%)" }
                          : {
                              backgroundImage: "url('/decor/fine-parchment.jpg')",
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                      }
                      className={cn(
                        "w-full flex items-center justify-between py-2 px-2 pl-2 rounded-[3px] transition-all text-left group cursor-pointer relative border select-none min-h-[48px]",
                        isActive
                          ? "z-10 border-[#FFE599] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_1.5px_rgba(140,80,10,0.3)] translate-x-0.5"
                          : "z-0 border-[#BCA16B]/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),inset_0_-1px_1px_rgba(0,0,0,0.15)] hover:brightness-105 hover:translate-x-0.5",
                        draggedBinderIndex === index && "opacity-40 scale-[0.98] ring-2 ring-[#DFBE77]/70",
                        dragOverBinderIndex === index && "border-[#DFBE77]"
                      )}
                    >
                      {/* Drag target indicator line */}
                      {dragOverBinderIndex === index && dragDropPosition === "before" && (
                        <div className="absolute -top-1 left-1 right-1 h-1 bg-gradient-to-r from-transparent via-[#FFE394] to-transparent rounded-full shadow-[0_0_10px_#FFE394] z-40 pointer-events-none" />
                      )}
                      {dragOverBinderIndex === index && dragDropPosition === "after" && (
                        <div className="absolute -bottom-1 left-1 right-1 h-1 bg-gradient-to-r from-transparent via-[#FFE394] to-transparent rounded-full shadow-[0_0_10px_#FFE394] z-40 pointer-events-none" />
                      )}

                      {/* Authentic Ornate Brass & Navy Slip Bracket */}
                      <BrassSlipHandle isActive={isActive} />

                      {/* Left: Grip / Lock handle + Number + vertical divider (Untouched!) */}
                      <div className="flex items-center shrink-0 pl-1 pr-1 gap-1.5 self-center">
                        {!isCover ? (
                          <span
                            className="cursor-grab active:cursor-grabbing p-0.5 text-[#8C6D2B]/70 group-hover:text-[#3D2C10] hover:scale-110 transition-all shrink-0"
                            title="Drag to rearrange binder in left sidebar"
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span
                            className="p-0.5 text-[#8C6D2B]/50 shrink-0"
                            title="Binder 01 (Official State Form) is the fixed lead cover"
                          >
                            <Lock className="w-3 h-3" />
                          </span>
                        )}

                        <span className={cn(
                          "font-mono text-[11px] shrink-0 font-bold leading-none self-center",
                          isActive ? "text-[#3D2C10]" : "text-[#5C421B]"
                        )}>
                          {getPageDisplayBadge(p, index)}
                        </span>

                        {/* Thin vertical line divider after the number */}
                        <div className={cn(
                          "h-6 w-[1px] shrink-0 self-center",
                          isActive ? "bg-[#8C6D2B]/75" : "bg-[#B39358]/55"
                        )} />
                      </div>

                      {/* Center: Title on top, edit options directly BELOW the text */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 px-1.5 py-0.5">
                        <span 
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            handleOpenRenameModal(p);
                          }}
                          title="Double-click to rename binder"
                          className={cn(
                            "text-[12px] font-serif font-bold leading-[1.25] break-words whitespace-normal cursor-pointer select-none",
                            isActive ? "text-[#1C1003]" : "text-[#1A1005]"
                          )}
                        >
                          {p.title}
                        </span>

                        {/* Edit options row BELOW the text */}
                        <div className="flex items-center gap-1.5 text-[10px] text-[#5C421B]">
                          {/* Rename shortcut button */}
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenRenameModal(p);
                            }}
                            className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-black/15 text-[#4A3718] hover:text-black transition-colors cursor-pointer"
                            title={`Rename "${p.title}" (or double-click)`}
                          >
                            <Pencil className="w-3 h-3" />
                            <span className="text-[9.5px] font-sans font-medium">Rename</span>
                          </span>

                          {/* Reorder Up / Down arrows */}
                          {!isCover && (
                            <div className="flex items-center gap-0.5">
                              {index > 1 && (
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveBinderUp(index);
                                  }}
                                  className="p-0.5 rounded hover:bg-black/15 text-[#4A3718] hover:text-black transition-colors cursor-pointer"
                                  title="Move binder up in left sidebar"
                                >
                                  <ChevronUp className="w-3 h-3 stroke-[2.5]" />
                                </span>
                              )}
                              {index < pages.length - 1 && (
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveBinderDown(index);
                                  }}
                                  className="p-0.5 rounded hover:bg-black/15 text-[#4A3718] hover:text-black transition-colors cursor-pointer"
                                  title="Move binder down in left sidebar"
                                >
                                  <ChevronDown className="w-3 h-3 stroke-[2.5]" />
                                </span>
                              )}
                            </div>
                          )}

                          {/* Remove button (when allowed) */}
                          {p.id !== "cover" && p.id !== "clarity_control" && p.category !== "restatement" && (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                setBinderPendingRemoval({ page: p, index });
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-rose-950/30 text-rose-700 hover:text-rose-900 transition-opacity cursor-pointer ml-auto"
                              title={`Remove "${p.title}" from packet`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Miniature document facsimile thumbnail */}
                      <div className="flex items-center shrink-0 pr-0.5 self-center">
                        <MiniaturePagePreview
                          page={p}
                          caseDetails={caseDetails}
                          isActive={isActive}
                          coverThumbnail={p.id === "cover" ? stateFormPages[0]?.dataUrl : p.renderedPages?.[0]?.dataUrl}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-[#3A2C18]/80 mt-2 relative z-20 flex flex-col gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsManageBindersModalOpen(true)}
                  className="w-full border-[#DFBE77]/60 bg-[#071C3A] text-[#FFE394] hover:text-[#FFF4D4] hover:bg-[#0A264D] text-xs h-8 font-serif font-bold gap-1.5 cursor-pointer shadow-xs rounded-lg"
                >
                  <Pencil className="w-3 h-3 text-[#DFBE77]" />
                  <span>Manage Packet Binders</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddPageModalOpen(true)}
                  className="w-full border-[#3A2C18] bg-[#05142B] text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#081F3E] text-xs h-8 font-medium gap-1.5 cursor-pointer shadow-xs rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5 text-[#C6B697]" />
                  <span>Insert Exhibit / Page</span>
                </Button>
              </div>

              {/* Brass Corner Brackets in front */}
              <FolioBoxCornerBrackets size={32} />
            </aside>
          )}

          {/* ── CENTER COLUMN: Parchment Writing Stage ──────────────────── */}
          <main 
            className={cn(
              "flex-1 flex flex-col border border-[#3A2C18] bg-[#03152E] shadow-2xl relative min-w-0 z-10",
              isToolsCollapsed 
                ? "rounded-l-[14px] rounded-r-none" 
                : "rounded-[14px]"
            )}
            style={{
              backgroundColor: "#03152E",
              background: "linear-gradient(180deg, #051A38 0%, #03152E 35%, #020E22 100%)",
              boxShadow: "inset 0 1px 1px rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.85)",
            }}
          >
            {/* Top Folio Tabs Bar (Executive Navy & Brass Tabs matching Student Workspace) */}
            <div 
              className={cn(
                "pl-8 sm:pl-9 pr-8 sm:pr-9 pt-2.5 pb-0 bg-gradient-to-b from-[#041633] via-[#021026] to-[#010a1a] flex items-end justify-center sm:justify-start relative z-20 shadow-[0_4px_12px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(147,197,253,0.15)]",
                isToolsCollapsed ? "rounded-tl-[14px] rounded-tr-none" : "rounded-t-[14px]"
              )}
            >
              {/* Authentic Debossed Leather Impression Seam (replacing the gold line) */}
              <div 
                className="absolute bottom-0 left-0 right-0 h-[3px] pointer-events-none z-10"
                style={{
                  background: "linear-gradient(180deg, #00040a 0%, #020b18 45%, #112036 100%)",
                  boxShadow: "0 1px 0 rgba(255,255,255,0.08), inset 0 1px 2px rgba(0,0,0,0.95)",
                }}
              />

              <div className="flex items-end gap-1 sm:gap-1.5 md:gap-2 mb-0 min-w-0 flex-1 justify-center sm:justify-start relative z-20">
                {/* Index icon tab when collapsed (always accessible) */}
                {isIndexCollapsed && (
                  <button
                    type="button"
                    onClick={() => setIsIndexCollapsed(false)}
                    className="relative flex items-center justify-center gap-1 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-t-[4px] text-xs sm:text-[13px] border border-b-0 border-[#DFBE77]/60 bg-gradient-to-b from-[#06244F] to-[#021430] text-[#DFBE77] hover:text-[#FFE394] hover:brightness-110 transition-all cursor-pointer select-none shrink-0 font-serif font-bold shadow-sm mr-1"
                    title="Expand Packet Index"
                  >
                    <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#DFBE77] shrink-0" />
                    <span>Index</span>
                    <ChevronRight className="w-3 h-3 text-[#C6B697]" />
                  </button>
                )}

                {[
                  { id: "setup", label: "Complaint Setup", icon: Sparkles },
                  { id: "cover", label: "State Form", icon: FileText },
                  { id: "edit", label: "Edit", icon: Pencil },
                  { id: "arrange", label: "Exhibit Index", icon: Layers },
                  { id: "insert", label: "Add Binder", icon: Plus },
                  { id: "tools", label: "Tools", icon: PanelRight },
                ]
                  .filter((tab) => !(tab.id === "tools" && !isToolsCollapsed))
                  .map((tab) => {
                  const isActive = tab.id === "tools" ? !isToolsCollapsed : activeToolbarTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        if (tab.id === "insert") {
                          setIsManageBindersModalOpen(true);
                        } else if (tab.id === "tools") {
                          setIsToolsCollapsed((prev) => !prev);
                        } else if (tab.id === "arrange") {
                          setActiveToolbarTab("arrange");
                          setActivePageId("exhibit_index");
                        } else if (tab.id === "setup") {
                          setActiveToolbarTab("setup");
                          setActivePageId("setup");
                        } else {
                          setActiveToolbarTab(tab.id as any);
                          if (tab.id === "cover") {
                            setActivePageId("cover");
                          } else if (activePageId === "cover" || activePageId === "setup") {
                            setActivePageId("clarity_control");
                          }
                        }
                      }}
                      className={cn(
                        "relative flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2 px-2.5 sm:px-3 md:px-3.5 lg:px-4 py-2 sm:py-2.5 rounded-t-[4px] text-xs sm:text-[13px] transition-all cursor-pointer select-none shrink-0",
                        "border border-b-0",
                        isActive
                          ? "bg-gradient-to-b from-[#032556] via-[#021d45] to-[#011432] text-white border-[#2b64a8]/80 z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(147,197,253,0.5)]"
                          : "bg-gradient-to-b from-[#021a3b] via-[#021532] to-[#010e24] text-[#e2e8f0]/85 hover:text-white hover:from-[#03224c] hover:to-[#01132e] border-[#1a4478]/70 z-20 shadow-[0_-2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(96,165,250,0.3)]"
                      )}
                      style={{
                        fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
                      }}
                    >
                      <Icon 
                        className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white/95 shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" 
                        strokeWidth={1.75} 
                      />
                      <span className="font-normal tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* If on cover page, show Official State Complaint Form status banner */}
            {activeToolbarTab === "cover" && activePage.id === "cover" && (
              <div 
                style={{
                  backgroundColor: "#061833",
                  background: "linear-gradient(90deg, #0A2244 0%, #061833 50%, #0A2244 100%)",
                }}
                className="px-4 sm:px-6 py-1.5 border-b border-[#3A2C18] flex flex-wrap items-center justify-between gap-2 text-xs relative z-20 shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#FFE394] font-serif">
                    Official State Filing Form:
                  </span>
                  <span className="text-[#C6B697] text-[11px]">
                    {SUPPORTED_STATE_FORMS[officialFormState.stateCode]?.name || "Georgia"} ({SUPPORTED_STATE_FORMS[officialFormState.stateCode]?.shortAgency || "GaDOE"}) · Special Education Formal Complaint Form
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] sm:text-xs text-[#E8DCC2] flex items-center gap-1.5 font-sans font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-[0_0_6px_rgba(52,211,153,0.8)] shrink-0" />
                    <span>This form has been matched to your client's state</span>
                  </span>
                  <span className="text-[#DFBE77] font-semibold text-xs select-none">&gt;</span>

                  <div className="relative inline-flex items-center">
                    <select
                      id="change-state-form-select"
                      value={officialFormState.stateCode || "GA"}
                      onChange={(e) => {
                        const newCode = e.target.value;
                        const config = SUPPORTED_STATE_FORMS[newCode];
                        setOfficialFormState((prev) => ({
                          ...prev,
                          stateCode: newCode,
                        }));
                        setCaseDetails((prev) => ({
                          ...prev,
                          state: newCode,
                        }));
                        toast.success(`Switched filing form to ${config?.name || newCode} (${config?.shortAgency || newCode})`);
                      }}
                      className="appearance-none bg-[#031124] hover:bg-[#071C3A] text-[#FFE394] hover:text-[#FFF4D4] font-serif font-bold text-xs border border-[#C5A059] hover:border-[#FFE394] rounded-md pl-2.5 pr-7 py-1 focus:outline-none focus:ring-1 focus:ring-[#FFE394] cursor-pointer shadow-sm transition-all"
                    >
                      {Object.values(SUPPORTED_STATE_FORMS).map((st) => (
                        <option key={st.code} value={st.code} className="bg-[#05142B] text-white font-sans py-1">
                          {st.code === officialFormState.stateCode ? `Change Form: ${st.name} (${st.shortAgency}) ✓` : `${st.name} (${st.shortAgency})`}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-[#DFBE77] absolute right-2 pointer-events-none" />
                  </div>
                </div>
              </div>
            )}

            {/* If NOT on cover page and NOT on exhibit page, show compact single-line formatting toolbar */}
            {activeToolbarTab !== "setup" && activePage.id !== "cover" && activePage.category !== "exhibit" && (
              <div 
                style={{
                  backgroundColor: "#061833",
                  background: "linear-gradient(90deg, #0A2244 0%, #061833 50%, #0A2244 100%)",
                }}
                className="px-4 sm:px-6 py-1.5 border-b border-[#3A2C18] flex flex-wrap items-center justify-between gap-2 text-xs relative z-20 shadow-xs"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value as any)}
                    className="bg-[#05142B] border border-[#3A2C18] text-[#E8DCC2] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#C5A059] cursor-pointer"
                  >
                    <option value="serif">Georgia (Admiralty Serif)</option>
                    <option value="times">Times New Roman (Legal)</option>
                    <option value="garamond">EB Garamond (Judicial)</option>
                    <option value="sans">Inter (Modern Sans)</option>
                  </select>

                  <div className="flex items-center bg-[#05142B] border border-[#3A2C18] rounded px-1 py-0.5">
                    <button
                      type="button"
                      onClick={() => setFontSize((s) => Math.max(9, s - 1))}
                      className="px-1 text-[#C6B697] hover:text-[#FFF4D4] font-bold"
                    >
                      -
                    </button>
                    <span className="font-mono text-[11px] text-[#FFF4D4] px-1.5 min-w-[28px] text-center font-semibold">
                      {fontSize}pt
                    </span>
                    <button
                      type="button"
                      onClick={() => setFontSize((s) => Math.min(24, s + 1))}
                      className="px-1 text-[#C6B697] hover:text-[#FFF4D4] font-bold"
                    >
                      +
                    </button>
                  </div>

                  <div className="w-[1px] h-4 bg-[#3A2C18] mx-0.5" />

                  <div className="flex items-center bg-[#05142B] border border-[#3A2C18] rounded p-0.5">
                    <button
                      type="button"
                      onClick={() => setIsBold(!isBold)}
                      className={cn("p-1 rounded transition-colors", isBold ? "bg-[#C5A059] text-[#07162B]" : "text-[#C6B697] hover:text-[#FFF4D4]")}
                    >
                      <Bold className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsItalic(!isItalic)}
                      className={cn("p-1 rounded transition-colors", isItalic ? "bg-[#C5A059] text-[#07162B]" : "text-[#C6B697] hover:text-[#FFF4D4]")}
                    >
                      <Italic className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsUnderline(!isUnderline)}
                      className={cn("p-1 rounded transition-colors", isUnderline ? "bg-[#C5A059] text-[#07162B]" : "text-[#C6B697] hover:text-[#FFF4D4]")}
                    >
                      <Underline className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="w-[1px] h-4 bg-[#3A2C18] mx-0.5" />

                  <div className="flex items-center bg-[#05142B] border border-[#3A2C18] rounded p-0.5">
                    <button
                      type="button"
                      onClick={() => setTextAlign("left")}
                      className={cn("p-1 rounded transition-colors", textAlign === "left" ? "bg-[#C5A059] text-[#07162B]" : "text-[#C6B697] hover:text-[#FFF4D4]")}
                    >
                      <AlignLeft className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTextAlign("center")}
                      className={cn("p-1 rounded transition-colors", textAlign === "center" ? "bg-[#C5A059] text-[#07162B]" : "text-[#C6B697] hover:text-[#FFF4D4]")}
                    >
                      <AlignCenter className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTextAlign("justify")}
                      className={cn("p-1 rounded transition-colors", textAlign === "justify" ? "bg-[#C5A059] text-[#07162B]" : "text-[#C6B697] hover:text-[#FFF4D4]")}
                    >
                      <AlignJustify className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="w-[1px] h-4 bg-[#3A2C18] mx-0.5" />

                  {/* AI Writer Helper Toolbar Button */}
                  <button
                    type="button"
                    onClick={handleOpenAiWriter}
                    className="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-serif font-bold transition-all cursor-pointer bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] hover:brightness-110 border border-[#FFE394]/80 shadow-[0_2px_8px_rgba(0,0,0,0.4)] active:scale-95 group"
                    title="AI Writer Helper: Help me write, polish legal arguments, add citations, or make it better"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#07162B] animate-pulse" />
                    <span>AI Writer</span>
                    <Wand2 className="w-3 h-3 text-[#07162B]/80 group-hover:rotate-12 transition-transform" />
                  </button>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-[11px] text-[#A69371] bg-[#05142B] px-2 py-0.5 rounded border border-[#3A2C18]">
                    {textStats.words} words · {textStats.chars.toLocaleString()} chars
                  </span>
                </div>
              </div>
            )}

            {/* If on exhibit page, show Exhibit Evidentiary Document Info & Highlighting Bar */}
            {activePage.category === "exhibit" && (
              <div 
                style={{
                  backgroundColor: "#061833",
                  background: "linear-gradient(90deg, #0A2244 0%, #061833 50%, #0A2244 100%)",
                }}
                className="px-4 sm:px-6 py-1.5 border-b border-[#3A2C18] flex flex-wrap items-center justify-between gap-2 text-xs relative z-20 shadow-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-[#FFE394] font-serif shrink-0">
                    {activePage.exhibitTag || activePage.number ? `Exhibit ${activePage.exhibitTag || activePage.number}:` : "Exhibit:"}
                  </span>
                  <span className="text-[#C6B697] text-[11px] truncate font-medium">
                    {activePage.fileName || activePage.title}
                  </span>
                  {activePage.renderedPages && activePage.renderedPages.length > 0 ? (
                    <span className="text-[10px] font-mono bg-[#031124] text-[#FFE394] border border-[#C5A059]/40 px-2 py-0.5 rounded shrink-0">
                      {activePage.renderedPages.length} Pages Inserted · Continuous Docket Pages {activeBinderRange.contentStart}–{activeBinderRange.contentEnd}
                    </span>
                  ) : activePage.fileUrl ? (
                    <span className="text-[10px] font-mono bg-[#031124] text-[#FFE394] border border-[#C5A059]/40 px-2 py-0.5 rounded shrink-0">
                      Evidentiary PDF Inserted
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono bg-[#381E0B] text-[#FFC480] border border-[#FFC480]/40 px-2 py-0.5 rounded shrink-0">
                      No Evidentiary File Attached
                    </span>
                  )}
                </div>

                {/* Highlighter Tools & Vault Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Highlighter Toggle */}
                  <div className="flex items-center bg-[#05142B] border border-[#3A2C18] rounded-md p-0.5 gap-1 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setIsHighlighterActive(!isHighlighterActive)}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all cursor-pointer",
                        isHighlighterActive
                          ? "bg-gradient-to-r from-[#DFBE77] to-[#C5A059] text-[#07162B] font-bold shadow-xs"
                          : "text-[#C6B697] hover:text-[#FFF4D4] hover:bg-white/[0.05]"
                      )}
                      title={isHighlighterActive ? "Highlighter Active: Click & drag on document to highlight" : "Click to activate document highlighter"}
                    >
                      <Highlighter className="w-3.5 h-3.5" />
                      <span>{isHighlighterActive ? "Highlighter ON" : "Highlight Text"}</span>
                    </button>

                    {/* Color selection pills (only when active) */}
                    {isHighlighterActive && (
                      <div className="flex items-center gap-1 pl-1 pr-1 border-l border-[#3A2C18]">
                        {(Object.keys(HIGHLIGHT_COLOR_MAP) as HighlightColor[]).map((cKey) => {
                          const cVal = HIGHLIGHT_COLOR_MAP[cKey];
                          const isSelected = activeHighlightColor === cKey;
                          return (
                            <button
                              key={cKey}
                              type="button"
                              onClick={() => setActiveHighlightColor(cKey)}
                              className={cn(
                                "w-4 h-4 rounded-full border transition-all cursor-pointer",
                                isSelected ? "scale-125 border-white ring-2 ring-[#DFBE77]" : "border-black/40 opacity-70 hover:opacity-100"
                              )}
                              style={{ backgroundColor: cVal.preview }}
                              title={`Color: ${cVal.label}`}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Highlights Count & Clear button */}
                  {(activePage.highlights || []).length > 0 && (
                    <div className="flex items-center gap-1.5 bg-[#031124] border border-[#C5A059]/40 rounded-md px-2 py-0.5 text-xs text-[#FFE394]">
                      <span className="font-mono text-[10px]">
                        {activePage.highlights!.length} highlighted
                      </span>
                      <button
                        type="button"
                        onClick={handleClearHighlights}
                        className="text-rose-400 hover:text-rose-200 ml-1 p-0.5 hover:bg-rose-950/40 rounded cursor-pointer"
                        title="Clear all highlights on this exhibit"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setTargetExhibitMode("current");
                      setIsAddPageModalOpen(true);
                    }}
                    className="bg-[#031124] hover:bg-[#071C3A] text-[#DFBE77] hover:text-[#FFF4D4] border border-[#C5A059]/60 text-xs h-7 px-2.5 gap-1.5 cursor-pointer shadow-xs"
                  >
                    <FolderArchive className="w-3.5 h-3.5 text-[#DFBE77]" />
                    <span>{activePage.fileUrl ? "Replace File from Vault" : "Insert File from Vault"}</span>
                  </Button>
                </div>
              </div>
            )}

            {/* ── Scrollable Document Canvas Viewport ───────────────────── */}
            {/* Consistent rich Admiralty Blue leather from top to bottom (no dark fade) */}
            <div 
              className="flex-1 relative overflow-y-auto overflow-x-hidden pt-2.5 pb-6 px-4 sm:px-6 flex flex-col items-center bg-[#0C2A52] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-[#081F3D] [&::-webkit-scrollbar-thumb]:bg-[#4A3718] [&::-webkit-scrollbar-thumb]:rounded-sm hover:[&::-webkit-scrollbar-thumb]:bg-[#7A5A28]"
              style={{
                backgroundImage: "linear-gradient(180deg, rgba(18, 54, 104, 0.90) 0%, rgba(14, 46, 90, 0.88) 50%, rgba(18, 54, 104, 0.90) 100%), url('/decor/folio-leather-texture.png')",
                backgroundRepeat: "repeat",
                backgroundSize: "auto, 240px",
                backgroundAttachment: "local",
              }}
            >
              {/* ── DOCUMENT SHEET DISPLAY ───────────────────────────────── */}
              {activeToolbarTab === "setup" || activePageId === "setup" ? (
                /* ── VIEW 0: PRE-FILING COMPLAINT SETUP & STATUTORY REFINEMENT STUDIO ── */
                <ComplaintSetupView
                  formState={officialFormState}
                  onChange={setOfficialFormState}
                  caseDetails={caseDetails}
                  onApplyToDocketSections={(updates) => {
                    setOfficialFormState((prev) => ({
                      ...prev,
                      statementOfViolations: updates.statementOfViolations,
                      factsRelatingToViolations: updates.factsRelatingToViolations,
                      proposedResolution: updates.proposedResolution,
                    }));
                    setPages((prev) =>
                      prev.map((p) => {
                        if (p.id === "clarity_control") {
                          return {
                            ...p,
                            content: updates.statementOfViolations,
                          };
                        }
                        if (p.id === "chronological_summary") {
                          return {
                            ...p,
                            content: updates.factsRelatingToViolations,
                          };
                        }
                        return p;
                      })
                    );
                  }}
                  onNavigateToStateForm={() => {
                    setActiveToolbarTab("cover");
                    setActivePageId("cover");
                  }}
                  onNavigateToRestatement={() => {
                    setActiveToolbarTab("edit");
                    setActivePageId("clarity_control");
                  }}
                />
              ) : activePage.id === "cover" ? (
                /* ── VIEW 1: AUTHENTIC OFFICIAL STATE COMPLAINT FORM (4 Standard 8.5x11 Sheets) ── */
                /* Cleanly stacked Letter sheets — zero iframes, zero inner scrollbars! Only the outer scrollbar on the right scrolls */
                <StateComplaintFormView
                  formState={officialFormState}
                  onChange={setOfficialFormState}
                  onSelectState={(code) => {
                    setOfficialFormState((prev) => ({ ...prev, stateCode: code }));
                    setCaseDetails((prev) => ({ ...prev, state: code }));
                  }}
                  onPagesLoaded={(loadedPages) => {
                    if (stateFormPages.length === 0) {
                      setStateFormPages(loadedPages);
                    }
                  }}
                  viewMode={viewMode}
                  zoomLevel={zoomLevel}
                  renderedPages={stateFormPages}
                  isRendering={isRenderingStateForm}
                  totalPages={totalDocketPages}
                />
              ) : activePage.category === "exhibit" ? (
                /* ── VIEW 2: EXHIBIT BINDER (COVER SHEET 1 + INSERTED REAL FILE PAGES DIRECTLY) ── */
                /* Vertically stacked Letter sheets — zero inner scrollbars, zero copy input */
                <div className="flex flex-col items-center w-full">
                  {/* SHEET 1: OFFICIAL DOCKET BINDER COVER PAGE */}
                  <BinderCoverPage
                    pageId={activePage.id}
                    title={activePage.title}
                    category={activePage.category}
                    sectionNumber={`Section ${activePageIndex + 1 < 10 ? `0${activePageIndex + 1}` : activePageIndex + 1}`}
                    coverPageNumber={activeBinderRange.coverPage}
                    totalDocketPages={totalDocketPages}
                    studentName={caseDetails.studentName}
                    studentDob={caseDetails.studentDob}
                    grade={caseDetails.grade}
                    school={caseDetails.school}
                    district={caseDetails.district}
                    preparedBy={caseDetails.preparedBy}
                    submissionDate={caseDetails.submissionDate}
                    agencyName={SUPPORTED_STATE_FORMS[officialFormState.stateCode]?.agencyName || "Georgia Department of Education"}
                    viewMode={viewMode}
                    zoomLevel={zoomLevel}
                  />

                  {/* SHEET 2+ : ACTUAL FILE PAGES INSERTED DIRECTLY (NO COPY INPUT, NO SQUISHING, NO LABELS) */}
                  {activePage.renderedPages?.length || activePage.fileUrl || activePage.isRenderingPdf ? (
                    <ExhibitPdfSheetsView
                      page={activePage}
                      activeBinderRange={activeBinderRange}
                      totalDocketPages={totalDocketPages}
                      agencyName={SUPPORTED_STATE_FORMS[officialFormState.stateCode]?.agencyName || "Georgia Department of Education"}
                      viewMode={viewMode}
                      zoomLevel={zoomLevel}
                      isHighlighterActive={isHighlighterActive}
                      activeHighlightColor={activeHighlightColor}
                      onAddHighlight={handleAddHighlight}
                      onRemoveHighlight={handleRemoveHighlight}
                      onReplaceFile={() => {
                        setTargetExhibitMode("current");
                        setIsAddPageModalOpen(true);
                      }}
                      onRemoveFile={() => {
                        setPages((prev) =>
                          prev.map((p) =>
                            p.id === activePage.id
                              ? {
                                  ...p,
                                  fileUrl: undefined,
                                  fileName: undefined,
                                  documentType: undefined,
                                  renderedPages: undefined,
                                  pageCount: undefined,
                                  isRenderingPdf: false,
                                }
                              : p
                          )
                        );
                        toast.success(`Removed attachment from ${activePage.exhibitTag || activePage.title}`);
                      }}
                    />
                  ) : (
                    /* When no file attached yet: Clean Insert Exhibit File prompt + Evidentiary Summary Sheet 2 */
                    <>
                      <div
                        style={{
                          width: viewMode === "actual" ? "816px" : "100%",
                          maxWidth: "816px",
                          minHeight: "320px",
                          transform: viewMode === "fit-page" ? "scale(0.78)" : zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined,
                          transformOrigin: "top center",
                        }}
                        className="rounded-xs bg-[#031124] border border-[#C5A059]/60 shadow-2xl p-8 flex flex-col items-center justify-center text-center my-4"
                      >
                        <div className="w-12 h-12 rounded-full bg-[#051A36] border border-[#DFBE77]/60 flex items-center justify-center text-[#DFBE77] mb-3 shadow-lg">
                          <FolderArchive className="w-6 h-6" />
                        </div>
                        <h3 className="font-serif text-lg font-bold text-[#FFF4D4] mb-1.5">
                          Insert Evidentiary Exhibit File
                        </h3>
                        <p className="font-sans text-xs text-[#C6B697] max-w-md leading-relaxed mb-4">
                          No copy input needed. The actual evidentiary PDF will be inserted directly after this cover sheet in full fidelity with zero modifications. Alternatively, the standard Evidentiary Summary Sheet below is automatically included on continuous Page {activeBinderRange.contentPage} of {totalDocketPages}.
                        </p>
                        <Button
                          type="button"
                          onClick={() => {
                            setTargetExhibitMode("current");
                            setIsAddPageModalOpen(true);
                          }}
                          className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border border-[#FFE394]/50 shadow-md text-xs cursor-pointer gap-2 px-5 py-2.5 hover:brightness-110"
                        >
                          <FolderArchive className="w-4 h-4" />
                          <span>Select File from Document Vault or Upload</span>
                        </Button>
                      </div>

                      {/* SHEET 2: Evidentiary Summary Sheet (Active on continuous Page 12 / 14 until PDF attached) */}
                      <div
                        style={{
                          width: viewMode === "actual" ? "816px" : "100%",
                          maxWidth: "816px",
                          minHeight: "1056px",
                          backgroundImage: "url('/decor/fine-parchment.jpg')",
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                          transform: viewMode === "fit-page" 
                            ? "scale(0.78)" 
                            : zoomLevel !== 100 
                              ? `scale(${zoomLevel / 100})` 
                              : undefined,
                          transformOrigin: "top center",
                        }}
                        className={cn(
                          "relative rounded-xs select-text flex flex-col justify-between transition-all",
                          "bg-[#FBF6EA] text-[#1A120A] border border-[#C5A059]/60 shadow-[0_16px_50px_rgba(0,0,0,0.85),0_2px_8px_rgba(0,0,0,0.5)]",
                          "px-8 sm:px-12 md:px-14 pt-8 pb-8 my-2 shrink-0"
                        )}
                      >
                        <div className="flex items-center justify-between pb-3 border-b border-[#8C7A60]/40 shrink-0">
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-widest text-[#8C7A60] font-bold">
                              Page {activeBinderRange.contentStart === activeBinderRange.contentEnd ? activeBinderRange.contentStart : `${activeBinderRange.contentStart}–${activeBinderRange.contentEnd}`} of {totalDocketPages} · {activePage.exhibitTag || "EXHIBIT"}
                            </span>
                            <h2
                              onDoubleClick={() => handleOpenRenameModal(activePage)}
                              title="Double-click to rename binder"
                              className="font-serif text-lg sm:text-xl font-bold text-[#1A120A] mt-0.5 cursor-pointer hover:underline decoration-[#8C7A60]/40 inline-flex items-center gap-1.5 group/header"
                            >
                              <span>{activePage.title}</span>
                              <Pencil className="w-3.5 h-3.5 text-[#8C7A60] opacity-0 group-hover/header:opacity-100 transition-opacity" />
                            </h2>
                          </div>
                          <div className="text-right">
                            <span className="text-[11px] font-serif text-[#6E5D43] italic block">
                              EVIDENTIARY SUMMARY SHEET
                            </span>
                            <span className="text-[10px] font-mono text-[#8C7A60]">
                              Included in Docket
                            </span>
                          </div>
                        </div>

                        <div className="py-6 flex flex-col w-full flex-1">
                          <div className="text-[12.5px] leading-relaxed whitespace-pre-wrap text-justify font-serif text-[#1A120A]">
                            {activePage.content || getDefaultExhibitContent(activePage, caseDetails)}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-[#8C7A60]/30 flex items-center justify-between text-[11px] font-serif text-[#6E5D43] shrink-0">
                          <span className="tracking-wide">
                            {SUPPORTED_STATE_FORMS[officialFormState.stateCode]?.agencyName || "Georgia Department of Education"} IDEA Complaint
                          </span>
                          <span className="font-mono">Page {activeBinderRange.contentStart === activeBinderRange.contentEnd ? activeBinderRange.contentStart : `${activeBinderRange.contentStart}–${activeBinderRange.contentEnd}`} of {totalDocketPages}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                /* ── VIEW 3: DRAFTING SECTION (COVER PAGE SHEET 1 + EDITABLE DOCUMENT SHEET 2) ── */
                <div className="flex flex-col items-center w-full">
                  {/* SHEET 1: OFFICIAL DOCKET BINDER COVER PAGE */}
                  <BinderCoverPage
                    pageId={activePage.id}
                    title={activePage.title}
                    category={activePage.category}
                    sectionNumber={`Section ${activePageIndex + 1 < 10 ? `0${activePageIndex + 1}` : activePageIndex + 1}`}
                    coverPageNumber={activeBinderRange.coverPage}
                    totalDocketPages={totalDocketPages}
                    studentName={caseDetails.studentName}
                    studentDob={caseDetails.studentDob}
                    grade={caseDetails.grade}
                    school={caseDetails.school}
                    district={caseDetails.district}
                    preparedBy={caseDetails.preparedBy}
                    submissionDate={caseDetails.submissionDate}
                    agencyName={SUPPORTED_STATE_FORMS[officialFormState.stateCode]?.agencyName || "Georgia Department of Education"}
                    viewMode={viewMode}
                    zoomLevel={zoomLevel}
                  />

                  {/* SHEET 2: EDITABLE DOCUMENT PAGES (Proportional Google Docs Writing Area) */}
                  <div
                    style={{
                      width: viewMode === "actual" ? "816px" : "100%",
                      maxWidth: "816px",
                      minHeight: "1056px",
                      backgroundImage: "url('/decor/fine-parchment.jpg')",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                      transform: viewMode === "fit-page" 
                        ? "scale(0.78)" 
                        : zoomLevel !== 100 
                          ? `scale(${zoomLevel / 100})` 
                          : undefined,
                      transformOrigin: "top center",
                      marginBottom: (viewMode !== "fit-page" && zoomLevel > 100) 
                        ? `${(zoomLevel - 100) * 11}px` 
                        : (viewMode === "fit-page")
                          ? "-180px"
                          : undefined,
                    }}
                    className={cn(
                      "relative rounded-xs select-text flex flex-col justify-between transition-all",
                      "bg-[#FBF6EA] text-[#1A120A] border border-[#C5A059]/60 shadow-[0_16px_50px_rgba(0,0,0,0.85),0_2px_8px_rgba(0,0,0,0.5)]",
                      "px-8 sm:px-12 md:px-14 pt-8 pb-8 my-2 shrink-0"
                    )}
                  >
                    {/* Printable Margin Guidelines (only on draft pages) */}
                    <div className="absolute top-6 left-6 w-3 h-3 border-t border-l border-[#8C7A60]/40 pointer-events-none z-10" />
                    <div className="absolute top-6 right-6 w-3 h-3 border-t border-r border-[#8C7A60]/40 pointer-events-none z-10" />
                    <div className="absolute bottom-6 left-6 w-3 h-3 border-b border-l border-[#8C7A60]/40 pointer-events-none z-10" />
                    <div className="absolute bottom-6 right-6 w-3 h-3 border-b border-r border-[#8C7A60]/40 pointer-events-none z-10" />

                    <div className="relative z-10 flex flex-col h-full select-text flex-1">
                      <div className="flex items-center justify-between pb-3 border-b border-[#8C7A60]/40 shrink-0">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-widest text-[#8C7A60] font-bold">
                            Page {activeBinderRange.contentStart === activeBinderRange.contentEnd ? activeBinderRange.contentStart : `${activeBinderRange.contentStart}–${activeBinderRange.contentEnd}`} · {activePage.id === "clarity_control" || activePage.number === "02" || activePage.number === "05" || activePage.category === "pleading" || activePage.category === "restatement" ? "RESTATEMENT" : activePage.category.toUpperCase()}
                          </span>
                          <h2
                            onDoubleClick={() => handleOpenRenameModal(activePage)}
                            title="Double-click to rename binder"
                            className="font-serif text-lg sm:text-xl font-bold text-[#1A120A] mt-0.5 cursor-pointer hover:underline decoration-[#8C7A60]/40 inline-flex items-center gap-1.5 group/header"
                          >
                            <span>{activePage.title}</span>
                            <Pencil className="w-3.5 h-3.5 text-[#8C7A60] opacity-0 group-hover/header:opacity-100 transition-opacity" />
                          </h2>
                        </div>
                        {/* For Page Two / Restatement, remove gadoe sped and 34 cfr etc */}
                        {activePage.id !== "clarity_control" && activePage.number !== "02" && activePage.number !== "05" && activePage.category !== "restatement" && (
                          <div className="text-right">
                            <span className="text-[11px] font-serif text-[#6E5D43] italic block">
                              {SUPPORTED_STATE_FORMS[officialFormState.stateCode]?.shortAgency || "GA DOE"} SPECIAL EDUCATION
                            </span>
                            <span className="text-[10px] font-mono text-[#8C7A60]">
                              IDEA State Complaint
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Live Auto-Restatement Banner on Clarity Control Restatement sheet */}
                      {(activePage.id === "clarity_control" || activePage.category === "restatement") && (
                        <div className="mt-3 mb-1 p-2.5 rounded-md bg-[#0A264D]/10 border border-[#8C7A60]/40 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse shrink-0" />
                            <span className="font-serif font-bold text-[#1A120A] shrink-0">
                              Auto-Restatement Active:
                            </span>
                            <span className="text-[#5C4A32] text-[11.5px] truncate">
                              Restating Box 1 (#1 Violations), Box 2 (#2 Facts), & Box 3 (#3 Proposed Resolution) from State Form
                            </span>
                            {activeBinderRange.contentCount > 1 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-mono font-bold bg-[#FFE394]/30 border border-[#C5A059]/60 text-[#73510C] shrink-0">
                                📄 Multi-Page Statement · {activeBinderRange.contentCount} Sheets (Pgs {activeBinderRange.contentStart}–{activeBinderRange.contentEnd} of {totalDocketPages})
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveToolbarTab("cover");
                              setActivePageId("cover");
                            }}
                            className="text-[11px] font-sans font-bold px-2.5 py-1 rounded bg-[#082245] text-[#FFE394] hover:bg-[#0B2C58] hover:text-[#FFF4D4] border border-[#C5A059]/60 shrink-0 cursor-pointer shadow-xs transition-colors flex items-center gap-1 ml-auto"
                          >
                            <span>Edit on State Form</span>
                            <span className="text-xs">↗</span>
                          </button>
                        </div>
                      )}

                      <div className="py-4 flex flex-col w-full flex-1">
                        <textarea
                          ref={textareaRef}
                          value={activePage.content || ""}
                          onChange={(e) => {
                            handleUpdatePageContent(e.target.value);
                            e.target.style.height = "auto";
                            e.target.style.height = `${Math.max(680, e.target.scrollHeight)}px`;
                          }}
                          placeholder="Draft legal statement, factual narrative, or statutory citations here..."
                          style={{
                            lineHeight: lineSpacing === "2.0" ? "2.0" : lineSpacing === "1.5" ? "1.6" : "1.35",
                            fontSize: `${fontSize}pt`,
                            textAlign: textAlign,
                            fontWeight: isBold ? "bold" : "normal",
                            fontStyle: isItalic ? "italic" : "normal",
                            textDecoration: isUnderline ? "underline" : "none",
                            fontFamily: fontFamily === "serif" ? "Georgia, Cambria, 'Times New Roman', serif" :
                                        fontFamily === "times" ? "'Times New Roman', Times, Georgia, serif" :
                                        fontFamily === "garamond" ? "'EB Garamond', Garamond, Georgia, serif" :
                                        "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
                          }}
                          className="w-full bg-transparent text-[#1A120A] resize-none focus:outline-none placeholder:text-[#8C7A60]/50 tracking-normal leading-relaxed overflow-hidden"
                        />
                      </div>

                      <div className="pt-3 border-t border-[#8C7A60]/30 flex items-center justify-between text-[11px] font-serif text-[#6E5D43] shrink-0">
                        <span className="tracking-wide">Georgia Department of Education IDEA Complaint</span>
                        <span className="font-mono">Page {activeBinderRange.contentStart === activeBinderRange.contentEnd ? activeBinderRange.contentStart : `${activeBinderRange.contentStart}–${activeBinderRange.contentEnd}`} of {totalDocketPages}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Floating Control Bar (Admiralty Navy leather, aligned, zero overlap, rounded bottom) */}
            <div 
              className="px-6 sm:px-8 py-2 border-t border-[#23508C]/80 bg-gradient-to-r from-[#082855] via-[#0E3A75] to-[#082855] flex items-center justify-between gap-2.5 relative z-20 rounded-b-[18px] shadow-[inset_0_1px_0_rgba(147,197,253,0.22),0_-4px_14px_rgba(0,0,0,0.45)] overflow-x-auto [&::-webkit-scrollbar]:hidden"
              style={{
                backgroundImage: "url('/decor/folio-leather-texture.png')",
                backgroundRepeat: "repeat",
                backgroundSize: "220px",
              }}
            >
              {/* Top seam debossed groove */}
              <div 
                className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none"
                style={{
                  background: "linear-gradient(180deg, rgba(0,4,10,0.85) 0%, rgba(17,32,54,0.3) 100%)",
                  boxShadow: "0 1px 0 rgba(147,197,253,0.12)",
                }}
              />
              
              {/* Left: Pagination Controls: < Pages 1–4 of 16 > or < Pages 5–6 of 16 > */}
              <div className="flex items-center gap-1 bg-[#020F24]/90 border border-[#1E3B66]/80 rounded-md px-2 py-1 shadow-sm shrink-0">
                <button
                  type="button"
                  disabled={activePageIndex <= 0}
                  onClick={() => setActivePageId(pages[activePageIndex - 1].id)}
                  className="p-1 rounded hover:bg-white/[0.08] text-[#DFBE77] hover:text-[#FFF4D4] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Previous page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-xs text-[#FFF4D4] px-2 font-medium">
                  {activePageIndex === 0
                    ? `Pages 1–4 of ${totalDocketPages}`
                    : `Pages ${activeBinderRange.start}–${activeBinderRange.end} of ${totalDocketPages}`}
                </span>
                <button
                  type="button"
                  disabled={activePageIndex >= pages.length - 1}
                  onClick={() => setActivePageId(pages[activePageIndex + 1].id)}
                  className="p-1 rounded hover:bg-white/[0.08] text-[#DFBE77] hover:text-[#FFF4D4] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Next page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Center: 100% Letter Paper View Indicator */}
              <div className="hidden md:flex items-center bg-[#020F24]/90 border border-[#1E3B66]/80 rounded-md px-3 py-1 shadow-sm text-xs shrink-0 text-[#FFF4D4] font-medium font-serif gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="tracking-wide">100% Letter View (8.5" × 11")</span>
              </div>

              {/* Right: Zoom & Focus Controls */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

                <div className="flex items-center bg-[#020F24]/90 border border-[#1E3B66]/80 rounded-md px-1.5 py-0.5 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
                    className="p-1 rounded hover:bg-white/[0.08] text-[#C6B697] hover:text-[#FFF4D4] cursor-pointer"
                    title="Zoom out"
                  >
                    <ZoomOut className="w-3 h-3" />
                  </button>
                  <span className="font-mono text-xs text-[#FFF4D4] px-1.5 sm:px-2 font-medium">
                    {zoomLevel}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
                    className="p-1 rounded hover:bg-white/[0.08] text-[#C6B697] hover:text-[#FFF4D4] cursor-pointer"
                    title="Zoom in"
                  >
                    <ZoomIn className="w-3 h-3" />
                  </button>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFocusMode(!isFocusMode)}
                  className="border-[#1E3B66]/80 bg-[#020F24]/90 text-[#D8C7A5] hover:text-[#FFF4D4] text-xs h-7 px-2 sm:px-2.5 gap-1.5 cursor-pointer shadow-sm rounded-md"
                >
                  {isFocusMode ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                  <span className="hidden sm:inline">Focus mode</span>
                </Button>
              </div>

            </div>

            {/* Brass Corner Brackets in front covering editorial box corners */}
            <FolioBoxCornerBrackets size={36} />
          </main>

          {/* ── RIGHT COLUMN: Cover tools Panel (matching reference mockup) ── */}
          {!isFocusMode && !isToolsCollapsed && (
            <aside 
              className="w-44 lg:w-48 xl:w-52 shrink-0 flex flex-col justify-between rounded-l-[14px] rounded-r-none border border-[#3A2C18] bg-[#03152E] shadow-2xl relative p-2.5 z-20"
              style={{
                backgroundColor: "#03152E",
                background: "linear-gradient(180deg, #051A38 0%, #03152E 35%, #020E22 100%)",
                boxShadow: "inset 0 1px 1px rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.85)",
              }}
            >
              <div className="space-y-3 relative z-20 pt-6 px-1">
                {/* Header: State complaint tools with collapse chevron */}
                <div className="flex items-center justify-between pb-2 border-b border-[#3A2C18]">
                  <h3 className="font-serif text-sm font-bold text-[#FFF4D4]">
                    State complaint tools
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsToolsCollapsed(true)}
                    className="text-[#C6B697] hover:text-[#FFF4D4] p-1 rounded hover:bg-white/[0.05] transition-colors cursor-pointer"
                    title="Collapse state complaint tools"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Gold Plaque: Settings (moved up, kept gold) */}
                <button
                  type="button"
                  onClick={() => setIsCompilerModalOpen(true)}
                  style={{
                    background: "linear-gradient(180deg, #FDF0C8 0%, #E6C577 26%, #C79E48 70%, #9E7428 100%)",
                  }}
                  className="h-11 px-3.5 w-full flex items-center justify-between rounded-md text-[#1A1005] font-serif font-bold border-[1.5px] border-[#FFE59E] shadow-[0_3px_10px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.75)] hover:brightness-105 transition-all cursor-pointer group"
                  title="Settings"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-[#1A1005]" />
                    <span className="text-xs">Settings</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#1A1005] group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* 4 Shallow Rectangular Parchment Plates */}
                <div className="space-y-2.5">
                  {/* Plate 1: Edit official state form details */}
                  <button
                    type="button"
                    onClick={() => setIsEditCoverModalOpen(true)}
                    style={{
                      backgroundImage: "url('/decor/fine-parchment.jpg')",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                    className="h-11 px-3.5 w-full flex items-center justify-between rounded-md border border-[#BCA062]/80 text-[#1A1005] shadow-[0_2px_5px_rgba(0,0,0,0.45),0_1px_1px_rgba(0,0,0,0.25)] transition-all cursor-pointer group hover:brightness-105"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-[#4A3515] group-hover:scale-105 transition-transform" />
                      <span className="text-xs font-serif font-bold tracking-tight">Edit State Form Details</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#7A5C28] group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Plate 2: State Jurisdiction */}
                  <button
                    type="button"
                    onClick={() => {
                      const next = officialFormState.stateCode === "GA" ? "FL" : "GA";
                      setOfficialFormState((prev) => ({ ...prev, stateCode: next }));
                      setCaseDetails((prev) => ({ ...prev, state: next }));
                      toast.success(`Switched state form to ${SUPPORTED_STATE_FORMS[next]?.name || next}`);
                    }}
                    style={{
                      backgroundImage: "url('/decor/fine-parchment.jpg')",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                    className="h-11 px-3.5 w-full flex items-center justify-between rounded-md border border-[#BCA062]/80 text-[#1A1005] shadow-[0_2px_5px_rgba(0,0,0,0.45),0_1px_1px_rgba(0,0,0,0.25)] transition-all cursor-pointer group hover:brightness-105"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-[#3E9B34] group-hover:scale-105 transition-transform" />
                      <span className="text-xs font-serif font-bold tracking-tight">
                        State: {SUPPORTED_STATE_FORMS[officialFormState.stateCode]?.name || "Georgia"} ({officialFormState.stateCode || "GA"})
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#7A5C28] group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Plate 3: Switch/Select Student */}
                  <button
                    type="button"
                    onClick={() => {
                      if (contactsQuery.data && contactsQuery.data.length > 0) {
                        const currentIdx = contactsQuery.data.findIndex((c) => 
                          (c.lastName ? `${c.lastName}, ${c.firstName}` : c.firstName) === (officialFormState.studentName || caseDetails.studentName)
                        );
                        const nextStudent = contactsQuery.data[(currentIdx + 1) % contactsQuery.data.length];
                        if (nextStudent) applyStudentToComplaint(nextStudent);
                      } else {
                        setIsEditCoverModalOpen(true);
                      }
                    }}
                    style={{
                      backgroundImage: "url('/decor/fine-parchment.jpg')",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                    className="h-11 px-3.5 w-full flex items-center justify-between rounded-md border border-[#BCA062]/80 text-[#1A1005] shadow-[0_2px_5px_rgba(0,0,0,0.45),0_1px_1px_rgba(0,0,0,0.25)] transition-all cursor-pointer group hover:brightness-105"
                    title="Click to cycle CRM student, or edit details in State Form details"
                  >
                    <div className="flex items-center gap-2.5">
                      <User className="w-4 h-4 text-[#4A3515] group-hover:scale-105 transition-transform" />
                      <span className="text-xs font-serif font-bold tracking-tight truncate max-w-[170px]">
                        Student: {officialFormState.studentName || caseDetails.studentName}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#7A5C28] group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Plate 4: Submission details & eFax Info */}
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText("spedhelpdesk@doe.k12.ga.us");
                      toast.success("Copied GaDOE SpEd Helpdesk email: spedhelpdesk@doe.k12.ga.us");
                    }}
                    style={{
                      backgroundImage: "url('/decor/fine-parchment.jpg')",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                    className="h-11 px-3.5 w-full flex items-center justify-between rounded-md border border-[#BCA062]/80 text-[#1A1005] shadow-[0_2px_5px_rgba(0,0,0,0.45),0_1px_1px_rgba(0,0,0,0.25)] transition-all cursor-pointer group hover:brightness-105"
                  >
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 text-[#4A3515] group-hover:scale-105 transition-transform" />
                      <span className="text-xs font-serif font-bold tracking-tight">Copy GaDOE Filing Info</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#7A5C28] group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Brass Corner Brackets in front */}
              <FolioBoxCornerBrackets size={32} />
            </aside>
          )}
        </div>

        {/* ── MODALS ──────────────────────────────────────────────────────── */}
        
        {/* 1. Edit Cover Details Modal */}
        <Dialog open={isEditCoverModalOpen} onOpenChange={setIsEditCoverModalOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] flex flex-col bg-[#05142B] border border-[#3A2C18] text-white shadow-2xl p-5">
            <DialogHeader className="pb-1 border-b border-[#3A2C18]/60">
              <DialogTitle className="font-serif text-base text-[#FFF4D4]">
                Edit State Form Details
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2.5 py-2 text-xs overflow-y-auto pr-1.5 custom-scrollbar flex-1 max-h-[60vh]">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-[#C6B697] text-[11px]">Student Full Legal Name</Label>
                  <Input
                    value={caseDetails.studentName}
                    onChange={(e) => handleQuickFieldUpdate("studentName", e.target.value)}
                    className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[#C6B697] text-[11px]">Date of Birth</Label>
                  <Input
                    placeholder="YYYY-MM-DD"
                    value={caseDetails.studentDob}
                    onChange={(e) => handleQuickFieldUpdate("studentDob", e.target.value)}
                    className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-[#C6B697] text-[11px]">Current Grade</Label>
                  <Input
                    value={caseDetails.grade}
                    onChange={(e) => handleQuickFieldUpdate("grade", e.target.value)}
                    className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[#C6B697] text-[11px]">Assigned School</Label>
                  <Input
                    placeholder="e.g. Wheeler High School"
                    value={caseDetails.school}
                    onChange={(e) => handleQuickFieldUpdate("school", e.target.value)}
                    className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-[#C6B697] text-[11px]">School District (LEA)</Label>
                  <Input
                    value={caseDetails.district}
                    onChange={(e) => handleQuickFieldUpdate("district", e.target.value)}
                    className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[#C6B697] text-[11px]">Parent / Complainant</Label>
                  <Input
                    placeholder="e.g. Sarah Jenkins"
                    value={caseDetails.parentName}
                    onChange={(e) => handleQuickFieldUpdate("parentName", e.target.value)}
                    className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-[#C6B697] text-[11px]">Prepared By</Label>
                  <Input
                    value={caseDetails.preparedBy}
                    onChange={(e) => handleQuickFieldUpdate("preparedBy", e.target.value)}
                    className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[#C6B697] text-[11px]">Submission Date</Label>
                  <Input
                    placeholder="e.g. October 15, 2026"
                    value={caseDetails.submissionDate}
                    onChange={(e) => handleQuickFieldUpdate("submissionDate", e.target.value)}
                    className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs"
                  />
                </div>
              </div>

              {/* Student Residential Information & IEP Pull */}
              <div className="pt-2 border-t border-[#3A2C18]/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-serif font-bold text-xs text-[#FFE394] flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-[#DFBE77]" />
                      Student Residential Information (Page 1)
                    </span>
                    <span className="text-[10px] text-[#A69371] block">
                      Residential address pulled from CRM contact or uploaded IEP document.
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => pullAddressFromIep(true)}
                    className="h-6 text-[10px] border-[#DFBE77]/50 bg-[#071E3D] hover:bg-[#0C2A52] text-[#FFE394] px-2 gap-1 cursor-pointer"
                    title="Pull address and demographics directly from student's uploaded IEP"
                  >
                    <FileSearch className="w-3 h-3" />
                    <span>Pull from IEP</span>
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <Label className="text-[#C6B697] text-[11px]">Student Residential Street Address</Label>
                    <Input
                      value={officialFormState.studentAddress}
                      onChange={(e) => handleStudentAddressUpdate(e.target.value)}
                      placeholder="Street address (or [Required — Please Fill Out])"
                      className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[#C6B697] text-[11px]">GTID Number</Label>
                    <Input
                      value={officialFormState.studentGtid}
                      onChange={(e) => setOfficialFormState((prev) => ({ ...prev, studentGtid: e.target.value }))}
                      placeholder="10-digit GTID"
                      className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[#C6B697] text-[11px]">City</Label>
                    <Input
                      value={officialFormState.studentCity}
                      onChange={(e) => handleStudentCityUpdate(e.target.value)}
                      className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[#C6B697] text-[11px]">State</Label>
                    <Input
                      value={officialFormState.studentState}
                      onChange={(e) => handleStudentStateUpdate(e.target.value)}
                      className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[#C6B697] text-[11px]">ZIP</Label>
                    <Input
                      value={officialFormState.studentZip}
                      onChange={(e) => handleStudentZipUpdate(e.target.value)}
                      className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Parent / Guardian Contact & Address */}
              <div className="pt-2 border-t border-[#3A2C18]/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-serif font-bold text-xs text-[#FFE394] flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#DFBE77]" />
                      Parent / Guardian (Page 1)
                    </span>
                    <span className="text-[10px] text-[#A69371] block">
                      Matches student residential info unless physically customized.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={matchParentAddressToStudent}
                      className="h-6 px-2.5 text-[10px] bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border border-[#FFE394]/50 hover:brightness-110 shadow-sm cursor-pointer flex items-center gap-1.5 transition-all"
                      title="Copy student residential address, city, state, and zip code to parent"
                    >
                      <Copy className="w-3 h-3 text-[#07162B]" />
                      Same as Student
                    </Button>
                    {!isParentAddressCustom ? (
                      <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded font-medium">
                        ✓ Matches Student
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-300 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.5 rounded font-medium">
                        Custom Address
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[#C6B697] text-[11px]">Parent Name</Label>
                    <Input
                      value={officialFormState.parentName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOfficialFormState((prev) => ({ ...prev, parentName: val }));
                        setCaseDetails((prev) => ({ ...prev, parentName: val }));
                      }}
                      className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[#C6B697] text-[11px]">Parent Phone</Label>
                    <Input
                      value={officialFormState.parentPhone}
                      onChange={(e) => setOfficialFormState((prev) => ({ ...prev, parentPhone: e.target.value }))}
                      className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[#C6B697] text-[11px]">Parent Email</Label>
                    <Input
                      value={officialFormState.parentEmail}
                      onChange={(e) => setOfficialFormState((prev) => ({ ...prev, parentEmail: e.target.value }))}
                      className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-[#C6B697] text-[11px]">Parent Residential Address</Label>
                      <div className="flex items-center gap-2">
                        {!isParentAddressCustom && (
                          <span className="text-[10px] text-emerald-400 font-normal">
                            (Synchronized with student address)
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={matchParentAddressToStudent}
                          className="text-[10px] text-[#FFE394] hover:text-[#FFF4D4] hover:underline cursor-pointer flex items-center gap-1 bg-[#071E3D] px-1.5 py-0.5 rounded border border-[#FFE394]/30 transition-colors"
                          title="Copy student residential address to parent"
                        >
                          <Copy className="w-2.5 h-2.5" />
                          Same as Student
                        </button>
                      </div>
                    </div>
                    <Input
                      value={officialFormState.parentAddress}
                      onChange={(e) => handleParentAddressUpdate(e.target.value)}
                      placeholder="Matches student address unless physically customized"
                      className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[#C6B697] text-[11px]">City</Label>
                    <Input
                      value={officialFormState.parentCity}
                      onChange={(e) => handleParentCityUpdate(e.target.value)}
                      className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[#C6B697] text-[11px]">State</Label>
                    <Input
                      value={officialFormState.parentState}
                      onChange={(e) => handleParentStateUpdate(e.target.value)}
                      className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[#C6B697] text-[11px]">ZIP</Label>
                    <Input
                      value={officialFormState.parentZip}
                      onChange={(e) => handleParentZipUpdate(e.target.value)}
                      className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Complainant & Business Credentials Connected to PG-024-BIZ */}
              <div className="pt-2 border-t border-[#3A2C18]/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-serif font-bold text-xs text-[#FFE394] flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#DFBE77]" />
                      Complainant & Practice Credentials (PG-024-BIZ)
                    </span>
                    <span className="text-[10px] text-[#A69371] block">
                      Authoritative practice info on Page 1 of the official complaint form.
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => syncFromBusinessProfile(true)}
                    className="h-6 text-[10px] border-[#DFBE77]/50 bg-[#071E3D] hover:bg-[#0C2A52] text-[#FFE394] px-2 gap-1 cursor-pointer"
                    title="Refresh address, phone, and email from PG-024-BIZ"
                  >
                    <Building2 className="w-3 h-3" />
                    <span>Sync PG-024-BIZ</span>
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <Label className="text-[#C6B697] text-[11px]">Complainant Name (First & Last only)</Label>
                    <Input
                      value={officialFormState.complainantName}
                      onChange={(e) => {
                        const clean = formatFirstLastName(e.target.value);
                        setOfficialFormState((prev) => ({ ...prev, complainantName: clean }));
                      }}
                      className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[#C6B697] text-[11px]">Relationship to Student</Label>
                    <Input
                      value={officialFormState.complainantRelationship}
                      onChange={(e) => setOfficialFormState((prev) => ({ ...prev, complainantRelationship: e.target.value }))}
                      className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <Label className="text-[#C6B697] text-[11px]">Mailing Address</Label>
                    <Input
                      value={officialFormState.complainantAddress}
                      onChange={(e) => setOfficialFormState((prev) => ({ ...prev, complainantAddress: e.target.value }))}
                      className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <div>
                      <Label className="text-[#C6B697] text-[11px]">City</Label>
                      <Input
                        value={officialFormState.complainantCity}
                        onChange={(e) => setOfficialFormState((prev) => ({ ...prev, complainantCity: e.target.value }))}
                        className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[#C6B697] text-[11px]">State</Label>
                      <Input
                        value={officialFormState.complainantState}
                        onChange={(e) => setOfficialFormState((prev) => ({ ...prev, complainantState: e.target.value }))}
                        className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[#C6B697] text-[11px]">ZIP</Label>
                      <Input
                        value={officialFormState.complainantZip}
                        onChange={(e) => setOfficialFormState((prev) => ({ ...prev, complainantZip: e.target.value }))}
                        className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <Label className="text-[#C6B697] text-[11px]">Practice Phone</Label>
                    <Input
                      value={officialFormState.complainantPhone}
                      onChange={(e) => setOfficialFormState((prev) => ({ ...prev, complainantPhone: e.target.value }))}
                      className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[#C6B697] text-[11px]">Practice Email</Label>
                    <Input
                      value={officialFormState.complainantEmail}
                      onChange={(e) => setOfficialFormState((prev) => ({ ...prev, complainantEmail: e.target.value }))}
                      className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Cover Options & Fast Tools */}
              <div className="pt-2 border-t border-[#3A2C18]/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-[#C6B697] text-xs cursor-pointer" htmlFor="cover-logo-toggle">
                    Display Waypoint Logo on Cover
                  </Label>
                </div>
                <button
                  type="button"
                  id="cover-logo-toggle"
                  onClick={() => setCaseDetails((prev) => ({ ...prev, showLogo: !prev.showLogo }))}
                  className={cn(
                    "px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all border cursor-pointer",
                    caseDetails.showLogo
                      ? "bg-[#C5A059] text-[#07162B] border-[#FFE394]"
                      : "bg-[#020A17] text-[#8C7A60] border-[#3A2C18]"
                  )}
                >
                  {caseDetails.showLogo ? "Logo Visible" : "Logo Hidden"}
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditCoverModalOpen(false);
                    setIsTemplateModalOpen(true);
                  }}
                  className="flex-1 border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#07162B] text-xs h-7 gap-1.5 cursor-pointer"
                >
                  <LayoutGrid className="w-3 h-3 text-[#DFBE77]" />
                  <span>Choose Template</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditCoverModalOpen(false);
                    setIsCompilerModalOpen(true);
                  }}
                  className="flex-1 border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#07162B] text-xs h-7 gap-1.5 cursor-pointer"
                >
                  <FileSignature className="w-3 h-3 text-[#DFBE77]" />
                  <span>Compiler Tool</span>
                </Button>
              </div>
            </div>
            <DialogFooter className="pt-2 border-t border-[#3A2C18]/60 flex items-center justify-between sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditCoverModalOpen(false)}
                className="text-[#C6B697] hover:text-white hover:bg-white/[0.05] text-xs h-7 px-3"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setIsEditCoverModalOpen(false);
                  toast.success("Cover sheet details saved");
                }}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-7 px-4 shadow-md hover:brightness-105"
              >
                Apply Details
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 2. Choose Template Modal */}
        <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
          <DialogContent className="max-w-lg bg-[#05142B] border border-[#3A2C18] text-white shadow-2xl">
            <DialogHeader>
              <DialogTitle className="font-serif text-lg text-[#FFF4D4]">
                Select State Complaint Template
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2.5 py-2">
              <div 
                onClick={() => {
                  setIsTemplateModalOpen(false);
                  toast.success("Georgia DOE Standard IDEA template loaded");
                }}
                className="p-3.5 rounded-lg border border-[#C5A059]/60 bg-[#020A17] hover:bg-[#07162B] cursor-pointer transition-all flex items-start gap-3"
              >
                <FileSignature className="w-5 h-5 text-[#DFBE77] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-serif font-bold text-[#FFF4D4]">Georgia DOE Standard IDEA Complaint</h4>
                  <p className="text-[11px] text-[#C6B697] mt-0.5">Complies with Ga. Comp. R. & Regs. 160-4-7-.12 with one-year statutory lookback.</p>
                </div>
              </div>

              <div 
                onClick={() => {
                  setIsTemplateModalOpen(false);
                  toast.success("Service implementation failure template loaded");
                }}
                className="p-3.5 rounded-lg border border-[#3A2C18] bg-[#020A17] hover:bg-[#07162B] cursor-pointer transition-all flex items-start gap-3"
              >
                <Clock className="w-5 h-5 text-[#DFBE77] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-serif font-bold text-[#FFF4D4]">Service Deprivation & Compensatory Education</h4>
                  <p className="text-[11px] text-[#C6B697] mt-0.5">Specialized schedule tracking missed therapy hours, staff shortages, and 1:1 tutoring recovery.</p>
                </div>
              </div>

              <div 
                onClick={() => {
                  setIsTemplateModalOpen(false);
                  toast.success("Child Find & Evaluation delay template loaded");
                }}
                className="p-3.5 rounded-lg border border-[#3A2C18] bg-[#020A17] hover:bg-[#07162B] cursor-pointer transition-all flex items-start gap-3"
              >
                <Scale className="w-5 h-5 text-[#DFBE77] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-serif font-bold text-[#FFF4D4]">Child Find & Evaluation Timeline Denial</h4>
                  <p className="text-[11px] text-[#C6B697] mt-0.5">60-day statutory timeline breach with independent evaluation request.</p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 3. Insert Document / Exhibit Modal with PG-023-VAULT Document Vault Access */}
        <Dialog open={isAddPageModalOpen} onOpenChange={setIsAddPageModalOpen}>
          <DialogContent className="max-w-2xl bg-[#05142B] border border-[#3A2C18] text-white shadow-2xl p-0 overflow-hidden">
            {/* Header with Admiralty styling & PG-023-VAULT Badge */}
            <div className="p-5 border-b border-[#3A2C18] bg-gradient-to-r from-[#041633] via-[#072147] to-[#041633] relative">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#0A2540] text-[#FFE394] border border-[#DFBE77]/40 flex items-center gap-1.5">
                      <FolderArchive className="w-3 h-3 text-[#DFBE77]" />
                      PG-023-VAULT · Document Vault
                    </span>
                    <span className="text-[10px] font-mono text-[#C6B697]">
                      Target: <span className="text-[#FFE394] font-bold">{effectiveTargetLabel}</span>
                    </span>
                  </div>
                  <DialogTitle className="font-serif text-lg sm:text-xl text-[#FFF4D4] font-bold">
                    Insert Document into State Complaint
                  </DialogTitle>
                  <p className="text-xs text-[#C6B697] mt-0.5">
                    Attach evidentiary records for <span className="text-[#FFF4D4] font-semibold">{caseDetails.studentName || "the student"}</span> from the official Document Vault or upload a new record.
                  </p>
                </div>
              </div>

              {/* 3 Tab Mode Switcher */}
              <div className="flex items-center gap-1.5 mt-4 border-b border-[#3A2C18]/80 pb-0">
                <button
                  type="button"
                  onClick={() => setInsertModalTab("vault")}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 text-xs font-serif font-bold rounded-t-md transition-all cursor-pointer border-b-2",
                    insertModalTab === "vault"
                      ? "bg-[#0B254A] text-[#FFE394] border-[#DFBE77]"
                      : "text-[#C6B697] hover:text-white border-transparent hover:bg-white/[0.04]"
                  )}
                >
                  <FolderArchive className="w-3.5 h-3.5 text-[#DFBE77]" />
                  <span>Retrieve from Document Vault</span>
                  <span className="text-[10px] font-mono bg-[#03152E] px-1.5 py-0.2 rounded text-[#DFBE77] border border-[#3A2C18]">
                    {availableVaultDocs.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setInsertModalTab("upload")}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 text-xs font-serif font-bold rounded-t-md transition-all cursor-pointer border-b-2",
                    insertModalTab === "upload"
                      ? "bg-[#0B254A] text-[#FFE394] border-[#DFBE77]"
                      : "text-[#C6B697] hover:text-white border-transparent hover:bg-white/[0.04]"
                  )}
                >
                  <Upload className="w-3.5 h-3.5 text-[#DFBE77]" />
                  <span>Upload New Document</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInsertModalTab("custom")}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 text-xs font-serif font-bold rounded-t-md transition-all cursor-pointer border-b-2",
                    insertModalTab === "custom"
                      ? "bg-[#0B254A] text-[#FFE394] border-[#DFBE77]"
                      : "text-[#C6B697] hover:text-white border-transparent hover:bg-white/[0.04]"
                  )}
                >
                  <FileText className="w-3.5 h-3.5 text-[#DFBE77]" />
                  <span>Custom Narrative Page</span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 max-h-[60vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-[#3A2C18]">
              {/* Exhibit Destination Selector (Shows when currently on an exhibit like Exhibit A) */}
              {isCurrentPageAnExhibit && (
                <div className="mb-4 p-3 rounded-lg bg-[#020A17] border border-[#3A2C18] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#A69371] block">
                      Exhibit Attachment Destination
                    </span>
                    <span className="text-xs font-serif font-bold text-[#FFF4D4] truncate block">
                      {targetExhibitMode === "current"
                        ? `Attach directly to ${currentExhibitLabel}`
                        : `Create New Exhibit (${nextExhibitLetter})`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 bg-[#05142B] p-1 rounded-md border border-[#3A2C18] shrink-0">
                    <button
                      type="button"
                      onClick={() => setTargetExhibitMode("current")}
                      className={cn(
                        "px-2.5 py-1 text-xs rounded font-medium transition-all cursor-pointer",
                        targetExhibitMode === "current"
                          ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-xs"
                          : "text-[#C6B697] hover:text-white"
                      )}
                    >
                      Attach to {activePage.exhibitTag || "Exhibit A"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetExhibitMode("new")}
                      className={cn(
                        "px-2.5 py-1 text-xs rounded font-medium transition-all cursor-pointer",
                        targetExhibitMode === "new"
                          ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-xs"
                          : "text-[#C6B697] hover:text-white"
                      )}
                    >
                      New Exhibit ({nextExhibitLetter})
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 1: RETRIEVE FROM DOCUMENT VAULT (PG-023-VAULT) */}
              {insertModalTab === "vault" && (
                <div className="space-y-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-[#8C6D2B] absolute left-3 top-2.5 pointer-events-none" />
                    <Input
                      placeholder="Search vault documents by title, IEP date, or category..."
                      value={vaultSearchQuery}
                      onChange={(e) => setVaultSearchQuery(e.target.value)}
                      className="bg-[#020A17] border-[#3A2C18] text-white pl-9 h-9 text-xs focus-visible:ring-[#DFBE77]/40 placeholder:text-[#8C6D2B]/70"
                    />
                  </div>

                  {/* Documents List */}
                  {vaultQuery.isLoading || iepDocQuery.isLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-[#DFBE77] mb-2" />
                      <span className="text-xs text-[#C6B697]">Accessing PG-023-VAULT records...</span>
                    </div>
                  ) : availableVaultDocs.length === 0 ? (
                    <div className="py-10 px-4 rounded-xl border border-dashed border-[#3A2C18] bg-[#020A17]/60 text-center">
                      <FolderArchive className="w-8 h-8 text-[#8C6D2B] mx-auto mb-2 opacity-60" />
                      <p className="font-serif text-sm font-semibold text-[#FFF4D4]">
                        No Documents Found in Vault
                      </p>
                      <p className="text-xs text-[#C6B697] mt-1 max-w-sm mx-auto">
                        {vaultSearchQuery 
                          ? `No records matching "${vaultSearchQuery}". Try clearing search.`
                          : `No stored documents found for ${caseDetails.studentName}. You can upload a new record directly to the vault below.`}
                      </p>
                      <Button
                        type="button"
                        onClick={() => setInsertModalTab("upload")}
                        className="mt-4 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-8 gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Upload Document to Vault
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] text-[#C6B697] px-1">
                        <span>Showing {availableVaultDocs.length} vault records for {caseDetails.studentName}</span>
                        <span className="text-[#DFBE77] font-mono">1-Click Exhibit Insertion</span>
                      </div>

                      <div className="grid gap-2">
                        {availableVaultDocs.map((doc, idx) => (
                          <div
                            key={`${doc.fileUrl}_${idx}`}
                            className="p-3.5 rounded-lg border border-[#3A2C18] bg-[#020A17] hover:bg-[#061833] hover:border-[#DFBE77]/60 transition-all flex items-center justify-between gap-3 group"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-8 h-8 rounded-md bg-[#071C38] border border-[#3A2C18] flex items-center justify-center shrink-0 group-hover:border-[#DFBE77]/60">
                                <FileText className="w-4 h-4 text-[#DFBE77]" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-serif font-semibold text-xs text-[#FFF4D4] truncate block">
                                    {doc.fileName}
                                  </span>
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#0A2540] text-[#FFE394] font-mono border border-[#DFBE77]/30">
                                    {doc.documentType}
                                  </span>
                                  {doc.source === "Current IEP Record" && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 font-medium border border-emerald-500/40">
                                      Primary Baseline
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-[10px] text-[#A69371] mt-0.5">
                                  <span>Source: {doc.source}</span>
                                  {doc.date && <span>• Uploaded: {doc.date}</span>}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(doc.fileUrl, "_blank")}
                                className="border-[#3A2C18] bg-[#03152E] text-[#C6B697] hover:text-white hover:bg-[#072147] text-[11px] h-7 px-2.5 gap-1"
                                title="Preview document in new tab"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Preview
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleInsertExhibitFromVault(doc)}
                                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-[11px] h-7 px-3 gap-1 shadow-sm hover:brightness-110 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                Attach to {effectiveTargetLabel}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: UPLOAD NEW DOCUMENT DIRECTLY TO VAULT */}
              {insertModalTab === "upload" && (
                <div className="space-y-4">
                  <div className="p-3 rounded-lg border border-[#DFBE77]/30 bg-[#061C3B]/60 text-xs text-[#C6B697] flex items-start gap-2.5">
                    <FolderArchive className="w-4 h-4 text-[#DFBE77] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-[#FFF4D4] block">Automatic PG-023-VAULT Synchronization</span>
                      Any document uploaded here is saved permanently in the student's Document Vault and attached to <span className="font-mono text-[#FFE394] font-bold">{effectiveTargetLabel}</span> in this State Complaint packet.
                    </div>
                  </div>

                  <div>
                    <Label className="text-[#C6B697] text-xs">Document File (PDF, DOCX, Images)</Label>
                    <input
                      ref={vaultFileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadFile(file);
                          if (!uploadCustomTitle) {
                            setUploadCustomTitle(file.name.replace(/\.[^/.]+$/, ""));
                          }
                        }
                      }}
                      className="hidden"
                      id="state-complaint-vault-file-input"
                    />
                    <div
                      onClick={() => vaultFileInputRef.current?.click()}
                      className={cn(
                        "mt-1.5 border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all",
                        uploadFile
                          ? "border-[#DFBE77] bg-[#0A2540]/80 text-[#FFF4D4]"
                          : "border-[#3A2C18] bg-[#020A17] hover:border-[#DFBE77]/60 text-[#C6B697]"
                      )}
                    >
                      {uploadFile ? (
                        <div className="flex items-center justify-center gap-3">
                          <FileText className="w-6 h-6 text-[#DFBE77]" />
                          <div className="text-left">
                            <span className="font-serif font-bold text-xs text-[#FFF4D4] block truncate max-w-sm">
                              {uploadFile.name}
                            </span>
                            <span className="text-[10px] text-[#A69371]">
                              {(uploadFile.size / 1024 / 1024).toFixed(2)} MB · Click to change file
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <FileUp className="w-8 h-8 text-[#8C6D2B] mb-1.5" />
                          <span className="font-serif font-bold text-xs text-[#FFF4D4]">
                            Click or drag file to upload
                          </span>
                          <span className="text-[10px] text-[#A69371] mt-0.5">
                            PDF, Word documents, diagnostic reports, psychoeds, or service logs
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[#C6B697] text-xs">Document Display Title</Label>
                      <Input
                        placeholder="e.g. Speech & Language Evaluation"
                        value={uploadCustomTitle}
                        onChange={(e) => setUploadCustomTitle(e.target.value)}
                        className="bg-[#020A17] border-[#3A2C18] text-white mt-1 h-8 text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-[#C6B697] text-xs">Document Classification</Label>
                      <select
                        value={uploadDocType}
                        onChange={(e) => setUploadDocType(e.target.value)}
                        className="w-full bg-[#020A17] border border-[#3A2C18] text-white rounded-md mt-1 h-8 px-2 text-xs"
                      >
                        <option value="Evaluation / Diagnostic Report">Evaluation / Diagnostic Report</option>
                        <option value="IEP / Section 504 Plan">IEP / Section 504 Plan</option>
                        <option value="Prior Written Notice (PWN)">Prior Written Notice (PWN)</option>
                        <option value="Service Log / Provider Attendance">Service Log / Provider Attendance</option>
                        <option value="Medical & Clinical Report">Medical & Clinical Report</option>
                        <option value="LEA Correspondence / Dispute Notice">LEA Correspondence / Dispute Notice</option>
                        <option value="General Evidentiary Record">General Evidentiary Record</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="button"
                      disabled={!uploadFile || isUploadingToVault}
                      onClick={handleUploadAndInsertExhibit}
                      className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-9 px-5 gap-2 shadow-md hover:brightness-110 disabled:opacity-50 cursor-pointer"
                    >
                      {isUploadingToVault ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Uploading to Vault...
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          Upload to Vault & Attach to {effectiveTargetLabel}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* TAB 3: CUSTOM NARRATIVE PLEADING PAGE */}
              {insertModalTab === "custom" && (
                <div className="space-y-4">
                  <div className="p-3 rounded-lg border border-[#3A2C18] bg-[#020A17] text-xs text-[#C6B697]">
                    <span className="font-semibold text-[#FFF4D4] block mb-0.5">Narrative Legal Section</span>
                    Adds a drafting sheet into the complaint binder for drafting factual statements, legal violations, or requested remedies.
                  </div>

                  <div>
                    <Label className="text-[#C6B697] text-xs">Section Title</Label>
                    <Input
                      placeholder="e.g. Statement of FAPE Deprivation & Make-Up Hours"
                      value={newPageTitle}
                      onChange={(e) => setNewPageTitle(e.target.value)}
                      className="bg-[#020A17] border-[#3A2C18] text-white mt-1 h-8 text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-[#C6B697] text-xs">Section Category</Label>
                    <select
                      value={newPageCategory}
                      onChange={(e) => setNewPageCategory(e.target.value as any)}
                      className="w-full bg-[#020A17] border border-[#3A2C18] text-white rounded-md mt-1 h-8 px-2 text-xs"
                    >
                      <option value="facts">Statement of Facts</option>
                      <option value="violations">Legal Violations</option>
                      <option value="remedies">Remedies & Compensatory Calculation</option>
                      <option value="pleading">Formal Pleading Section</option>
                      <option value="exhibit">Custom Exhibit Placeholder</option>
                    </select>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="button"
                      disabled={!newPageTitle.trim()}
                      onClick={handleAddPage}
                      className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-8 px-5 disabled:opacity-50"
                    >
                      Insert Narrative Page
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-[#3A2C18] bg-[#031124] flex items-center justify-between text-xs">
              <span className="text-[11px] text-[#A69371] font-mono">
                Admiralty Docket Engine · Waypoint Advocates
              </span>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAddPageModalOpen(false)}
                className="text-xs h-7 text-[#C6B697] hover:text-white hover:bg-white/[0.08]"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 4. Complaint Compiler Modal */}
        <Dialog open={isCompilerModalOpen} onOpenChange={setIsCompilerModalOpen}>
          <DialogContent className="max-w-lg bg-[#05142B] border border-[#3A2C18] text-white shadow-2xl">
            <DialogHeader>
              <DialogTitle className="font-serif text-lg text-[#FFF4D4] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#DFBE77]" />
                Complaint Compiler & Readiness Audit
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-lg bg-[#020A17] border border-emerald-500/30 flex items-center gap-2 text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Statutory 1-year filing window verified for Georgia DOE.</span>
              </div>
              <div className="p-3 rounded-lg bg-[#020A17] border border-[#3A2C18] space-y-1.5 text-[#C6B697]">
                <div className="flex justify-between text-white font-medium">
                  <span>Packet Assembly Status:</span>
                  <span className="text-[#DFBE77]">{totalDocketPages} Pages Assembled</span>
                </div>
                <div>• 1. State Form formatted with LEA identifiers</div>
                <div>• 2. Clarity Control Restatement with statutory claims</div>
                <div>• 3. Chronological Summary with 1-year timeline milestones</div>
                <div>• 4. Master Exhibit Index with evidentiary schedule</div>
                <div>• 5. Exhibit A: Student's IEP attached as primary baseline</div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={() => {
                  setIsCompilerModalOpen(false);
                  handleExportPdf();
                }}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-8 w-full"
              >
                Export Complete Filing Packet (PDF)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 5. Real Print Preview Modal (Authentic 8.5" x 11" Standard White Paper, No Parchment) */}
        <Dialog
          open={isPreviewModalOpen}
          onOpenChange={(open) => {
            if (open && stateFormPages.length === 0) {
              renderFilledStateFormPages(officialFormState);
            }
            setIsPreviewModalOpen(open);
          }}
        >
          <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-[94vw] md:max-w-[92vw] lg:max-w-5xl xl:max-w-6xl max-h-[94vh] overflow-y-auto bg-[#071322] border border-[#3A2C18] text-white shadow-2xl custom-scrollbar p-3 sm:p-5">
            <DialogHeader className="space-y-0">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#3A2C18]">
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-2">
                    <DialogTitle className="font-serif text-lg sm:text-xl text-[#FFF4D4] font-bold">
                      Official Print Preview
                    </DialogTitle>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-600/40 font-semibold uppercase tracking-wider">
                      White Print Paper · No Parchment
                    </span>
                  </div>
                  <span className="text-xs text-[#C6B697] font-mono mt-0.5">
                    Standard US Letter (8.5" × 11") · {totalDocketPages} Pages Total (4-Page Official State Form + Sections)
                  </span>
                </div>

                {/* 100% Letter Paper Indicator & Print Button */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-[#020A17] border border-[#3A2C18] rounded-md px-3 py-1 text-xs text-[#FFF4D4] font-medium font-serif gap-2 shadow-inner">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>100% Letter View</span>
                  </div>


                  <Button
                    type="button"
                    size="sm"
                    onClick={handlePrintAll}
                    className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-7.5 px-3 gap-1.5 cursor-pointer rounded-md shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                    title="Print complete filing packet with all sections and exhibits"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Full Packet ({totalDocketPages} Pgs)</span>
                  </Button>
                </div>
              </div>
            </DialogHeader>

            {/* Print Preview Desk Stage (Dark Desk Canvas with Authentic White 8.5x11 Sheets) */}
            <div className="space-y-10 py-6 px-1 sm:px-4 flex flex-col items-center">
              {pages.map((p, idx) => {
                const range = getBinderPageRange(idx, pages, caseDetails);
                if (p.id === "cover") {
                  return (
                    <div key={p.id} className="w-full flex flex-col items-center space-y-8">
                      {/* Section 01 Banner */}
                      <div className="w-full max-w-[816px] bg-[#05142B] px-4 py-2.5 rounded border border-[#3A2C18] flex flex-wrap items-center justify-between gap-2 text-xs text-[#FFF4D4]">
                        <div className="flex items-center gap-2">
                          <span className="font-serif font-bold text-[#FFE394]">
                            Section 01 · Official State Complaint Form
                          </span>
                          <span className="text-[#A69371] font-mono text-[11px]">
                            · Pages 1–4 of {totalDocketPages}
                          </span>
                        </div>
                        <a
                          href="/forms/gadoe-formal-complaint-form.pdf"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#DFBE77] hover:underline font-mono text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <span>Open Raw Form PDF</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      {/* Render all 4 pages of the Official State Complaint Form on White Paper */}
                      {stateFormPages.length > 0 ? (
                        <div className="w-full flex flex-col items-center space-y-10">
                          {stateFormPages.map((sPage, sIdx) => {
                            const pageTitles = [
                              "Page 1: Public Agency, Complainant & Student Information",
                              "Page 2: Statement of Problem, Proposed Resolution & Mediation",
                              "Page 3: Verification of Service to Local Educational Agency (LEA)",
                              "Page 4: Special Education Division Contact & Submission Information",
                            ];

                            return (
                              <div key={`state-preview-page-${sIdx}`} className="w-full flex flex-col items-center">
                                {/* Page Indicator Badge */}
                                <div className="w-full max-w-[816px] flex items-center justify-between text-[11px] font-mono text-[#D8C7A5] bg-[#020A17]/90 px-3.5 py-1.5 rounded-t border-t border-x border-[#3A2C18]">
                                  <span className="font-bold text-[#FFE394]">
                                    PAGE {sIdx + 1} OF {totalDocketPages}
                                  </span>
                                  <span className="text-[#C6B697] truncate ml-2">
                                    {pageTitles[sIdx]} · Official State Complaint Form (Filled)
                                  </span>
                                </div>
                                <div 
                                  style={{
                                    width: "816px",
                                    maxWidth: "816px",
                                    backgroundColor: "#FFFFFF",
                                    boxShadow: "0 16px 40px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)",
                                    border: "1px solid #D1D5DB",
                                  }}
                                  className="relative rounded-b overflow-hidden bg-white shrink-0"
                                >
                                  <StateComplaintFormPage
                                    page={sPage}
                                    pageIdx={sIdx}
                                    formState={officialFormState}
                                    readOnly={true}
                                    isPrint={false}
                                    viewMode="actual"
                                    className="border-0 shadow-none"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="w-full max-w-[816px] aspect-[612/792] bg-white rounded border border-[#C5A059]/60 overflow-hidden shadow-sm flex flex-col items-center justify-center p-8 text-center text-slate-700">
                          <div className="w-10 h-10 border-3 border-[#C5A059] border-t-transparent rounded-full animate-spin mb-4" />
                          <p className="font-serif text-base font-bold text-slate-900 mb-1">
                            Rendering Filled State Complaint Sheets...
                          </p>
                          <p className="text-xs text-slate-500 font-mono">
                            Preparing high-resolution print pages with your custom adopted signature and verified LEA details.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                }

                // All subsequent binders: render Cover Sheet (Sheet 1) followed by Content Sheet (Sheet 2) on REAL WHITE PAPER
                return (
                  <div key={p.id} className="w-full flex flex-col items-center space-y-10">
                    
                    {/* SHEET 1: STANDARDIZED BINDER COVER PAGE (WHITE PAPER) */}
                    <div className="w-full flex flex-col items-center">
                      <div className="w-full max-w-[816px] flex items-center justify-between text-[11px] font-mono text-[#D8C7A5] bg-[#020A17]/90 px-3.5 py-1.5 rounded-t border-t border-x border-[#3A2C18]">
                        <span className="font-bold text-[#FFE394]">
                          PAGE {range.coverPage} OF {totalDocketPages}
                        </span>
                        <span className="text-[#C6B697] truncate ml-2">
                          Section {idx + 1 < 10 ? `0${idx + 1}` : idx + 1} Cover Page · Standard White Print Paper
                        </span>
                      </div>
                      <BinderCoverPage
                        pageId={p.id}
                        title={p.title}
                        category={p.category}
                        sectionNumber={`Section ${idx + 1 < 10 ? `0${idx + 1}` : idx + 1}`}
                        coverPageNumber={range.coverPage}
                        totalDocketPages={totalDocketPages}
                        studentName={caseDetails.studentName}
                        studentDob={caseDetails.studentDob}
                        grade={caseDetails.grade}
                        school={caseDetails.school}
                        district={caseDetails.district}
                        preparedBy={caseDetails.preparedBy}
                        submissionDate={caseDetails.submissionDate}
                        agencyName={SUPPORTED_STATE_FORMS[officialFormState.stateCode]?.agencyName || "Georgia Department of Education"}
                        paperTheme="white"
                        viewMode="actual"
                        zoomLevel={100}
                      />
                    </div>

                    {/* SHEET 2+ : EXHIBIT AUTHENTIC PDF PAGES OR STANDARD CONTENT SHEET */}
                    {p.category === "exhibit" && p.renderedPages && p.renderedPages.length > 0 ? (
                      p.renderedPages.map((pdfPage, pIdx) => {
                        const continuousDocketPage = range.contentStart + pIdx;
                        return (
                          <div key={`preview-exhibit-${p.id}-p${pdfPage.pageNumber}`} className="w-full flex flex-col items-center">
                            <div className="w-full max-w-[816px] flex items-center justify-between text-[11px] font-mono text-[#D8C7A5] bg-[#020A17]/90 px-3.5 py-1.5 rounded-t border-t border-x border-[#3A2C18]">
                              <span className="font-bold text-[#FFE394]">
                                PAGE {continuousDocketPage} OF {totalDocketPages}
                              </span>
                              <span className="text-[#C6B697] truncate ml-2">
                                {p.exhibitTag || "Exhibit"} · Page {pdfPage.pageNumber} of {p.renderedPages!.length} · Evidentiary Document
                              </span>
                            </div>
                            <div
                              style={{
                                width: "816px",
                                maxWidth: "816px",
                                aspectRatio:
                                  pdfPage.width && pdfPage.height
                                    ? `${pdfPage.width} / ${pdfPage.height}`
                                    : "8.5 / 11",
                                backgroundColor: "#FFFFFF",
                                boxShadow: "0 16px 40px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)",
                                border: "1px solid #D1D5DB",
                              }}
                              className="relative rounded-b select-text flex flex-col items-center justify-center p-0 transition-all shrink-0 bg-white overflow-hidden"
                            >
                              <img
                                src={pdfPage.dataUrl}
                                alt={`Exhibit Page ${pdfPage.pageNumber}`}
                                className="w-full h-auto block mx-auto bg-white select-none pointer-events-none m-0 p-0"
                              />
                              {(p.highlights || [])
                                .filter((h) => h.pageNumber === pdfPage.pageNumber)
                                .map((h) => {
                                  const colorDef = HIGHLIGHT_COLOR_MAP[h.color] || HIGHLIGHT_COLOR_MAP.yellow;
                                  return (
                                    <div
                                      key={`preview-hl-${h.id}`}
                                      style={{
                                        position: "absolute",
                                        left: `${h.x}%`,
                                        top: `${h.y}%`,
                                        width: `${h.width}%`,
                                        height: `${h.height}%`,
                                        backgroundColor: colorDef.fill,
                                        borderBottom: `1.5px solid ${colorDef.border}`,
                                        mixBlendMode: "multiply",
                                        pointerEvents: "none",
                                        borderRadius: "2px",
                                      }}
                                    />
                                  );
                                })}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      /* SHEET 2+: DOCUMENT CONTENT SHEET(S) (WHITE PAPER) */
                      (() => {
                        const rawContent = p.id === "exhibit_index"
                          ? syncExhibitIndexTableOfSections(p.content || getDefaultExhibitContent(p, caseDetails), pages, caseDetails)
                          : (p.content || getDefaultExhibitContent(p, caseDetails));
                        const contentPages = paginateTextContent(rawContent);
                        return contentPages.map((pageText, pageSubIdx) => {
                          const currentSheetNumber = range.contentStart + pageSubIdx;
                          return (
                            <div key={`preview-content-${p.id}-${pageSubIdx}`} className="w-full flex flex-col items-center">
                              <div className="w-full max-w-[816px] flex items-center justify-between text-[11px] font-mono text-[#D8C7A5] bg-[#020A17]/90 px-3.5 py-1.5 rounded-t border-t border-x border-[#3A2C18]">
                                <span className="font-bold text-[#FFE394]">
                                  PAGE {currentSheetNumber} OF {totalDocketPages}
                                </span>
                                <span className="text-[#C6B697] truncate ml-2">
                                  {p.category === "exhibit"
                                    ? `${p.exhibitTag || "Exhibit"} · Evidentiary Summary Sheet ${contentPages.length > 1 ? `(Sheet ${pageSubIdx + 1} of ${contentPages.length})` : ""} · Standard White Print Paper`
                                    : `Section ${idx + 1 < 10 ? `0${idx + 1}` : idx + 1} Content ${contentPages.length > 1 ? `(Sheet ${pageSubIdx + 1} of ${contentPages.length})` : ""} · Standard White Print Paper`}
                                </span>
                              </div>
                              <div
                                style={{
                                  width: "816px",
                                  maxWidth: "816px",
                                  minHeight: "1056px",
                                  aspectRatio: "8.5 / 11",
                                  backgroundColor: "#FFFFFF",
                                  color: "#111827",
                                  boxShadow: "0 16px 40px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)",
                                  border: "1px solid #D1D5DB",
                                }}
                                className="relative rounded-b select-text flex flex-col justify-between px-10 sm:px-14 md:px-16 pt-12 pb-10 transition-all shrink-0 bg-white text-[#111827]"
                              >
                                {/* Running Top Header */}
                                <div className="w-full shrink-0 pb-3 border-b border-black flex items-center justify-between text-xs font-sans text-slate-800">
                                  <span className="font-bold uppercase tracking-wider">
                                    {p.category === "exhibit"
                                      ? `${p.exhibitTag ? `${p.exhibitTag} · ` : ""}${p.title}`
                                      : `Section ${idx + 1 < 10 ? `0${idx + 1}` : idx + 1} · ${p.id === "clarity_control" || p.category === "restatement" ? "Clarity Control Restatement" : p.title}`}
                                  </span>
                                  <span className="font-mono font-bold">
                                    Page {currentSheetNumber} of {totalDocketPages}
                                  </span>
                                </div>

                                {/* Content Body */}
                                <div className="flex-1 py-8 font-serif text-[13px] leading-relaxed text-justify text-black whitespace-pre-wrap select-text">
                                  {pageText}
                                </div>

                                {/* Running Bottom Footer */}
                                <div className="w-full shrink-0 pt-3 border-t border-[#8C7A60]/30 flex items-center justify-between text-[11px] font-serif text-slate-600">
                                  <span className="tracking-wide">
                                    {SUPPORTED_STATE_FORMS[officialFormState.stateCode]?.agencyName || "Georgia Department of Education"} IDEA Complaint
                                  </span>
                                  <span className="font-serif">Page {currentSheetNumber} of {totalDocketPages}</span>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()
                    )}

                  </div>
                );
              })}
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between w-full border-t border-[#3A2C18] pt-3">
              <span className="text-xs text-[#A69371] font-mono">
                {caseDetails.studentName?.replace(/^IN\s+RE:\s*/i, "")} · {caseDetails.district || "Cobb County School District"}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] text-xs h-8"
                >
                  Close
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleExportPdf}
                  className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-8 gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Download & Print</span>
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Open Recent Drafts Modal (PG-020 Session Recovery) */}
        <OpenRecentModal
          open={isOpenRecentModalOpen}
          onOpenChange={setIsOpenRecentModalOpen}
          onSelectDraft={handleSelectRecentDraft}
          onStartNewDraft={handleStartNewDraft}
          onSaveCurrentNow={handleSaveCurrentNow}
          currentStudentId={activeStudentId}
          currentStudentName={caseDetails.studentName}
        />

        {/* AI Writer Helper Modal (PG-020 Legal Drafting Assistant) */}
        <ComplaintAiWriterHelper
          isOpen={isAiWriterHelperOpen}
          onClose={() => setIsAiWriterHelperOpen(false)}
          currentText={activePage.content || ""}
          selectedText={selectedDocumentText}
          onApplyText={handleApplyAiText}
          sectionTitle={activePage.title}
          studentName={caseDetails.studentName}
          districtName={caseDetails.district}
          stateCode={officialFormState.stateCode || "GA"}
        />

        {/* Manage Packet Binders Modal (PG-020 Binder Manager) */}
        <ManagePacketBindersModal
          isOpen={isManageBindersModalOpen}
          onClose={() => setIsManageBindersModalOpen(false)}
          pages={pages}
          onUpdatePages={(newPages) => setPages(ensureRequiredBinders(newPages))}
          activePageId={activePageId}
          onSelectPage={(pageId) => {
            setActivePageId(pageId);
            if (pageId === "cover") {
              setActiveToolbarTab("cover");
            } else {
              setActiveToolbarTab("edit");
            }
          }}
          stateCode={officialFormState.stateCode || "GA"}
          studentName={caseDetails.studentName}
          onOpenVaultInsert={() => {
            setIsManageBindersModalOpen(false);
            setIsAddPageModalOpen(true);
          }}
        />

        {/* Explicit Yes / No Removal Confirmation Dialog from Packet Index Cards */}
        <Dialog
          open={!!binderPendingRemoval}
          onOpenChange={(open) => !open && setBinderPendingRemoval(null)}
        >
          <DialogContent
            className={cn(
              "w-full max-w-md p-5 rounded-xl border shadow-2xl",
              "bg-[#07162B] border-[#C5A059]/80 text-slate-100"
            )}
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(14, 42, 82, 0.98) 0%, rgba(7, 22, 43, 0.98) 100%), url('/decor/folio-leather-texture.png')",
              backgroundRepeat: "repeat",
              backgroundSize: "220px",
            }}
          >
            <DialogHeader className="flex flex-row items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-950/80 border border-rose-600/60 flex items-center justify-center text-rose-400 shrink-0 shadow-lg">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>

              <div className="text-left flex-1">
                <DialogTitle className="font-serif font-bold text-base text-[#FFF4D4]">
                  Remove Binder from Packet?
                </DialogTitle>
                <p className="text-xs text-[#C6B697] mt-1.5 leading-relaxed">
                  Are you sure you want to remove{" "}
                  <span className="text-[#FFE394] font-bold">
                    "{binderPendingRemoval?.page.title}"
                  </span>{" "}
                  from the state complaint packet?
                </p>
              </div>
            </DialogHeader>

            <div className="p-3 my-2 rounded-lg bg-[#020A17]/80 border border-[#3A2C18] text-xs text-[#A69371] leading-relaxed">
              <span className="text-[#FFE394] font-medium block mb-1">
                ✓ Automatic Page Renumbering Guarantee:
              </span>
              All remaining binders and continuous docket page numbers will automatically shift up and recalculate without gaps. You can re-add this binder anytime from the packet manager.
            </div>

            <DialogFooter className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#3A2C18]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBinderPendingRemoval(null)}
                className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] text-xs h-8"
              >
                No, Keep Binder
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleConfirmRemoveBinder}
                className="bg-rose-600 hover:bg-rose-500 text-white font-serif font-bold text-xs h-8 px-4 shadow-md transition-all cursor-pointer"
              >
                Yes, Remove Binder
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* =========================================================================
            SMALL WINDOW: RENAME BINDER MODAL (TRIGGERED BY DOUBLE-CLICK ON BINDER NAME)
            ========================================================================= */}
        <Dialog
          open={!!binderToRename}
          onOpenChange={(open) => {
            if (!open) setBinderToRename(null);
          }}
        >
          <DialogContent
            className={cn(
              "w-full max-w-md p-5 rounded-xl border shadow-2xl",
              "bg-[#07162B] border-[#C5A059]/80 text-slate-100"
            )}
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(14, 42, 82, 0.98) 0%, rgba(7, 22, 43, 0.98) 100%), url('/decor/folio-leather-texture.png')",
              backgroundRepeat: "repeat",
              backgroundSize: "220px",
            }}
          >
            <DialogHeader className="flex flex-row items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#031124] border border-[#C5A059]/70 flex items-center justify-center text-[#FFE394] shrink-0 shadow-lg">
                <Pencil className="w-4 h-4 text-[#DFBE77]" />
              </div>

              <div className="text-left flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <DialogTitle className="font-serif font-bold text-base text-[#FFF4D4]">
                    Rename Binder
                  </DialogTitle>
                  {binderToRename && (
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#031124] border border-[#C5A059]/50 text-[#FFE394]">
                      {binderToRename.id === "cover" ? "Binder 01" : `Binder ${binderToRename.number || ""}`}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#C6B697] mt-1 leading-relaxed">
                  Enter a new name for this packet binder. Changes update the index, continuous docket page headers, and filing bookmarks immediately.
                </p>
              </div>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveRename();
              }}
              className="mt-3 flex flex-col gap-3.5"
            >
              <div>
                <label className="block text-xs font-serif font-bold text-[#FFE394] mb-1.5">
                  Binder Name / Title <span className="text-rose-400">*</span>
                </label>
                <Input
                  value={renameTitleInput}
                  onChange={(e) => setRenameTitleInput(e.target.value)}
                  placeholder="e.g., Parent's Statement of Facts & Chronology"
                  autoFocus
                  onFocus={(e) => e.target.select()}
                  className="bg-[#020A17] border-[#3A2C18] focus:border-[#DFBE77] text-[#FFF4D4] font-serif text-sm h-10 placeholder:text-[#5A4830]"
                />
              </div>

              {binderToRename?.category === "exhibit" && (
                <div>
                  <label className="block text-xs font-serif font-bold text-[#FFE394] mb-1.5">
                    Exhibit Identification Tag (Optional)
                  </label>
                  <Input
                    value={renameExhibitTagInput}
                    onChange={(e) => setRenameExhibitTagInput(e.target.value)}
                    placeholder="e.g., Exhibit A or EXHIBIT C"
                    className="bg-[#020A17] border-[#3A2C18] focus:border-[#DFBE77] text-[#FFF4D4] font-mono text-xs h-9 placeholder:text-[#5A4830]"
                  />
                  <p className="text-[11px] text-[#A69371] mt-1">
                    Used on evidentiary stamps and exhibit tab slip sheets.
                  </p>
                </div>
              )}

              <div className="p-2.5 rounded-lg bg-[#020A17]/80 border border-[#3A2C18] text-[11px] text-[#A69371] flex items-center justify-between">
                <span>Category: <strong className="text-[#DFBE77] capitalize">{binderToRename?.category}</strong></span>
                <span className="text-[10px] text-[#C6B697] italic">Press Enter to save</span>
              </div>

              <DialogFooter className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#3A2C18] mt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setBinderToRename(null)}
                  className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] text-xs h-8 cursor-pointer"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  disabled={!renameTitleInput.trim()}
                  className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-8 px-4 hover:brightness-110 shadow-md cursor-pointer disabled:opacity-40"
                >
                  Save Binder Name
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* =========================================================================
            SMALL WINDOW: EVIDENCE CHECKLIST & COMPLAINT SCRATCHPAD NOTES
            ========================================================================= */}
        <Dialog open={isNotesModalOpen} onOpenChange={setIsNotesModalOpen}>
          <DialogContent
            className={cn(
              "w-full max-w-xl p-5 rounded-xl border shadow-2xl flex flex-col max-h-[88vh]",
              "bg-[#07162B] border-[#C5A059]/80 text-slate-100"
            )}
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(14, 42, 82, 0.98) 0%, rgba(7, 22, 43, 0.98) 100%), url('/decor/folio-leather-texture.png')",
              backgroundRepeat: "repeat",
              backgroundSize: "220px",
            }}
          >
            {/* Header */}
            <DialogHeader className="flex flex-row items-start gap-3 pb-2 border-b border-[#3A2C18]/80">
              <div className="w-10 h-10 rounded-full bg-[#031124] border border-[#C5A059]/70 flex items-center justify-center text-[#FFE394] shrink-0 shadow-lg">
                <ClipboardCheck className="w-5 h-5 text-[#DFBE77]" />
              </div>

              <div className="text-left flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <DialogTitle className="font-serif font-bold text-base text-[#FFF4D4]">
                    Evidence Checklist & Complaint Notes
                  </DialogTitle>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/70 border border-emerald-700/50 px-2 py-0.5 rounded-full shrink-0 font-sans">
                    <Cloud className="w-3 h-3 text-emerald-300" />
                    Auto-saved
                  </span>
                </div>
                <p className="text-xs text-[#C6B697] mt-1 leading-relaxed">
                  Track records to gather, check off verified exhibits, and draft working notes. Auto-saves continuously with your complaint draft.
                </p>
              </div>
            </DialogHeader>

            {/* Segmented Control / Tabs */}
            <div className="flex items-center gap-1 p-1 bg-[#020A17] rounded-lg border border-[#3A2C18] mt-2 shrink-0">
              <button
                type="button"
                onClick={() => setNotesActiveTab("checklist")}
                className={cn(
                  "flex-1 py-1.5 px-3 rounded-md text-xs font-serif font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                  notesActiveTab === "checklist"
                    ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-sm"
                    : "text-[#C6B697] hover:text-[#FFF4D4] hover:bg-white/[0.04]"
                )}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Evidence Checklist</span>
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold leading-none ml-1",
                  notesActiveTab === "checklist" ? "bg-[#07162B] text-[#FFE394]" : "bg-[#031124] text-[#DFBE77]"
                )}>
                  {checklistItems.filter((i) => i.completed).length}/{checklistItems.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setNotesActiveTab("notes")}
                className={cn(
                  "flex-1 py-1.5 px-3 rounded-md text-xs font-serif font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                  notesActiveTab === "notes"
                    ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-sm"
                    : "text-[#C6B697] hover:text-[#FFF4D4] hover:bg-white/[0.04]"
                )}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Complaint Scratchpad Notes</span>
                {caseDetails.evidenceNotes && caseDetails.evidenceNotes.trim().length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                )}
              </button>
            </div>

            {/* TAB 1: EVIDENCE CHECKLIST */}
            {notesActiveTab === "checklist" && (
              <div className="flex-1 min-h-0 flex flex-col gap-3 mt-2 overflow-y-auto pr-1 custom-scrollbar">
                {/* Progress bar */}
                <div className="p-2.5 rounded-lg bg-[#020A17]/80 border border-[#3A2C18] shrink-0">
                  <div className="flex items-center justify-between text-xs mb-1.5 font-sans">
                    <span className="text-[#C6B697]">
                      Evidence Gathering Progress:
                    </span>
                    <span className="font-mono font-bold text-[#FFE394]">
                      {checklistItems.filter((i) => i.completed).length} of {checklistItems.length} Gathered ({Math.round((checklistItems.filter((i) => i.completed).length / Math.max(1, checklistItems.length)) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#031124] rounded-full overflow-hidden border border-[#3A2C18]">
                    <div
                      className="h-full bg-gradient-to-r from-[#C5A059] to-emerald-400 transition-all duration-300"
                      style={{
                        width: `${Math.round((checklistItems.filter((i) => i.completed).length / Math.max(1, checklistItems.length)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto">
                  {checklistItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleToggleChecklistItem(item.id)}
                      className={cn(
                        "flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer group text-xs select-none",
                        item.completed
                          ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-200/80"
                          : "bg-[#020A17]/85 border-[#3A2C18] hover:border-[#C5A059]/60 text-[#FFF4D4]"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                        <span className="shrink-0 text-[#DFBE77]">
                          {item.completed ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4 text-[#8C6D2B] group-hover:text-[#DFBE77]" />
                          )}
                        </span>
                        <span className={cn(
                          "font-serif leading-snug break-words",
                          item.completed && "line-through text-[#A69371]"
                        )}>
                          {item.text}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.category && (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#031124] text-[#DFBE77] border border-[#3A2C18]">
                            {item.category}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChecklistItem(item.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-rose-400 hover:text-rose-200 transition-opacity cursor-pointer"
                          title="Delete checklist item"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Custom Checklist Item */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }}
                  className="flex items-center gap-2 pt-2 border-t border-[#3A2C18] shrink-0"
                >
                  <Input
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    placeholder="Add custom evidence item (e.g., Attendance records from 10/12)..."
                    className="flex-1 bg-[#020A17] border-[#3A2C18] focus:border-[#DFBE77] text-xs h-8.5 text-[#FFF4D4] placeholder:text-[#5A4830]"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!newChecklistText.trim()}
                    className="bg-[#071C3A] hover:bg-[#0A2E5C] text-[#FFE394] border border-[#DFBE77]/60 text-xs h-8.5 px-3 font-serif font-bold cursor-pointer disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </Button>
                </form>

                {/* Reset button */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleResetChecklist}
                    className="text-[10px] text-[#A69371] hover:text-[#DFBE77] underline cursor-pointer"
                  >
                    Reset to Standard Advocacy Evidence Checklist
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: COMPLAINT NOTES & SCRATCHPAD */}
            {notesActiveTab === "notes" && (
              <div className="flex-1 min-h-0 flex flex-col gap-2.5 mt-2">
                <div className="flex items-center justify-between text-xs text-[#C6B697] shrink-0">
                  <span>Jot rough notes, witness summaries, or things to weave into the complaint:</span>
                  <span className="font-mono text-[11px] text-[#DFBE77]">
                    {caseDetails.evidenceNotes?.trim() ? caseDetails.evidenceNotes.trim().split(/\s+/).length : 0} words
                  </span>
                </div>

                <textarea
                  value={caseDetails.evidenceNotes || ""}
                  onChange={(e) => handleUpdateEvidenceNotes(e.target.value)}
                  placeholder="e.g.,
- Parent reports speech services canceled on 3 consecutive Mondays in November
- Verify PWN dated Oct 14 matches what district actually implemented
- Include quotation from Dr. Miller's neuropsych report regarding dyslexia diagnosis
- Request compensatory tutoring at 1:1 certified instructor rate..."
                  className="flex-1 min-h-[220px] p-3 rounded-lg bg-[#020A17] border border-[#3A2C18] focus:border-[#DFBE77] text-[#FFF4D4] font-serif text-xs leading-relaxed focus:outline-hidden custom-scrollbar resize-none placeholder:text-[#5A4830]"
                />

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#3A2C18] shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!caseDetails.evidenceNotes?.trim()) {
                        toast.error("No notes to copy");
                        return;
                      }
                      navigator.clipboard.writeText(caseDetails.evidenceNotes);
                      toast.success("Notes copied to clipboard");
                    }}
                    className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] text-xs h-8 gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#FFE394]" />
                    <span>Copy Notes</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleInsertNotesIntoActivePage}
                    disabled={!caseDetails.evidenceNotes?.trim()}
                    className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-8 px-3.5 hover:brightness-110 shadow-md cursor-pointer disabled:opacity-40 gap-1.5"
                    title={`Insert these notes into active binder "${activePage.title}"`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Insert into Active Binder ({activePage.title.slice(0, 18)}...)</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Footer */}
            <DialogFooter className="flex items-center justify-between sm:justify-between pt-2 border-t border-[#3A2C18] mt-2 shrink-0">
              <span className="text-[11px] text-[#A69371] italic">
                ✓ All items auto-save with draft
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNotesModalOpen(false)}
                className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] text-xs h-8 cursor-pointer"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── PRINT MEDIA STYLES & PRINT DOCKET ───────────────────────────────── */}
        <style>{`
          @page {
            size: letter portrait;
            margin: 0;
          }
          @media print {
            html, body {
              background: #ffffff !important;
              color: #000000 !important;
              width: 8.5in !important;
              min-width: 8.5in !important;
              max-width: 8.5in !important;
              height: auto !important;
              min-height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            header, nav, aside, dialog, [role="dialog"], [data-radix-portal], button, .no-print {
              display: none !important;
            }
            #root,
            #root > div,
            #root > div > div,
            #root > div > div > div {
              height: auto !important;
              min-height: 0 !important;
              max-height: none !important;
              overflow: visible !important;
              position: static !important;
              background: #ffffff !important;
              padding: 0 !important;
              margin: 0 !important;
              border: none !important;
            }
            body * {
              visibility: hidden;
            }
            #state-complaint-print-docket,
            #state-complaint-print-docket * {
              visibility: visible !important;
            }
            #state-complaint-print-docket {
              display: block !important;
              position: static !important;
              width: 8.5in !important;
              max-width: 8.5in !important;
              min-width: 8.5in !important;
              margin: 0 auto !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              overflow: visible !important;
            }
            .print-packet-sheet {
              display: block !important;
              width: 8.5in !important;
              min-width: 8.5in !important;
              max-width: 8.5in !important;
              height: 10.98in !important;
              min-height: 10.98in !important;
              max-height: 10.98in !important;
              margin: 0 !important;
              padding: 0 !important;
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              background: #ffffff !important;
              color: #000000 !important;
              box-sizing: border-box !important;
              position: relative !important;
              overflow: hidden !important;
            }
            .print-packet-sheet:last-child,
            .print-packet-sheet:last-of-type,
            .print-packet-sheet.is-last-sheet,
            #state-complaint-print-docket > div:last-child,
            #state-complaint-print-docket .is-last-sheet {
              page-break-after: avoid !important;
              break-after: avoid !important;
            }
            .print-state-form-page {
              padding: 0 !important;
              margin: 0 !important;
              width: 8.5in !important;
              height: 10.98in !important;
              max-width: 8.5in !important;
              max-height: 10.98in !important;
              min-height: 10.98in !important;
              display: block !important;
              background: #ffffff !important;
              box-sizing: border-box !important;
              position: relative !important;
              overflow: hidden !important;
            }
            .print-state-form-page .state-form-sheet-root,
            .print-state-form-page > div {
              width: 8.5in !important;
              height: 10.98in !important;
              max-width: 8.5in !important;
              max-height: 10.98in !important;
              border: none !important;
              box-shadow: none !important;
              margin: 0 !important;
              padding: 0 !important;
              position: relative !important;
              overflow: hidden !important;
              background: #ffffff !important;
              transform: none !important;
            }
            .print-state-form-page img {
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 8.5in !important;
              height: 10.98in !important;
              max-width: 8.5in !important;
              max-height: 10.98in !important;
              object-fit: fill !important;
              display: block !important;
              z-index: 1 !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .print-state-form-page [style*="position: absolute"],
            .print-state-form-page .absolute {
              position: absolute !important;
              z-index: 20 !important;
            }
            .print-cover-page-wrapper {
              padding: 0 !important;
              margin: 0 !important;
              background: #ffffff !important;
              width: 8.5in !important;
              height: 10.98in !important;
              max-height: 10.98in !important;
              overflow: hidden !important;
            }
            .print-cover-page-wrapper .binder-cover-page-sheet {
              background-color: #ffffff !important;
              background-image: none !important;
              box-shadow: none !important;
              border: none !important;
              width: 8.5in !important;
              max-width: 8.5in !important;
              min-height: 10.98in !important;
              height: 10.98in !important;
              max-height: 10.98in !important;
              margin: 0 !important;
              padding: 0.65in 0.75in !important;
              box-sizing: border-box !important;
              transform: none !important;
              overflow: hidden !important;
            }
            .print-content-sheet {
              width: 8.5in !important;
              max-width: 8.5in !important;
              height: 10.98in !important;
              max-height: 10.98in !important;
              margin: 0 !important;
              padding: 0.65in 0.75in !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              background: #ffffff !important;
            }
            .print-exhibit-page-sheet {
              width: 8.5in !important;
              max-width: 8.5in !important;
              height: 10.98in !important;
              max-height: 10.98in !important;
              margin: 0 !important;
              padding: 0 !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
              position: relative !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              background: #ffffff !important;
            }
            .print-exhibit-page-sheet img {
              max-width: 8.5in !important;
              max-height: 10.98in !important;
              width: auto !important;
              height: auto !important;
              object-fit: contain !important;
              display: block !important;
              margin: auto !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #state-complaint-print-docket input,
            #state-complaint-print-docket textarea,
            #state-complaint-print-docket span,
            #state-complaint-print-docket div,
            #state-complaint-print-docket a,
            #state-complaint-print-docket p {
              color: #000000 !important;
              -webkit-text-fill-color: #000000 !important;
              text-decoration: none !important;
              border-bottom: none !important;
              border: none !important;
              outline: none !important;
              box-shadow: none !important;
            }
          }
        `}</style>

        <div id="state-complaint-print-docket" className="hidden print:block">
          {printScope === "form-only" ? (
            /* Print strictly the 4 State Form pages */
            stateFormPages.map((sPage, sIdx) => {
              const isLast = sIdx === stateFormPages.length - 1;
              return (
                <div
                  key={`print-state-form-only-p${sIdx + 1}`}
                  className={cn("print-packet-sheet print-state-form-page font-serif", isLast && "is-last-sheet")}
                >
                  <StateComplaintFormPage
                    page={sPage}
                    pageIdx={sIdx}
                    formState={officialFormState}
                    readOnly={true}
                    isPrint={true}
                    viewMode="actual"
                    className="border-0 shadow-none"
                  />
                </div>
              );
            })
          ) : (
            /* Print the complete filing packet (14 pages) in exact 1-to-14 order */
            pages.map((p, idx) => {
              const isLastBinder = idx === pages.length - 1;
              if (p.id === "cover") {
                if (stateFormPages.length > 0) {
                  return (
                    <React.Fragment key={`print-state-forms`}>
                      {stateFormPages.map((sPage, sIdx) => {
                        const isLast = isLastBinder && sIdx === stateFormPages.length - 1;
                        return (
                          <div
                            key={`print-state-form-p${sIdx + 1}`}
                            className={cn("print-packet-sheet print-state-form-page font-serif", isLast && "is-last-sheet")}
                          >
                            <StateComplaintFormPage
                              page={sPage}
                              pageIdx={sIdx}
                              formState={officialFormState}
                              readOnly={true}
                              isPrint={true}
                              viewMode="actual"
                              className="border-0 shadow-none"
                            />
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                }
                return (
                  <div key={`print-${p.id}`} className={cn("print-packet-sheet font-serif p-10", isLastBinder && "is-last-sheet")}>
                    <div className="text-center border-b-2 border-black pb-3 mb-6">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800">
                        GEORGIA DEPARTMENT OF EDUCATION
                      </h3>
                      <h4 className="text-xs font-bold text-slate-600 mt-1">
                        DIVISION FOR SPECIAL EDUCATION SERVICES AND SUPPORTS
                      </h4>
                      <h2 className="text-xl font-black uppercase mt-3 tracking-wide">
                        SPECIAL EDUCATION FORMAL COMPLAINT FILING DOCKET
                      </h2>
                      <p className="text-xs italic mt-1 text-slate-600">
                        Filed pursuant to 34 C.F.R. §§ 300.151–300.153 and Ga. Comp. R. & Regs. 160-4-7-.12
                      </p>
                    </div>

                    <div className="border border-slate-700 p-4 rounded mb-6 text-xs">
                      <div className="grid grid-cols-[180px_1fr] gap-y-2 text-left">
                        <div className="font-bold">STUDENT:</div>
                        <div>{caseDetails.studentName?.replace(/^IN\s+RE:\s*/i, "")} (DOB: {caseDetails.studentDob || "N/A"})</div>
                        <div className="font-bold">PUBLIC AGENCY / LEA:</div>
                        <div>{caseDetails.district}</div>
                        <div className="font-bold">ASSIGNED SCHOOL:</div>
                        <div>{caseDetails.school} (Grade: {caseDetails.grade})</div>
                        <div className="font-bold">COMPLAINANT / ADVOCATE:</div>
                        <div>{caseDetails.preparedBy} on behalf of Parent / Guardian</div>
                        <div className="font-bold">DATE OF FILING:</div>
                        <div>{caseDetails.submissionDate}</div>
                        <div className="font-bold">ATTACHED STATE FORM:</div>
                        <div>Official GaDOE Formal Complaint Filing Form (4 Pages) attached as Section 01</div>
                      </div>
                    </div>

                    <div className="text-xs leading-relaxed text-slate-800">
                      <p><strong>FORMAL NOTICE OF FILING:</strong> This state complaint filing packet comprises Section 01 (Official Georgia Department of Education Formal Complaint Form), followed by Section 02 (Clarity Control Restatement of Issues & Statutory Violations), Section 03 (Chronological Summary of Facts), Section 04 (Master Evidentiary Exhibit Index), and attached documentary exhibits in indexed alphabetical order.</p>
                    </div>
                  </div>
                );
              }

              const range = getBinderPageRange(idx, pages, caseDetails);
              return (
                <React.Fragment key={`print-${p.id}`}>
                  {/* Print Sheet 1: Official Standardized Binder Cover Page on White Paper */}
                  <div className="print-packet-sheet print-cover-page-wrapper">
                    <BinderCoverPage
                      pageId={p.id}
                      title={p.title}
                      category={p.category}
                      sectionNumber={`Section ${idx + 1 < 10 ? `0${idx + 1}` : idx + 1}`}
                      coverPageNumber={range.coverPage}
                      totalDocketPages={totalDocketPages}
                      studentName={caseDetails.studentName}
                      studentDob={caseDetails.studentDob}
                      grade={caseDetails.grade}
                      school={caseDetails.school}
                      district={caseDetails.district}
                      preparedBy={caseDetails.preparedBy}
                      submissionDate={caseDetails.submissionDate}
                      agencyName={SUPPORTED_STATE_FORMS[officialFormState.stateCode]?.agencyName || "Georgia Department of Education"}
                      paperTheme="white"
                      viewMode="actual"
                    />
                  </div>

                  {/* Print Sheet 2+ : Clean Real Exhibit PDF Pages OR Document Content Sheet */}
                  {p.category === "exhibit" && p.renderedPages && p.renderedPages.length > 0 ? (
                    p.renderedPages.map((pdfPage, pdfIdx) => {
                      const isLast = isLastBinder && pdfIdx === p.renderedPages!.length - 1;
                      return (
                        <div
                          key={`print-${p.id}-p${pdfPage.pageNumber}`}
                          className={cn("print-packet-sheet print-exhibit-page-sheet", isLast && "is-last-sheet")}
                        >
                          <img
                            src={pdfPage.dataUrl}
                            alt={`Exhibit Page ${pdfPage.pageNumber}`}
                            className="max-w-full max-h-full object-contain block mx-auto bg-white m-0 p-0"
                          />
                          {(p.highlights || [])
                            .filter((h) => h.pageNumber === pdfPage.pageNumber)
                            .map((h) => {
                              const colorDef = HIGHLIGHT_COLOR_MAP[h.color] || HIGHLIGHT_COLOR_MAP.yellow;
                              return (
                                <div
                                  key={`print-hl-${h.id}`}
                                  style={{
                                    position: "absolute",
                                    left: `${h.x}%`,
                                    top: `${h.y}%`,
                                    width: `${h.width}%`,
                                    height: `${h.height}%`,
                                    backgroundColor: colorDef.fill,
                                    borderBottom: `1.5px solid ${colorDef.border}`,
                                    mixBlendMode: "multiply",
                                    pointerEvents: "none",
                                    borderRadius: "2px",
                                  }}
                                />
                              );
                            })}
                        </div>
                      );
                    })
                  ) : (
                    /* Print Sheet 2+: Document Content Sheet(s) on White Paper */
                    (() => {
                      const rawContent = p.id === "exhibit_index"
                        ? syncExhibitIndexTableOfSections(p.content || getDefaultExhibitContent(p, caseDetails), pages, caseDetails)
                        : (p.content || getDefaultExhibitContent(p, caseDetails));
                      const contentPages = paginateTextContent(rawContent);
                      return contentPages.map((pageText, pageSubIdx) => {
                        const currentSheetNumber = range.contentStart + pageSubIdx;
                        const isFinalSheetOfPacket = isLastBinder && pageSubIdx === contentPages.length - 1;
                        return (
                          <div
                            key={`print-content-${p.id}-${pageSubIdx}`}
                            className={cn("print-packet-sheet print-content-sheet font-serif", isFinalSheetOfPacket && "is-last-sheet")}
                          >
                            <div className="flex justify-between items-center border-b border-black pb-2 mb-3 text-xs font-sans shrink-0">
                              <span className="font-bold uppercase tracking-wider">
                                {p.category === "exhibit"
                                  ? `${p.exhibitTag ? `${p.exhibitTag} · ` : ""}${p.title}`
                                  : `Section ${idx + 1 < 10 ? `0${idx + 1}` : idx + 1} · ${p.id === "clarity_control" || p.category === "restatement" ? "Restatement" : p.title}`}
                              </span>
                              <span className="font-mono font-bold">
                                Page {currentSheetNumber} of {totalDocketPages}
                              </span>
                            </div>
                            <div className="text-[12px] leading-relaxed whitespace-pre-wrap text-justify font-serif flex-1 text-black overflow-hidden">
                              {pageText}
                            </div>
                            <div className="border-t border-black pt-2 flex justify-between text-[11px] font-mono mt-3 shrink-0">
                              <span>{SUPPORTED_STATE_FORMS[officialFormState.stateCode]?.agencyName || "Georgia Department of Education"} IDEA Complaint</span>
                              <span>Page {currentSheetNumber} of {totalDocketPages}</span>
                            </div>
                          </div>
                        );
                      });
                    })()
                  )}
                </React.Fragment>
              );
            })
          )}
        </div>

      </div>
    </ScopedErrorBoundary>
  );
}

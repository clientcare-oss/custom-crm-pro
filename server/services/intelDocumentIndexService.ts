/**
 * Intel Unit Document Extraction, Indexing & Citation Verification Service (Phase 2A)
 *
 * Provides:
 * 1. Page-level text & table/column-aware layout extraction across all pages of an IEP PDF.
 * 2. Normalized percentage bounding boxes (0..100% of page width/height) for zoom-independent passage highlighting.
 * 3. Per-page readability tracking ("readable" | "partial" | "unreadable") & extraction method ("native_pdf" | "ocr_fallback" | "none").
 * 4. Conservative excerpt verification ("verified" | "page_only" | "unverified") that preserves numbers and negation.
 * 5. Persistent caching in `intel_document_extractions` keyed by `(file_id, content_fingerprint)`.
 */

import crypto from "crypto";
import { queryCloudflareD1 } from "../_core/d1Client";

export type PageReadabilityStatus = "readable" | "partial" | "unreadable";
export type PageExtractionMethod = "native_pdf" | "ocr_fallback" | "none";
export type DocumentExtractionStatus = "complete" | "partial" | "failed";
export type SourceVerificationStatus = "verified" | "page_only" | "unverified";

export interface NormalizedBoundingBox {
  /** Left offset as percentage of page width (0..100) */
  x: number;
  /** Top offset as percentage of page height (0..100) */
  y: number;
  /** Width as percentage of page width (0..100) */
  width: number;
  /** Height as percentage of page height (0..100) */
  height: number;
}

export interface PageTextItemRecord {
  text: string;
  box: NormalizedBoundingBox;
}

export interface IndexedPdfPage {
  /** 1-based PDF page number */
  pdfPageNumber: number;
  /** Printed page label when reliably detected (e.g., "Page 3 of 24"), otherwise null */
  printedPageLabel: string | null;
  /** Readability status for this specific page */
  status: PageReadabilityStatus;
  /** Method used to extract text on this page */
  extractionMethod: PageExtractionMethod;
  /** Table-aware and column-aware reconstructed text for reading and search */
  extractedText: string;
  /** Positioned text spans in percentage coordinates (0..100) for passage highlighting */
  textItems: PageTextItemRecord[];
  /** Character count of extracted text */
  charCount: number;
  /** Word count of extracted text */
  wordCount: number;
}

export interface IndexedDocumentResult {
  fileId: number;
  studentContactId: number;
  workspaceId: number | null;
  fileName: string;
  contentFingerprint: string;
  /** Documented IEP meeting / effective date extracted from document text or metadata */
  iepDocumentDate: string | null;
  /** Date label describing the source of iepDocumentDate (e.g., "IEP Meeting Date", "Annual Review Date") */
  iepDocumentDateLabel: string | null;
  /** Upload timestamp from vault record */
  uploadedAt: string | null;
  pageCount: number;
  readablePageCount: number;
  partialPageCount: number;
  unreadablePageCount: number;
  failedPages: number[];
  overallStatus: DocumentExtractionStatus;
  pages: IndexedPdfPage[];
  cached: boolean;
}

export interface VerifiedSourceReference {
  documentId: number;
  fileName: string;
  contentFingerprint: string;
  pdfPageNumber: number | null;
  printedPageLabel: string | null;
  excerpt: string | null;
  boundingBoxes: NormalizedBoundingBox[];
  verificationStatus: SourceVerificationStatus;
  verificationReason?: string;
}

export interface DocumentSearchHit {
  pdfPageNumber: number;
  printedPageLabel: string | null;
  pageStatus: PageReadabilityStatus;
  matchedExcerpt: string;
  contextSnippet: string;
  boundingBoxes: NormalizedBoundingBox[];
  matchCountOnPage: number;
}

export interface DocumentSearchResponse {
  fileId: number;
  fileName: string;
  contentFingerprint: string;
  query: string;
  totalMatches: number;
  hits: DocumentSearchHit[];
  unreadablePageCount: number;
  partialPageCount: number;
  failedPages: number[];
  unreadablePagesWarning: string | null;
}

let tableInitialized = false;

export async function ensureIntelDocumentExtractionsTable(): Promise<void> {
  if (tableInitialized) return;
  try {
    await queryCloudflareD1(`
      CREATE TABLE IF NOT EXISTS intel_document_extractions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_contact_id INTEGER NOT NULL,
        workspace_id INTEGER,
        file_id INTEGER NOT NULL,
        file_name TEXT NOT NULL,
        content_fingerprint TEXT NOT NULL,
        iep_document_date TEXT,
        iep_document_date_label TEXT,
        uploaded_at TEXT,
        page_count INTEGER NOT NULL DEFAULT 0,
        readable_page_count INTEGER NOT NULL DEFAULT 0,
        partial_page_count INTEGER NOT NULL DEFAULT 0,
        unreadable_page_count INTEGER NOT NULL DEFAULT 0,
        overall_status TEXT NOT NULL DEFAULT 'failed',
        pages_json TEXT NOT NULL DEFAULT '[]',
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
    await queryCloudflareD1(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_intel_doc_extractions_file_fp
      ON intel_document_extractions (file_id, content_fingerprint)
    `);
    tableInitialized = true;
  } catch (err) {
    console.warn("[IntelDocumentIndex] Table init warning:", err);
  }
}

export function computeContentFingerprint(buffer: Buffer | Uint8Array): string {
  return crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 32);
}

/**
 * Loads pdfjs-dist in Node/Workers environments using the legacy bundle.
 */
async function loadPdfJsLib(): Promise<any> {
  try {
    // @ts-ignore
    const mod = await import("pdfjs-dist/legacy/build/pdf.js");
    return mod.default || mod;
  } catch {
    try {
      // @ts-ignore
      const mod = await import("pdfjs-dist/legacy/build/pdf.mjs");
      return mod.default || mod;
    } catch {
      // @ts-ignore
      const mod = await import("pdfjs-dist");
      return mod.default || mod;
    }
  }
}

/**
 * Reconstructs reading order from positioned PDF text items while preserving
 * table rows (cells separated by " | " when horizontally spaced on the same row)
 * and multi-column / line structure.
 */
function reconstructStructuredPageText(
  rawItems: Array<{
    str: string;
    xPct: number;
    yPct: number;
    wPct: number;
    hPct: number;
  }>
): {
  extractedText: string;
  textItems: PageTextItemRecord[];
  printedPageLabel: string | null;
} {
  const validItems = rawItems
    .map((item) => ({
      ...item,
      str: item.str.replace(/\u0000/g, "").trim(),
    }))
    .filter((item) => item.str.length > 0);

  if (validItems.length === 0) {
    return { extractedText: "", textItems: [], printedPageLabel: null };
  }

  // Group items into horizontal rows using a Y-coordinate tolerance (0.65% of page height)
  const rowTolerancePct = 0.65;
  const sortedByY = [...validItems].sort((a, b) => {
    if (Math.abs(a.yPct - b.yPct) <= rowTolerancePct) {
      return a.xPct - b.xPct;
    }
    return a.yPct - b.yPct;
  });

  const rows: Array<typeof validItems> = [];
  for (const item of sortedByY) {
    const lastRow = rows[rows.length - 1];
    if (!lastRow) {
      rows.push([item]);
      continue;
    }
    const rowAvgY =
      lastRow.reduce((sum, r) => sum + r.yPct, 0) / lastRow.length;
    if (Math.abs(item.yPct - rowAvgY) <= rowTolerancePct) {
      lastRow.push(item);
    } else {
      rows.push([item]);
    }
  }

  const lines: string[] = [];
  const positionedRecords: PageTextItemRecord[] = [];

  for (const row of rows) {
    row.sort((a, b) => a.xPct - b.xPct);
    let lineStr = "";
    for (let i = 0; i < row.length; i++) {
      const curr = row[i];
      positionedRecords.push({
        text: curr.str,
        box: {
          x: Number(curr.xPct.toFixed(2)),
          y: Number(curr.yPct.toFixed(2)),
          width: Number(curr.wPct.toFixed(2)),
          height: Number(curr.hPct.toFixed(2)),
        },
      });

      if (i === 0) {
        lineStr += curr.str;
      } else {
        const prev = row[i - 1];
        const prevRight = prev.xPct + prev.wPct;
        const horizontalGap = curr.xPct - prevRight;
        // If there is a wide horizontal gap (> 3.5% of page width), treat as a table column separator
        if (horizontalGap > 3.5) {
          lineStr += " | " + curr.str;
        } else if (horizontalGap > 0.15 || !lineStr.endsWith("-")) {
          lineStr += " " + curr.str;
        } else {
          lineStr += curr.str;
        }
      }
    }
    if (lineStr.trim()) {
      lines.push(lineStr.trim());
    }
  }

  const extractedText = lines.join("\n");

  // Detect printed page label from top or bottom lines when reliably present
  let printedPageLabel: string | null = null;
  const candidateLines = [
    ...lines.slice(0, 3),
    ...lines.slice(Math.max(0, lines.length - 3)),
  ];
  for (const line of candidateLines) {
    const pageOfMatch = line.match(/\bPage\s+(\d+)\s+of\s+(\d+)\b/i);
    if (pageOfMatch) {
      printedPageLabel = `Page ${pageOfMatch[1]} of ${pageOfMatch[2]}`;
      break;
    }
    const simplePageMatch = line.match(/(?:^|\|\s*)Page\s+(\d+)\b/i);
    if (simplePageMatch) {
      printedPageLabel = `Page ${simplePageMatch[1]}`;
      break;
    }
  }

  return {
    extractedText,
    textItems: positionedRecords,
    printedPageLabel,
  };
}

/**
 * Extracts documented IEP date from the first pages of the document text so
 * the toolbar and drawer can distinguish the IEP's documented date from its upload date.
 */
export function extractDocumentedIepDate(
  pages: IndexedPdfPage[],
  fallbackMetadataDate?: string | null
): { date: string | null; label: string | null } {
  const headerText = pages
    .slice(0, 3)
    .map((p) => p.extractedText)
    .join("\n");

  const patterns: Array<{ label: string; regex: RegExp }> = [
    {
      label: "IEP Meeting Date",
      regex:
        /\b(?:IEP\s+)?Meeting\s+Date\s*[:\-|]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i,
    },
    {
      label: "IEP Effective Date",
      regex:
        /\b(?:IEP\s+)?(?:Effective|Implementation|Start|Initiation)\s+Date\s*[:\-|]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i,
    },
    {
      label: "Annual Review Date",
      regex:
        /\bAnnual\s+Review(?:\s+Date)?\s*[:\-|]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    },
    {
      label: "Amendment Date",
      regex:
        /\bAmendment\s+Date\s*[:\-|]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    },
    {
      label: "Evaluation Date",
      regex:
        /\b(?:Evaluation|Reevaluation|Report)\s+Date\s*[:\-|]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    },
  ];

  for (const { label, regex } of patterns) {
    const match = headerText.match(regex);
    if (match && match[1]) {
      return { date: match[1].trim(), label };
    }
  }

  // Also check if "Meeting Date" and the date value are on adjacent lines/cells in Paulding County IEPs
  const meetingDateCellMatch = headerText.match(
    /Meeting\s+Date[\s\S]{0,80}?(\d{1,2}\/\d{1,2}\/\d{4})/i
  );
  if (meetingDateCellMatch && meetingDateCellMatch[1]) {
    return { date: meetingDateCellMatch[1].trim(), label: "IEP Meeting Date" };
  }

  if (fallbackMetadataDate) {
    return { date: fallbackMetadataDate, label: "Documented Date" };
  }

  return { date: null, label: null };
}

/**
 * Extracts and indexes every page of a PDF buffer, caching the result in `intel_document_extractions`
 * keyed by `(file_id, content_fingerprint)`.
 */
export async function extractAndIndexPdfDocument(params: {
  fileId: number;
  studentContactId: number;
  workspaceId?: number | null;
  fileName: string;
  pdfBuffer: Buffer | Uint8Array;
  uploadedAt?: string | null;
  fallbackMetadataDate?: string | null;
  forceReindex?: boolean;
}): Promise<IndexedDocumentResult> {
  await ensureIntelDocumentExtractionsTable();

  const contentFingerprint = computeContentFingerprint(params.pdfBuffer);

  if (!params.forceReindex) {
    try {
      const cachedRows = await queryCloudflareD1(
        `SELECT * FROM intel_document_extractions WHERE file_id = ? AND content_fingerprint = ? LIMIT 1`,
        [params.fileId, contentFingerprint]
      );
      const row = cachedRows?.[0] as Record<string, any> | undefined;
      if (row && row.pages_json) {
        const parsedPages = JSON.parse(String(row.pages_json)) as IndexedPdfPage[];
        if (
          Array.isArray(parsedPages) &&
          parsedPages.length > 0 &&
          row.overall_status !== "failed" &&
          (Number(row.readable_page_count) > 0 || Number(row.partial_page_count) > 0)
        ) {
          const failedPages = parsedPages
            .filter((p) => p.status !== "readable")
            .map((p) => p.pdfPageNumber);
          return {
            fileId: params.fileId,
            studentContactId: params.studentContactId,
            workspaceId: params.workspaceId ?? (row.workspace_id ? Number(row.workspace_id) : null),
            fileName: params.fileName,
            contentFingerprint,
            iepDocumentDate: row.iep_document_date ? String(row.iep_document_date) : params.fallbackMetadataDate ?? null,
            iepDocumentDateLabel: row.iep_document_date_label ? String(row.iep_document_date_label) : null,
            uploadedAt: params.uploadedAt ?? (row.uploaded_at ? String(row.uploaded_at) : null),
            pageCount: Number(row.page_count) || parsedPages.length,
            readablePageCount: Number(row.readable_page_count) || 0,
            partialPageCount: Number(row.partial_page_count) || 0,
            unreadablePageCount: Number(row.unreadable_page_count) || 0,
            failedPages,
            overallStatus: (row.overall_status as DocumentExtractionStatus) || "complete",
            pages: parsedPages,
            cached: true,
          };
        }
      }
    } catch (cacheErr) {
      console.warn("[IntelDocumentIndex] Cache lookup skipped:", cacheErr);
    }
  }

  const pages: IndexedPdfPage[] = [];
  let pageCount = 0;

  try {
    const pdfjsLib = await loadPdfJsLib();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(params.pdfBuffer),
      useSystemFonts: true,
      disableFontFace: true,
    });
    const pdfDoc = await loadingTask.promise;
    pageCount = pdfDoc.numPages;

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 });
        const pageWidth = viewport.width || 612;
        const pageHeight = viewport.height || 792;

        const textContent = await page.getTextContent();
        const rawItems: Array<{
          str: string;
          xPct: number;
          yPct: number;
          wPct: number;
          hPct: number;
        }> = [];

        for (const item of textContent.items as any[]) {
          if (!item || typeof item.str !== "string" || !item.str.trim()) {
            continue;
          }
          const tx = Array.isArray(item.transform) ? item.transform : [1, 0, 0, 1, 0, 0];
          const pdfX = Number(tx[4]) || 0;
          const pdfY = Number(tx[5]) || 0;
          const fontHeight = Math.max(Math.abs(Number(tx[3]) || Number(item.height) || 10), 8);
          const itemWidth = Math.max(Number(item.width) || item.str.length * (fontHeight * 0.5), 4);

          // Convert PDF bottom-left origin coordinates to top-left percentage coordinates (0..100)
          const xPct = Math.max(0, Math.min(100, (pdfX / pageWidth) * 100));
          const topY = pageHeight - pdfY - fontHeight * 0.85;
          const yPct = Math.max(0, Math.min(100, (topY / pageHeight) * 100));
          const wPct = Math.max(0.5, Math.min(100 - xPct, (itemWidth / pageWidth) * 100));
          const hPct = Math.max(0.8, Math.min(100 - yPct, ((fontHeight * 1.25) / pageHeight) * 100));

          rawItems.push({
            str: item.str,
            xPct,
            yPct,
            wPct,
            hPct,
          });
        }

        const { extractedText, textItems, printedPageLabel } =
          reconstructStructuredPageText(rawItems);

        const charCount = extractedText.length;
        const wordCount = extractedText
          .split(/\s+/)
          .filter((w) => w.length > 0 && /[A-Za-z0-9]/.test(w)).length;

        let status: PageReadabilityStatus = "readable";
        let extractionMethod: PageExtractionMethod = "native_pdf";

        if (charCount >= 40 && wordCount >= 6) {
          status = "readable";
          extractionMethod = "native_pdf";
        } else if (charCount > 0) {
          status = "partial";
          extractionMethod = "native_pdf";
        } else {
          status = "unreadable";
          extractionMethod = "none";
        }

        pages.push({
          pdfPageNumber: pageNum,
          printedPageLabel,
          status,
          extractionMethod,
          extractedText,
          textItems,
          charCount,
          wordCount,
        });
      } catch (pageErr) {
        pages.push({
          pdfPageNumber: pageNum,
          printedPageLabel: null,
          status: "unreadable",
          extractionMethod: "none",
          extractedText: "",
          textItems: [],
          charCount: 0,
          wordCount: 0,
        });
      }
    }
  } catch (docErr) {
    console.warn("[IntelDocumentIndex] PDF parse failed:", docErr);
    return {
      fileId: params.fileId,
      studentContactId: params.studentContactId,
      workspaceId: params.workspaceId ?? null,
      fileName: params.fileName,
      contentFingerprint,
      iepDocumentDate: params.fallbackMetadataDate ?? null,
      iepDocumentDateLabel: null,
      uploadedAt: params.uploadedAt ?? null,
      pageCount: 0,
      readablePageCount: 0,
      partialPageCount: 0,
      unreadablePageCount: 0,
      failedPages: [],
      overallStatus: "failed",
      pages: [],
      cached: false,
    };
  }

  const readablePageCount = pages.filter((p) => p.status === "readable").length;
  const partialPageCount = pages.filter((p) => p.status === "partial").length;
  const unreadablePageCount = pages.filter((p) => p.status === "unreadable").length;
  const failedPages = pages
    .filter((p) => p.status !== "readable")
    .map((p) => p.pdfPageNumber);

  // Never report a document as "complete" ("fully read") when pages failed extraction
  let overallStatus: DocumentExtractionStatus = "complete";
  if (pageCount === 0 || readablePageCount === 0) {
    overallStatus = "failed";
  } else if (unreadablePageCount > 0 || partialPageCount > 0) {
    overallStatus = "partial";
  }

  const { date: iepDocumentDate, label: iepDocumentDateLabel } =
    extractDocumentedIepDate(pages, params.fallbackMetadataDate);

  try {
    await queryCloudflareD1(
      `INSERT INTO intel_document_extractions (
        student_contact_id,
        workspace_id,
        file_id,
        file_name,
        content_fingerprint,
        iep_document_date,
        iep_document_date_label,
        uploaded_at,
        page_count,
        readable_page_count,
        partial_page_count,
        unreadable_page_count,
        overall_status,
        pages_json,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
      ON CONFLICT(file_id, content_fingerprint) DO UPDATE SET
        student_contact_id = excluded.student_contact_id,
        workspace_id = COALESCE(excluded.workspace_id, intel_document_extractions.workspace_id),
        file_name = excluded.file_name,
        iep_document_date = excluded.iep_document_date,
        iep_document_date_label = excluded.iep_document_date_label,
        uploaded_at = excluded.uploaded_at,
        page_count = excluded.page_count,
        readable_page_count = excluded.readable_page_count,
        partial_page_count = excluded.partial_page_count,
        unreadable_page_count = excluded.unreadable_page_count,
        overall_status = excluded.overall_status,
        pages_json = excluded.pages_json,
        updated_at = unixepoch()`,
      [
        params.studentContactId,
        params.workspaceId ?? null,
        params.fileId,
        params.fileName,
        contentFingerprint,
        iepDocumentDate,
        iepDocumentDateLabel,
        params.uploadedAt ?? null,
        pageCount,
        readablePageCount,
        partialPageCount,
        unreadablePageCount,
        overallStatus,
        JSON.stringify(pages),
      ]
    );
  } catch (saveErr) {
    console.warn("[IntelDocumentIndex] Cache write warning:", saveErr);
  }

  return {
    fileId: params.fileId,
    studentContactId: params.studentContactId,
    workspaceId: params.workspaceId ?? null,
    fileName: params.fileName,
    contentFingerprint,
    iepDocumentDate,
    iepDocumentDateLabel,
    uploadedAt: params.uploadedAt ?? null,
    pageCount,
    readablePageCount,
    partialPageCount,
    unreadablePageCount,
    failedPages,
    overallStatus,
    pages,
    cached: false,
  };
}

/**
 * Conservative text normalization for excerpt verification:
 * - Normalizes whitespace, line breaks, table pipes (`|`), and typographic quotes/dashes.
 * - Preserves all numbers, percentages, dates, and negation words ("not", "no", "never", "without", "none").
 */
export function normalizeForConservativeMatch(input: string): string {
  return input
    .replace(/[\u2018\u2019\u201A\u201B`']/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F"]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s*\|\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Computes normalized bounding boxes on a page for a matched excerpt or query string.
 */
export function findBoundingBoxesOnPage(
  page: IndexedPdfPage,
  excerptOrQuery: string
): NormalizedBoundingBox[] {
  const normTarget = normalizeForConservativeMatch(excerptOrQuery);
  if (!normTarget || page.textItems.length === 0) return [];

  // 1. Direct substring match inside individual text items
  const directBoxes: NormalizedBoundingBox[] = [];
  for (const item of page.textItems) {
    const normItem = normalizeForConservativeMatch(item.text);
    if (!normItem) continue;
    if (normItem.includes(normTarget) || (normTarget.length >= 12 && normItem.length >= 6 && normTarget.includes(normItem))) {
      directBoxes.push(item.box);
    }
  }
  if (directBoxes.length > 0) {
    return mergeAdjacentBoxesOnSameRow(directBoxes);
  }

  // 2. Sliding window across consecutive text items on the page
  const itemNorms = page.textItems.map((it) => normalizeForConservativeMatch(it.text));
  let combined = "";
  const itemOffsets: Array<{ start: number; end: number; index: number }> = [];

  for (let i = 0; i < itemNorms.length; i++) {
    const token = itemNorms[i];
    if (!token) continue;
    if (combined.length > 0) combined += " ";
    const start = combined.length;
    combined += token;
    const end = combined.length;
    itemOffsets.push({ start, end, index: i });
  }

  const matchIdx = combined.indexOf(normTarget);
  if (matchIdx === -1) return [];

  const matchEnd = matchIdx + normTarget.length;
  const matchedBoxes: NormalizedBoundingBox[] = [];
  for (const span of itemOffsets) {
    if (span.end > matchIdx && span.start < matchEnd) {
      matchedBoxes.push(page.textItems[span.index].box);
    }
  }

  return mergeAdjacentBoxesOnSameRow(matchedBoxes);
}

function mergeAdjacentBoxesOnSameRow(
  boxes: NormalizedBoundingBox[]
): NormalizedBoundingBox[] {
  if (boxes.length <= 1) return boxes;
  const sorted = [...boxes].sort((a, b) => {
    if (Math.abs(a.y - b.y) <= 0.8) return a.x - b.x;
    return a.y - b.y;
  });

  const merged: NormalizedBoundingBox[] = [];
  for (const box of sorted) {
    const prev = merged[merged.length - 1];
    if (
      prev &&
      Math.abs(prev.y - box.y) <= 0.8 &&
      box.x <= prev.x + prev.width + 6
    ) {
      const right = Math.max(prev.x + prev.width, box.x + box.width);
      const bottom = Math.max(prev.y + prev.height, box.y + box.height);
      prev.x = Number(Math.min(prev.x, box.x).toFixed(2));
      prev.y = Number(Math.min(prev.y, box.y).toFixed(2));
      prev.width = Number((right - prev.x).toFixed(2));
      prev.height = Number((bottom - prev.y).toFixed(2));
    } else {
      merged.push({ ...box });
    }
  }
  return merged.slice(0, 12);
}

/**
 * Verifies a source reference against an indexed PDF document.
 *
 * Rules (Section 5):
 * - Excerpt matching is conservative: normalizes only whitespace, line breaks, and punctuation spacing;
 *   never blurs numbers or negation.
 * - If an excerpt is matched on the specified page (or discovered on a single page when page wasn't specified),
 *   returns `verificationStatus: "verified"` with accurate boundingBoxes.
 * - If only a valid page number is provided without an excerpt, returns `verificationStatus: "page_only"`
 *   with `boundingBoxes: []` (no invented highlight box).
 * - If an excerpt is provided and cannot be matched, or page number is out of range, returns
 *   `verificationStatus: "unverified"` ("Source needs verification") with `boundingBoxes: []`.
 */
export function verifySourceReferenceAgainstIndex(
  index: IndexedDocumentResult,
  input: {
    pdfPageNumber?: number | null;
    excerpt?: string | null;
  }
): VerifiedSourceReference {
  const cleanExcerpt = input.excerpt ? input.excerpt.trim() : "";
  const requestedPage =
    typeof input.pdfPageNumber === "number" && Number.isFinite(input.pdfPageNumber)
      ? Math.round(input.pdfPageNumber)
      : null;

  // Case 1: Excerpt provided — must conservatively match extracted text (preserving numbers and negation)
  if (cleanExcerpt.length > 0) {
    const normExcerpt = normalizeForConservativeMatch(cleanExcerpt);
    if (!normExcerpt) {
      return {
        documentId: index.fileId,
        fileName: index.fileName,
        contentFingerprint: index.contentFingerprint,
        pdfPageNumber: requestedPage,
        printedPageLabel: null,
        excerpt: cleanExcerpt,
        boundingBoxes: [],
        verificationStatus: "unverified",
        verificationReason: "Source needs verification (empty excerpt)",
      };
    }

    const candidatePages =
      requestedPage !== null
        ? index.pages.filter((p) => p.pdfPageNumber === requestedPage)
        : index.pages;

    for (const page of candidatePages) {
      const normPageText = normalizeForConservativeMatch(page.extractedText);
      if (normPageText.includes(normExcerpt)) {
        const boxes = findBoundingBoxesOnPage(page, cleanExcerpt);
        return {
          documentId: index.fileId,
          fileName: index.fileName,
          contentFingerprint: index.contentFingerprint,
          pdfPageNumber: page.pdfPageNumber,
          printedPageLabel: page.printedPageLabel,
          excerpt: cleanExcerpt,
          boundingBoxes: boxes,
          verificationStatus: "verified",
        };
      }
    }

    // Excerpt did not match on the requested page (or anywhere in document)
    return {
      documentId: index.fileId,
      fileName: index.fileName,
      contentFingerprint: index.contentFingerprint,
      pdfPageNumber:
        requestedPage && requestedPage >= 1 && requestedPage <= index.pageCount
          ? requestedPage
          : null,
      printedPageLabel: null,
      excerpt: cleanExcerpt,
      boundingBoxes: [],
      verificationStatus: "unverified",
      verificationReason:
        requestedPage !== null
          ? `Source needs verification — excerpt not found verbatim on PDF page ${requestedPage}`
          : "Source needs verification — excerpt not found in document",
    };
  }

  // Case 2: No excerpt provided, only a page number -> "page_only" (never invent a highlight box)
  if (requestedPage !== null && requestedPage >= 1 && requestedPage <= index.pageCount) {
    const targetPage = index.pages.find((p) => p.pdfPageNumber === requestedPage);
    return {
      documentId: index.fileId,
      fileName: index.fileName,
      contentFingerprint: index.contentFingerprint,
      pdfPageNumber: requestedPage,
      printedPageLabel: targetPage?.printedPageLabel ?? null,
      excerpt: null,
      boundingBoxes: [],
      verificationStatus: "page_only",
      verificationReason: "Page-level reference only (no excerpt specified)",
    };
  }

  // Case 3: Neither valid excerpt nor valid page number
  return {
    documentId: index.fileId,
    fileName: index.fileName,
    contentFingerprint: index.contentFingerprint,
    pdfPageNumber: null,
    printedPageLabel: null,
    excerpt: null,
    boundingBoxes: [],
    verificationStatus: "unverified",
    verificationReason: "Source needs verification",
  };
}

/**
 * Searches across all extracted pages of an indexed PDF document.
 * Surfaces unreadable page warnings when unreadable or partial pages exist.
 */
export function searchIndexedDocument(
  index: IndexedDocumentResult,
  rawQuery: string
): DocumentSearchResponse {
  const query = rawQuery.trim();
  const normQuery = normalizeForConservativeMatch(query);
  const hits: DocumentSearchHit[] = [];
  let totalMatches = 0;

  if (normQuery.length > 0) {
    for (const page of index.pages) {
      if (!page.extractedText) continue;
      const normPage = normalizeForConservativeMatch(page.extractedText);
      let searchPos = 0;
      let matchCountOnPage = 0;

      while (searchPos < normPage.length) {
        const idx = normPage.indexOf(normQuery, searchPos);
        if (idx === -1) break;
        matchCountOnPage++;
        totalMatches++;
        searchPos = idx + Math.max(normQuery.length, 1);
      }

      if (matchCountOnPage > 0) {
        // Extract a clean verbatim excerpt from the original page text so conservative verification succeeds
        const lowerRaw = page.extractedText.toLowerCase();
        const rawIdx = lowerRaw.indexOf(query.toLowerCase());
        let matchedExcerpt = query;
        let contextSnippet = "";

        if (rawIdx !== -1) {
          matchedExcerpt = page.extractedText.slice(rawIdx, rawIdx + query.length);
          const snippetStart = Math.max(0, rawIdx - 70);
          const snippetEnd = Math.min(
            page.extractedText.length,
            rawIdx + query.length + 90
          );
          contextSnippet =
            (snippetStart > 0 ? "…" : "") +
            page.extractedText.slice(snippetStart, snippetEnd).replace(/\s+/g, " ").trim() +
            (snippetEnd < page.extractedText.length ? "…" : "");
        } else {
          // Fallback when query spans across normalized whitespace/table pipe
          const lines = page.extractedText.split("\n");
          const matchingLine =
            lines.find((l) => normalizeForConservativeMatch(l).includes(normQuery)) ||
            lines[0] ||
            "";
          matchedExcerpt = matchingLine.trim();
          contextSnippet = matchingLine.trim().slice(0, 180);
        }

        const boundingBoxes = findBoundingBoxesOnPage(page, matchedExcerpt);

        hits.push({
          pdfPageNumber: page.pdfPageNumber,
          printedPageLabel: page.printedPageLabel,
          pageStatus: page.status,
          matchedExcerpt,
          contextSnippet,
          boundingBoxes,
          matchCountOnPage,
        });
      }
    }
  }

  let unreadablePagesWarning: string | null = null;
  if (index.unreadablePageCount > 0 || index.partialPageCount > 0) {
    const pageList = index.failedPages.join(", ");
    unreadablePagesWarning = `${
      index.unreadablePageCount + index.partialPageCount
    } page(s) (${
      pageList ? `p. ${pageList}` : "see index"
    }) could not be fully read (${index.unreadablePageCount} unreadable, ${
      index.partialPageCount
    } partial) and may limit search coverage.`;
  }

  return {
    fileId: index.fileId,
    fileName: index.fileName,
    contentFingerprint: index.contentFingerprint,
    query,
    totalMatches,
    hits,
    unreadablePageCount: index.unreadablePageCount,
    partialPageCount: index.partialPageCount,
    failedPages: index.failedPages,
    unreadablePagesWarning,
  };
}

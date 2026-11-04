import React, { useMemo, useRef, useState } from "react";
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Bookmark,
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Eye,
  X,
  Search,
  RotateCcw,
  PlusCircle,
  FileSearch,
  Calendar,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { convertPdfToPageImages, type ImportedPdfPage } from "@/lib/pdfImporter";
import type {
  VaultDocumentOption,
  IntelDocumentIndex,
  IntelBoundingBox,
  IntelReadingPosition,
} from "./intelUnitTypes";

export interface FocusedSourcePassage {
  chapterLabel: string;
  pageLabel: string;
  pageNumber?: number;
  printedPageLabel?: string | null;
  quote?: string;
  sectionRef?: string;
  documentId?: number | null;
  verificationStatus?: "verified" | "page_only" | "unverified";
  verificationReason?: string;
  boundingBoxes?: IntelBoundingBox[];
}

interface IntelDocumentSurfaceProps {
  studentName: string;
  selectedDocument: VaultDocumentOption | null;
  vaultDocStatus: "idle" | "loading" | "ready" | "unavailable" | "unsupported" | "error";
  vaultDocMessage: string | null;
  documentIndex: IntelDocumentIndex | null;
  vaultRenderedPages: ImportedPdfPage[];
  isRenderingVaultPdf: boolean;
  currentPage: number;
  totalPages: number;
  zoomPercent: number;
  onPageChange: (page: number) => void;
  onZoomChange: (zoom: number) => void;
  focusedPassage: FocusedSourcePassage | null;
  onFocusPassage: (passage: FocusedSourcePassage, recordReturnPos?: boolean) => void;
  onClearFocusedPassage: () => void;
  previousReadingPosition: IntelReadingPosition | null;
  onReturnToReadingPosition: () => void;
  localPdfPages: ImportedPdfPage[];
  localPdfName: string | null;
  onLoadLocalPdf: (name: string, pages: ImportedPdfPage[]) => void;
  onClearLocalPdf: () => void;
  onCaptureFindingFromSource: (params: {
    category: string;
    section: string;
    text: string;
    excerpt: string;
    pdfPageNumber: number;
    printedPageLabel?: string | null;
    boundingBoxes: IntelBoundingBox[];
  }) => void;
  activeChapterCategory: string;
  activeChapterSection: string;
  isReviewCollapsed: boolean;
  onToggleReviewCollapse: () => void;
}

function normalizeConservativeClient(input: string): string {
  return input
    .replace(/[\u2018\u2019\u201A\u201B`']/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F"]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s*\|\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function computeClientBoundingBoxes(
  textItems: Array<{ text: string; box: IntelBoundingBox }>,
  excerptOrQuery: string
): IntelBoundingBox[] {
  const normTarget = normalizeConservativeClient(excerptOrQuery);
  if (!normTarget || textItems.length === 0) return [];

  const direct: IntelBoundingBox[] = [];
  for (const item of textItems) {
    const normItem = normalizeConservativeClient(item.text);
    if (!normItem) continue;
    if (
      normItem.includes(normTarget) ||
      (normTarget.length >= 12 && normItem.length >= 6 && normTarget.includes(normItem))
    ) {
      direct.push(item.box);
    }
  }
  if (direct.length > 0) return direct.slice(0, 12);

  let combined = "";
  const offsets: Array<{ start: number; end: number; idx: number }> = [];
  for (let i = 0; i < textItems.length; i++) {
    const tok = normalizeConservativeClient(textItems[i].text);
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
    .slice(0, 12);
}

function formatUploadTimestamp(raw?: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function IntelDocumentSurface({
  studentName,
  selectedDocument,
  vaultDocStatus,
  vaultDocMessage,
  documentIndex,
  vaultRenderedPages,
  isRenderingVaultPdf,
  currentPage,
  totalPages,
  zoomPercent,
  onPageChange,
  onZoomChange,
  focusedPassage,
  onFocusPassage,
  onClearFocusedPassage,
  previousReadingPosition,
  onReturnToReadingPosition,
  localPdfPages,
  localPdfName,
  onLoadLocalPdf,
  onClearLocalPdf,
  onCaptureFindingFromSource,
  activeChapterCategory,
  activeChapterSection,
  isReviewCollapsed,
  onToggleReviewCollapse,
}: IntelDocumentSurfaceProps) {
  const [isRenderingLocalPdf, setIsRenderingLocalPdf] = useState<boolean>(false);
  const [renderStatusText, setRenderStatusText] = useState<string>("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showPageTextDrawer, setShowPageTextDrawer] = useState<boolean>(false);

  // Manual finding capture inline form state
  const [captureForm, setCaptureForm] = useState<{
    pdfPageNumber: number;
    printedPageLabel?: string | null;
    excerpt: string;
    noteText: string;
    category: string;
    section: string;
    boundingBoxes: IntelBoundingBox[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const isUsingLocalFile = localPdfPages.length > 0 && Boolean(localPdfName);

  const effectiveDocName = isUsingLocalFile
    ? localPdfName
    : selectedDocument?.fileName || null;

  const documentedIepDate = isUsingLocalFile
    ? null
    : documentIndex?.iepDocumentDate || selectedDocument?.documentDate || null;

  const documentedIepDateLabel = isUsingLocalFile
    ? null
    : documentIndex?.iepDocumentDateLabel || "IEP Date";

  const uploadedDateFormatted = isUsingLocalFile
    ? null
    : formatUploadTimestamp(
        documentIndex?.uploadedAt || selectedDocument?.uploadedAt || null
      );

  const effectiveDocType = isUsingLocalFile
    ? "Temporary Local PDF"
    : selectedDocument?.documentType || null;

  const activeRenderedPages = isUsingLocalFile
    ? localPdfPages
    : vaultRenderedPages;

  const resolvedTotalPages = isUsingLocalFile
    ? localPdfPages.length
    : documentIndex?.pageCount || vaultRenderedPages.length || totalPages;

  const safeCurrentPage =
    resolvedTotalPages > 0
      ? Math.min(Math.max(1, currentPage), resolvedTotalPages)
      : 1;

  const activePageImage =
    activeRenderedPages.length > 0
      ? activeRenderedPages[safeCurrentPage - 1] || null
      : null;

  const activeIndexedPage = useMemo(() => {
    if (isUsingLocalFile) {
      const lp = localPdfPages[safeCurrentPage - 1];
      if (!lp) return null;
      const lpText = (lp.textItems || []).map((it) => it.str).join(" ");
      return {
        pdfPageNumber: safeCurrentPage,
        printedPageLabel: null,
        status: (lpText.trim().length >= 30 ? "readable" : "partial") as
          | "readable"
          | "partial"
          | "unreadable",
        extractionMethod: "native_pdf" as const,
        extractedText: lpText,
        textItems: (lp.textItems || []).map((it) => ({
          text: it.str,
          box: { x: it.x, y: it.y, width: it.width, height: it.height },
        })),
        charCount: lpText.length,
        wordCount: lpText.split(/\s+/).filter(Boolean).length,
      };
    }
    if (!documentIndex?.pages) return null;
    return (
      documentIndex.pages.find((p) => p.pdfPageNumber === safeCurrentPage) ||
      documentIndex.pages[safeCurrentPage - 1] ||
      null
    );
  }, [isUsingLocalFile, localPdfPages, documentIndex, safeCurrentPage]);

  const handleLocalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setRenderError("Please select a PDF document (.pdf) to display in the source viewer.");
      return;
    }
    setRenderError(null);
    setIsRenderingLocalPdf(true);
    setRenderStatusText("Rendering temporary local PDF pages...");
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pages = await convertPdfToPageImages(arrayBuffer);
      onLoadLocalPdf(file.name, pages);
      onPageChange(1);
    } catch (err: any) {
      setRenderError(err?.message || "Could not render PDF pages in browser.");
    } finally {
      setIsRenderingLocalPdf(false);
      setRenderStatusText("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Full-document search across all indexed pages
  const searchResults = useMemo(() => {
    const q = searchQuery.trim();
    const normQ = normalizeConservativeClient(q);
    if (!normQ || normQ.length < 2) return null;

    const pagesToSearch = isUsingLocalFile
      ? localPdfPages.map((lp, idx) => {
          const lpText = (lp.textItems || []).map((it) => it.str).join(" ");
          return {
            pdfPageNumber: idx + 1,
            printedPageLabel: null as string | null,
            status: (lpText.trim().length >= 30 ? "readable" : "partial") as
              | "readable"
              | "partial"
              | "unreadable",
            extractedText: lpText,
            textItems: (lp.textItems || []).map((it) => ({
              text: it.str,
              box: { x: it.x, y: it.y, width: it.width, height: it.height },
            })),
          };
        })
      : documentIndex?.pages || [];

    const hits: Array<{
      pdfPageNumber: number;
      printedPageLabel: string | null;
      pageStatus: "readable" | "partial" | "unreadable";
      matchedExcerpt: string;
      contextSnippet: string;
      boundingBoxes: IntelBoundingBox[];
      matchCountOnPage: number;
    }> = [];
    let totalMatches = 0;

    for (const page of pagesToSearch) {
      if (!page.extractedText) continue;
      const normPage = normalizeConservativeClient(page.extractedText);
      let pos = 0;
      let count = 0;
      while (pos < normPage.length) {
        const idx = normPage.indexOf(normQ, pos);
        if (idx === -1) break;
        count++;
        totalMatches++;
        pos = idx + Math.max(normQ.length, 1);
      }

      if (count > 0) {
        const lowerRaw = page.extractedText.toLowerCase();
        const rawIdx = lowerRaw.indexOf(q.toLowerCase());
        let matchedExcerpt = q;
        let contextSnippet = "";

        if (rawIdx !== -1) {
          const lineStart = page.extractedText.lastIndexOf("\n", rawIdx);
          const lineEnd = page.extractedText.indexOf("\n", rawIdx + q.length);
          const fullLine = page.extractedText
            .slice(
              lineStart === -1 ? 0 : lineStart + 1,
              lineEnd === -1 ? page.extractedText.length : lineEnd
            )
            .trim();
          matchedExcerpt =
            fullLine.length <= 220 && fullLine.length >= q.length
              ? fullLine
              : page.extractedText.slice(rawIdx, rawIdx + q.length);
          const sStart = Math.max(0, rawIdx - 60);
          const sEnd = Math.min(page.extractedText.length, rawIdx + q.length + 90);
          contextSnippet =
            (sStart > 0 ? "…" : "") +
            page.extractedText.slice(sStart, sEnd).replace(/\s+/g, " ").trim() +
            (sEnd < page.extractedText.length ? "…" : "");
        } else {
          const lines = page.extractedText.split("\n");
          const matchingLine =
            lines.find((l) => normalizeConservativeClient(l).includes(normQ)) ||
            lines[0] ||
            "";
          matchedExcerpt = matchingLine.trim().slice(0, 200);
          contextSnippet = matchingLine.trim().slice(0, 180);
        }

        const boxes = computeClientBoundingBoxes(page.textItems, matchedExcerpt);
        hits.push({
          pdfPageNumber: page.pdfPageNumber,
          printedPageLabel: page.printedPageLabel,
          pageStatus: page.status,
          matchedExcerpt,
          contextSnippet,
          boundingBoxes: boxes.length > 0 ? boxes : computeClientBoundingBoxes(page.textItems, q),
          matchCountOnPage: count,
        });
      }
    }

    let unreadableWarning: string | null = null;
    if (!isUsingLocalFile && documentIndex) {
      if (documentIndex.unreadablePageCount > 0 || documentIndex.partialPageCount > 0) {
        unreadableWarning = `${
          documentIndex.unreadablePageCount + documentIndex.partialPageCount
        } page(s) (${documentIndex.failedPages
          .map((p) => `p. ${p}`)
          .join(", ")}) could not be fully read and may limit search coverage.`;
      }
    }

    return {
      query: q,
      totalMatches,
      hits,
      unreadableWarning,
    };
  }, [searchQuery, isUsingLocalFile, localPdfPages, documentIndex]);

  // Verified highlight boxes for the active page — NEVER draw invented highlight boxes for "page_only" or "unverified"
  const activeHighlightBoxes = useMemo<IntelBoundingBox[]>(() => {
    if (!focusedPassage) return [];
    if (
      focusedPassage.pageNumber &&
      focusedPassage.pageNumber !== safeCurrentPage
    ) {
      return [];
    }
    if (
      focusedPassage.verificationStatus === "page_only" ||
      focusedPassage.verificationStatus === "unverified"
    ) {
      return [];
    }
    if (
      focusedPassage.boundingBoxes &&
      focusedPassage.boundingBoxes.length > 0 &&
      focusedPassage.verificationStatus === "verified"
    ) {
      return focusedPassage.boundingBoxes;
    }
    if (focusedPassage.quote && activeIndexedPage) {
      const normPage = normalizeConservativeClient(activeIndexedPage.extractedText);
      const normQuote = normalizeConservativeClient(focusedPassage.quote);
      if (normQuote && normPage.includes(normQuote)) {
        return computeClientBoundingBoxes(
          activeIndexedPage.textItems,
          focusedPassage.quote
        );
      }
    }
    return [];
  }, [focusedPassage, safeCurrentPage, activeIndexedPage]);

  const resolvedVerificationStatus: "verified" | "page_only" | "unverified" | null =
    useMemo(() => {
      if (!focusedPassage) return null;
      if (focusedPassage.verificationStatus) {
        return focusedPassage.verificationStatus;
      }
      if (focusedPassage.quote && activeIndexedPage) {
        const normPage = normalizeConservativeClient(
          activeIndexedPage.extractedText
        );
        const normQuote = normalizeConservativeClient(focusedPassage.quote);
        if (normQuote && normPage.includes(normQuote)) {
          return "verified";
        }
        return "unverified";
      }
      if (focusedPassage.pageNumber && !focusedPassage.quote) {
        return "page_only";
      }
      return "unverified";
    }, [focusedPassage, activeIndexedPage]);

  const isBusyLoading = vaultDocStatus === "loading" || isRenderingVaultPdf || isRenderingLocalPdf;

  return (
    <div className="flex flex-col h-full bg-[#010718] border-r border-[#3A2C18]/80 relative select-none sm:select-text">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleLocalFileChange}
        className="hidden"
        aria-label="Open temporary local PDF for source inspection"
      />

      {/* ── Temporary Local File Banner (when Load Local PDF is used) ── */}
      {isUsingLocalFile && (
        <div
          data-testid="temporary-local-pdf-banner"
          className="px-3.5 py-1.5 bg-amber-950/75 border-b border-amber-500/40 flex flex-wrap items-center justify-between gap-2 text-[11px] text-amber-200"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span>
              <strong>Temporary Local File:</strong> &ldquo;{localPdfName}&rdquo; is loaded in browser memory only and is <strong>not saved to the student vault</strong> (will not persist after refresh).
            </span>
          </div>
          {selectedDocument && (
            <button
              type="button"
              onClick={onClearLocalPdf}
              className="px-2 py-0.5 rounded bg-[#07162B] border border-amber-400/50 text-[#FFE394] hover:bg-[#0D2344] font-semibold cursor-pointer shrink-0"
            >
              Return to Vault PDF ({selectedDocument.fileName})
            </button>
          )}
        </div>
      )}

      {/* ── Document Leaf Top Control Bar ── */}
      <div className="px-3.5 py-2.5 bg-gradient-to-r from-[#020A1E] via-[#04112B] to-[#020A1E] border-b border-[#3A2C18]/80 flex flex-wrap items-center justify-between gap-2">
        {/* Left: Document Identity, Documented Date vs Upload Date, & Coverage */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-7 w-7 rounded-lg bg-[#071633] border border-[#3A2C18] flex items-center justify-center shrink-0 shadow-inner">
            <FileText className="h-3.5 w-3.5 text-[#DFBE77]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                data-testid="intel-doc-title"
                className="text-xs font-serif font-bold text-[#FFF4D4] truncate max-w-[200px] sm:max-w-[280px]"
              >
                {effectiveDocName || "No IEP Document Selected"}
              </span>
              {effectiveDocType && (
                <Badge className="bg-[#091D3E] text-[#FFE394] border border-[#C5A059]/40 text-[10px] px-1.5 py-0 font-medium">
                  {effectiveDocType}
                </Badge>
              )}
              {!isUsingLocalFile && documentIndex && (
                <Badge
                  data-testid="intel-doc-index-badge"
                  className={
                    documentIndex.overallStatus === "complete"
                      ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[10px] px-1.5 py-0"
                      : documentIndex.overallStatus === "partial"
                      ? "bg-amber-950/80 text-amber-200 border border-amber-500/40 text-[10px] px-1.5 py-0"
                      : "bg-rose-950/80 text-rose-200 border border-rose-500/40 text-[10px] px-1.5 py-0"
                  }
                >
                  {documentIndex.overallStatus === "complete"
                    ? `${documentIndex.readablePageCount}/${documentIndex.pageCount} Pages Indexed`
                    : documentIndex.overallStatus === "partial"
                    ? `Partial Index (${documentIndex.readablePageCount}/${documentIndex.pageCount} readable)`
                    : "Index Failed"}
                </Badge>
              )}
            </div>

            <div
              data-testid="intel-doc-dates-row"
              className="text-[10.5px] text-[#A69371] flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5"
            >
              {documentedIepDate ? (
                <span className="inline-flex items-center gap-1 text-[#FFE394]/90">
                  <Calendar className="h-2.5 w-2.5 text-[#DFBE77]" />
                  <span>
                    {documentedIepDateLabel || "IEP Date"}: <strong>{documentedIepDate}</strong>
                  </span>
                </span>
              ) : effectiveDocName && !isUsingLocalFile ? (
                <span className="text-[#8EA6C9]/80">IEP Date: Not detected on cover</span>
              ) : null}

              {uploadedDateFormatted && (
                <span className="inline-flex items-center gap-1 text-[#C6B697]">
                  <Clock className="h-2.5 w-2.5 text-[#8EA6C9]" />
                  <span>Vault Upload: {uploadedDateFormatted}</span>
                </span>
              )}

              {resolvedTotalPages > 0 && (
                <span className="text-[#D8C7A5] font-mono">
                  {resolvedTotalPages} {resolvedTotalPages === 1 ? "page" : "pages"}
                </span>
              )}

              {!effectiveDocName && (
                <span>Select a student IEP in the toolbar to load pages</span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Page Navigation & Zoom Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Page Navigation */}
          <div
            className="inline-flex items-center rounded-lg bg-[#000820] border border-[#3A2C18] px-1.5 py-0.5 text-[11px] text-[#D8C7A5]"
            aria-label="Document page navigation"
          >
            <button
              type="button"
              disabled={resolvedTotalPages === 0 || safeCurrentPage <= 1}
              onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
              className="p-1 text-[#C6B697] hover:text-[#FFF4D4] disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
              title="Previous page"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px] text-[#FFF4D4]">
              {resolvedTotalPages > 0 ? (
                <>
                  Page <strong className="text-[#FFE394]">{safeCurrentPage}</strong> of{" "}
                  <span>{resolvedTotalPages}</span>
                  {activeIndexedPage?.printedPageLabel &&
                    activeIndexedPage.printedPageLabel !==
                      `Page ${safeCurrentPage} of ${resolvedTotalPages}` && (
                      <span className="ml-1 text-[10px] text-[#8EA6C9]">
                        ({activeIndexedPage.printedPageLabel})
                      </span>
                    )}
                </>
              ) : (
                <span className="text-[#8EA6C9]/70">Page — of —</span>
              )}
            </span>
            <button
              type="button"
              disabled={resolvedTotalPages === 0 || safeCurrentPage >= resolvedTotalPages}
              onClick={() => onPageChange(Math.min(resolvedTotalPages, safeCurrentPage + 1))}
              className="p-1 text-[#C6B697] hover:text-[#FFF4D4] disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
              title="Next page"
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="hidden sm:inline-flex items-center rounded-lg bg-[#000820] border border-[#3A2C18] px-1 py-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => onZoomChange(Math.max(75, zoomPercent - 10))}
              disabled={!effectiveDocName}
              className="p-1 text-[#C6B697] hover:text-[#FFF4D4] disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span
              data-testid="intel-doc-zoom-value"
              className="px-1.5 font-mono text-[10.5px] text-[#D8C7A5] min-w-[42px] text-center"
            >
              {zoomPercent}%
            </span>
            <button
              type="button"
              onClick={() => onZoomChange(Math.min(150, zoomPercent + 10))}
              disabled={!effectiveDocName}
              className="p-1 text-[#C6B697] hover:text-[#FFF4D4] disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Open Temporary Local PDF */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusyLoading}
            className="h-7 px-2.5 text-[11px] border-[#3A2C18] bg-[#020A1E] text-[#D8C7A5] hover:bg-[#081C3A] hover:text-[#FFF4D4] hover:border-[#C5A059]/60 cursor-pointer gap-1.5"
            title="Load a temporary local PDF file (not saved to student vault)"
          >
            <Upload className="h-3 w-3 text-[#DFBE77]" />
            <span>{isUsingLocalFile ? "Change Local PDF" : "Local PDF"}</span>
          </Button>
        </div>
      </div>

      {/* ── Compact Full-Document Search & Evidence Capture Bar ── */}
      {(documentIndex || isUsingLocalFile) && (
        <div className="px-3.5 py-2 bg-[#01091F] border-b border-[#3A2C18]/70 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-3.5 w-3.5 text-[#C5A059] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search full IEP text, tables, baselines, or accommodations (e.g., WJ-IV, multiplication, headphones)..."
                aria-label="Search full IEP document text"
                data-testid="intel-doc-search-input"
                className="h-7 pl-8 pr-7 bg-[#000616] border-[#3A2C18] text-xs text-[#FFF4D4] placeholder:text-[#8EA6C9]/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A69371] hover:text-[#FFF4D4] cursor-pointer"
                  aria-label="Clear search query"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowPageTextDrawer((v) => !v)}
              data-testid="toggle-page-text-btn"
              className="h-7 px-2.5 text-[10.5px] border-[#3A2C18] bg-[#041028] text-[#D8C7A5] hover:border-[#C5A059]/60 hover:text-[#FFF4D4] cursor-pointer gap-1"
            >
              <FileSearch className="h-3 w-3 text-[#DFBE77]" />
              <span>{showPageTextDrawer ? "Hide Page Text" : `Page ${safeCurrentPage} Text & Capture`}</span>
            </Button>
          </div>

          {/* Search Results Panel */}
          {searchResults && (
            <div
              data-testid="intel-doc-search-results"
              className="rounded-lg bg-[#000614] border border-[#3A2C18]/90 p-2.5 space-y-2 max-h-[210px] overflow-y-auto"
            >
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-[#FFE394] font-semibold">
                  {searchResults.totalMatches === 0
                    ? `No matches found for "${searchResults.query}"`
                    : `${searchResults.totalMatches} match${
                        searchResults.totalMatches === 1 ? "" : "es"
                      } across ${searchResults.hits.length} page${
                        searchResults.hits.length === 1 ? "" : "s"
                      }`}
                </span>
                {searchResults.unreadableWarning && (
                  <span className="text-[10px] text-amber-300 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {searchResults.unreadableWarning}
                  </span>
                )}
              </div>

              {searchResults.hits.map((hit) => (
                <div
                  key={`hit-p-${hit.pdfPageNumber}`}
                  data-testid={`intel-search-hit-p${hit.pdfPageNumber}`}
                  className="rounded-md bg-[#030F26] border border-[#3A2C18]/70 p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-[#C5A059]/50 transition-colors"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-[#0B2144] border border-[#3E68A8]/50 text-[10px] font-mono text-[#FFE394] font-semibold">
                        PDF p. {hit.pdfPageNumber}
                        {hit.printedPageLabel ? ` (${hit.printedPageLabel})` : ""}
                      </span>
                      <span className="text-[10px] text-[#8EA6C9]">
                        {hit.matchCountOnPage} match{hit.matchCountOnPage === 1 ? "" : "es"}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#FFF4D4] font-serif leading-snug break-words">
                      {hit.contextSnippet}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      data-testid={`intel-search-open-p${hit.pdfPageNumber}`}
                      onClick={() => {
                        onFocusPassage(
                          {
                            chapterLabel: activeChapterSection || "Document Search",
                            pageLabel: `PDF p. ${hit.pdfPageNumber}${
                              hit.printedPageLabel ? ` (${hit.printedPageLabel})` : ""
                            }`,
                            pageNumber: hit.pdfPageNumber,
                            printedPageLabel: hit.printedPageLabel,
                            quote: hit.matchedExcerpt,
                            sectionRef: `Search Match · "${searchResults.query}"`,
                            documentId: selectedDocument?.id ?? null,
                            verificationStatus: "verified",
                            boundingBoxes: hit.boundingBoxes,
                          },
                          true
                        );
                      }}
                      className="h-6 px-2 text-[10.5px] border-[#3A2C18] bg-[#061836] text-[#FFE394] hover:bg-[#0D2852] cursor-pointer"
                    >
                      Open & Highlight
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      data-testid={`intel-search-capture-p${hit.pdfPageNumber}`}
                      onClick={() => {
                        onFocusPassage(
                          {
                            chapterLabel: activeChapterSection || "Document Search",
                            pageLabel: `PDF p. ${hit.pdfPageNumber}`,
                            pageNumber: hit.pdfPageNumber,
                            printedPageLabel: hit.printedPageLabel,
                            quote: hit.matchedExcerpt,
                            sectionRef: `Verified Excerpt · PDF p. ${hit.pdfPageNumber}`,
                            documentId: selectedDocument?.id ?? null,
                            verificationStatus: "verified",
                            boundingBoxes: hit.boundingBoxes,
                          },
                          true
                        );
                        setCaptureForm({
                          pdfPageNumber: hit.pdfPageNumber,
                          printedPageLabel: hit.printedPageLabel,
                          excerpt: hit.matchedExcerpt,
                          noteText: `Evidence on PDF p. ${hit.pdfPageNumber}: ${hit.matchedExcerpt}`,
                          category: activeChapterCategory || "Present Levels",
                          section: activeChapterSection || "Present Levels / Academics",
                          boundingBoxes: hit.boundingBoxes,
                        });
                      }}
                      className="h-6 px-2 text-[10.5px] font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] cursor-pointer gap-1"
                    >
                      <PlusCircle className="h-3 w-3" />
                      <span>Capture Finding</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Inline Capture Finding Modal/Strip */}
          {captureForm && (
            <div
              data-testid="intel-capture-finding-panel"
              className="rounded-lg bg-[#06152D] border border-[#C5A059]/60 p-3 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 text-[10px]">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Verified Source · PDF p. {captureForm.pdfPageNumber}
                  </Badge>
                  <span className="text-xs font-serif font-bold text-[#FFF4D4]">
                    Capture Source Passage as Workspace Finding
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCaptureForm(null)}
                  className="text-[#A69371] hover:text-[#FFF4D4] cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="text-[11px] font-serif italic text-[#FFE394] bg-[#02091A] border border-[#3A2C18] rounded p-2">
                &ldquo;{captureForm.excerpt}&rdquo;
              </div>

              <div className="space-y-1">
                <label className="text-[10.5px] text-[#C6B697] font-semibold">
                  Advocate Finding & Analysis Note
                </label>
                <Textarea
                  value={captureForm.noteText}
                  onChange={(e) =>
                    setCaptureForm((prev) =>
                      prev ? { ...prev, noteText: e.target.value } : null
                    )
                  }
                  rows={2}
                  data-testid="intel-capture-finding-textarea"
                  className="bg-[#000616] border-[#3A2C18] text-xs text-[#FFF4D4]"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setCaptureForm(null)}
                  className="h-7 text-xs border-[#3A2C18] bg-[#020A18] text-[#C6B697]"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  data-testid="intel-capture-finding-save-btn"
                  onClick={() => {
                    onCaptureFindingFromSource({
                      category: captureForm.category,
                      section: captureForm.section,
                      text: captureForm.noteText.trim() || captureForm.excerpt,
                      excerpt: captureForm.excerpt,
                      pdfPageNumber: captureForm.pdfPageNumber,
                      printedPageLabel: captureForm.printedPageLabel,
                      boundingBoxes: captureForm.boundingBoxes,
                    });
                    setCaptureForm(null);
                  }}
                  className="h-7 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] cursor-pointer"
                >
                  Save Verified Finding to Workspace
                </Button>
              </div>
            </div>
          )}

          {/* Active Page Extracted Text & Manual Selection Drawer */}
          {showPageTextDrawer && activeIndexedPage && (
            <div
              data-testid="intel-page-text-drawer"
              className="rounded-lg bg-[#000614] border border-[#3A2C18] p-2.5 space-y-2"
            >
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#FFF4D4]">
                    Extracted Text · PDF Page {safeCurrentPage}
                  </span>
                  <Badge
                    className={
                      activeIndexedPage.status === "readable"
                        ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[9.5px]"
                        : "bg-amber-950/80 text-amber-200 border border-amber-500/40 text-[9.5px]"
                    }
                  >
                    {activeIndexedPage.status} ({activeIndexedPage.wordCount} words)
                  </Badge>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    const firstLine =
                      activeIndexedPage.extractedText
                        .split("\n")
                        .find((l) => l.trim().length > 15) ||
                      activeIndexedPage.extractedText.slice(0, 140);
                    const cleanExcerpt = firstLine.trim().slice(0, 180);
                    const boxes = computeClientBoundingBoxes(
                      activeIndexedPage.textItems,
                      cleanExcerpt
                    );
                    setCaptureForm({
                      pdfPageNumber: safeCurrentPage,
                      printedPageLabel: activeIndexedPage.printedPageLabel,
                      excerpt: cleanExcerpt,
                      noteText: `Finding on PDF p. ${safeCurrentPage}: ${cleanExcerpt}`,
                      category: activeChapterCategory || "Present Levels",
                      section: activeChapterSection || "Present Levels / Academics",
                      boundingBoxes: boxes,
                    });
                  }}
                  className="h-6 px-2 text-[10.5px] font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] cursor-pointer gap-1"
                >
                  <PlusCircle className="h-3 w-3" />
                  <span>Capture Passage from Page {safeCurrentPage}</span>
                </Button>
              </div>
              <pre className="max-h-[150px] overflow-y-auto text-[10.5px] font-mono text-[#D8C7A5] whitespace-pre-wrap leading-relaxed bg-[#020A1C] p-2 rounded border border-[#3A2C18]/60">
                {activeIndexedPage.extractedText || "No readable text extracted on this page."}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* ── Compact Source Reference Strip & Return to Reading Position ── */}
      <div className="px-3.5 py-1.5 bg-[#000617] border-b border-[#3A2C18]/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <Bookmark className="h-3.5 w-3.5 text-[#C5A059] shrink-0" />
          <span className="text-[#A69371] font-medium shrink-0">Source Reference:</span>
          {focusedPassage ? (
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-[#10254A] border border-[#3E68A8]/60 text-[#FFE394] font-mono text-[10.5px] shrink-0">
                {focusedPassage.pageLabel || "Unindexed Page"}
              </span>

              {/* Conservative Verification Status Badge */}
              {resolvedVerificationStatus === "verified" && (
                <Badge
                  data-testid="source-status-verified"
                  className="bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 text-[10px] px-1.5 py-0"
                >
                  <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                  Verified Source
                </Badge>
              )}
              {resolvedVerificationStatus === "page_only" && (
                <Badge
                  data-testid="source-status-page-only"
                  className="bg-[#0B2246] text-[#FFE394] border border-[#C5A059]/40 text-[10px] px-1.5 py-0"
                >
                  Page only
                </Badge>
              )}
              {resolvedVerificationStatus === "unverified" && (
                <Badge
                  data-testid="source-status-unverified"
                  className="bg-amber-950/90 text-amber-200 border border-amber-500/40 text-[10px] px-1.5 py-0"
                >
                  <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                  Source needs verification
                </Badge>
              )}

              <span className="text-[#FFF4D4] truncate max-w-[240px]">
                {focusedPassage.sectionRef || focusedPassage.chapterLabel}
              </span>
            </div>
          ) : (
            <span className="text-[#8EA6C9]/70 italic truncate">
              Click any source citation or search result to jump to its exact page and passage
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {previousReadingPosition &&
            previousReadingPosition.pageNumber !== safeCurrentPage && (
              <button
                type="button"
                data-testid="return-to-reading-position-btn"
                onClick={onReturnToReadingPosition}
                className="inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded bg-[#0A2044] border border-[#C5A059]/50 text-[#FFE394] hover:bg-[#102B58] cursor-pointer font-semibold"
                title={`Return to your previous reading position (Page ${previousReadingPosition.pageNumber})`}
              >
                <RotateCcw className="h-3 w-3 text-[#DFBE77]" />
                <span>Return to Page {previousReadingPosition.pageNumber}</span>
              </button>
            )}

          {focusedPassage && (
            <button
              type="button"
              onClick={onClearFocusedPassage}
              className="inline-flex items-center gap-1 text-[10.5px] text-[#A69371] hover:text-[#FFF4D4] cursor-pointer"
              title="Clear focused passage"
            >
              <X className="h-3 w-3" />
              <span>Clear</span>
            </button>
          )}
          <button
            type="button"
            onClick={onToggleReviewCollapse}
            className="hidden lg:inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded border border-[#3A2C18] bg-[#041028] text-[#D8C7A5] hover:border-[#C5A059]/60 hover:text-[#FFF4D4] cursor-pointer transition-colors"
            title={
              isReviewCollapsed
                ? "Restore Contextual Review Panel"
                : "Collapse Contextual Review Panel for wider document reading"
            }
          >
            <Eye className="h-3 w-3 text-[#DFBE77]" />
            <span>{isReviewCollapsed ? "Show Review Folio" : "Full-Width Document"}</span>
          </button>
        </div>
      </div>

      {/* ── Highlighted Source Passage Callout (when focused) ── */}
      {focusedPassage?.quote && (
        <div
          data-testid="focused-passage-banner"
          className={
            resolvedVerificationStatus === "verified"
              ? "px-4 py-2.5 bg-gradient-to-r from-[#1A1608] via-[#241D0B] to-[#121008] border-b border-[#C5A059]/50 flex items-start justify-between gap-3"
              : "px-4 py-2.5 bg-amber-950/40 border-b border-amber-500/40 flex items-start justify-between gap-3"
          }
        >
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-block h-2 w-2 rounded-full bg-[#FFE394] animate-pulse" />
              <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#FFE394] font-semibold">
                {resolvedVerificationStatus === "verified"
                  ? `Verified Source Excerpt · ${focusedPassage.pageLabel}`
                  : `Source Needs Verification · ${focusedPassage.pageLabel}`}
              </span>
              {focusedPassage.verificationReason &&
                resolvedVerificationStatus !== "verified" && (
                  <span className="text-[10px] text-amber-300">
                    ({focusedPassage.verificationReason})
                  </span>
                )}
            </div>
            <p className="text-xs font-serif italic text-[#FFF4D4] leading-relaxed">
              &ldquo;{focusedPassage.quote}&rdquo;
            </p>
          </div>
          <button
            type="button"
            onClick={onClearFocusedPassage}
            className="text-[#C6B697] hover:text-[#FFF4D4] p-1 cursor-pointer shrink-0"
            aria-label="Dismiss passage highlight"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Main Document Examination Surface ── */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-start bg-[radial-gradient(ellipse_at_50%_15%,#071838_0%,#010716_75%)] min-h-[460px]"
      >
        {renderError && (
          <div className="w-full max-w-xl mb-4 rounded-xl border border-rose-500/40 bg-rose-950/30 p-3.5 flex items-start gap-2.5 text-xs text-rose-200">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Unable to display PDF file</p>
              <p className="text-rose-300/90 mt-0.5">{renderError}</p>
            </div>
            <button
              type="button"
              onClick={() => setRenderError(null)}
              className="text-rose-300 hover:text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {isBusyLoading ? (
          <div
            data-testid="intel-doc-loading-state"
            className="my-auto flex flex-col items-center justify-center text-center p-10 space-y-3"
          >
            <Loader2 className="h-8 w-8 animate-spin text-[#DFBE77]" />
            <p className="text-sm font-serif font-bold text-[#FFF4D4]">
              Loading & Indexing IEP Source Pages
            </p>
            <p className="text-xs text-[#A69371] font-mono">
              {renderStatusText ||
                `Extracting page text, table layouts, and citation coordinates for ${
                  effectiveDocName || "selected IEP"
                }...`}
            </p>
          </div>
        ) : activePageImage ? (
          /* ── Rendered PDF Page with Zoom-Aligned Percentage Highlight Overlays ── */
          <div
            data-testid="intel-rendered-pdf-page"
            className="relative rounded-lg shadow-[0_16px_48px_rgba(0,0,0,0.9)] border border-[#3A2C18] bg-white overflow-hidden transition-all"
            style={{
              width: `${Math.min(100, zoomPercent)}%`,
              maxWidth: zoomPercent > 100 ? `${zoomPercent * 7.5}px` : "760px",
            }}
          >
            <img
              src={activePageImage.dataUrl}
              alt={`Document page ${safeCurrentPage}`}
              className="w-full h-auto block"
            />
            {/* Highlight Overlay Boxes ONLY when verificationStatus is "verified" */}
            {activeHighlightBoxes.map((box, idx) => (
              <div
                key={`hl-${idx}-${box.x}-${box.y}`}
                data-testid={`intel-highlight-box-${idx}`}
                className="absolute bg-amber-400/35 border-2 border-amber-500 pointer-events-none rounded-xs shadow-[0_0_12px_rgba(245,158,11,0.45)]"
                style={{
                  left: `${box.x}%`,
                  top: `${box.y}%`,
                  width: `${Math.max(box.width, 3)}%`,
                  height: `${Math.max(box.height, 1.3)}%`,
                }}
              />
            ))}
          </div>
        ) : !isUsingLocalFile &&
          selectedDocument &&
          (vaultDocStatus === "unsupported" ||
            vaultDocStatus === "unavailable" ||
            vaultDocStatus === "error") ? (
          /* ── Honest Unsupported / Unavailable / Error State for Vault Document ── */
          <div
            data-testid={`intel-doc-${vaultDocStatus}-state`}
            className="mt-4 w-full max-w-lg rounded-2xl border border-[#3A2C18] bg-gradient-to-b from-[#041129]/95 to-[#010716]/95 p-6 sm:p-7 shadow-[0_14px_40px_rgba(0,0,0,0.85)] space-y-4"
          >
            <div className="flex items-start gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-300" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-amber-950/90 text-amber-200 border border-amber-500/40 text-[10px] uppercase">
                    {vaultDocStatus === "unsupported"
                      ? "Unsupported File Format"
                      : vaultDocStatus === "unavailable"
                      ? "Vault File Binary Unavailable"
                      : "Document Load Error"}
                  </Badge>
                  <Badge className="bg-[#081B38] text-[#FFE394] border border-[#3A2C18] text-[10px]">
                    {selectedDocument.documentType}
                  </Badge>
                </div>
                <h3 className="text-base font-serif font-bold text-[#FFF4D4] break-words">
                  {selectedDocument.fileName}
                </h3>
                <p className="text-xs text-[#C6B697] leading-relaxed">
                  {vaultDocMessage ||
                    "This vault record cannot be rendered in the PDF source viewer."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button
                type="button"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-md cursor-pointer hover:brightness-105 gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Load Temporary Local PDF Instead</span>
              </Button>
            </div>
          </div>
        ) : (
          /* ── Honest Empty State when no document is selected ── */
          <div
            data-testid="intel-doc-empty-state"
            className="mt-4 w-full max-w-md rounded-2xl border border-[#3A2C18]/90 bg-gradient-to-b from-[#030E24]/95 to-[#000820]/95 p-6 sm:p-7 text-center shadow-[0_14px_40px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.05)] space-y-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#071836] border border-[#C5A059]/35 flex items-center justify-center mx-auto shadow-inner">
              <FileText className="h-6 w-6 text-[#DFBE77]" />
            </div>

            <div className="space-y-1.5">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#091D3E] border border-[#274B82]/60 text-[10px] font-mono uppercase tracking-widest text-[#8EA6C9]">
                Source Document Surface
              </span>
              <h3 className="text-base sm:text-lg font-serif font-bold text-[#FFF4D4]">
                No IEP Document Selected
              </h3>
              <p className="text-xs text-[#C6B697] leading-relaxed">
                Select an IEP for <strong className="text-[#FFF4D4]">{studentName}</strong> from the toolbar above to load its pages from the student vault, or open a temporary local PDF file.
              </p>
            </div>

            <div className="rounded-xl bg-[#000616] border border-[#3A2C18]/60 p-3 text-left text-[11px] text-[#A69371] space-y-1">
              <div className="text-[#FFE394] font-semibold">Evidence Integrity Guardrail</div>
              <p>
                The Intel Unit never populates fictional IEP pages or unverified quotes into a student&apos;s workspace. Source passages appear only from selected documents or advocate-verified entries.
              </p>
            </div>

            <div className="pt-1 flex items-center justify-center gap-2.5">
              <Button
                type="button"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-md cursor-pointer hover:brightness-105 gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Load Temporary Local PDF</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

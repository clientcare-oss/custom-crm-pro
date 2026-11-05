import React, { useEffect, useMemo, useRef, useState } from "react";
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
  FolderOpen,
  Sparkles,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { convertPdfToPageImages, type ImportedPdfPage } from "@/lib/pdfImporter";
import {
  type VaultDocumentOption,
  type IntelDocumentIndex,
  type IntelBoundingBox,
  type IntelReadingPosition,
  formatShortFileName,
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
  vaultDocStatus:
    | "idle"
    | "loading"
    | "ready"
    | "unavailable"
    | "unsupported"
    | "error";
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
  onFocusPassage: (
    passage: FocusedSourcePassage,
    recordReturnPos?: boolean
  ) => void;
  onClearFocusedPassage: () => void;
  previousReadingPosition: IntelReadingPosition | null;
  onReturnToReadingPosition: () => void;
  localPdfPages: ImportedPdfPage[];
  localPdfName: string | null;
  onLoadLocalPdf: (
    name: string,
    pages: ImportedPdfPage[],
    rawBase64?: string
  ) => void;
  onClearLocalPdf: () => void;
  onSaveLocalPdfToVault?: () => void;
  isSavingLocalPdfToVault?: boolean;
  onOpenRecordsDrawer?: () => void;
  onUploadPdfToVault?: (file: File) => void;
  onAskFirstMateAboutPassage?: (quote: string, pageNumber: number) => void;
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
  returnToCompareBanner?: boolean;
  onReturnToCompare?: () => void;
  returnToIepBanner?: boolean;
  onReturnToIep?: () => void;
  scrollTriggerSeq?: number;
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
      (normTarget.length >= 12 &&
        normItem.length >= 6 &&
        normTarget.includes(normItem))
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
  onSaveLocalPdfToVault,
  isSavingLocalPdfToVault,
  onOpenRecordsDrawer,
  onUploadPdfToVault,
  onAskFirstMateAboutPassage,
  onCaptureFindingFromSource,
  activeChapterCategory,
  activeChapterSection,
  isReviewCollapsed,
  onToggleReviewCollapse,
  returnToCompareBanner,
  onReturnToCompare,
  returnToIepBanner,
  onReturnToIep,
  scrollTriggerSeq,
}: IntelDocumentSurfaceProps) {
  const [isRenderingLocalPdf, setIsRenderingLocalPdf] =
    useState<boolean>(false);
  const [renderStatusText, setRenderStatusText] = useState<string>("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showPageTextDrawer, setShowPageTextDrawer] = useState<boolean>(false);
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
  const vaultUploadInputRef = useRef<HTMLInputElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const firstHighlightBoxRef = useRef<HTMLDivElement | null>(null);

  const isUsingLocalFile = localPdfPages.length > 0 && Boolean(localPdfName);
  const effectiveDocName = isUsingLocalFile
    ? localPdfName
    : selectedDocument?.fileName || null;

  const documentedIepDate = isUsingLocalFile
    ? null
    : documentIndex?.iepDocumentDate || selectedDocument?.documentDate || null;
  const documentedIepDateLabel = isUsingLocalFile
    ? null
    : documentIndex?.iepDocumentDateLabel || "Document Date";
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

  const handleLocalFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setRenderError(
        "Please select a PDF document (.pdf) to display in the source viewer."
      );
      return;
    }
    setRenderError(null);
    setIsRenderingLocalPdf(true);
    setRenderStatusText("Rendering PDF pages at high resolution...");
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Data = `data:application/pdf;base64,${window.btoa(binary)}`;
      const pages = await convertPdfToPageImages(arrayBuffer, 2.4);
      onLoadLocalPdf(file.name, pages, base64Data);
      onPageChange(1);
    } catch (err: any) {
      setRenderError(
        err?.message || "Could not render PDF pages in browser."
      );
    } finally {
      setIsRenderingLocalPdf(false);
      setRenderStatusText("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleVaultUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (onUploadPdfToVault) {
      onUploadPdfToVault(file);
    } else {
      handleLocalFileChange(e);
    }
    if (vaultUploadInputRef.current) vaultUploadInputRef.current.value = "";
  };

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
          const sEnd = Math.min(
            page.extractedText.length,
            rawIdx + q.length + 90
          );
          contextSnippet =
            (sStart > 0 ? "…" : "") +
            page.extractedText
              .slice(sStart, sEnd)
              .replace(/\s+/g, " ")
              .trim() +
            (sEnd < page.extractedText.length ? "…" : "");
        } else {
          const lines = page.extractedText.split("\n");
          const matchingLine =
            lines.find((l) =>
              normalizeConservativeClient(l).includes(normQ)
            ) ||
            lines[0] ||
            "";
          matchedExcerpt = matchingLine.trim().slice(0, 200);
          contextSnippet = matchingLine.trim().slice(0, 180);
        }
        const boxes = computeClientBoundingBoxes(
          page.textItems,
          matchedExcerpt
        );
        hits.push({
          pdfPageNumber: page.pdfPageNumber,
          printedPageLabel: page.printedPageLabel,
          pageStatus: page.status,
          matchedExcerpt,
          contextSnippet,
          boundingBoxes:
            boxes.length > 0
              ? boxes
              : computeClientBoundingBoxes(page.textItems, q),
          matchCountOnPage: count,
        });
      }
    }

    let unreadableWarning: string | null = null;
    if (!isUsingLocalFile && documentIndex) {
      if (
        documentIndex.unreadablePageCount > 0 ||
        documentIndex.partialPageCount > 0
      ) {
        unreadableWarning = `${
          documentIndex.unreadablePageCount + documentIndex.partialPageCount
        } page(s) (${documentIndex.failedPages
          .map((p) => `p. ${p}`)
          .join(", ")}) could not be fully read and may limit search coverage.`;
      }
    }

    return { query: q, totalMatches, hits, unreadableWarning };
  }, [searchQuery, isUsingLocalFile, localPdfPages, documentIndex]);

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
      const normPage = normalizeConservativeClient(
        activeIndexedPage.extractedText
      );
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

  const resolvedVerificationStatus:
    | "verified"
    | "page_only"
    | "unverified"
    | null = useMemo(() => {
    if (!focusedPassage) return null;
    if (focusedPassage.verificationStatus) {
      return focusedPassage.verificationStatus;
    }
    if (focusedPassage.quote && activeIndexedPage) {
      const normPage = normalizeConservativeClient(
        activeIndexedPage.extractedText
      );
      const normQuote = normalizeConservativeClient(focusedPassage.quote);
      if (normQuote && normPage.includes(normQuote)) return "verified";
      return "unverified";
    }
    if (focusedPassage.pageNumber && !focusedPassage.quote) return "page_only";
    return "unverified";
  }, [focusedPassage, activeIndexedPage]);

  const isBusyLoading =
    vaultDocStatus === "loading" || isRenderingVaultPdf || isRenderingLocalPdf;
  const hasOpenDocument = Boolean(effectiveDocName);

  // Scroll to the highlighted passage ONLY when explicitly triggered by finding selection / Return to passage
  useEffect(() => {
    if (!scrollTriggerSeq || isBusyLoading) return;
    const timer = setTimeout(() => {
      if (firstHighlightBoxRef.current) {
        firstHighlightBoxRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      } else if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [scrollTriggerSeq, safeCurrentPage, isBusyLoading]);

  return (
    <div className="flex flex-col h-full bg-[#0C2346] relative select-none sm:select-text">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleLocalFileChange}
        className="hidden"
        aria-label="Open temporary local PDF for source inspection"
      />
      <input
        ref={vaultUploadInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleVaultUploadChange}
        className="hidden"
        aria-label="Upload PDF to Student Vault"
      />

      {/* Return to IEP Banner when user opened an Evaluation citation during Guided Review */}
      {returnToIepBanner && onReturnToIep && (
        <div
          data-testid="return-to-iep-banner"
          className="px-4 py-2 bg-[#071D42] border-b border-[#C5A059]/60 flex items-center justify-between gap-2 text-xs text-[#FFF4D4]"
        >
          <span className="text-[#FFE394] font-medium">
            Viewing Evaluation Citation · Return to the Current IEP at any time
          </span>
          <Button
            type="button"
            size="sm"
            data-testid="reader-return-to-iep-btn"
            onClick={onReturnToIep}
            className="h-7 px-3 text-[11px] font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] cursor-pointer gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Return to IEP</span>
          </Button>
        </div>
      )}

      {/* Return to Compare Banner when user jumped from a Compare citation */}
      {returnToCompareBanner && onReturnToCompare && (
        <div
          data-testid="return-to-compare-banner"
          className="px-4 py-2 bg-[#061838] border-b border-[#C5A059]/50 flex items-center justify-between gap-2 text-xs text-[#FFF4D4]"
        >
          <span className="text-[#FFE394] font-medium">
            Viewing cited original passage from Compare view
          </span>
          <Button
            type="button"
            size="sm"
            onClick={onReturnToCompare}
            className="h-7 px-3 text-[11px] font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] cursor-pointer gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Return to Compare</span>
          </Button>
        </div>
      )}

      {/* Temporary Local File Banner */}
      {isUsingLocalFile && (
        <div
          data-testid="temporary-local-pdf-banner"
          className="px-4 py-2 bg-[#091D3E] border-b border-[#C5A059]/45 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#FFF4D4]"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-[#DFBE77] shrink-0" />
            <span>
              <strong className="text-[#FFE394]">Temporary Local PDF:</strong>{" "}
              &ldquo;{localPdfName}&rdquo; is open in browser memory only.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onSaveLocalPdfToVault && (
              <button
                type="button"
                disabled={isSavingLocalPdfToVault}
                onClick={onSaveLocalPdfToVault}
                data-testid="save-temp-pdf-to-vault-btn"
                className="px-2.5 py-1 rounded-md bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
              >
                <Save className="h-3 w-3" />
                <span>
                  {isSavingLocalPdfToVault
                    ? "Saving to Vault..."
                    : "Save to Student Vault"}
                </span>
              </button>
            )}
            {selectedDocument && (
              <button
                type="button"
                onClick={onClearLocalPdf}
                className="px-2.5 py-1 rounded-md bg-[#030F28] border border-[#2C4878] text-[#FFE394] hover:bg-[#0A2044] font-semibold cursor-pointer"
              >
                Return to {formatShortFileName(selectedDocument.fileName, 22)}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active Document Header & Reading Controls (Hidden when no document is selected so inactive controls are never shown) */}
      {hasOpenDocument && (
        <div className="px-4 py-2.5 bg-[#0D2850] border-b border-[#345486] flex flex-wrap items-center justify-between gap-3">
          {/* Left: Document Identity & Dates */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-[#061634] border border-[#253C64] flex items-center justify-center shrink-0">
              <FileText className="h-3.5 w-3.5 text-[#DFBE77]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  data-testid="intel-doc-title"
                  className="text-xs font-serif font-bold text-[#FFF4D4] truncate max-w-[220px] sm:max-w-[320px]"
                  title={effectiveDocName || undefined}
                >
                  {formatShortFileName(effectiveDocName, 40)}
                </span>
                {effectiveDocType && (
                  <Badge className="bg-[#081C3E] text-[#FFE394] border border-[#C5A059]/35 text-[10px] px-1.5 py-0 font-medium">
                    {effectiveDocType}
                  </Badge>
                )}
                {!isUsingLocalFile && documentIndex && (
                  <Badge
                    data-testid="intel-doc-index-badge"
                    className={
                      documentIndex.overallStatus === "complete"
                        ? "bg-emerald-950/75 text-emerald-300 border border-emerald-500/35 text-[10px] px-1.5 py-0"
                        : "bg-[#0B2246] text-[#FFE394] border border-[#C5A059]/40 text-[10px] px-1.5 py-0"
                    }
                  >
                    {documentIndex.overallStatus === "complete"
                      ? `${documentIndex.readablePageCount}/${documentIndex.pageCount} Pages Indexed`
                      : `Partial Index (${documentIndex.readablePageCount}/${documentIndex.pageCount} readable)`}
                  </Badge>
                )}
              </div>

              <div
                data-testid="intel-doc-dates-row"
                className="text-[10.5px] text-[#8EA6C9] flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5"
              >
                {documentedIepDate && (
                  <span className="inline-flex items-center gap-1 text-[#FFE394]/90">
                    <Calendar className="h-2.5 w-2.5 text-[#DFBE77]" />
                    <span>
                      {documentedIepDateLabel}:{" "}
                      <strong>{documentedIepDate}</strong>
                    </span>
                  </span>
                )}
                {uploadedDateFormatted && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    <span>Uploaded {uploadedDateFormatted}</span>
                  </span>
                )}
                {resolvedTotalPages > 0 && (
                  <span className="font-mono text-[#D8C7A5]">
                    {resolvedTotalPages}{" "}
                    {resolvedTotalPages === 1 ? "page" : "pages"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Page Navigation, Fit-to-Width & Zoom, Search, Focus Reading */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            {(documentIndex || isUsingLocalFile) && (
              <div className="relative w-44 sm:w-56">
                <Search className="h-3.5 w-3.5 text-[#8EA6C9] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search document..."
                  aria-label="Search full IEP document text"
                  data-testid="intel-doc-search-input"
                  className="h-7 pl-8 pr-6 bg-[#000616] border-[#223860] text-xs text-[#FFF4D4] placeholder:text-[#8EA6C9]/55"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8EA6C9] hover:text-[#FFF4D4] cursor-pointer"
                    aria-label="Clear search query"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}

            {/* Page Navigation */}
            <div
              className="inline-flex items-center rounded-lg bg-[#000616] border border-[#223860] px-1.5 py-0.5 text-[11px] text-[#D8C7A5]"
              aria-label="Document page navigation"
            >
              <button
                type="button"
                disabled={resolvedTotalPages === 0 || safeCurrentPage <= 1}
                onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
                className="p-1 text-[#8EA6C9] hover:text-[#FFF4D4] disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
                title="Previous page"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 font-mono text-[11px] text-[#FFF4D4]">
                Page <strong className="text-[#FFE394]">{safeCurrentPage}</strong>{" "}
                / {resolvedTotalPages || 1}
              </span>
              <button
                type="button"
                disabled={
                  resolvedTotalPages === 0 ||
                  safeCurrentPage >= resolvedTotalPages
                }
                onClick={() =>
                  onPageChange(
                    Math.min(resolvedTotalPages, safeCurrentPage + 1)
                  )
                }
                className="p-1 text-[#8EA6C9] hover:text-[#FFF4D4] disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
                title="Next page"
                aria-label="Next page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Zoom & Fit-to-Width Controls */}
            <div className="inline-flex items-center rounded-lg bg-[#000616] border border-[#223860] px-1 py-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => onZoomChange(Math.max(75, zoomPercent - 15))}
                className="p-1 text-[#8EA6C9] hover:text-[#FFF4D4] cursor-pointer"
                title="Zoom out"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onZoomChange(100)}
                data-testid="intel-doc-zoom-value"
                className="px-1.5 font-mono text-[10.5px] text-[#D8C7A5] hover:text-[#FFE394] min-w-[48px] text-center cursor-pointer"
                title="Reset to Fit-to-Width (100%)"
              >
                {zoomPercent === 100 ? "Fit (100%)" : `${zoomPercent}%`}
              </button>
              <button
                type="button"
                onClick={() => onZoomChange(Math.min(160, zoomPercent + 15))}
                className="p-1 text-[#8EA6C9] hover:text-[#FFF4D4] cursor-pointer"
                title="Zoom in"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Page Text & Capture Trigger */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowPageTextDrawer((v) => !v)}
              data-testid="toggle-page-text-btn"
              className="h-7 px-2.5 text-[10.5px] border-[#223860] bg-[#020B22] text-[#D8C7A5] hover:border-[#C5A059]/60 hover:text-[#FFF4D4] cursor-pointer gap-1"
            >
              <FileSearch className="h-3 w-3 text-[#DFBE77]" />
              <span>{showPageTextDrawer ? "Hide Text" : "Capture Passage"}</span>
            </Button>

            {/* Focus Reading Toggle */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onToggleReviewCollapse}
              data-testid="focus-reading-toggle-btn"
              className={
                isReviewCollapsed
                  ? "h-7 px-2.5 text-[10.5px] border-[#C5A059] bg-[#0B2248] text-[#FFE394] font-semibold cursor-pointer gap-1"
                  : "h-7 px-2.5 text-[10.5px] border-[#223860] bg-[#020B22] text-[#D8C7A5] hover:border-[#C5A059]/60 hover:text-[#FFF4D4] cursor-pointer gap-1"
              }
            >
              <Eye className="h-3 w-3 text-[#DFBE77]" />
              <span>
                {isReviewCollapsed ? "Exit Focus Reading" : "Focus Reading"}
              </span>
            </Button>
          </div>
        </div>
      )}

      {/* Search Results & Capture Strip (only when active) */}
      {hasOpenDocument &&
        (searchResults || captureForm || showPageTextDrawer) && (
          <div className="px-4 py-2.5 bg-[#01081C] border-b border-[#1A2D50] space-y-2">
            {searchResults && (
              <div
                data-testid="intel-doc-search-results"
                className="rounded-xl bg-[#000614] border border-[#1E3256] p-2.5 space-y-2 max-h-[210px] overflow-y-auto"
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
                    <span className="text-[10px] text-[#FFE394]/80 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      {searchResults.unreadableWarning}
                    </span>
                  )}
                </div>

                {searchResults.hits.map((hit) => (
                  <div
                    key={`hit-p-${hit.pdfPageNumber}`}
                    data-testid={`intel-search-hit-p${hit.pdfPageNumber}`}
                    className="rounded-lg bg-[#030F28] border border-[#1E3256] p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-[#C5A059]/50 transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded bg-[#0A2146] border border-[#3E68A8]/50 text-[10px] font-mono text-[#FFE394] font-semibold">
                          PDF p. {hit.pdfPageNumber}
                        </span>
                        <span className="text-[10px] text-[#8EA6C9]">
                          {hit.matchCountOnPage} match
                          {hit.matchCountOnPage === 1 ? "" : "es"}
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
                              chapterLabel:
                                activeChapterSection || "Document Search",
                              pageLabel: `PDF p. ${hit.pdfPageNumber}`,
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
                        className="h-6 px-2 text-[10.5px] border-[#263E68] bg-[#061836] text-[#FFE394] hover:bg-[#0D2852] cursor-pointer"
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
                              chapterLabel:
                                activeChapterSection || "Document Search",
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
                            section:
                              activeChapterSection ||
                              "Present Levels / Academics",
                            boundingBoxes: hit.boundingBoxes,
                          });
                        }}
                        className="h-6 px-2 text-[10.5px] font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] cursor-pointer gap-1"
                      >
                        <PlusCircle className="h-3 w-3" />
                        <span>Save Finding</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {captureForm && (
              <div
                data-testid="intel-capture-finding-panel"
                className="rounded-xl bg-[#04122C] border border-[#C5A059]/55 p-3 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 text-[10px]">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Verified Source · PDF p. {captureForm.pdfPageNumber}
                    </Badge>
                    <span className="text-xs font-serif font-bold text-[#FFF4D4]">
                      Save Source Passage as Finding
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCaptureForm(null)}
                    className="text-[#8EA6C9] hover:text-[#FFF4D4] cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="text-[11px] font-serif italic text-[#FFE394] bg-[#010818] border border-[#1E3256] rounded-lg p-2">
                  &ldquo;{captureForm.excerpt}&rdquo;
                </div>

                <Textarea
                  value={captureForm.noteText}
                  onChange={(e) =>
                    setCaptureForm((prev) =>
                      prev ? { ...prev, noteText: e.target.value } : null
                    )
                  }
                  rows={2}
                  data-testid="intel-capture-finding-textarea"
                  className="bg-[#000616] border-[#223860] text-xs text-[#FFF4D4]"
                />

                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setCaptureForm(null)}
                    className="h-7 text-xs border-[#223860] bg-[#020A18] text-[#8EA6C9]"
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
                        text:
                          captureForm.noteText.trim() || captureForm.excerpt,
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

            {showPageTextDrawer && activeIndexedPage && (
              <div
                data-testid="intel-page-text-drawer"
                className="rounded-xl bg-[#000614] border border-[#1E3256] p-2.5 space-y-2"
              >
                <div className="flex items-center justify-between gap-2 text-[11px] flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#FFF4D4]">
                      Page {safeCurrentPage} Text ({activeIndexedPage.wordCount}{" "}
                      words)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {onAskFirstMateAboutPassage &&
                      activeIndexedPage.extractedText && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const snippet = activeIndexedPage.extractedText
                              .trim()
                              .slice(0, 260);
                            onAskFirstMateAboutPassage(
                              snippet,
                              safeCurrentPage
                            );
                          }}
                          className="h-6 px-2 text-[10.5px] border-[#C5A059]/50 bg-[#071A3C] text-[#FFE394] cursor-pointer gap-1"
                        >
                          <Sparkles className="h-3 w-3 text-[#DFBE77]" />
                          <span>Ask First Mate</span>
                        </Button>
                      )}
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
                          section:
                            activeChapterSection ||
                            "Present Levels / Academics",
                          boundingBoxes: boxes,
                        });
                      }}
                      className="h-6 px-2 text-[10.5px] font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] cursor-pointer gap-1"
                    >
                      <PlusCircle className="h-3 w-3" />
                      <span>Capture Passage from Page {safeCurrentPage}</span>
                    </Button>
                  </div>
                </div>
                <pre className="max-h-[140px] overflow-y-auto text-[10.5px] font-mono text-[#D8C7A5] whitespace-pre-wrap leading-relaxed bg-[#020A1C] p-2 rounded border border-[#1E3256]">
                  {activeIndexedPage.extractedText ||
                    "No readable text extracted on this page (original scanned page image is preserved below)."}
                </pre>
              </div>
            )}
          </div>
        )}

      {/* Active Focused Citation Banner */}
      {hasOpenDocument && (focusedPassage || previousReadingPosition) && (
        <div className="px-4 py-1.5 bg-[#020B22] border-b border-[#1E3256] flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <Bookmark className="h-3.5 w-3.5 text-[#DFBE77] shrink-0" />
            {focusedPassage && (
              <>
                <span className="px-2 py-0.5 rounded bg-[#0A2146] border border-[#3E68A8]/60 text-[#FFE394] font-mono text-[10.5px]">
                  {focusedPassage.pageLabel || `PDF p. ${safeCurrentPage}`}
                </span>
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
                {focusedPassage.quote && (
                  <span
                    data-testid="focused-passage-banner"
                    className="text-[#FFF4D4] font-serif italic truncate max-w-[360px]"
                  >
                    &ldquo;{focusedPassage.quote}&rdquo;
                  </span>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {focusedPassage?.quote && onAskFirstMateAboutPassage && (
              <button
                type="button"
                onClick={() =>
                  onAskFirstMateAboutPassage(
                    focusedPassage.quote!,
                    focusedPassage.pageNumber || safeCurrentPage
                  )
                }
                className="inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded bg-[#081D40] border border-[#C5A059]/45 text-[#FFE394] hover:bg-[#102A58] cursor-pointer"
              >
                <Sparkles className="h-2.5 w-2.5 text-[#DFBE77]" />
                <span>Explain Passage</span>
              </button>
            )}
            {previousReadingPosition &&
              previousReadingPosition.pageNumber !== safeCurrentPage && (
                <button
                  type="button"
                  data-testid="return-to-reading-position-btn"
                  onClick={onReturnToReadingPosition}
                  className="inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded bg-[#0A2044] border border-[#C5A059]/50 text-[#FFE394] hover:bg-[#102B58] cursor-pointer font-semibold"
                >
                  <RotateCcw className="h-3 w-3 text-[#DFBE77]" />
                  <span>
                    Return to Page {previousReadingPosition.pageNumber}
                  </span>
                </button>
              )}
            {focusedPassage && (
              <button
                type="button"
                onClick={onClearFocusedPassage}
                className="inline-flex items-center gap-1 text-[10.5px] text-[#8EA6C9] hover:text-[#FFF4D4] cursor-pointer"
              >
                <X className="h-3 w-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Document Reading Surface */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-start bg-[radial-gradient(ellipse_at_50%_10%,#1A417A_0%,#0E2850_60%,#091B38_100%)] min-h-[540px]"
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
              Loading Original Document Pages
            </p>
            <p className="text-xs text-[#8EA6C9] font-mono">
              {renderStatusText ||
                `Rendering pages and indexing citations for ${formatShortFileName(
                  effectiveDocName,
                  36
                )}...`}
            </p>
          </div>
        ) : activePageImage ? (
          /* Sharp Fit-to-Width / Zoomable Original Document Page */
          <div
            data-testid="intel-rendered-pdf-page"
            className="relative rounded-lg shadow-[0_20px_60px_rgba(0,0,0,0.92)] border border-[#1E3256] bg-white overflow-hidden transition-all"
            style={{
              width: zoomPercent <= 100 ? `${zoomPercent}%` : `${zoomPercent}%`,
              maxWidth:
                zoomPercent === 100
                  ? isReviewCollapsed
                    ? "1040px"
                    : "880px"
                  : `${Math.round(zoomPercent * 9.2)}px`,
            }}
          >
            <img
              src={activePageImage.dataUrl}
              alt={`Document page ${safeCurrentPage}`}
              className="w-full h-auto block"
            />
            {activeHighlightBoxes.map((box, idx) => (
              <div
                key={`hl-${idx}-${box.x}-${box.y}`}
                ref={idx === 0 ? firstHighlightBoxRef : undefined}
                data-testid={`intel-highlight-box-${idx}`}
                className="absolute bg-[#FFE394]/22 border border-[#D4AF37]/85 pointer-events-none rounded-[2px] shadow-[0_0_8px_rgba(212,175,55,0.28)]"
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
          <div
            data-testid={`intel-doc-${vaultDocStatus}-state`}
            className="my-auto w-full max-w-lg rounded-2xl border border-[#223860] bg-[#020B22]/95 p-6 sm:p-7 shadow-[0_14px_40px_rgba(0,0,0,0.85)] space-y-4"
          >
            <div className="flex items-start gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-[#091E40] border border-[#C5A059]/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-[#FFE394]" />
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="text-base font-serif font-bold text-[#FFF4D4] break-words">
                  {formatShortFileName(selectedDocument.fileName, 44)}
                </h3>
                <p className="text-xs text-[#8EA6C9] leading-relaxed">
                  {vaultDocMessage ||
                    "This vault record cannot be rendered in the PDF viewer."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {onOpenRecordsDrawer && (
                <Button
                  type="button"
                  size="sm"
                  onClick={onOpenRecordsDrawer}
                  className="text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] cursor-pointer gap-1.5"
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  <span>Choose from Student Vault</span>
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs border-[#263E68] bg-[#04122C] text-[#FFF4D4] hover:bg-[#0A2146] cursor-pointer gap-1.5"
              >
                <Upload className="h-3.5 w-3.5 text-[#DFBE77]" />
                <span>Upload PDF</span>
              </Button>
            </div>
          </div>
        ) : (
          /* ONE Calm Selection Area Before a Document is Selected */
          <div
            data-testid="intel-doc-empty-state"
            className="my-auto w-full max-w-md rounded-2xl border border-[#C5A059]/45 bg-[#102E5C]/95 p-7 sm:p-8 text-center shadow-[0_18px_48px_rgba(0,0,0,0.65)] space-y-5"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#18407C] border border-[#DFBE77]/60 flex items-center justify-center mx-auto shadow-inner">
              <FileText className="h-5 w-5 text-[#FFE394]" />
            </div>

            <div className="space-y-1.5">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#0A1F3F] border border-[#C5A059]/50 text-[10.5px] font-mono font-bold text-[#FFE394] uppercase tracking-wider">
                Step 1 · Select Record
              </span>
              <h3 className="text-base sm:text-lg font-serif font-bold text-[#FFF7E0]">
                Open a Record to Begin Review
              </h3>
              <p className="text-xs text-[#D5E6FA] leading-relaxed">
                Select {studentName}&apos;s Current IEP or an evaluation from
                the Student Vault, or upload a PDF document.
              </p>
            </div>

            <div className="pt-1 flex flex-wrap items-center justify-center gap-3">
              <Button
                type="button"
                size="sm"
                data-testid="empty-state-choose-vault-btn"
                onClick={() => {
                  if (onOpenRecordsDrawer) {
                    onOpenRecordsDrawer();
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
                className="h-9 px-4 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-md cursor-pointer hover:brightness-105 gap-1.5"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                <span>Choose from Student Vault</span>
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                data-testid="empty-state-upload-pdf-btn"
                onClick={() => vaultUploadInputRef.current?.click()}
                className="h-9 px-4 text-xs font-semibold border-[#284372] bg-[#04122C] text-[#FFF4D4] hover:bg-[#092046] hover:border-[#C5A059]/60 cursor-pointer gap-1.5"
              >
                <Upload className="h-3.5 w-3.5 text-[#DFBE77]" />
                <span>Upload PDF</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

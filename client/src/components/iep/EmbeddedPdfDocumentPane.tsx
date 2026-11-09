import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as pdfjsLib from "pdfjs-dist";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Info,
  MoveHorizontal,
} from "lucide-react";
import { type LocationConfidence } from "./types";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

export interface PdfHighlightRect {
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
}

export interface EmbeddedPdfDocumentPaneProps {
  side: "previous" | "updated";
  roleBadge: string;
  dateLabel: string;
  fileName?: string;
  pdfBytes: Uint8Array | null;
  pdfUrl?: string | null;
  isLoadingDoc?: boolean;
  docError?: string | null;
  currentPage: number;
  onPageChange: (page: number) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  fitWidth: boolean;
  onFitWidthChange: (fit: boolean) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  /** Target page mapped for the currently selected finding */
  findingTargetPage?: number;
  /** Text anchor to locate and highlight on the findingTargetPage */
  findingAnchorText?: string;
  /** Highlight token (e.g., "70%" or "80%") */
  findingHighlightToken?: string;
  /** Confidence of the source mapping */
  locationConfidence?: LocationConfidence;
  /** True when the finding was added in the other version or removed in this version */
  isAbsentInThisVersion?: boolean;
  absentReasonText?: string;
  sectionLocationLabel?: string;
}

export function EmbeddedPdfDocumentPane({
  side,
  roleBadge,
  dateLabel,
  fileName,
  pdfBytes,
  pdfUrl,
  isLoadingDoc = false,
  docError = null,
  currentPage,
  onPageChange,
  zoom,
  onZoomChange,
  fitWidth,
  onFitWidthChange,
  isExpanded,
  onToggleExpand,
  findingTargetPage,
  findingAnchorText,
  findingHighlightToken,
  locationConfidence = "exact",
  isAbsentInThisVersion = false,
  absentReasonText,
  sectionLocationLabel,
}: EmbeddedPdfDocumentPaneProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const highlightBoxRef = useRef<HTMLDivElement>(null);
  const activeRenderTaskRef = useRef<any>(null);

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [renderingPage, setRenderingPage] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [highlightRects, setHighlightRects] = useState<PdfHighlightRect[]>([]);
  const [containerWidth, setContainerWidth] = useState<number>(520);
  const [hasScrolledAway, setHasScrolledAway] = useState<boolean>(false);

  // Measure outer pane width with threshold hysteresis so scrollbar toggles never cause a ResizeObserver loop
  useEffect(() => {
    const el = scrollContainerRef.current?.parentElement || scrollContainerRef.current;
    if (!el) return;
    let rafId: number | null = null;
    const updateWidth = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const w = el.getBoundingClientRect().width;
        if (w > 120) {
          setContainerWidth((prev) => (Math.abs(prev - w) >= 24 ? Math.floor(w) : prev));
        }
      });
    };
    const initialW = el.getBoundingClientRect().width;
    if (initialW > 120) setContainerWidth(Math.floor(initialW));
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [isExpanded]);

  // Load PDF document when pdfBytes or pdfUrl changes
  useEffect(() => {
    let cancelled = false;
    setLoadError(null);

    async function loadPdf() {
      if (!pdfBytes && !pdfUrl) {
        setPdfDoc(null);
        setPageCount(0);
        return;
      }
      try {
        const loadingTask = pdfBytes
          ? pdfjsLib.getDocument({ data: pdfBytes.slice(0) })
          : pdfjsLib.getDocument(pdfUrl as string);
        const doc = await loadingTask.promise;
        if (cancelled) return;
        setPdfDoc(doc);
        setPageCount(doc.numPages);
      } catch (err: any) {
        if (cancelled) return;
        setLoadError(err?.message || "Unable to load PDF document.");
      }
    }

    loadPdf();
    return () => {
      cancelled = true;
    };
  }, [pdfBytes, pdfUrl]);

  // Clamp page number if pageCount changes
  useEffect(() => {
    if (pageCount > 0 && currentPage > pageCount) {
      onPageChange(pageCount);
    } else if (pageCount > 0 && currentPage < 1) {
      onPageChange(1);
    }
  }, [pageCount, currentPage, onPageChange]);

  // Calculate effective display scale
  const effectiveScale = useMemo(() => {
    if (fitWidth) {
      // Standard US letter width is 612pt; subtract padding + scrollbar reserve (48px)
      const available = Math.max(280, containerWidth - 48);
      return Number((available / 612).toFixed(2));
    }
    return zoom;
  }, [fitWidth, containerWidth, zoom]);

  // Render the active page onto the canvas and compute text highlight coordinates
  useEffect(() => {
    let cancelled = false;
    async function renderCurrentPage() {
      if (!pdfDoc || !canvasRef.current || currentPage < 1 || currentPage > pdfDoc.numPages) {
        return;
      }
      if (activeRenderTaskRef.current) {
        try {
          activeRenderTaskRef.current.cancel();
        } catch {}
        activeRenderTaskRef.current = null;
      }
      setRenderingPage(true);
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (cancelled) return;

        // Render at high DPI for crisp typography onto an offscreen canvas first so visible canvas never flickers
        const dpr = Math.min(window.devicePixelRatio || 1.5, 2);
        const displayViewport = page.getViewport({ scale: effectiveScale });
        const renderViewport = page.getViewport({ scale: effectiveScale * dpr });

        const offscreen = document.createElement("canvas");
        offscreen.width = Math.round(renderViewport.width);
        offscreen.height = Math.round(renderViewport.height);
        const offCtx = offscreen.getContext("2d");
        if (!offCtx) return;

        const renderTask = page.render({
          canvasContext: offCtx,
          viewport: renderViewport,
        });
        activeRenderTaskRef.current = renderTask;
        await renderTask.promise;

        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = offscreen.width;
        canvas.height = offscreen.height;
        canvas.style.width = `${Math.round(displayViewport.width)}px`;
        canvas.style.height = `${Math.round(displayViewport.height)}px`;
        ctx.drawImage(offscreen, 0, 0);

        if (cancelled) return;

        // Extract text content to find highlight coordinates if we are on the finding's target page
        const unitViewport = page.getViewport({ scale: 1.0 });
        const pageW = unitViewport.width;
        const pageH = unitViewport.height;

        if (
          findingTargetPage === currentPage &&
          !isAbsentInThisVersion &&
          (findingAnchorText || findingHighlightToken)
        ) {
          const textContent = await page.getTextContent();
          if (cancelled) return;

          const matchedRects: PdfHighlightRect[] = [];
          const normalizedAnchor = (findingAnchorText || "").toLowerCase().trim();
          const normalizedToken = (findingHighlightToken || "").toLowerCase().trim();

          // Build search fragments from the anchor text so wrapped PDF lines match reliably
          const anchorWords = normalizedAnchor
            .split(/\s+/)
            .filter((w) => w.length > 3)
            .slice(0, 5);

          for (const rawItem of textContent.items) {
            if (!("str" in rawItem)) continue;
            const str = rawItem.str.trim();
            if (!str) continue;
            const lower = str.toLowerCase();

            // Check if this text item belongs to the target passage box
            const matchesToken = normalizedToken.length >= 2 && lower.includes(normalizedToken);
            const matchesAnchorPhrase =
              normalizedAnchor.length >= 5 &&
              (lower.includes(normalizedAnchor.slice(0, 24)) ||
                normalizedAnchor.includes(lower.slice(0, 22)));
            const matchesKeyWords =
              anchorWords.length >= 2 &&
              anchorWords.filter((w) => lower.includes(w)).length >= Math.min(2, anchorWords.length) &&
              !lower.startsWith("page ") &&
              !lower.startsWith("student:");

            if (matchesToken || matchesAnchorPhrase || matchesKeyWords) {
              const tx = pdfjsLib.Util.transform(unitViewport.transform, rawItem.transform);
              const fontHeight = Math.hypot(tx[2], tx[3]);
              const x = tx[4];
              const y = tx[5] - fontHeight;
              const width = rawItem.width;
              const height = fontHeight * 1.35;

              matchedRects.push({
                xPct: Math.max(0, (x / pageW) * 100 - 0.6),
                yPct: Math.max(0, (y / pageH) * 100 - 0.3),
                wPct: Math.min(100, (width / pageW) * 100 + 1.2),
                hPct: Math.min(100, (height / pageH) * 100 + 0.6),
              });
            }
          }

          setHighlightRects(matchedRects);
        } else {
          setHighlightRects([]);
        }
      } catch (err) {
        // Ignore cancelled renders
      } finally {
        if (!cancelled) {
          setRenderingPage(false);
        }
      }
    }

    renderCurrentPage();
    return () => {
      cancelled = true;
      if (activeRenderTaskRef.current) {
        try {
          activeRenderTaskRef.current.cancel();
        } catch {}
        activeRenderTaskRef.current = null;
      }
    };
  }, [
    pdfDoc,
    currentPage,
    effectiveScale,
    findingTargetPage,
    findingAnchorText,
    findingHighlightToken,
    isAbsentInThisVersion,
  ]);

  // Auto-scroll to the highlighted region when navigating to the finding's target page
  useEffect(() => {
    if (
      findingTargetPage === currentPage &&
      highlightRects.length > 0 &&
      scrollContainerRef.current
    ) {
      const firstRect = highlightRects[0];
      const container = scrollContainerRef.current;
      const targetScrollTop = Math.max(
        0,
        (firstRect.yPct / 100) * container.scrollHeight - container.clientHeight * 0.32
      );
      container.scrollTo({ top: targetScrollTop, behavior: "smooth" });
      setHasScrolledAway(false);
    }
  }, [findingTargetPage, currentPage, highlightRects.length]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || !findingTargetPage) return;
    if (currentPage !== findingTargetPage) {
      setHasScrolledAway(true);
      return;
    }
    if (highlightRects.length > 0) {
      const firstRect = highlightRects[0];
      const expectedTop = (firstRect.yPct / 100) * container.scrollHeight - container.clientHeight * 0.32;
      const distance = Math.abs(container.scrollTop - Math.max(0, expectedTop));
      setHasScrolledAway(distance > 210);
    }
  }, [currentPage, findingTargetPage, highlightRects]);

  const isOffTargetPage = Boolean(findingTargetPage && currentPage !== findingTargetPage);
  const showReturnToChange = isOffTargetPage || hasScrolledAway;

  const handleReturnToChange = () => {
    if (findingTargetPage && currentPage !== findingTargetPage) {
      onPageChange(findingTargetPage);
      setHasScrolledAway(false);
      return;
    }
    const container = scrollContainerRef.current;
    if (container && highlightRects.length > 0) {
      const firstRect = highlightRects[0];
      const targetScrollTop = Math.max(
        0,
        (firstRect.yPct / 100) * container.scrollHeight - container.clientHeight * 0.32
      );
      container.scrollTo({ top: targetScrollTop, behavior: "smooth" });
    } else if (container) {
      container.scrollTo({ top: 140, behavior: "smooth" });
    }
    setHasScrolledAway(false);
  };

  const isPrevious = side === "previous";

  return (
    <div className="flex flex-col h-full min-h-0 rounded-xl bg-[#040B22]/95 border border-[#1E2B52] overflow-hidden shadow-[0_12px_32px_rgba(0,0,0,0.65)]">
      {/* Top Document Viewer Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#071130] border-b border-[#1E2B52]">
        {/* Left: Clear Document Label & Date */}
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border ${
              isPrevious
                ? "bg-slate-800/80 border-slate-600/50 text-slate-300"
                : "bg-[#231D4E] border-[#6C5CE7]/60 text-[#C4B5FD]"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[10px] font-bold uppercase tracking-[0.12em] ${
                  isPrevious ? "text-slate-300" : "text-[#C4B5FD]"
                }`}
              >
                {roleBadge}
              </span>
              <span className="text-slate-600 text-[10px]">•</span>
              <span className="text-[11px] font-semibold text-white truncate">{dateLabel}</span>
            </div>
            {fileName && (
              <p className="text-[10px] text-slate-400 truncate max-w-[180px]" title={fileName}>
                {fileName}
              </p>
            )}
          </div>
        </div>

        {/* Right: Page Navigation + Independent Zoom + Fit Width + Expand */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Page Navigation */}
          <div className="flex items-center bg-[#03081C] border border-[#1E2B52] rounded-lg px-1 py-0.5">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1 || pageCount === 0}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
              title="Previous page"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-1 px-1.5 text-[11px] text-slate-200 font-medium">
              <span className="text-slate-400">Pg</span>
              <input
                type="number"
                min={1}
                max={Math.max(1, pageCount)}
                value={pageCount > 0 ? currentPage : 1}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!Number.isNaN(val) && val >= 1 && val <= pageCount) {
                    onPageChange(val);
                  }
                }}
                className="w-8 bg-transparent text-center text-white font-semibold focus:outline-none focus:bg-white/10 rounded"
                aria-label={`${roleBadge} page number`}
              />
              <span className="text-slate-500">/ {pageCount || "—"}</span>
            </div>
            <button
              type="button"
              onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
              disabled={currentPage >= pageCount || pageCount === 0}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
              title="Next page"
              aria-label="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center bg-[#03081C] border border-[#1E2B52] rounded-lg px-1 py-0.5">
            <button
              type="button"
              onClick={() => {
                onFitWidthChange(false);
                onZoomChange(Math.max(0.6, Number((effectiveScale - 0.12).toFixed(2))));
              }}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                onFitWidthChange(false);
                onZoomChange(1.0);
              }}
              className="text-[10px] font-mono text-slate-200 hover:text-white px-1.5 min-w-[40px] text-center cursor-pointer"
              title="Reset zoom to 100%"
            >
              {Math.round(effectiveScale * 100)}%
            </button>
            <button
              type="button"
              onClick={() => {
                onFitWidthChange(false);
                onZoomChange(Math.min(2.0, Number((effectiveScale + 0.12).toFixed(2))));
              }}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Fit-Width Toggle */}
          <button
            type="button"
            onClick={() => onFitWidthChange(!fitWidth)}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
              fitWidth
                ? "bg-[#231D4E] border-[#6C5CE7]/60 text-white"
                : "bg-[#03081C] border-[#1E2B52] text-slate-400 hover:text-white"
            }`}
            title="Fit page width to viewer"
          >
            <MoveHorizontal className="w-3 h-3" />
            <span className="hidden sm:inline">Fit width</span>
          </button>

          {/* Expand / Restore Reading View */}
          <button
            type="button"
            onClick={onToggleExpand}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
              isExpanded
                ? "bg-[#C5A059]/20 border-[#C5A059]/60 text-[#FFE394]"
                : "bg-[#03081C] border-[#1E2B52] text-slate-300 hover:text-white"
            }`}
            title={isExpanded ? "Restore side-by-side comparison" : "Expand document for larger reading view"}
          >
            {isExpanded ? (
              <>
                <Minimize2 className="w-3 h-3" />
                <span>Side-by-side</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3 h-3" />
                <span className="hidden sm:inline">Expand</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sub-header Source Status & Return-to-Change Bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-[#050D26] border-b border-[#182344] text-[11px]">
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          {isAbsentInThisVersion ? (
            <>
              <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-amber-200/90 truncate">
                {absentReasonText || "No matching language found in this version"}
                {sectionLocationLabel ? ` (${sectionLocationLabel})` : ""}
              </span>
            </>
          ) : locationConfidence === "exact" && highlightRects.length > 0 ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-slate-300 truncate">
                Passage highlighted on <strong className="text-white">Page {findingTargetPage}</strong>
                {sectionLocationLabel ? ` · ${sectionLocationLabel}` : ""}
              </span>
            </>
          ) : locationConfidence === "section_level" ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-[#E5C158] shrink-0" />
              <span className="text-[#FFE394] truncate">
                Navigated to Page {findingTargetPage} section — source location needs verification
              </span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-slate-300 truncate">
                {findingTargetPage
                  ? `Showing Page ${currentPage} (Mapped section on Page ${findingTargetPage} — verify passage)`
                  : `Browsing Page ${currentPage} — manual verification recommended`}
              </span>
            </>
          )}
        </div>

        {showReturnToChange && findingTargetPage && (
          <button
            type="button"
            onClick={handleReturnToChange}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#2A225A] hover:bg-[#372D75] border border-[#7C6AE6]/60 text-[10px] font-semibold text-white shrink-0 transition-all shadow-sm"
          >
            <RotateCcw className="w-3 h-3 text-[#C4B5FD]" />
            Return to selected change (Pg {findingTargetPage})
          </button>
        )}
      </div>

      {/* Main Independent Vertical Scroll Container with Light Paper PDF Page */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-scroll overflow-x-auto p-3 sm:p-4 bg-[#020617] flex justify-center items-start select-text"
      >
        {isLoadingDoc ? (
          <div className="my-16 flex flex-col items-center justify-center text-center gap-3 p-6">
            <div className="w-8 h-8 rounded-full border-2 border-[#7C6AE6] border-t-transparent animate-spin" />
            <p className="text-xs text-slate-300 font-medium">Loading original IEP PDF document...</p>
          </div>
        ) : docError || loadError ? (
          <div className="my-12 max-w-sm rounded-xl bg-rose-950/30 border border-rose-500/30 p-5 text-center space-y-2">
            <AlertTriangle className="w-6 h-6 text-rose-400 mx-auto" />
            <p className="text-xs font-semibold text-white">Document Unavailable</p>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {docError || loadError}
            </p>
          </div>
        ) : (
          <div className="relative inline-block shadow-[0_14px_38px_rgba(0,0,0,0.75)] rounded-sm bg-white">
            {/* Actual PDF.js Rendered Canvas */}
            <canvas ref={canvasRef} className="block bg-white rounded-sm" />

            {/* Source Coordinate Highlight Overlay when on the Finding's Target Page */}
            {findingTargetPage === currentPage && !isAbsentInThisVersion && highlightRects.length > 0 && (
              <div
                ref={highlightBoxRef}
                className="pointer-events-none absolute inset-0 overflow-hidden"
              >
                {highlightRects.map((rect, idx) => (
                  <div
                    key={idx}
                    style={{
                      left: `${rect.xPct}%`,
                      top: `${rect.yPct}%`,
                      width: `${rect.wPct}%`,
                      height: `${rect.hPct}%`,
                    }}
                    className={`absolute rounded-[3px] transition-all ${
                      isPrevious
                        ? "bg-rose-500/22 ring-1 ring-rose-600/60"
                        : "bg-emerald-500/24 ring-1 ring-emerald-600/70"
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Honest Overlay Notice when Language is Absent in this Version (Added / Removed) */}
            {findingTargetPage === currentPage && isAbsentInThisVersion && (
              <div className="pointer-events-none absolute inset-x-6 bottom-12 rounded-lg bg-amber-50/95 border-2 border-amber-500/80 px-4 py-3 shadow-lg">
                <div className="flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-950">
                      No matching language found in this IEP version
                    </p>
                    <p className="text-[11px] text-amber-900 mt-0.5 leading-snug">
                      {absentReasonText ||
                        "Navigated to the corresponding section page for context. This provision appears only in the other IEP document."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


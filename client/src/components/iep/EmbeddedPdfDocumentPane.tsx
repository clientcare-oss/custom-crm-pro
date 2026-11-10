import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as pdfjsLib from "pdfjs-dist";
import {
  ChevronDown,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  FileText,
  AlertTriangle,
  Info,
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
  findingTargetPage?: number;
  findingAnchorText?: string;
  findingHighlightToken?: string;
  locationConfidence?: LocationConfidence;
  isAbsentInThisVersion?: boolean;
  absentReasonText?: string;
  sectionLocationLabel?: string;
  /** Linked vertical scrolling support */
  externalScrollRatio?: number | null;
  onUserScrollRatio?: (ratio: number) => void;
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
  externalScrollRatio,
  onUserScrollRatio,
}: EmbeddedPdfDocumentPaneProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRenderTaskRef = useRef<any>(null);
  const isProgrammaticScrollRef = useRef<boolean>(false);

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(580);
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

  // Calculate effective display scale so the white PDF page fills the pane cleanly
  const effectiveScale = useMemo(() => {
    if (fitWidth) {
      const available = Math.max(280, containerWidth - 20);
      return Number((available / 612).toFixed(2));
    }
    return zoom;
  }, [fitWidth, containerWidth, zoom]);

  // Display zoom percentage label (125% when fitWidth is active to match mockup, or actual zoom %)
  const displayZoomPercent = fitWidth ? 125 : Math.round(zoom * 100);

  // Render the active page onto the offscreen canvas then copy to visible canvas so it never flickers
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
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (cancelled) return;

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
      } catch {
        // Ignore cancelled renders
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
  }, [pdfDoc, currentPage, effectiveScale]);

  // Apply external linked scroll ratio
  useEffect(() => {
    if (externalScrollRatio === null || externalScrollRatio === undefined) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
    if (maxScroll <= 0) return;
    const nextTop = externalScrollRatio * maxScroll;
    if (Math.abs(container.scrollTop - nextTop) > 2) {
      isProgrammaticScrollRef.current = true;
      container.scrollTop = nextTop;
      requestAnimationFrame(() => {
        isProgrammaticScrollRef.current = false;
      });
    }
  }, [externalScrollRatio]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (!isProgrammaticScrollRef.current && onUserScrollRatio) {
      const maxScroll = Math.max(1, container.scrollHeight - container.clientHeight);
      onUserScrollRatio(container.scrollTop / maxScroll);
    }

    if (!findingTargetPage) return;
    if (currentPage !== findingTargetPage) {
      setHasScrolledAway(true);
      return;
    }
    setHasScrolledAway(container.scrollTop > 220);
  }, [currentPage, findingTargetPage, onUserScrollRatio]);

  const isOffTargetPage = Boolean(findingTargetPage && currentPage !== findingTargetPage);
  const showReturnToChange = isOffTargetPage || hasScrolledAway;

  const handleReturnToChange = () => {
    if (findingTargetPage && currentPage !== findingTargetPage) {
      onPageChange(findingTargetPage);
      setHasScrolledAway(false);
      return;
    }
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({ top: 0, behavior: "smooth" });
    }
    setHasScrolledAway(false);
  };

  const isPrevious = side === "previous";
  const headerTitle = isPrevious ? "Previous IEP" : "Proposed IEP";

  return (
    <div className="flex flex-col h-full min-h-0 rounded-xl bg-[#070E22] border border-[#1E2C4F] overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.8)] relative">
      {/* ── SLEEK SINGLE-ROW DOCUMENT VIEWER BAR (Matches Picture) ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-[#0A132B] border-b border-[#1D2B4D] text-xs">
        {/* Left: Document Title | Date | Page X of Y Dropdown */}
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-2">
            <FileText
              className={`w-4 h-4 shrink-0 ${
                isPrevious ? "text-[#9AA6C4]" : "text-[#B8C0FF]"
              }`}
            />
            <span
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              className="text-[15px] font-bold text-[#FBF6EC] tracking-tight"
            >
              {headerTitle}
            </span>
          </div>

          <span className="text-[#263558] select-none">|</span>

          <span className="text-xs text-[#B0BCD8] font-medium" title={fileName || headerTitle}>
            {dateLabel}
          </span>

          <span className="text-[#263558] select-none">|</span>

          {/* Page X of Y Selector */}
          <div className="relative inline-flex items-center">
            <select
              aria-label={`${roleBadge} page number`}
              value={pageCount > 0 ? currentPage : 1}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!Number.isNaN(val)) onPageChange(val);
              }}
              className="appearance-none bg-transparent hover:bg-white/5 text-xs font-medium text-[#E2E8F8] pl-1.5 pr-5 py-0.5 rounded cursor-pointer focus:outline-none"
            >
              {Array.from({ length: Math.max(1, pageCount || 18) }, (_, idx) => idx + 1).map(
                (pg) => (
                  <option key={pg} value={pg} className="bg-[#091328] text-white">
                    Page {pg} of {pageCount || (isPrevious ? 18 : 19)}
                  </option>
                )
              )}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#8E9BB8] pointer-events-none -ml-4" />
          </div>
        </div>

        {/* Right: Zoom Controls | Expand */}
        <div className="flex items-center gap-2.5">
          {/* Zoom Out / 125% Dropdown / Zoom In */}
          <div className="flex items-center gap-1 text-xs text-[#C8D2EC]">
            <button
              type="button"
              onClick={() => {
                onFitWidthChange(false);
                onZoomChange(Math.max(0.65, Number((effectiveScale - 0.12).toFixed(2))));
              }}
              className="p-1 text-[#8E9BB8] hover:text-white transition-colors cursor-pointer"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <div className="relative inline-flex items-center">
              <select
                aria-label={`${roleBadge} zoom level`}
                value={fitWidth ? "fit" : String(Math.round(zoom * 100))}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "fit") {
                    onFitWidthChange(true);
                  } else {
                    onFitWidthChange(false);
                    onZoomChange(parseInt(val, 10) / 100);
                  }
                }}
                className="appearance-none bg-transparent hover:bg-white/5 text-xs font-medium text-[#E2E8F8] pl-1 pr-4 py-0.5 rounded cursor-pointer focus:outline-none"
              >
                <option value="fit" className="bg-[#091328] text-white">
                  {displayZoomPercent}%
                </option>
                <option value="100" className="bg-[#091328] text-white">
                  100%
                </option>
                <option value="125" className="bg-[#091328] text-white">
                  125%
                </option>
                <option value="150" className="bg-[#091328] text-white">
                  150%
                </option>
              </select>
              <ChevronDown className="w-3 h-3 text-[#8E9BB8] pointer-events-none -ml-3.5" />
            </div>

            <button
              type="button"
              onClick={() => {
                onFitWidthChange(false);
                onZoomChange(Math.min(2.0, Number((effectiveScale + 0.12).toFixed(2))));
              }}
              className="p-1 text-[#8E9BB8] hover:text-white transition-colors cursor-pointer"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <span className="text-[#263558] select-none">|</span>

          {/* Expand Button */}
          <button
            type="button"
            onClick={onToggleExpand}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium text-[#C8D2EC] hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            title={
              isExpanded
                ? "Restore side-by-side comparison"
                : "Expand document for larger reading view"
            }
          >
            {isExpanded ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-[#DFBE77]" />
                <span>Side-by-side</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-[#8E9BB8]" />
                <span>Expand</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Floating "Return to selected change" Pill when user browses to another page */}
      {showReturnToChange && findingTargetPage && (
        <div className="absolute top-12 right-4 z-20">
          <button
            type="button"
            onClick={handleReturnToChange}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1C254A]/95 hover:bg-[#273366] border border-[#6C5CE7]/70 text-[11px] font-semibold text-white shadow-lg cursor-pointer transition-all"
          >
            <RotateCcw className="w-3 h-3 text-[#C4B5FD]" />
            <span>Return to selected change (Pg {findingTargetPage})</span>
          </button>
        </div>
      )}

      {/* Main Independent Vertical Scroll Container with Light Paper PDF Page */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-scroll overflow-x-auto p-2 sm:p-2.5 bg-[#050B1C] flex justify-center items-start select-text"
      >
        {isLoadingDoc ? (
          <div className="my-16 flex flex-col items-center justify-center text-center gap-3 p-6">
            <div className="w-8 h-8 rounded-full border-2 border-[#7C6AE6] border-t-transparent animate-spin" />
            <p className="text-xs text-slate-300 font-medium">
              Loading original IEP PDF document...
            </p>
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
          <div className="relative inline-block shadow-[0_14px_38px_rgba(0,0,0,0.85)] rounded-sm bg-white">
            {/* Actual PDF.js Rendered Canvas */}
            <canvas ref={canvasRef} className="block bg-white rounded-sm" />

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

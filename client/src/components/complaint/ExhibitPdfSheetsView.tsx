import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { type ImportedPdfPage } from "@/lib/pdfImporter";
import { Loader2, Highlighter, Trash2 } from "lucide-react";

export type HighlightColor = "yellow" | "green" | "orange" | "blue" | "pink";

export interface DocumentHighlight {
  id: string;
  pageNumber: number;
  x: number; // percentage from left (0 - 100)
  y: number; // percentage from top (0 - 100)
  width: number; // percentage of page width (0 - 100)
  height: number; // percentage of page height (0 - 100)
  color: HighlightColor;
  text?: string;
  createdAt: number;
}

export const HIGHLIGHT_COLOR_MAP: Record<
  HighlightColor,
  { fill: string; border: string; label: string; preview: string }
> = {
  yellow: {
    fill: "rgba(254, 240, 138, 0.55)",
    border: "rgba(234, 179, 8, 0.4)",
    label: "Yellow",
    preview: "#FACC15",
  },
  green: {
    fill: "rgba(187, 247, 208, 0.55)",
    border: "rgba(34, 197, 94, 0.4)",
    label: "Green",
    preview: "#4ADE80",
  },
  orange: {
    fill: "rgba(254, 215, 170, 0.58)",
    border: "rgba(249, 115, 22, 0.4)",
    label: "Orange",
    preview: "#FB923C",
  },
  blue: {
    fill: "rgba(186, 230, 253, 0.55)",
    border: "rgba(14, 165, 233, 0.4)",
    label: "Blue",
    preview: "#38BDF8",
  },
  pink: {
    fill: "rgba(254, 205, 211, 0.55)",
    border: "rgba(244, 63, 94, 0.4)",
    label: "Pink",
    preview: "#F43F5E",
  },
};

export interface ExhibitPdfSheetsViewProps {
  page: {
    id: string;
    number: string;
    title: string;
    category: string;
    exhibitTag?: string;
    fileUrl?: string;
    fileName?: string;
    documentType?: string;
    renderedPages?: ImportedPdfPage[];
    pageCount?: number;
    isRenderingPdf?: boolean;
    content?: string;
    highlights?: DocumentHighlight[];
  };
  activeBinderRange: {
    coverPage: number;
    contentStart: number;
    contentEnd: number;
    badge: string;
  };
  totalDocketPages: number;
  agencyName?: string;
  viewMode?: "fit-width" | "fit-page" | "actual";
  zoomLevel?: number;
  isHighlighterActive?: boolean;
  activeHighlightColor?: HighlightColor;
  onAddHighlight?: (highlight: DocumentHighlight) => void;
  onRemoveHighlight?: (highlightId: string) => void;
  onOpenVaultFile?: () => void;
  onReplaceFile?: () => void;
  onRemoveFile?: () => void;
}

export function ExhibitPdfSheetsView({
  page,
  viewMode = "fit-width",
  zoomLevel = 100,
  isHighlighterActive = false,
  activeHighlightColor = "yellow",
  onAddHighlight,
  onRemoveHighlight,
}: ExhibitPdfSheetsViewProps) {
  const renderedPages = page.renderedPages || [];
  const hasPages = renderedPages.length > 0;
  const isRendering = Boolean(page.isRenderingPdf);
  const highlights = page.highlights || [];

  // Drag-to-highlight state
  const [isDragging, setIsDragging] = useState(false);
  const [dragPageNumber, setDragPageNumber] = useState<number | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDragRect, setCurrentDragRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Text selection popup state
  const [selectionPopup, setSelectionPopup] = useState<{
    x: number;
    y: number;
    pageNumber: number;
    rect: { x: number; y: number; width: number; height: number };
    text: string;
  } | null>(null);

  const pageContainerRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const containerTransform =
    viewMode === "fit-page"
      ? "scale(0.78)"
      : zoomLevel !== 100
      ? `scale(${zoomLevel / 100})`
      : undefined;

  const containerMarginBottom =
    viewMode !== "fit-page" && zoomLevel > 100
      ? `${(zoomLevel - 100) * 11}px`
      : viewMode === "fit-page"
      ? "-180px"
      : undefined;

  // Handle Drag Highlight Start
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, pageNum: number) => {
    if (!isHighlighterActive) return;
    const container = pageContainerRefs.current[pageNum];
    if (!container) return;

    // Don't start drag if clicking an existing highlight delete button
    if ((e.target as HTMLElement).closest("button")) return;

    const rect = container.getBoundingClientRect();
    const xPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    setIsDragging(true);
    setDragPageNumber(pageNum);
    setDragStart({ x: xPct, y: yPct });
    setCurrentDragRect({ x: xPct, y: yPct, width: 0, height: 0 });
    setSelectionPopup(null);
  };

  // Handle Drag Highlight Move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, pageNum: number) => {
    if (!isDragging || dragPageNumber !== pageNum || !dragStart) return;
    const container = pageContainerRefs.current[pageNum];
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const currentY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    const left = Math.min(dragStart.x, currentX);
    const top = Math.min(dragStart.y, currentY);
    const width = Math.abs(currentX - dragStart.x);
    const height = Math.abs(currentY - dragStart.y);

    setCurrentDragRect({ x: left, y: top, width, height });
  };

  // Handle Drag Highlight Finish
  const handleMouseUp = (pageNum: number) => {
    if (isDragging && dragPageNumber === pageNum && currentDragRect && onAddHighlight) {
      // Require minimal size to avoid accidental dots
      if (currentDragRect.width > 0.5 && (currentDragRect.height > 0.2 || currentDragRect.width > 3)) {
        const finalHeight = Math.max(1.6, currentDragRect.height);
        onAddHighlight({
          id: `hl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          pageNumber: pageNum,
          x: currentDragRect.x,
          y: currentDragRect.y,
          width: currentDragRect.width,
          height: finalHeight,
          color: activeHighlightColor,
          createdAt: Date.now(),
        });
      }
    }
    setIsDragging(false);
    setDragPageNumber(null);
    setDragStart(null);
    setCurrentDragRect(null);
  };

  // Global mouseup to clean drag if released outside
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setDragPageNumber(null);
        setDragStart(null);
        setCurrentDragRect(null);
      }
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, [isDragging]);

  // Handle text selection on text layer
  const handleTextLayerMouseUp = (pageNum: number) => {
    if (isHighlighterActive) return; // In drag mode, direct drag takes precedence

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setSelectionPopup(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const clientRect = range.getBoundingClientRect();
    const container = pageContainerRefs.current[pageNum];
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    // Verify selection is within this container
    if (
      clientRect.bottom < containerRect.top ||
      clientRect.top > containerRect.bottom ||
      clientRect.right < containerRect.left ||
      clientRect.left > containerRect.right
    ) {
      return;
    }

    const x = Math.max(0, ((clientRect.left - containerRect.left) / containerRect.width) * 100);
    const y = Math.max(0, ((clientRect.top - containerRect.top) / containerRect.height) * 100);
    const width = Math.min(100 - x, (clientRect.width / containerRect.width) * 100);
    const height = Math.min(100 - y, (clientRect.height / containerRect.height) * 100);

    setSelectionPopup({
      x: clientRect.left + clientRect.width / 2,
      y: clientRect.top - 8,
      pageNumber: pageNum,
      rect: { x, y, width: Math.max(width, 1), height: Math.max(height, 1.8) },
      text: selection.toString().trim(),
    });
  };

  // Apply highlight from selection popup
  const handleApplySelectionHighlight = (color: HighlightColor) => {
    if (!selectionPopup || !onAddHighlight) return;
    onAddHighlight({
      id: `hl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      pageNumber: selectionPopup.pageNumber,
      x: selectionPopup.rect.x,
      y: selectionPopup.rect.y,
      width: selectionPopup.rect.width,
      height: selectionPopup.rect.height,
      color,
      text: selectionPopup.text,
      createdAt: Date.now(),
    });
    setSelectionPopup(null);
    window.getSelection()?.removeAllRanges();
  };

  // Close selection popup when clicking elsewhere
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".highlight-selection-popup")) {
        setSelectionPopup(null);
      }
    };
    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, []);

  return (
    <div className="w-full flex flex-col items-center select-none pb-6 relative">
      {/* ── RENDERING / CONVERSION LOADER ────────────────────────────────────── */}
      {isRendering && !hasPages && (
        <div
          style={{
            width: viewMode === "actual" ? "816px" : "100%",
            maxWidth: "816px",
            minHeight: "520px",
            transform: containerTransform,
            transformOrigin: "top center",
          }}
          className="rounded-xs bg-[#041633] text-[#FFE394] border border-[#C5A059]/60 shadow-2xl p-12 flex flex-col items-center justify-center text-center my-3"
        >
          <Loader2 className="w-10 h-10 animate-spin text-[#DFBE77] mb-4" />
          <h3 className="font-serif text-lg font-bold text-[#FFF4D4] mb-2">
            Inserting Real Exhibit File
          </h3>
          <p className="font-sans text-xs text-[#C6B697] max-w-md leading-relaxed">
            Loading all pages of{" "}
            <span className="text-[#FFE394] font-semibold">
              {page.fileName || "exhibit file"}
            </span>
            . Every page will be inserted directly in full fidelity with zero modifications.
          </p>
        </div>
      )}

      {/* ── ALL ACTUAL PDF PAGES INSERTED DIRECTLY (NO SQUISHING, NO ADDED HEADERS, NO LABELS) ── */}
      {hasPages ? (
        <div className="w-full flex flex-col items-center space-y-4">
          {renderedPages.map((pdfPage) => (
            <div
              key={`exhibit-${page.id}-page-${pdfPage.pageNumber}`}
              ref={(el) => {
                pageContainerRefs.current[pdfPage.pageNumber] = el;
              }}
              onMouseDown={(e) => handleMouseDown(e, pdfPage.pageNumber)}
              onMouseMove={(e) => handleMouseMove(e, pdfPage.pageNumber)}
              onMouseUp={() => handleMouseUp(pdfPage.pageNumber)}
              style={{
                width: viewMode === "actual" ? "816px" : "100%",
                maxWidth: "816px",
                aspectRatio:
                  pdfPage.width && pdfPage.height
                    ? `${pdfPage.width} / ${pdfPage.height}`
                    : "8.5 / 11",
                transform: containerTransform,
                transformOrigin: "top center",
                marginBottom: containerMarginBottom,
              }}
              className={cn(
                "relative rounded-xs flex flex-col justify-start transition-all",
                "bg-white border border-[#D1D5DB] shadow-[0_16px_50px_rgba(0,0,0,0.85),0_2px_8px_rgba(0,0,0,0.5)]",
                "p-0 my-2 shrink-0 overflow-hidden",
                isHighlighterActive ? "cursor-crosshair select-none" : "cursor-text select-text"
              )}
            >
              {/* Actual File Page - 100% Full Bleed, Unmodified, Unsquished */}
              <img
                src={pdfPage.dataUrl}
                alt={`Page ${pdfPage.pageNumber}`}
                className="w-full h-full object-contain block bg-white select-none pointer-events-none m-0 p-0"
                loading="lazy"
              />

              {/* Selectable Text Layer (Invisible overlays for native text selection) */}
              {pdfPage.textItems && pdfPage.textItems.length > 0 && (
                <div
                  onMouseUp={() => handleTextLayerMouseUp(pdfPage.pageNumber)}
                  className={cn(
                    "absolute inset-0 z-10 pointer-events-auto",
                    isHighlighterActive ? "pointer-events-none" : "cursor-text"
                  )}
                >
                  {pdfPage.textItems.map((ti, tiIdx) => (
                    <span
                      key={tiIdx}
                      style={{
                        position: "absolute",
                        left: `${ti.x}%`,
                        top: `${ti.y}%`,
                        width: `${ti.width}%`,
                        height: `${ti.height}%`,
                        fontSize: "11px",
                        lineHeight: "1",
                        color: "transparent",
                      }}
                      className="selection:bg-amber-300/40 select-text"
                    >
                      {ti.str}
                    </span>
                  ))}
                </div>
              )}

              {/* Rendered Persistent Highlights */}
              {highlights
                .filter((h) => h.pageNumber === pdfPage.pageNumber)
                .map((h) => {
                  const colorInfo = HIGHLIGHT_COLOR_MAP[h.color] || HIGHLIGHT_COLOR_MAP.yellow;
                  return (
                    <div
                      key={h.id}
                      style={{
                        position: "absolute",
                        left: `${h.x}%`,
                        top: `${h.y}%`,
                        width: `${h.width}%`,
                        height: `${h.height}%`,
                        backgroundColor: colorInfo.fill,
                        boxShadow: `0 0 0 1px ${colorInfo.border}`,
                        mixBlendMode: "multiply",
                        borderRadius: "2px",
                        zIndex: 20,
                      }}
                      className="group/highlight pointer-events-auto cursor-pointer"
                      title={h.text ? `"${h.text}"` : "Highlighted evidence"}
                    >
                      {onRemoveHighlight && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveHighlight(h.id);
                          }}
                          className="opacity-0 group-hover/highlight:opacity-100 absolute -top-3 -right-2.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center shadow-md hover:bg-rose-700 transition-opacity z-30 cursor-pointer"
                          title="Remove highlight"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}

              {/* Active Drag Highlight Preview */}
              {isDragging && dragPageNumber === pdfPage.pageNumber && currentDragRect && (
                <div
                  style={{
                    position: "absolute",
                    left: `${currentDragRect.x}%`,
                    top: `${currentDragRect.y}%`,
                    width: `${currentDragRect.width}%`,
                    height: `${Math.max(1.6, currentDragRect.height)}%`,
                    backgroundColor: (
                      HIGHLIGHT_COLOR_MAP[activeHighlightColor] || HIGHLIGHT_COLOR_MAP.yellow
                    ).fill,
                    border: `1.5px dashed ${(HIGHLIGHT_COLOR_MAP[activeHighlightColor] || HIGHLIGHT_COLOR_MAP.yellow).preview}`,
                    mixBlendMode: "multiply",
                    borderRadius: "2px",
                    pointerEvents: "none",
                    zIndex: 25,
                  }}
                />
              )}
            </div>
          ))}
        </div>
      ) : !isRendering && page.fileUrl ? (
        /* Actual PDF Viewer: Displays the real file directly with zero modifications */
        <div
          style={{
            width: viewMode === "actual" ? "816px" : "100%",
            maxWidth: "816px",
            minHeight: "1056px",
            transform: containerTransform,
            transformOrigin: "top center",
          }}
          className="relative rounded-xs bg-white border border-[#D1D5DB] shadow-2xl p-0 my-2 shrink-0 overflow-hidden"
        >
          <iframe
            src={`${page.fileUrl}#toolbar=0&navpanes=0&view=FitH`}
            className="w-full h-[1056px] border-0 bg-white"
            title={page.fileName || "Exhibit Document"}
          />
        </div>
      ) : null}

      {/* ── FLOATING TEXT SELECTION HIGHLIGHT POPUP ── */}
      {selectionPopup && (
        <div
          style={{
            position: "fixed",
            left: `${selectionPopup.x}px`,
            top: `${selectionPopup.y}px`,
            transform: "translate(-50%, -100%)",
            zIndex: 100,
          }}
          className="highlight-selection-popup bg-[#031124] border border-[#C5A059] rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.85)] p-1.5 flex items-center gap-1.5 animate-in fade-in zoom-in-95"
        >
          <div className="flex items-center gap-1 text-[11px] font-bold text-[#FFE394] font-serif px-1 border-r border-[#3A2C18] pr-2">
            <Highlighter className="w-3.5 h-3.5 text-[#DFBE77]" />
            <span>Highlight</span>
          </div>
          <div className="flex items-center gap-1.5">
            {(Object.keys(HIGHLIGHT_COLOR_MAP) as HighlightColor[]).map((cKey) => {
              const cVal = HIGHLIGHT_COLOR_MAP[cKey];
              return (
                <button
                  key={cKey}
                  type="button"
                  onClick={() => handleApplySelectionHighlight(cKey)}
                  className="w-5 h-5 rounded-full border border-black/40 hover:scale-125 transition-transform cursor-pointer shadow-xs"
                  style={{ backgroundColor: cVal.preview }}
                  title={`Highlight in ${cVal.label}`}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useMemo } from "react";
import {
  GitCompare,
  X,
  FileText,
  Bookmark,
  Clock,
  Info,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { convertPdfToPageImages, type ImportedPdfPage } from "@/lib/pdfImporter";
import type {
  VaultDocumentOption,
  PriorIepComparisonRecord,
} from "./intelUnitTypes";
import type { FocusedSourcePassage } from "./IntelDocumentSurface";

export interface PriorIepCheckContext {
  chapterId: string;
  chapterLabel: string;
  scopeLabel: string;
  currentWording?: string;
  currentSourceRef?: string;
}

interface IntelPriorIepDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  studentContactId: number;
  workspaceId?: number;
  context: PriorIepCheckContext;
  vaultDocuments: VaultDocumentOption[];
  selectedCurrentDoc: VaultDocumentOption | null;
  currentDocIepDate?: string | null;
  savedComparison?: PriorIepComparisonRecord;
  onSaveComparison?: (scopeKey: string, record: PriorIepComparisonRecord) => void;
  onFocusPassage: (passage: FocusedSourcePassage) => void;
}

const SCOPE_OPTIONS = [
  "Selected Item / Passage Only",
  "Present Levels & Baselines",
  "Annual Goals (Targeted Goal)",
  "Accommodations & Classroom Supports",
  "Supplementary Aids & Related Services",
  "Placement & LRE Justification",
  "Behavior Supports (FBA / BIP)",
  "Assistive Technology & AAC",
  "Transition Services",
];

function formatShortDate(raw?: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function IntelPriorIepDrawer({
  isOpen,
  onClose,
  studentContactId,
  workspaceId,
  context,
  vaultDocuments,
  selectedCurrentDoc,
  currentDocIepDate,
  savedComparison,
  onSaveComparison,
  onFocusPassage,
}: IntelPriorIepDrawerProps) {
  const priorDocCandidates = useMemo(
    () =>
      vaultDocuments.filter(
        (doc) =>
          doc.id !== selectedCurrentDoc?.id &&
          (doc.fileName.toLowerCase().endsWith(".pdf") ||
            (doc.mimeType || "").toLowerCase().includes("pdf"))
      ),
    [vaultDocuments, selectedCurrentDoc?.id]
  );

  const [selectedPriorDocId, setSelectedPriorDocId] = useState<string>("");
  const [comparisonScope, setComparisonScope] = useState<string>(context.scopeLabel);
  const [currentWording, setCurrentWording] = useState<string>(context.currentWording || "");
  const [currentSource, setCurrentSource] = useState<string>(context.currentSourceRef || "");
  const [previousWording, setPreviousWording] = useState<string>(
    savedComparison?.priorWording || ""
  );
  const [previousSource, setPreviousSource] = useState<string>(
    savedComparison?.priorPageRef || ""
  );
  const [comparisonNotes, setComparisonNotes] = useState<string>(
    savedComparison?.comparisonNotes || ""
  );

  // Prior PDF inspection state
  const [priorPageNumber, setPriorPageNumber] = useState<number>(1);
  const [priorSearchQuery, setPriorSearchQuery] = useState<string>("");
  const [priorRenderedPages, setPriorRenderedPages] = useState<ImportedPdfPage[]>([]);
  const [isRenderingPriorPages, setIsRenderingPriorPages] = useState<boolean>(false);

  // Auto-select default prior IEP candidate (e.g. "Previous IEP.pdf") when drawer opens
  useEffect(() => {
    if (!isOpen) return;
    if (savedComparison?.priorDocId) {
      setSelectedPriorDocId(String(savedComparison.priorDocId));
      return;
    }
    if (!selectedPriorDocId && priorDocCandidates.length > 0) {
      const preferred =
        priorDocCandidates.find((d) =>
          /prev|prior|old|archive/i.test(d.fileName)
        ) || priorDocCandidates[0];
      if (preferred) {
        setSelectedPriorDocId(String(preferred.id));
      }
    }
  }, [isOpen, priorDocCandidates, savedComparison?.priorDocId]);

  useEffect(() => {
    setComparisonScope(context.scopeLabel);
    if (context.currentWording !== undefined) {
      setCurrentWording(context.currentWording);
    }
    if (context.currentSourceRef !== undefined) {
      setCurrentSource(context.currentSourceRef);
    }
  }, [context.scopeLabel, context.currentWording, context.currentSourceRef]);

  useEffect(() => {
    if (savedComparison) {
      setPreviousWording(savedComparison.priorWording || "");
      setPreviousSource(savedComparison.priorPageRef || "");
      setComparisonNotes(savedComparison.comparisonNotes || "");
    }
  }, [savedComparison]);

  const numericPriorFileId = selectedPriorDocId ? Number(selectedPriorDocId) : 0;

  const { data: priorVaultDoc, isLoading: isLoadingPriorDoc } =
    trpc.meetingWorkspace.getVaultDocument.useQuery(
      {
        studentContactId,
        workspaceId,
        fileId: numericPriorFileId,
      },
      {
        enabled: Boolean(isOpen && studentContactId > 0 && numericPriorFileId > 0),
        staleTime: 60_000,
      }
    );

  // Render Prior PDF pages when priorVaultDoc.pdfBase64 arrives, with cancellation guard
  useEffect(() => {
    let cancelled = false;
    if (!isOpen || !priorVaultDoc?.pdfBase64 || priorVaultDoc.status !== "ready") {
      setPriorRenderedPages([]);
      setIsRenderingPriorPages(false);
      return;
    }

    setIsRenderingPriorPages(true);
    (async () => {
      try {
        const binaryString = window.atob(priorVaultDoc.pdfBase64!);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const pages = await convertPdfToPageImages(bytes.buffer, 1.25);
        if (!cancelled) {
          setPriorRenderedPages(pages);
        }
      } catch {
        if (!cancelled) setPriorRenderedPages([]);
      } finally {
        if (!cancelled) setIsRenderingPriorPages(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, priorVaultDoc?.fileId, priorVaultDoc?.pdfBase64, priorVaultDoc?.status]);

  if (!isOpen) return null;

  const selectedPriorDoc = priorDocCandidates.find(
    (d) => String(d.id) === selectedPriorDocId
  );

  const priorIndex = priorVaultDoc?.index || null;
  const priorTotalPages = priorIndex?.pageCount || priorRenderedPages.length || 0;
  const safePriorPage =
    priorTotalPages > 0 ? Math.min(Math.max(1, priorPageNumber), priorTotalPages) : 1;
  const activePriorPageRecord =
    priorIndex?.pages?.find((p) => p.pdfPageNumber === safePriorPage) ||
    priorIndex?.pages?.[safePriorPage - 1] ||
    null;
  const activePriorPageImage = priorRenderedPages[safePriorPage - 1] || null;

  const priorSearchHits = priorIndex?.pages
    ? priorIndex.pages.filter((p) => {
        const q = priorSearchQuery.trim().toLowerCase();
        if (q.length < 2) return false;
        return p.extractedText.toLowerCase().includes(q);
      })
    : [];

  const persistDraftComparison = (
    nextWording: string,
    nextSource: string,
    nextNotes: string
  ) => {
    if (!onSaveComparison) return;
    onSaveComparison(context.scopeLabel || context.chapterId, {
      priorDocId: numericPriorFileId || null,
      priorPageRef: nextSource,
      priorWording: nextWording,
      comparisonNotes: nextNotes,
      changeDisposition: "undetermined",
    });
  };

  return (
    <div
      role="region"
      aria-label="Check against previous IEP"
      data-testid="intel-prior-iep-drawer"
      className="rounded-xl border border-[#C5A059]/60 bg-gradient-to-b from-[#061531] via-[#030D22] to-[#010716] p-4 shadow-[0_12px_32px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.08)] space-y-4 animate-in fade-in duration-150"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-[#3A2C18]/80 pb-3">
        <div className="flex items-start gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-[#0A1F44] border border-[#C5A059]/50 flex items-center justify-center shrink-0">
            <GitCompare className="h-4 w-4 text-[#DFBE77]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-serif font-bold text-[#FFF4D4]">
                Check Against Prior IEP · {context.chapterLabel}
              </h4>
              <Badge className="bg-[#091D3E] text-[#FFE394] border border-[#3E68A8]/50 text-[10px] font-mono">
                Targeted Scope: {comparisonScope}
              </Badge>
            </div>
            <p className="text-[11px] text-[#A69371] mt-0.5">
              Inspect a specific section, accommodation, or goal in a prior IEP without losing your place in the current document.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid="prior-iep-close-return-btn"
          onClick={onClose}
          className="h-7 px-2 text-xs text-[#C6B697] hover:text-[#FFF4D4] hover:bg-white/5 cursor-pointer gap-1 shrink-0"
          title="Close comparison and return to current reading position"
        >
          <span>Close & Return</span>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Unmistakable Current IEP vs Prior IEP Identity Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div
          data-testid="drawer-current-iep-identity"
          className="rounded-lg bg-[#04142E] border border-[#C5A059]/50 px-3 py-2 flex items-center justify-between gap-2"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Badge className="bg-[#DFBE77] text-[#07162B] font-bold text-[9.5px] px-1.5 py-0">
                CURRENT IEP
              </Badge>
              <span className="text-xs font-serif font-bold text-[#FFF4D4] truncate">
                {selectedCurrentDoc?.fileName || "No Current IEP Selected"}
              </span>
            </div>
            <div className="text-[10px] text-[#FFE394]/90 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>
                <Calendar className="h-2.5 w-2.5 inline mr-1" />
                IEP Date: <strong>{currentDocIepDate || selectedCurrentDoc?.documentDate || "Not detected"}</strong>
              </span>
              {selectedCurrentDoc?.uploadedAt && (
                <span className="text-[#8EA6C9]">
                  · Uploaded: {formatShortDate(selectedCurrentDoc.uploadedAt)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div
          data-testid="drawer-prior-iep-identity"
          className="rounded-lg bg-[#020A1A] border border-[#3E68A8]/60 px-3 py-2 flex items-center justify-between gap-2"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Badge className="bg-[#102A52] text-[#B8D4FF] border border-[#3E68A8]/60 font-bold text-[9.5px] px-1.5 py-0">
                PRIOR IEP
              </Badge>
              <span className="text-xs font-serif font-bold text-[#FFF4D4] truncate">
                {selectedPriorDoc?.fileName || "Select Prior IEP Below"}
              </span>
            </div>
            <div className="text-[10px] text-[#B8D4FF]/90 mt-0.5 flex items-center gap-2 flex-wrap">
              {priorVaultDoc ? (
                <>
                  <span>
                    <Calendar className="h-2.5 w-2.5 inline mr-1" />
                    IEP Date:{" "}
                    <strong>
                      {priorVaultDoc.iepDocumentDate ||
                        selectedPriorDoc?.documentDate ||
                        "Not detected"}
                    </strong>
                  </span>
                  {priorVaultDoc.uploadedAt && (
                    <span className="text-[#8EA6C9]">
                      · Uploaded: {formatShortDate(priorVaultDoc.uploadedAt)}
                    </span>
                  )}
                  {priorTotalPages > 0 && (
                    <span className="font-mono text-[#FFE394]">
                      · {priorTotalPages} pages indexed
                    </span>
                  )}
                </>
              ) : (
                <span className="text-[#8EA6C9]">Choose a prior IEP from student vault</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Selectors Row: Prior Document Selector + Comparison Scope */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label
            htmlFor="intel-prior-iep-select"
            className="text-[11px] font-semibold text-[#D8C7A5] flex items-center gap-1.5"
          >
            <FileText className="h-3 w-3 text-[#DFBE77]" />
            <span>Prior IEP Document (Student Vault)</span>
          </label>
          <select
            id="intel-prior-iep-select"
            data-testid="intel-prior-iep-select"
            value={selectedPriorDocId}
            onChange={(e) => setSelectedPriorDocId(e.target.value)}
            className="w-full h-8 rounded-lg bg-[#000820] border border-[#3A2C18] px-2.5 text-xs text-[#FFF4D4] focus:outline-none focus:border-[#C5A059]"
          >
            <option value="">
              {priorDocCandidates.length > 0
                ? "Select a previous IEP from Vault..."
                : "Select a previous IEP (No prior IEP in Vault yet)"}
            </option>
            {priorDocCandidates.map((doc) => (
              <option key={doc.id} value={String(doc.id)}>
                {doc.fileName} ({doc.documentType}
                {doc.documentDate ? ` · IEP Date: ${doc.documentDate}` : ""})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="intel-comparison-scope"
            className="text-[11px] font-semibold text-[#D8C7A5] flex items-center gap-1.5"
          >
            <Clock className="h-3 w-3 text-[#DFBE77]" />
            <span>Selected Comparison Scope</span>
          </label>
          <select
            id="intel-comparison-scope"
            value={comparisonScope}
            onChange={(e) => setComparisonScope(e.target.value)}
            className="w-full h-8 rounded-lg bg-[#000820] border border-[#3A2C18] px-2.5 text-xs text-[#FFF4D4] focus:outline-none focus:border-[#C5A059]"
          >
            {!SCOPE_OPTIONS.includes(comparisonScope) && (
              <option value={comparisonScope}>{comparisonScope}</option>
            )}
            {SCOPE_OPTIONS.map((scope) => (
              <option key={scope} value={scope}>
                {scope}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Connected Prior Document Page & Text Inspector */}
      {numericPriorFileId > 0 && (
        <div
          data-testid="prior-iep-inspector-surface"
          className="rounded-xl bg-[#000617] border border-[#3A2C18] p-3 space-y-2.5"
        >
          {isLoadingPriorDoc ? (
            <div className="py-6 flex items-center justify-center gap-2 text-xs text-[#FFE394]">
              <Loader2 className="h-4 w-4 animate-spin text-[#DFBE77]" />
              <span>Loading and indexing Prior IEP pages from Student Vault...</span>
            </div>
          ) : priorVaultDoc?.status === "ready" && priorIndex ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#3A2C18]/70 pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 text-[10px]">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Prior IEP Indexed ({priorIndex.readablePageCount}/{priorIndex.pageCount} pages)
                  </Badge>
                  <div className="relative w-52 sm:w-64">
                    <Search className="h-3 w-3 text-[#C5A059] absolute left-2 top-1/2 -translate-y-1/2" />
                    <Input
                      value={priorSearchQuery}
                      onChange={(e) => setPriorSearchQuery(e.target.value)}
                      placeholder="Search prior IEP pages..."
                      data-testid="prior-iep-search-input"
                      className="h-6 pl-6 pr-2 text-[11px] bg-[#020B21] border-[#3A2C18] text-[#FFF4D4]"
                    />
                  </div>
                </div>

                {/* Prior Page Navigation + Capture Button */}
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center rounded bg-[#020B21] border border-[#3A2C18] px-1.5 py-0.5 text-[11px]">
                    <button
                      type="button"
                      disabled={safePriorPage <= 1}
                      onClick={() => setPriorPageNumber((p) => Math.max(1, p - 1))}
                      className="p-0.5 text-[#C6B697] hover:text-[#FFF4D4] disabled:opacity-35 cursor-pointer"
                      aria-label="Previous prior IEP page"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <span
                      data-testid="prior-iep-page-indicator"
                      className="px-2 font-mono text-[10.5px] text-[#FFF4D4]"
                    >
                      Prior Page <strong className="text-[#FFE394]">{safePriorPage}</strong> of{" "}
                      {priorTotalPages}
                    </span>
                    <button
                      type="button"
                      disabled={safePriorPage >= priorTotalPages}
                      onClick={() =>
                        setPriorPageNumber((p) => Math.min(priorTotalPages, p + 1))
                      }
                      className="p-0.5 text-[#C6B697] hover:text-[#FFF4D4] disabled:opacity-35 cursor-pointer"
                      aria-label="Next prior IEP page"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    data-testid="record-prior-page-btn"
                    onClick={() => {
                      const excerpt =
                        activePriorPageRecord?.extractedText
                          ?.split("\n")
                          .slice(0, 6)
                          .join("\n")
                          .trim() || "";
                      const refStr = `${priorVaultDoc.fileName} · PDF p. ${safePriorPage}${
                        activePriorPageRecord?.printedPageLabel
                          ? ` (${activePriorPageRecord.printedPageLabel})`
                          : ""
                      }`;
                      setPreviousWording(excerpt);
                      setPreviousSource(refStr);
                      persistDraftComparison(excerpt, refStr, comparisonNotes);
                    }}
                    className="h-6 px-2.5 text-[10.5px] font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] cursor-pointer"
                  >
                    Record Prior Page {safePriorPage} in Drawer
                  </Button>
                </div>
              </div>

              {/* Search matching pages quick jump */}
              {priorSearchQuery.trim().length >= 2 && (
                <div className="flex items-center gap-1.5 flex-wrap text-[10.5px]">
                  <span className="text-[#A69371]">Prior matches:</span>
                  {priorSearchHits.length === 0 ? (
                    <span className="text-[#8EA6C9]">No pages match &ldquo;{priorSearchQuery}&rdquo;</span>
                  ) : (
                    priorSearchHits.map((hitPage) => (
                      <button
                        key={`prior-hit-${hitPage.pdfPageNumber}`}
                        type="button"
                        onClick={() => setPriorPageNumber(hitPage.pdfPageNumber)}
                        className="px-2 py-0.5 rounded bg-[#0B2246] border border-[#3E68A8] text-[#FFE394] hover:bg-[#133263] font-mono cursor-pointer"
                      >
                        Prior p. {hitPage.pdfPageNumber}
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Split miniature preview of Prior PDF Page + Extracted Text */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto">
                {activePriorPageImage && (
                  <div className="rounded border border-[#3A2C18] bg-white overflow-hidden">
                    <img
                      src={activePriorPageImage.dataUrl}
                      alt={`Prior IEP page ${safePriorPage}`}
                      className="w-full h-auto block"
                    />
                  </div>
                )}
                <div className="rounded border border-[#3A2C18]/70 bg-[#020A1C] p-2.5 overflow-y-auto">
                  <div className="text-[10px] font-mono uppercase text-[#8EA6C9] mb-1">
                    Prior IEP Extracted Text · Page {safePriorPage}
                  </div>
                  <pre className="text-[10.5px] font-mono text-[#D8C7A5] whitespace-pre-wrap leading-relaxed">
                    {activePriorPageRecord?.extractedText ||
                      "No readable text extracted on this prior page."}
                  </pre>
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs text-amber-200 py-2">
              {priorVaultDoc?.message || "Unable to load selected prior IEP document."}
            </div>
          )}
        </div>
      )}

      {/* Honest Guardrail Notice: No Automated Change Claims in Phase 2A */}
      <div className="rounded-lg bg-[#000820]/90 border border-[#243E6B]/60 px-3 py-2 flex items-start gap-2 text-[11px] text-[#B0C7E8]">
        <Info className="h-3.5 w-3.5 text-[#DFBE77] shrink-0 mt-0.5" />
        <div>
          <span>
            <strong>Evidence Integrity Guardrail:</strong> The Intel Unit does not automatically claim that a support or goal was removed, reduced, or changed without advocate verification. Inspect the prior IEP above and record exact prior wording and page references below.
          </span>
        </div>
      </div>

      {/* Current vs Previous Wording Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Current IEP Wording & Source */}
        <div className="rounded-xl bg-[#000820] border border-[#3A2C18] p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-serif font-bold uppercase tracking-wider text-[#FFE394]">
              Current IEP Wording ({selectedCurrentDoc?.fileName || "Current"})
            </span>
            {currentSource && (
              <button
                type="button"
                onClick={() =>
                  onFocusPassage({
                    chapterLabel: context.chapterLabel,
                    pageLabel: currentSource,
                    quote: currentWording || undefined,
                    sectionRef: comparisonScope,
                  })
                }
                className="inline-flex items-center gap-1 text-[10px] font-mono text-[#DFBE77] hover:text-[#FFE394] cursor-pointer"
                title="Focus this reference in the Source Document Viewer"
              >
                <span>{currentSource}</span>
                <ArrowUpRight className="h-3 w-3" />
              </button>
            )}
          </div>

          <Textarea
            value={currentWording}
            onChange={(e) => setCurrentWording(e.target.value)}
            rows={3}
            placeholder="No current IEP wording loaded for this scope yet. Enter or select a passage..."
            className="text-xs bg-[#020B21] border-[#263B5E] text-[#FFF4D4] placeholder:text-[#8EA6C9]/50"
          />

          <div className="flex items-center gap-2">
            <Bookmark className="h-3 w-3 text-[#C5A059] shrink-0" />
            <Input
              value={currentSource}
              onChange={(e) => setCurrentSource(e.target.value)}
              placeholder="Current IEP source reference (e.g., PDF p. 4)"
              className="h-7 text-[11px] bg-[#020B21] border-[#263B5E] text-[#D8C7A5] placeholder:text-[#8EA6C9]/50"
            />
          </div>
        </div>

        {/* Previous IEP Wording & Source */}
        <div className="rounded-xl bg-[#000820] border border-[#3A2C18] p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-serif font-bold uppercase tracking-wider text-[#C6B697]">
              Prior IEP Wording ({selectedPriorDoc?.fileName || "Prior Version"})
            </span>
            <span className="text-[10px] font-mono text-[#8EA6C9]">
              {priorVaultDoc?.iepDocumentDate ||
                selectedPriorDoc?.documentDate ||
                "Prior Version"}
            </span>
          </div>

          <Textarea
            value={previousWording}
            data-testid="prior-iep-wording-textarea"
            onChange={(e) => {
              const val = e.target.value;
              setPreviousWording(val);
              persistDraftComparison(val, previousSource, comparisonNotes);
            }}
            rows={3}
            placeholder="Select a page above and click 'Record Prior Page in Drawer', or paste prior IEP wording here..."
            className="text-xs bg-[#020B21] border-[#263B5E] text-[#FFF4D4] placeholder:text-[#8EA6C9]/50"
          />

          <div className="flex items-center gap-2">
            <Bookmark className="h-3 w-3 text-[#8EA6C9] shrink-0" />
            <Input
              value={previousSource}
              data-testid="prior-iep-source-input"
              onChange={(e) => {
                const val = e.target.value;
                setPreviousSource(val);
                persistDraftComparison(previousWording, val, comparisonNotes);
              }}
              placeholder="Prior IEP source reference (e.g., Previous IEP.pdf · PDF p. 4)"
              className="h-7 text-[11px] bg-[#020B21] border-[#263B5E] text-[#D8C7A5] placeholder:text-[#8EA6C9]/50"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[10.5px] text-[#8EA6C9]">
          Your reading position in the Current IEP viewer is preserved and restored on close.
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid="prior-iep-done-btn"
          onClick={onClose}
          className="h-7 px-3 text-xs border-[#3A2C18] bg-[#020A1E] text-[#FFF4D4] hover:border-[#C5A059] cursor-pointer"
        >
          Done Comparing
        </Button>
      </div>
    </div>
  );
}

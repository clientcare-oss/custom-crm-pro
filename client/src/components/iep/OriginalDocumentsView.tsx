import React, { useState, useMemo, useCallback } from "react";
import {
  Pencil,
  MinusCircle,
  Plus,
  Type,
  ChevronRight,
  ChevronLeft,
  Flag,
  StickyNote,
  Layers,
  Check,
  Link2,
  FileText,
  Sparkles,
  Mail,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ComparisonItem, IEP_VERSION_OPTIONS } from "./types";
import { EmbeddedPdfDocumentPane } from "./EmbeddedPdfDocumentPane";

interface OriginalDocumentsViewProps {
  items: ComparisonItem[];
  selectedItemId: string | null;
  onSelectItem: (id: string) => void;
  oldVersionId: string;
  newVersionId: string;
  oldFileName?: string;
  newFileName?: string;
  oldPdfBytes: Uint8Array | null;
  newPdfBytes: Uint8Array | null;
  oldPdfUrl?: string | null;
  newPdfUrl?: string | null;
  isLoadingPdfs: boolean;
  pdfError: string | null;
  leftPage: number;
  onLeftPageChange: (page: number) => void;
  rightPage: number;
  onRightPageChange: (page: number) => void;
  leftZoom: number;
  onLeftZoomChange: (zoom: number) => void;
  rightZoom: number;
  onRightZoomChange: (zoom: number) => void;
  leftFitWidth: boolean;
  onLeftFitWidthChange: (fit: boolean) => void;
  rightFitWidth: boolean;
  onRightFitWidthChange: (fit: boolean) => void;
  onToggleStar: (id: string) => void;
  onToggleReviewed: (id: string) => void;
  onOpenNoteDrawer: (id: string) => void;
  onSendToBlueprint: (item: ComparisonItem) => void;
  onToggleLinkMinutes: (id: string) => void;
  onOpenCorrectionEmailModal: () => void;
  advocateMode?: boolean;
}

function getShortDeltaTokens(item: ComparisonItem): { prevToken: string; nextToken: string } {
  switch (item.id) {
    case "comp-1":
      return { prevToken: "70%", nextToken: "80%" };
    case "comp-2":
      return { prevToken: "30 min/wk", nextToken: "0 min/wk (Consult)" };
    case "comp-3":
      return { prevToken: "100% Double Time", nextToken: "50% Extended Time" };
    case "comp-4":
      return { prevToken: "Not in Previous", nextToken: "5-min Breaks" };
    case "comp-5":
      return { prevToken: "Standard Prompt", nextToken: "Graphic Organizer" };
    case "comp-6":
      return { prevToken: "Small Bus + Monitor", nextToken: "Standard Bus Route" };
    case "comp-7":
      return { prevToken: "80% Gen Ed", nextToken: "72% Gen Ed" };
    default:
      return {
        prevToken: item.oldHighlightToken || "Baseline",
        nextToken: item.newHighlightToken || "Proposed",
      };
  }
}

export function OriginalDocumentsView({
  items,
  selectedItemId,
  onSelectItem,
  oldVersionId,
  newVersionId,
  oldFileName,
  newFileName,
  oldPdfBytes,
  newPdfBytes,
  oldPdfUrl,
  newPdfUrl,
  isLoadingPdfs,
  pdfError,
  leftPage,
  onLeftPageChange,
  rightPage,
  onRightPageChange,
  leftZoom,
  onLeftZoomChange,
  rightZoom,
  onRightZoomChange,
  leftFitWidth,
  onLeftFitWidthChange,
  rightFitWidth,
  onRightFitWidthChange,
  onToggleStar,
  onToggleReviewed,
  onOpenNoteDrawer,
  onSendToBlueprint,
  onToggleLinkMinutes,
  onOpenCorrectionEmailModal,
  advocateMode = false,
}: OriginalDocumentsViewProps) {
  const [queueFilter, setQueueFilter] = useState<"all" | "attention">("all");
  const [showAllQueue, setShowAllQueue] = useState<boolean>(false);
  const [linkedScrolling, setLinkedScrolling] = useState<boolean>(true);
  const [leftExternalScroll, setLeftExternalScroll] = useState<number | null>(null);
  const [rightExternalScroll, setRightExternalScroll] = useState<number | null>(null);
  const [expandedPane, setExpandedPane] = useState<"none" | "previous" | "updated">("none");
  const [mobileActiveDoc, setMobileActiveDoc] = useState<"previous" | "updated">("previous");
  const [showPhraseSticky, setShowPhraseSticky] = useState<boolean>(false);
  const [meetingDrawerOpen, setMeetingDrawerOpen] = useState<boolean>(false);

  const oldVer =
    IEP_VERSION_OPTIONS.find((v) => v.id === oldVersionId) || IEP_VERSION_OPTIONS[1];
  const newVer =
    IEP_VERSION_OPTIONS.find((v) => v.id === newVersionId) || IEP_VERSION_OPTIONS[0];

  const needAttentionCount = useMemo(
    () =>
      items.filter(
        (i) =>
          i.severity === "high_attention" ||
          i.status === "removed" ||
          i.isStarred
      ).length,
    [items]
  );

  const reviewedCount = useMemo(
    () => items.filter((i) => i.isReviewed).length,
    [items]
  );

  const filteredQueue = useMemo(() => {
    if (queueFilter === "attention") {
      return items.filter(
        (i) =>
          i.severity === "high_attention" ||
          i.status === "removed" ||
          i.isStarred
      );
    }
    return items;
  }, [items, queueFilter]);

  const activeItem = useMemo(() => {
    if (selectedItemId) {
      const found = items.find((i) => i.id === selectedItemId);
      if (found) return found;
    }
    return filteredQueue[0] || items[0] || null;
  }, [items, selectedItemId, filteredQueue]);

  const activeIndex = activeItem
    ? items.findIndex((i) => i.id === activeItem.id) + 1
    : 1;

  // Compact 4-item list unless "View all 7 ->" is toggled (always keeping activeItem visible if beyond 4)
  const displayedQueue = useMemo(() => {
    if (showAllQueue || filteredQueue.length <= 4) return filteredQueue;
    const topFour = filteredQueue.slice(0, 4);
    if (activeItem && !topFour.some((i) => i.id === activeItem.id)) {
      return [...filteredQueue.slice(0, 3), activeItem];
    }
    return topFour;
  }, [filteredQueue, showAllQueue, activeItem]);

  const getRowIcon = (item: ComparisonItem) => {
    switch (item.status) {
      case "removed":
        return <MinusCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
      case "added":
        return <Plus className="w-3.5 h-3.5 text-[#C8D2EC] shrink-0" />;
      case "reworded":
        return <Type className="w-3.5 h-3.5 text-[#B4BFF5] shrink-0" />;
      default:
        return <Pencil className="w-3.5 h-3.5 text-[#DFBE77] shrink-0" />;
    }
  };

  const getStatusBadge = (status: ComparisonItem["status"]) => {
    switch (status) {
      case "removed":
        return {
          label: "Removed",
          cls: "bg-[#3A1926] border-rose-500/40 text-rose-300",
        };
      case "added":
        return {
          label: "Added",
          cls: "bg-[#12352A] border-emerald-500/40 text-emerald-300",
        };
      case "reworded":
        return {
          label: "Reworded",
          cls: "bg-[#1B2448] border-indigo-400/40 text-indigo-200",
        };
      default:
        return {
          label: "Modified",
          cls: "bg-[#332918] border-[#C5A059]/60 text-[#FFE394]",
        };
    }
  };

  const handleSelectPrevChange = () => {
    if (!activeItem) return;
    const idx = filteredQueue.findIndex((i) => i.id === activeItem.id);
    if (idx > 0) {
      onSelectItem(filteredQueue[idx - 1].id);
    } else if (filteredQueue.length > 0) {
      onSelectItem(filteredQueue[filteredQueue.length - 1].id);
    }
  };

  const handleSelectNextChange = () => {
    if (!activeItem) return;
    const idx = filteredQueue.findIndex((i) => i.id === activeItem.id);
    if (idx >= 0 && idx + 1 < filteredQueue.length) {
      onSelectItem(filteredQueue[idx + 1].id);
    } else if (filteredQueue.length > 0) {
      onSelectItem(filteredQueue[0].id);
    }
  };

  const handleMarkReviewedAndAdvance = () => {
    if (!activeItem) return;
    if (!activeItem.isReviewed) {
      onToggleReviewed(activeItem.id);
    }
    const currentIdx = filteredQueue.findIndex((i) => i.id === activeItem.id);
    if (currentIdx >= 0 && currentIdx + 1 < filteredQueue.length) {
      onSelectItem(filteredQueue[currentIdx + 1].id);
    }
  };

  const handleLeftUserScroll = useCallback(
    (ratio: number) => {
      if (linkedScrolling) {
        setRightExternalScroll(ratio);
      }
    },
    [linkedScrolling]
  );

  const handleRightUserScroll = useCallback(
    (ratio: number) => {
      if (linkedScrolling) {
        setLeftExternalScroll(ratio);
      }
    },
    [linkedScrolling]
  );

  if (!activeItem) return null;

  const activeBadge = getStatusBadge(activeItem.status);
  const { prevToken, nextToken } = getShortDeltaTokens(activeItem);

  return (
    <div className="flex flex-col gap-2.5 w-full min-w-0 text-left">
      {/* ===================================================================== */}
      {/* TOP CONSOLE SPLIT CARD (Matches Picture: 7 changes Left | Detail Right) */}
      {/* ===================================================================== */}
      <div
        className="rounded-xl border border-[#223052] shadow-[0_16px_42px_rgba(0,0,0,0.85)] overflow-hidden grid grid-cols-1 lg:grid-cols-12"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,20,44,0.96) 0%, rgba(6,13,30,0.98) 100%)",
        }}
      >
        {/* ── LEFT COLUMN (4 Cols): COMPACT "7 changes" QUEUE ── */}
        <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-[#1B2848] p-3.5 sm:p-4 flex flex-col justify-between bg-[#070F22]/90">
          <div>
            {/* Header Row: "7 changes" + [ All | Needs attention 3 ] */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                className="text-xl font-bold text-[#FBF6EC] tracking-tight"
              >
                {items.length} changes
              </h2>

              <div className="inline-flex items-center p-0.5 rounded-lg bg-[#0B1630] border border-[#25355A]">
                <button
                  type="button"
                  onClick={() => setQueueFilter("all")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    queueFilter === "all"
                      ? "bg-gradient-to-b from-[#E5C887] via-[#C69F56] to-[#9E7936] text-[#07162B] shadow-sm"
                      : "text-[#A8B4D0] hover:text-white"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setQueueFilter("attention")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    queueFilter === "attention"
                      ? "bg-gradient-to-b from-[#E5C887] via-[#C69F56] to-[#9E7936] text-[#07162B] font-bold shadow-sm"
                      : "text-[#C8D2EC] hover:text-white"
                  }`}
                >
                  <span>Needs attention</span>
                  <span
                    className={`font-bold ${
                      queueFilter === "attention" ? "text-[#07162B]" : "text-[#FFE394]"
                    }`}
                  >
                    {needAttentionCount}
                  </span>
                </button>
              </div>
            </div>

            {/* Compact Rows */}
            <div className="divide-y divide-[#15203B]">
              {displayedQueue.map((item) => {
                const isSelected = item.id === activeItem.id;
                const badge = getStatusBadge(item.status);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectItem(item.id)}
                    className={`w-full px-3 py-2 flex items-center justify-between gap-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? "rounded-lg bg-gradient-to-r from-[#2B2419] via-[#222028] to-[#171C34] border border-[#C5A059]/65 text-white shadow-[0_4px_14px_rgba(0,0,0,0.5)]"
                        : "hover:bg-white/[0.03] text-[#D8E0F2]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {getRowIcon(item)}
                      <span
                        className={`text-[13px] truncate ${
                          isSelected ? "font-semibold text-[#FFF4D4]" : "font-medium"
                        }`}
                      >
                        {item.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {(isSelected || item.status === "removed") && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      )}
                      <ChevronRight
                        className={`w-3.5 h-3.5 ${
                          isSelected ? "text-[#FFE394]" : "text-[#6D7B9B]"
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom "View all 7 ->" toggle */}
          <div className="pt-2.5 mt-1 border-t border-[#15203B] flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowAllQueue((prev) => !prev)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#DFBE77] hover:text-[#FFE394] transition-colors cursor-pointer"
            >
              <span>
                {showAllQueue
                  ? "Show compact list"
                  : `View all ${filteredQueue.length} →`}
              </span>
            </button>

            <span className="text-[10.5px] text-[#7C8AA8] font-mono">
              Pg {activeItem.previousPage || 9} → Pg {activeItem.newPage || 8}
            </span>
          </div>
        </div>

        {/* ── RIGHT COLUMN (8 Cols): ACTIVE FINDING HERO & TOKEN DELTA ── */}
        <div className="lg:col-span-8 p-4 sm:p-5 flex flex-col justify-between gap-3.5">
          {/* Top Overline Row: CHANGE 01 OF 07 · ANNUAL GOALS ... 2 of 7 reviewed [progress] */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9AA6C4]">
              CHANGE {String(activeIndex).padStart(2, "0")} OF{" "}
              {String(items.length).padStart(2, "0")} · {activeItem.categoryLabel}
            </div>

            <div className="flex items-center gap-2.5">
              <span
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                className="text-xs italic text-[#C8D2EC]"
              >
                {reviewedCount} of {items.length} reviewed
              </span>
              <div className="w-28 h-2 rounded-full bg-[#17223D] overflow-hidden border border-[#25355A]/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#FFE394] via-[#DFBE77] to-[#B68E40] transition-all duration-300"
                  style={{
                    width: `${(reviewedCount / Math.max(1, items.length)) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Main Title + Status Pill + Short Plain-Language Explanation */}
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h3
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                className="text-2xl sm:text-[31px] font-bold text-[#FBF6EC] tracking-tight leading-none"
              >
                {activeItem.title}
              </h3>

              <span
                className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${activeBadge.cls}`}
              >
                {activeBadge.label}
              </span>
            </div>

            <p
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              className="text-[15.5px] italic text-[#DCE4F5] mt-1.5"
            >
              {activeItem.shortSummary || activeItem.explanation}
            </p>
          </div>

          {/* Center Previous -> Proposed Token Delta Comparison Pills (Matches Picture) */}
          <div className="py-1 flex flex-wrap items-center justify-start sm:justify-center gap-4 sm:gap-6">
            {/* Previous Value Pill */}
            <div className="min-w-[170px] px-5 py-2 rounded-lg bg-[#0D162E] border border-[#2C3B5E] inline-flex items-center justify-center gap-3 shadow-inner">
              <span className="text-xs text-[#9AA6C4] font-medium">Previous</span>
              <span className="text-lg font-bold text-white tracking-tight">
                {prevToken}
              </span>
            </div>

            {/* Horizontal Arrow */}
            <div className="flex items-center text-[#7E8CA8]" aria-hidden="true">
              <div className="w-10 sm:w-14 h-[1.5px] bg-[#5E6E91]" />
              <ChevronRight className="w-4 h-4 -ml-2 text-[#8E9BB8]" />
            </div>

            {/* Proposed Value Pill */}
            <div className="min-w-[170px] px-5 py-2 rounded-lg bg-[#1F1B4A] border border-[#6C5CE7]/75 shadow-[0_0_24px_rgba(108,92,231,0.28)] inline-flex items-center justify-center gap-3">
              <span className="text-xs text-[#C4B5FD] font-medium">Proposed</span>
              <span className="text-lg font-bold text-white tracking-tight">
                {nextToken}
              </span>
            </div>
          </div>

          {/* Optional Expandable Dog-Eared Phrase Sticky Note when toggled */}
          {showPhraseSticky && (
            <div className="pt-2 border-t border-[#1A2644] space-y-2 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative rounded-xl bg-[#0B1428] border border-[#233154] p-3 overflow-hidden">
                  <div
                    className="pointer-events-none absolute top-0 right-0 w-4 h-4 bg-[#1C2947] border-b border-l border-[#344670]"
                    style={{ clipPath: "polygon(0 0, 0 100%, 100% 100%)" }}
                  />
                  <div className="text-[11px] font-bold text-[#E6EBF8] mb-1">
                    Previous language ({oldVer.date})
                  </div>
                  <p className="text-xs text-[#F1F4FC] leading-relaxed">
                    {activeItem.previousValue || "Not present in previous IEP."}
                  </p>
                </div>

                <div className="relative rounded-xl bg-[#0B1428] border border-[#2F3D6B] p-3 overflow-hidden">
                  <div
                    className="pointer-events-none absolute top-0 right-0 w-4 h-4 bg-[#243258] border-b border-l border-[#45588A]"
                    style={{ clipPath: "polygon(0 0, 0 100%, 100% 100%)" }}
                  />
                  <div className="text-[11px] font-bold text-white mb-1">
                    Proposed language ({newVer.date})
                  </div>
                  <p className="text-xs text-white leading-relaxed">
                    {activeItem.newValue || "Removed in proposed IEP."}
                  </p>
                </div>
              </div>
              <div className="rounded-lg bg-[#0A1326] border border-[#29385C] px-3 py-2 flex items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-bold text-[#E5B85B] mr-2">Review note:</span>
                  <span className="text-[#EEF2FC]">
                    {activeItem.userNote ||
                      activeItem.reviewNote ||
                      activeItem.suggestedQuestion}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenNoteDrawer(activeItem.id)}
                  className="text-[11px] font-semibold text-[#FFE394] underline cursor-pointer shrink-0"
                >
                  Edit
                </button>
              </div>
            </div>
          )}

          {/* Bottom Action Row: Flag | Add note | Send to Blueprint | [ ✓ Mark reviewed ] */}
          <div className="pt-2.5 border-t border-[#18233E] flex flex-wrap items-center justify-between gap-3">
            {/* Left subtle helper: Phrase sticky note quick toggle */}
            <button
              type="button"
              onClick={() => setShowPhraseSticky((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-[11px] text-[#9AA6C4] hover:text-[#FFE394] transition-colors cursor-pointer"
            >
              <StickyNote className="w-3.5 h-3.5 text-[#DFBE77]" />
              <span>{showPhraseSticky ? "Hide phrase sticky note" : "Phrase sticky note"}</span>
            </button>

            {/* Right Primary Actions (Matches Picture) */}
            <div className="flex flex-wrap items-center gap-4 ml-auto">
              <button
                type="button"
                onClick={() => onToggleStar(activeItem.id)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  activeItem.isStarred
                    ? "text-[#FFE394] font-semibold"
                    : "text-[#C8D2EC] hover:text-white"
                }`}
              >
                <Flag
                  className={`w-3.5 h-3.5 ${
                    activeItem.isStarred ? "fill-[#FFE394] text-[#FFE394]" : ""
                  }`}
                />
                <span>{activeItem.isStarred ? "Flagged" : "Flag"}</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenNoteDrawer(activeItem.id)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  activeItem.userNote
                    ? "text-[#FFE394] font-semibold"
                    : "text-[#C8D2EC] hover:text-white"
                }`}
              >
                <StickyNote className="w-3.5 h-3.5" />
                <span>{activeItem.userNote ? "Edit note" : "Add note"}</span>
              </button>

              <button
                type="button"
                onClick={() => onSendToBlueprint(activeItem)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  activeItem.sentToBlueprint
                    ? "text-emerald-300 font-semibold"
                    : "text-[#C8D2EC] hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>
                  {activeItem.sentToBlueprint ? "In Blueprint" : "Send to Blueprint"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleMarkReviewedAndAdvance}
                title="Marks this finding as reviewed (distinct from agreeing to the IEP change)"
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeItem.isReviewed
                    ? "bg-emerald-500/20 border border-emerald-500/45 text-emerald-300"
                    : "bg-gradient-to-b from-[#E5C887] via-[#C69F56] to-[#987230] text-[#07162B] border border-[#FFE394]/75 shadow-[0_4px_14px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.5)] hover:brightness-105"
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{activeItem.isReviewed ? "Reviewed" : "Mark reviewed"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MIDDLE BAR: < Previous change  |  🔗 Linked scrolling  |  Next change > */}
      {/* ===================================================================== */}
      <div className="flex items-center justify-between gap-3 px-0.5 py-0.5">
        <button
          type="button"
          onClick={handleSelectPrevChange}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#091328] hover:bg-[#112040] border border-[#223258] text-xs font-medium text-[#C8D2EC] hover:text-white transition-all cursor-pointer shadow-sm"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-[#8E9BB8]" />
          <span>Previous change</span>
        </button>

        {/* Center Linked Scrolling Toggle */}
        <div className="inline-flex items-center gap-2.5">
          <Link2 className="w-3.5 h-3.5 text-[#DFBE77]" />
          <span className="text-xs font-medium text-[#DCE4F5]">Linked scrolling</span>
          <button
            type="button"
            role="switch"
            aria-checked={linkedScrolling}
            onClick={() => setLinkedScrolling((prev) => !prev)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ${
              linkedScrolling
                ? "bg-gradient-to-r from-[#DFBE77] to-[#B68E40] border-[#FFE394]/70"
                : "bg-[#0D1730] border-[#29385C]"
            }`}
            title="Toggle synchronized vertical scrolling between Previous IEP and Proposed IEP"
          >
            <span
              className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full transition duration-200 mt-[2px] ${
                linkedScrolling
                  ? "translate-x-4 bg-[#07162B] shadow-sm"
                  : "translate-x-0.5 bg-[#8E9BB8]"
              }`}
            />
          </button>
        </div>

        <button
          type="button"
          onClick={handleSelectNextChange}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#091328] hover:bg-[#112040] border border-[#223258] text-xs font-medium text-[#C8D2EC] hover:text-white transition-all cursor-pointer shadow-sm"
        >
          <span>Next change</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#8E9BB8]" />
        </button>
      </div>

      {/* RESPONSIVE MOBILE DOCUMENT SWITCHER (Below md) */}
      {expandedPane === "none" && (
        <div className="flex md:hidden items-center justify-between gap-2 p-1 rounded-xl bg-[#071128] border border-[#223258]">
          <button
            type="button"
            onClick={() => setMobileActiveDoc("previous")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              mobileActiveDoc === "previous"
                ? "bg-[#14254B] text-white border border-[#C5A059]/50"
                : "text-[#9AA6C4]"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Previous IEP ({oldVer.date}) · Pg {leftPage}
          </button>
          <button
            type="button"
            onClick={() => setMobileActiveDoc("updated")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              mobileActiveDoc === "updated"
                ? "bg-[#14254B] text-white border border-[#C5A059]/50"
                : "text-[#9AA6C4]"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#C4B5FD]" />
            Proposed IEP ({newVer.date}) · Pg {rightPage}
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TWO SIDE-BY-SIDE ORIGINAL PDF DOCUMENT VIEWERS                        */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-[calc(100vh-305px)] min-h-[680px] w-full min-w-0">
        {/* LEFT VIEWER: PREVIOUS IEP */}
        {expandedPane !== "updated" && (
          <div
            className={`${
              expandedPane === "previous"
                ? "md:col-span-2"
                : mobileActiveDoc === "previous"
                  ? "block"
                  : "hidden md:block"
            } h-full min-h-0 min-w-0`}
          >
            <EmbeddedPdfDocumentPane
              side="previous"
              roleBadge="PREVIOUS IEP"
              dateLabel={oldVer.date}
              fileName={
                oldFileName ||
                `Michael_Sheep_IEP_${oldVer.date.replace(/[\s,]+/g, "_")}.pdf`
              }
              pdfBytes={oldPdfBytes}
              pdfUrl={oldPdfUrl}
              isLoadingDoc={isLoadingPdfs}
              docError={pdfError}
              currentPage={leftPage}
              onPageChange={onLeftPageChange}
              zoom={leftZoom}
              onZoomChange={onLeftZoomChange}
              fitWidth={leftFitWidth}
              onFitWidthChange={onLeftFitWidthChange}
              isExpanded={expandedPane === "previous"}
              onToggleExpand={() =>
                setExpandedPane((prev) =>
                  prev === "previous" ? "none" : "previous"
                )
              }
              findingTargetPage={activeItem.previousPage}
              findingAnchorText={activeItem.previousAnchorText}
              findingHighlightToken={activeItem.oldHighlightToken}
              locationConfidence={activeItem.locationConfidence}
              isAbsentInThisVersion={activeItem.status === "added"}
              absentReasonText={
                activeItem.status === "added"
                  ? "No matching language found in Previous IEP (new addition in Proposed IEP)"
                  : undefined
              }
              sectionLocationLabel={activeItem.previousLocation}
              externalScrollRatio={leftExternalScroll}
              onUserScrollRatio={handleLeftUserScroll}
            />
          </div>
        )}

        {/* RIGHT VIEWER: PROPOSED IEP */}
        {expandedPane !== "previous" && (
          <div
            className={`${
              expandedPane === "updated"
                ? "md:col-span-2"
                : mobileActiveDoc === "updated"
                  ? "block"
                  : "hidden md:block"
            } h-full min-h-0 min-w-0`}
          >
            <EmbeddedPdfDocumentPane
              side="updated"
              roleBadge="PROPOSED IEP"
              dateLabel={newVer.date}
              fileName={
                newFileName ||
                `Michael_Sheep_IEP_${newVer.date.replace(/[\s,]+/g, "_")}.pdf`
              }
              pdfBytes={newPdfBytes}
              pdfUrl={newPdfUrl}
              isLoadingDoc={isLoadingPdfs}
              docError={pdfError}
              currentPage={rightPage}
              onPageChange={onRightPageChange}
              zoom={rightZoom}
              onZoomChange={onRightZoomChange}
              fitWidth={rightFitWidth}
              onFitWidthChange={onRightFitWidthChange}
              isExpanded={expandedPane === "updated"}
              onToggleExpand={() =>
                setExpandedPane((prev) =>
                  prev === "updated" ? "none" : "updated"
                )
              }
              findingTargetPage={activeItem.newPage}
              findingAnchorText={activeItem.newAnchorText}
              findingHighlightToken={activeItem.newHighlightToken}
              locationConfidence={activeItem.locationConfidence}
              isAbsentInThisVersion={activeItem.status === "removed"}
              absentReasonText={
                activeItem.status === "removed"
                  ? "No matching language found in Proposed IEP (direct service removed from matrix)"
                  : undefined
              }
              sectionLocationLabel={activeItem.newLocation}
              externalScrollRatio={rightExternalScroll}
              onUserScrollRatio={handleRightUserScroll}
            />
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* COLLAPSED-BY-DEFAULT MEETING AGREEMENT & WORKFLOW BAR BELOW DOCS      */}
      {/* ===================================================================== */}
      <div className="rounded-xl bg-[#070E22]/90 border border-[#1E2C4F] px-3.5 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setMeetingDrawerOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 text-xs text-[#9AA6C4] hover:text-white transition-colors cursor-pointer"
          >
            <Link2 className="w-3.5 h-3.5 text-[#DFBE77]" />
            <span className="font-semibold text-[#DCE4F5]">Meeting agreement:</span>
            <span
              className={
                activeItem.linkedMinutes ? "text-emerald-300 font-medium" : "text-[#8E9BB8]"
              }
            >
              {activeItem.linkedMinutes
                ? `Linked to ${newVer.date} IEP Meeting Minutes`
                : "Not linked"}
            </span>
            {meetingDrawerOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-[#8E9BB8]" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-[#8E9BB8]" />
            )}
          </button>

          <div className="flex items-center gap-3">
            {advocateMode && activeItem.suggestedQuestion && (
              <span className="hidden xl:inline-flex items-center gap-1.5 text-[11px] text-[#FFE394]">
                <Sparkles className="w-3 h-3 text-[#DFBE77]" />
                Ask: “{activeItem.suggestedQuestion}”
              </span>
            )}
            <button
              type="button"
              onClick={onOpenCorrectionEmailModal}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#DFBE77] hover:text-white transition-colors cursor-pointer"
            >
              <Mail className="w-3 h-3" />
              <span>Include in Parent Correction Email</span>
            </button>
          </div>
        </div>

        {meetingDrawerOpen && (
          <div className="mt-2.5 pt-2.5 border-t border-[#1A2644] flex flex-wrap items-center justify-between gap-3 text-xs text-[#9AA6C4]">
            <p className="max-w-2xl">
              Link <strong className="text-white">{activeItem.title}</strong> to the official
              IEP Team Meeting Minutes or Prior Written Notice (PWN) record.
            </p>
            <button
              type="button"
              onClick={() => onToggleLinkMinutes(activeItem.id)}
              className="px-3 py-1 rounded-lg bg-[#142242] hover:bg-[#1C2F5A] border border-[#344875] text-white font-semibold cursor-pointer"
            >
              {activeItem.linkedMinutes ? "Unlink Meeting Minutes" : "Link Meeting Minutes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useMemo } from "react";
import {
  AlertCircle,
  Pencil,
  Plus,
  Type,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Flag,
  StickyNote,
  Layers,
  ArrowRight,
  Check,
  Mail,
  Link2,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
  Sparkles,
} from "lucide-react";
import { type ComparisonItem, IEP_VERSION_OPTIONS } from "./types";
import { EmbeddedPdfDocumentPane } from "./EmbeddedPdfDocumentPane";

export interface OriginalDocumentsViewProps {
  items: ComparisonItem[];
  selectedItemId: string | null;
  onSelectItem: (id: string) => void;
  oldVersionId: string;
  newVersionId: string;
  oldFileName?: string | null;
  newFileName?: string | null;
  oldPdfBytes: Uint8Array | null;
  newPdfBytes: Uint8Array | null;
  oldPdfUrl?: string | null;
  newPdfUrl?: string | null;
  isLoadingPdfs?: boolean;
  pdfError?: string | null;
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
  isLoadingPdfs = false,
  pdfError = null,
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
  const [isQueueCollapsed, setIsQueueCollapsed] = useState<boolean>(false);
  const [expandedPane, setExpandedPane] = useState<"none" | "previous" | "updated">("none");
  const [mobileActiveDoc, setMobileActiveDoc] = useState<"previous" | "updated">("previous");
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

  const getRowIcon = (item: ComparisonItem) => {
    switch (item.status) {
      case "removed":
        return <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
      case "added":
        return <Plus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case "reworded":
        return <Type className="w-3.5 h-3.5 text-indigo-300 shrink-0" />;
      default:
        return <Pencil className="w-3.5 h-3.5 text-[#E5C158] shrink-0" />;
    }
  };

  const getRowBadge = (status: ComparisonItem["status"]) => {
    switch (status) {
      case "removed":
        return {
          label: "Removed",
          cls: "bg-rose-950/60 border-rose-500/35 text-rose-300",
        };
      case "added":
        return {
          label: "Added",
          cls: "bg-emerald-950/60 border-emerald-500/35 text-emerald-300",
        };
      case "reworded":
        return {
          label: "Reworded",
          cls: "bg-indigo-950/60 border-indigo-400/35 text-indigo-300",
        };
      default:
        return {
          label: "Modified",
          cls: "bg-amber-950/50 border-[#C5A059]/40 text-[#FFE394]",
        };
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

  return (
    <div className="flex flex-col lg:flex-row gap-3 w-full min-w-0">
      {/* LEFT COMPACT COLLAPSIBLE FINDINGS QUEUE */}
      {isQueueCollapsed ? (
        <div className="flex lg:flex-col items-center justify-between lg:justify-start gap-2 px-2 py-2.5 rounded-2xl bg-[#050C24]/95 border border-[#1E2B52] shrink-0">
          <button
            type="button"
            onClick={() => setIsQueueCollapsed(false)}
            className="p-2 rounded-xl bg-[#0D1738] hover:bg-[#172554] border border-[#2C3E75] text-slate-200 transition-all"
            title="Expand findings queue"
            aria-label="Expand findings queue"
          >
            <PanelLeftOpen className="w-4 h-4 text-[#C4B5FD]" />
          </button>
          <div className="flex lg:flex-col items-center gap-1.5">
            <span className="text-[11px] font-bold text-white px-1.5 py-0.5 rounded bg-[#1E1942] border border-[#6C5CE7]/40">
              {items.length}
            </span>
            <span className="text-[10px] text-slate-400 lg:[writing-mode:vertical-rl] lg:rotate-180 tracking-wider uppercase font-semibold">
              Findings Queue ({reviewedCount}/{items.length})
            </span>
          </div>
        </div>
      ) : (
        <aside className="w-full lg:w-[236px] xl:w-[248px] shrink-0 rounded-2xl bg-[#050C24]/95 border border-[#1E2B52] p-3 flex flex-col justify-between shadow-[0_14px_40px_rgba(0,0,0,0.65)]">
          <div>
            {/* Queue Header + Collapse Button */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <h2
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  className="text-xl font-semibold text-white tracking-tight leading-tight"
                >
                  {items.length} changes
                </h2>
                <p className="text-xs font-medium text-[#E5C158] mt-0.5">
                  {needAttentionCount} need attention
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsQueueCollapsed(true)}
                className="p-1.5 rounded-lg bg-[#081029] hover:bg-[#111C42] border border-[#1E2B52] text-slate-400 hover:text-white transition-colors"
                title="Collapse review queue for wider document reading"
                aria-label="Collapse review queue"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            {/* Segmented Filter Pill */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-[#03081A] border border-[#1B264B] mb-3">
              <button
                type="button"
                onClick={() => setQueueFilter("all")}
                className={`py-1.5 px-2.5 rounded-lg text-[11px] font-semibold transition-all ${
                  queueFilter === "all"
                    ? "bg-[#2C255A] text-white shadow-[0_2px_10px_rgba(109,92,231,0.3)] border border-[#6D5CE7]/45"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                All ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setQueueFilter("attention")}
                className={`py-1.5 px-2.5 rounded-lg text-[11px] font-semibold transition-all ${
                  queueFilter === "attention"
                    ? "bg-[#2C255A] text-white shadow-[0_2px_10px_rgba(109,92,231,0.3)] border border-[#6D5CE7]/45"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Needs attention
              </button>
            </div>

            {/* Findings List */}
            <div className="space-y-1 max-h-[240px] lg:max-h-[460px] overflow-y-auto pr-0.5">
              {filteredQueue.map((item) => {
                const isSelected = activeItem?.id === item.id;
                const badge = getRowBadge(item.status);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectItem(item.id)}
                    className={`w-full text-left px-2.5 py-2.5 rounded-xl transition-all flex items-center justify-between gap-2 relative overflow-hidden ${
                      isSelected
                        ? "bg-gradient-to-r from-[#231C4C] via-[#1A163B] to-[#111530] border border-[#6C5CE7]/45 text-white shadow-[0_4px_16px_rgba(0,0,0,0.45)]"
                        : "bg-transparent hover:bg-white/[0.03] border border-transparent text-slate-300"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-[#E5C158]" />
                    )}
                    <div className="flex items-center gap-2 min-w-0 pl-1">
                      {getRowIcon(item)}
                      <div className="min-w-0">
                        <span
                          className={`block text-xs font-medium truncate ${
                            isSelected ? "text-white font-semibold" : "text-slate-200"
                          }`}
                        >
                          {item.title}
                        </span>
                        <span className="block text-[10px] text-slate-400 truncate">
                          {item.previousPage ? `Pg ${item.previousPage}` : "—"} →{" "}
                          {item.newPage ? `Pg ${item.newPage}` : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold border ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                      <ChevronRight
                        className={`w-3.5 h-3.5 ${
                          isSelected ? "text-slate-200" : "text-slate-600"
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Progress & School Email Action */}
          <div className="pt-3 mt-3 border-t border-[#182344] space-y-2.5">
            <div>
              <div className="flex items-center justify-between text-[11px] italic text-slate-400 mb-1.5">
                <span>
                  {reviewedCount} of {items.length} reviewed
                </span>
                <span className="not-italic text-[10px] text-slate-500">
                  {Math.round((reviewedCount / Math.max(1, items.length)) * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#0E1733] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#8B7AE6] to-[#B7A9FF] transition-all duration-300"
                  style={{
                    width: `${(reviewedCount / Math.max(1, items.length)) * 100}%`,
                  }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenCorrectionEmailModal}
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#111938] hover:bg-[#19234B] border border-[#2C3B6E] text-[11px] font-medium text-[#D8C7A5] hover:text-white transition-all"
            >
              <Mail className="w-3.5 h-3.5 text-[#E5C158]" />
              Draft Parent School Email ({needAttentionCount})
            </button>
          </div>
        </aside>
      )}

      {/* RIGHT MAIN WORKSPACE: COMPACT EXPLANATION BAR + SIDE-BY-SIDE ORIGINAL PDF VIEWERS */}
      {activeItem && (
        <section className="flex-1 min-w-0 flex flex-col gap-2.5">
          {/* 4. COMPACT EXPLANATION BAR ABOVE THE DOCUMENT VIEWERS */}
          <div className="rounded-2xl bg-[#050C24]/95 border border-[#1E2B52] px-4 py-3 shadow-[0_10px_28px_rgba(0,0,0,0.55)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Left: Category, Title, Change Type Badge, Short Plain-Language Explanation */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    {activeItem.categoryLabel} / CHANGE {String(activeIndex).padStart(2, "0")} OF{" "}
                    {String(items.length).padStart(2, "0")}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                      getRowBadge(activeItem.status).cls
                    }`}
                  >
                    <Pencil className="w-2.5 h-2.5" />
                    {getRowBadge(activeItem.status).label}
                  </span>
                  {activeItem.severity === "high_attention" && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/35 text-[10px] font-semibold text-rose-300">
                      Needs Attention
                    </span>
                  )}
                  {activeItem.isReviewed && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/35 text-[10px] font-semibold text-emerald-300">
                      <Check className="w-2.5 h-2.5" />
                      Reviewed
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    className="text-lg sm:text-xl font-semibold text-white tracking-tight"
                  >
                    {activeItem.title}:
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-200 italic">
                    {activeItem.shortSummary || activeItem.explanation}
                  </p>
                </div>

                {advocateMode && activeItem.suggestedQuestion && (
                  <div className="mt-2 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#111A3A] border border-[#2C3E75] text-xs text-[#FFE394]">
                    <Sparkles className="w-3.5 h-3.5 text-[#E5C158] shrink-0" />
                    <span className="truncate">
                      <strong>Advocate Question:</strong> “{activeItem.suggestedQuestion}”
                    </span>
                  </div>
                )}
              </div>

              {/* Right: Selected Finding Actions Within Immediate Reach */}
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onToggleStar(activeItem.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    activeItem.isStarred
                      ? "bg-amber-500/15 border-[#E5C158]/60 text-[#FFE394]"
                      : "bg-[#081029] border-[#24325F] text-slate-300 hover:text-white hover:border-slate-500"
                  }`}
                >
                  <Flag
                    className={`w-3.5 h-3.5 ${
                      activeItem.isStarred ? "text-[#E5C158] fill-[#E5C158]" : "text-slate-400"
                    }`}
                  />
                  {activeItem.isStarred ? "Flagged" : "Flag for discussion"}
                </button>

                <button
                  type="button"
                  onClick={() => onOpenNoteDrawer(activeItem.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    activeItem.userNote
                      ? "bg-[#1E1942] border-[#6C5CE7]/60 text-white"
                      : "bg-[#081029] border-[#24325F] text-slate-300 hover:text-white hover:border-slate-500"
                  }`}
                >
                  <StickyNote className="w-3.5 h-3.5 text-[#C4B5FD]" />
                  {activeItem.userNote ? "Edit note" : "Add note"}
                </button>

                <button
                  type="button"
                  onClick={() => onSendToBlueprint(activeItem)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    activeItem.sentToBlueprint
                      ? "bg-emerald-950/50 border-emerald-500/50 text-emerald-300"
                      : "bg-[#081029] border-[#24325F] text-slate-200 hover:text-white hover:border-slate-500"
                  }`}
                >
                  {activeItem.sentToBlueprint ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Sent to Blueprint
                    </>
                  ) : (
                    <>
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      Send to Blueprint
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleMarkReviewedAndAdvance}
                  title="Marks this finding as reviewed by staff/parent (does not approve or consent to the IEP change)"
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeItem.isReviewed
                      ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                      : "bg-gradient-to-r from-[#E6C574] via-[#D4AF57] to-[#B68F3A] text-[#07132A] border border-[#FFE394]/60 shadow-[0_4px_14px_rgba(212,175,87,0.3)] hover:brightness-105"
                  }`}
                >
                  {activeItem.isReviewed ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Reviewed
                    </>
                  ) : (
                    <>
                      Mark reviewed
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* RESPONSIVE NARROW-WIDTH DOCUMENT SWITCHER (Visible only on phones below md when not expanded) */}
          {expandedPane === "none" && (
            <div className="flex md:hidden items-center justify-between gap-2 p-1 rounded-xl bg-[#050C24] border border-[#1E2B52]">
              <button
                type="button"
                onClick={() => setMobileActiveDoc("previous")}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  mobileActiveDoc === "previous"
                    ? "bg-[#1A2447] text-white border border-slate-500/40"
                    : "text-slate-400 hover:text-white"
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
                    ? "bg-[#241D4F] text-white border border-[#6C5CE7]/60"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-[#C4B5FD]" />
                Updated IEP ({newVer.date}) · Pg {rightPage}
              </button>
            </div>
          )}

          {/* 2. SIDE-BY-SIDE EMBEDDED ORIGINAL PDF DOCUMENT VIEWERS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-[640px] min-h-[540px] w-full min-w-0">
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
                  fileName={oldFileName || `Michael_Sheep_IEP_${oldVer.date.replace(/[\s,]+/g, "_")}.pdf`}
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
                    setExpandedPane((prev) => (prev === "previous" ? "none" : "previous"))
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
                />
              </div>
            )}

            {/* RIGHT VIEWER: UPDATED / PROPOSED IEP */}
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
                  fileName={newFileName || `Michael_Sheep_IEP_${newVer.date.replace(/[\s,]+/g, "_")}.pdf`}
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
                    setExpandedPane((prev) => (prev === "updated" ? "none" : "updated"))
                  }
                  findingTargetPage={activeItem.newPage}
                  findingAnchorText={activeItem.newAnchorText}
                  findingHighlightToken={activeItem.newHighlightToken}
                  locationConfidence={activeItem.locationConfidence}
                  isAbsentInThisVersion={activeItem.status === "removed"}
                  absentReasonText={
                    activeItem.status === "removed"
                      ? "No matching direct service language found in Proposed IEP (verify Section VII)"
                      : undefined
                  }
                  sectionLocationLabel={activeItem.newLocation}
                />
              </div>
            )}
          </div>

          {/* 6. COLLAPSIBLE MEETING AGREEMENT & REVIEW NOTE BAR (Collapsed by default to preserve reading space) */}
          <div className="rounded-xl bg-[#050C24]/95 border border-[#1E2B52] overflow-hidden">
            <button
              type="button"
              onClick={() => setMeetingDrawerOpen((prev) => !prev)}
              className="w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  <Link2 className="w-3.5 h-3.5 text-[#9B8AFB]" />
                  Meeting agreement:
                </span>
                <span
                  className={`text-xs font-medium ${
                    activeItem.linkedMinutes ? "text-emerald-400" : "text-slate-400"
                  }`}
                >
                  {activeItem.linkedMinutes
                    ? "Linked to May 14, 2026 IEP Meeting Minutes"
                    : "Not linked"}
                </span>
                {activeItem.userNote && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs text-[#FFE394] truncate max-w-md">
                      Saved Note: “{activeItem.userNote}”
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 text-xs text-slate-400">
                <span>{meetingDrawerOpen ? "Hide details" : "Expand meeting agreement & notes"}</span>
                {meetingDrawerOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </button>

            {meetingDrawerOpen && (
              <div className="px-4 pb-3.5 pt-2 border-t border-[#182344] bg-[#04091E] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1 text-xs text-slate-300 max-w-3xl">
                  <p>
                    <strong className="text-white">Review guidance:</strong>{" "}
                    {activeItem.userNote || activeItem.reviewNote || activeItem.explanation}
                  </p>
                  {activeItem.meetingAgreementNote && (
                    <p className="text-slate-400">
                      <strong className="text-slate-200">Meeting Minute Record:</strong>{" "}
                      {activeItem.meetingAgreementNote}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onToggleLinkMinutes(activeItem.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141C3D] hover:bg-[#1E2A5A] border border-[#324582] text-xs font-medium text-[#C4B5FD] transition-all"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    {activeItem.linkedMinutes ? "Unlink minutes" : "Link meeting minutes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenNoteDrawer(activeItem.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E1942] hover:bg-[#2A235B] border border-[#6C5CE7]/50 text-xs font-medium text-white transition-all"
                  >
                    <StickyNote className="w-3.5 h-3.5 text-[#C4B5FD]" />
                    Open Note Drawer
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}


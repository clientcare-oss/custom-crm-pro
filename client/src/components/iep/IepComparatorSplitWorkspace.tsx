import React, { useState } from "react";
import {
  FileText,
  Pencil,
  AlertCircle,
  Plus,
  Type,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Link2,
  Flag,
  FileEdit,
  Layers,
  ArrowRight,
  Check,
  Mail,
  GitCompare,
} from "lucide-react";
import { toast } from "sonner";
import { ComparisonItem, IepVersionOption } from "./types";

interface IepComparatorSplitWorkspaceProps {
  items: ComparisonItem[];
  selectedItem: ComparisonItem;
  onSelectItem: (item: ComparisonItem) => void;
  oldVersion: IepVersionOption;
  newVersion: IepVersionOption;
  onToggleStar: (id: string) => void;
  onToggleReviewed: (id: string, advanceNext?: boolean) => void;
  onUpdateNote: (id: string, note: string) => void;
  onToggleLinkMinutes: (id: string) => void;
  onSendToBlueprint: (item: ComparisonItem) => void;
  onOpenSchoolEmailModal: () => void;
  onSwitchToBoardView: () => void;
  onOpenNoteDrawer?: (id: string) => void;
  onOpenInOriginalDocuments?: (id: string) => void;
}

/**
 * Helper to highlight a specific token inside a paragraph with a colored badge
 */
function renderHighlightedText(
  fullText: string,
  token: string | undefined,
  variant: "old" | "new"
) {
  if (!token || !fullText.includes(token)) {
    return <span>{fullText}</span>;
  }
  const parts = fullText.split(token);
  const badgeClass =
    variant === "old"
      ? "inline-block px-2 py-0.5 mx-0.5 rounded bg-[#6E2538] text-[#FFD9E2] font-bold border border-[#A83854]/60"
      : "inline-block px-2 py-0.5 mx-0.5 rounded bg-[#1B6B50] text-[#D7FBE8] font-bold border border-[#2FA87E]/60";

  return (
    <>
      {parts.map((part, idx) => (
        <React.Fragment key={idx}>
          {part}
          {idx < parts.length - 1 && (
            <span className={badgeClass}>{token}</span>
          )}
        </React.Fragment>
      ))}
    </>
  );
}

/**
 * Status Pill & Left Icon for the Changes List
 */
function getChangeListBadge(status: ComparisonItem["status"]) {
  switch (status) {
    case "removed":
      return {
        label: "Removed",
        icon: AlertCircle,
        iconClass: "text-rose-400",
        pillClass:
          "bg-[#3B1724] text-rose-300 border border-rose-500/35",
      };
    case "added":
      return {
        label: "Added",
        icon: Plus,
        iconClass: "text-emerald-400",
        pillClass:
          "bg-[#12382B] text-emerald-300 border border-emerald-500/35",
      };
    case "reworded":
      return {
        label: "Reworded",
        icon: Type,
        iconClass: "text-[#8C98E8]",
        pillClass:
          "bg-[#1B2444] text-[#B4BFF5] border border-[#3E4E88]/60",
      };
    default:
      return {
        label: "Modified",
        icon: Pencil,
        iconClass: "text-[#E5B85B]",
        pillClass:
          "bg-[#332B1A] text-[#ECCB82] border border-[#7D6331]/60",
      };
  }
}

export function IepComparatorSplitWorkspace({
  items,
  selectedItem,
  onSelectItem,
  oldVersion,
  newVersion,
  onToggleStar,
  onToggleReviewed,
  onUpdateNote,
  onToggleLinkMinutes,
  onSendToBlueprint,
  onOpenSchoolEmailModal,
  onSwitchToBoardView,
  onOpenNoteDrawer,
  onOpenInOriginalDocuments,
}: IepComparatorSplitWorkspaceProps) {
  const [listFilter, setListFilter] = useState<"all" | "attention">("all");
  const [editingNote, setEditingNote] = useState(false);
  const [draftNote, setDraftNote] = useState("");

  const changeItems = items.filter((i) => i.status !== "unchanged");
  const attentionCount = changeItems.filter(
    (i) => i.severity === "high_attention"
  ).length;
  const reviewedCount = changeItems.filter((i) => i.isReviewed).length;

  const visibleList =
    listFilter === "all"
      ? changeItems
      : changeItems.filter((i) => i.severity === "high_attention");

  const activeIndex = Math.max(
    0,
    changeItems.findIndex((i) => i.id === selectedItem.id)
  );
  const activeBadge = getChangeListBadge(selectedItem.status);
  const ActiveStatusIcon = activeBadge.icon;

  const currentNoteText =
    selectedItem.userNote ||
    selectedItem.reviewNote ||
    selectedItem.suggestedQuestion;

  const handleOpenNoteEditor = () => {
    setDraftNote(currentNoteText);
    setEditingNote(true);
  };

  const handleSaveNote = () => {
    onUpdateNote(selectedItem.id, draftNote);
    setEditingNote(false);
    toast.success("Review note saved");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch text-left">
      {/* =================================================================== */}
      {/* LEFT PANEL: CHANGES LIST & REVIEW PROGRESS                          */}
      {/* =================================================================== */}
      <div className="lg:col-span-4 rounded-xl bg-[#070E1F]/95 border border-[#1E2B4A] shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col justify-between overflow-hidden">
        {/* Top Summary Header & Filter Toggle */}
        <div>
          <div className="p-5 border-b border-[#18233D]">
            <h2
              className="text-3xl sm:text-[34px] font-bold text-[#FBF6EC] leading-none"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {changeItems.length} changes
            </h2>
            <p className="text-[14px] text-[#E2B86B] font-medium mt-1.5">
              {attentionCount} need attention
            </p>

            {/* All | Needs attention Segmented Control */}
            <div className="mt-4 grid grid-cols-2 p-1 rounded-lg bg-[#050A16] border border-[#1C2844]">
              <button
                type="button"
                onClick={() => setListFilter("all")}
                className={`py-1.5 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  listFilter === "all"
                    ? "bg-[#3E457A] text-white shadow-sm"
                    : "text-[#9AA6C4] hover:text-white"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setListFilter("attention")}
                className={`py-1.5 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  listFilter === "attention"
                    ? "bg-[#3E457A] text-white shadow-sm"
                    : "text-[#9AA6C4] hover:text-white"
                }`}
              >
                Needs attention
              </button>
            </div>
          </div>

          {/* Changes List */}
          <div className="divide-y divide-[#151F38] max-h-[440px] overflow-y-auto">
            {visibleList.map((item) => {
              const isSelected = item.id === selectedItem.id;
              const badge = getChangeListBadge(item.status);
              const RowIcon = badge.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectItem(item);
                    setEditingNote(false);
                  }}
                  className={`relative w-full px-4 py-3.5 flex items-center justify-between gap-2.5 text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-gradient-to-r from-[#222854] via-[#1C2247] to-[#141A38] text-white"
                      : "hover:bg-white/[0.03] text-[#D8DFEE]"
                  }`}
                >
                  {/* Active Left Gold/Amber Accent Bar */}
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-gradient-to-b from-[#FFE394] via-[#DFB860] to-[#9E7329]" />
                  )}

                  <div className="flex items-center gap-3 min-w-0">
                    {isSelected ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#8D95FF] shadow-[0_0_8px_#8D95FF] shrink-0" />
                    ) : (
                      <RowIcon
                        className={`h-4 w-4 shrink-0 ${badge.iconClass}`}
                      />
                    )}
                    <span
                      className={`text-[14px] leading-snug truncate ${
                        isSelected ? "font-semibold text-white" : "font-medium"
                      }`}
                    >
                      {item.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isSelected && (
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${badge.pillClass}`}
                      >
                        {badge.label}
                      </span>
                    )}
                    <ChevronRight
                      className={`h-4 w-4 ${
                        isSelected ? "text-[#C5CCF0]" : "text-[#6D7996]"
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Reviewed Progress Bar */}
        <div className="p-4 border-t border-[#18233D] bg-[#060B18]">
          <div className="flex items-center justify-between text-xs">
            <span
              className="italic text-[#C8D0E4]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {reviewedCount} of {changeItems.length} reviewed
            </span>
            <span className="text-[11px] text-[#8E98B4]">
              {Math.round((reviewedCount / Math.max(1, changeItems.length)) * 100)}%
            </span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-[#151E34] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7880E8] to-[#A6ADFF] transition-all duration-300"
              style={{
                width: `${(reviewedCount / Math.max(1, changeItems.length)) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* RIGHT PANEL: SIDE-BY-SIDE OLD (LEFT) vs NEW (RIGHT) COMPARISON      */}
      {/* =================================================================== */}
      <div className="lg:col-span-8 rounded-xl bg-[#070E1F]/95 border border-[#1E2B4A] p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col justify-between space-y-6">
        <div className="space-y-4">
          {/* Category & Index Overline */}
          <div className="text-[11px] uppercase tracking-[0.2em] text-[#9AA6C6] font-semibold">
            {selectedItem.categoryLabel} <span className="mx-1.5 text-[#526080]">/</span>{" "}
            CHANGE {String(activeIndex + 1).padStart(2, "0")} OF{" "}
            {String(changeItems.length).padStart(2, "0")}
          </div>

          {/* Change Title + Status Pill */}
          <div className="flex flex-wrap items-center gap-3.5">
            <h2
              className="text-3xl sm:text-[36px] font-bold text-[#FBF6EC] tracking-tight leading-none"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {selectedItem.title}
            </h2>

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium ${activeBadge.pillClass}`}
            >
              <ActiveStatusIcon className="h-3.5 w-3.5" />
              <span>{activeBadge.label}</span>
            </span>

            {selectedItem.isReviewed && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                <Check className="h-3.5 w-3.5" />
                Reviewed
              </span>
            )}
          </div>

          {/* Summary Callout Banner with Left Gold Bar */}
          <div className="relative rounded-lg bg-[#161D3B]/90 border border-[#2C3766] pl-4 pr-4 py-2.5 overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#FFE394] to-[#B88933]" />
            <p className="text-[14px] italic text-[#E6EBF8]">
              {selectedItem.shortSummary || selectedItem.explanation}
            </p>
          </div>
        </div>

        {/* ── SIDE-BY-SIDE DOCUMENT CARDS: OLD ALWAYS LEFT, NEW ALWAYS RIGHT ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {/* LEFT CARD: OLD / PREVIOUS LANGUAGE */}
          <div className="relative rounded-xl bg-[#0B1428] border border-[#233154] p-5 flex flex-col justify-between shadow-[0_12px_30px_rgba(0,0,0,0.65)] overflow-hidden">
            {/* Dog-ear folded corner top-right */}
            <div
              className="pointer-events-none absolute top-0 right-0 w-6 h-6 bg-[#1C2947] border-b border-l border-[#344670]"
              style={{
                clipPath: "polygon(0 0, 0 100%, 100% 100%)",
              }}
            />

            <div className="space-y-4">
              {/* Document Header */}
              <div className="flex items-start gap-2.5">
                <FileText className="h-4 w-4 text-[#9AA6C4] mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-[#E6EBF8]">
                    Previous language
                  </h4>
                  <p className="text-[11px] text-[#8E98B4]">
                    {oldVersion.date}
                  </p>
                </div>
              </div>

              {/* Document Body Text with Rose Highlight */}
              <div className="text-[16px] leading-[1.6] text-[#F1F4FC] font-normal">
                {renderHighlightedText(
                  selectedItem.previousValue || "Not present in previous IEP.",
                  selectedItem.oldHighlightToken,
                  "old"
                )}
              </div>

              {/* Metadata lines */}
              {(selectedItem.measurement || selectedItem.frequency) && (
                <div className="pt-2 space-y-1 text-xs text-[#9AA6C4]">
                  {selectedItem.measurement && (
                    <div>Measurement: {selectedItem.measurement}</div>
                  )}
                  {selectedItem.frequency && (
                    <div>Frequency: {selectedItem.frequency}</div>
                  )}
                </div>
              )}
            </div>

            {/* Footer: Page & Section + Open source */}
            <div className="pt-4 mt-4 border-t border-[#1A2642] flex items-center justify-between text-[11.5px] text-[#8E98B4]">
              <span>{selectedItem.previousLocation || "Previous IEP"}</span>
              <button
                type="button"
                onClick={() => {
                  if (onOpenInOriginalDocuments) {
                    onOpenInOriginalDocuments(selectedItem.id);
                  } else {
                    toast.info(
                      `Opening ${oldVersion.date} IEP at ${selectedItem.previousLocation || "Section"}`
                    );
                  }
                }}
                className="inline-flex items-center gap-1 text-[#C5CCF0] hover:text-white cursor-pointer transition-colors"
              >
                <span>Open source</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* RIGHT CARD: NEW / PROPOSED LANGUAGE */}
          <div className="relative rounded-xl bg-[#0B1428] border border-[#2F3D6B] p-5 flex flex-col justify-between shadow-[0_12px_30px_rgba(0,0,0,0.65)] overflow-hidden">
            {/* Dog-ear folded corner top-right */}
            <div
              className="pointer-events-none absolute top-0 right-0 w-6 h-6 bg-[#243258] border-b border-l border-[#45588A]"
              style={{
                clipPath: "polygon(0 0, 0 100%, 100% 100%)",
              }}
            />

            <div className="space-y-4">
              {/* Document Header */}
              <div className="flex items-start gap-2.5">
                <FileText className="h-4 w-4 text-[#B8C0FF] mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-white">
                    Proposed language
                  </h4>
                  <p className="text-[11px] text-[#A8B2D8]">
                    {newVersion.date}
                  </p>
                </div>
              </div>

              {/* Document Body Text with Emerald Highlight */}
              <div className="text-[16px] leading-[1.6] text-white font-normal">
                {renderHighlightedText(
                  selectedItem.newValue || "Removed in proposed IEP.",
                  selectedItem.newHighlightToken,
                  "new"
                )}
              </div>

              {/* Metadata lines */}
              {(selectedItem.measurement || selectedItem.frequency) && (
                <div className="pt-2 space-y-1 text-xs text-[#9AA6C4]">
                  {selectedItem.measurement && (
                    <div>Measurement: {selectedItem.measurement}</div>
                  )}
                  {selectedItem.frequency && (
                    <div>Frequency: {selectedItem.frequency}</div>
                  )}
                </div>
              )}
            </div>

            {/* Footer: Page & Section + Open source */}
            <div className="pt-4 mt-4 border-t border-[#1A2642] flex items-center justify-between text-[11.5px] text-[#8E98B4]">
              <span>{selectedItem.newLocation || "Proposed IEP"}</span>
              <button
                type="button"
                onClick={() => {
                  if (onOpenInOriginalDocuments) {
                    onOpenInOriginalDocuments(selectedItem.id);
                  } else {
                    toast.info(
                      `Opening ${newVersion.date} Proposed IEP at ${selectedItem.newLocation || "Section"}`
                    );
                  }
                }}
                className="inline-flex items-center gap-1 text-[#C5CCF0] hover:text-white cursor-pointer transition-colors"
              >
                <span>Open source</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* ── REVIEW NOTE CARD ── */}
        <div className="rounded-xl bg-[#0A1326]/95 border border-[#223052] p-4 flex items-start gap-3.5">
          <div className="p-2 rounded-lg bg-[#111D38] border border-[#29385C] text-[#E5B85B] shrink-0">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <h4 className="text-xs font-bold text-[#E5B85B]">Review note</h4>
              {!editingNote ? (
                <p className="text-[14px] text-[#EEF2FC] mt-0.5">
                  {currentNoteText}
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  <textarea
                    rows={2}
                    value={draftNote}
                    onChange={(e) => setDraftNote(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-[#060B18] border border-[#3B4B78] text-xs text-white focus:outline-none focus:border-[#FFE394]"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveNote}
                      className="px-3 py-1 rounded bg-[#C5A059] text-[#07162B] text-xs font-bold cursor-pointer"
                    >
                      Save note
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingNote(false)}
                      className="px-3 py-1 rounded bg-[#111C35] text-xs text-[#9AA6C4] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[#182440] flex flex-wrap items-center gap-4 text-xs text-[#8E98B4]">
              <span>
                Meeting agreement:{" "}
                <strong className="text-[#C8D0E4] font-medium">
                  {selectedItem.linkedMinutes
                    ? "Linked to May 14 Minutes"
                    : "Not linked"}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => onToggleLinkMinutes(selectedItem.id)}
                className="inline-flex items-center gap-1.5 text-[#A5AEFF] hover:text-white transition-colors cursor-pointer"
              >
                <Link2 className="h-3.5 w-3.5" />
                <span>
                  {selectedItem.linkedMinutes
                    ? "Unlink minutes"
                    : "Link minutes"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ── BOTTOM ACTION BAR ── */}
        <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onToggleStar(selectedItem.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                selectedItem.isStarred
                  ? "bg-amber-500/15 border-amber-400/60 text-[#FFE394]"
                  : "bg-[#0B1428] hover:bg-[#12203D] border-[#263556] text-[#DCE2F2]"
              }`}
            >
              <Flag className="h-3.5 w-3.5" />
              <span>
                {selectedItem.isStarred
                  ? "In School Email · Flagged"
                  : "Flag & Add to School Email"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onOpenNoteDrawer) {
                  onOpenNoteDrawer(selectedItem.id);
                } else {
                  handleOpenNoteEditor();
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0B1428] hover:bg-[#12203D] border border-[#263556] text-xs font-medium text-[#DCE2F2] transition-all cursor-pointer"
            >
              <FileEdit className="h-3.5 w-3.5" />
              <span>{selectedItem.userNote ? "Edit note" : "Add note"}</span>
            </button>

            <button
              type="button"
              onClick={onOpenSchoolEmailModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#151F42] hover:bg-[#1D2B58] border border-[#5B68C8]/70 text-xs font-semibold text-[#D6DCFF] transition-all cursor-pointer"
            >
              <Mail className="h-3.5 w-3.5 text-[#FFE394]" />
              <span>Email School</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onSwitchToBoardView}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-[#0B1428] hover:bg-[#12203D] border border-[#263556] text-xs font-medium text-[#B8C2D8] hover:text-white transition-all cursor-pointer"
              title="Switch to Connected Cards Circuit Board View"
            >
              <GitCompare className="h-3.5 w-3.5 text-[#939BFF]" />
              <span>Cards View</span>
            </button>

            <button
              type="button"
              onClick={() => onSendToBlueprint(selectedItem)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0B1428] hover:bg-[#12203D] border border-[#263556] text-xs font-medium text-[#DCE2F2] transition-all cursor-pointer"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Send to Blueprint</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleReviewed(selectedItem.id, true)}
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-lg bg-gradient-to-b from-[#E5C887] via-[#C69F56] to-[#987230] text-[#0E1322] font-bold text-[13.5px] border border-[#FCE7B6]/75 shadow-[0_6px_18px_rgba(0,0,0,0.75),inset_0_1px_1px_rgba(255,255,255,0.6)] hover:brightness-110 transition-all cursor-pointer"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              <span>
                {selectedItem.isReviewed ? "Next change" : "Mark reviewed"}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

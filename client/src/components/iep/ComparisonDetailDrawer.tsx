import React, { useState, useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  HelpCircle,
  Star,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  X,
  MessageSquare,
  ShieldAlert,
  ArrowRight,
  FileText,
  Layers,
  Check,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { ComparisonItem, getStatusTheme } from "./types";

function renderStickyHighlightedPhrase(
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

interface ComparisonDetailDrawerProps {
  item: ComparisonItem | null;
  isOpen: boolean;
  onClose: () => void;
  advocateMode: boolean;
  onToggleStar: (id: string) => void;
  onToggleReviewed: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
  comparisonGeneralNote?: string;
  onUpdateComparisonGeneralNote?: (note: string) => void;
  onSendToBlueprint?: (item: ComparisonItem) => void;
  onOpenInOriginalDocuments?: (id: string) => void;
  onSelectNext?: () => void;
  onSelectPrev?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export function ComparisonDetailDrawer({
  item,
  isOpen,
  onClose,
  advocateMode,
  onToggleStar,
  onToggleReviewed,
  onUpdateNote,
  comparisonGeneralNote = "",
  onUpdateComparisonGeneralNote,
  onSendToBlueprint,
  onOpenInOriginalDocuments,
  onSelectNext,
  onSelectPrev,
  hasPrev = false,
  hasNext = false,
}: ComparisonDetailDrawerProps) {
  const [localNote, setLocalNote] = useState("");
  const [localGeneralNote, setLocalGeneralNote] = useState(comparisonGeneralNote);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (item) {
      setLocalNote(item.userNote || "");
      setSaveState(item.userNote ? "saved" : "idle");
    }
  }, [item?.id, item?.userNote]);

  useEffect(() => {
    setLocalGeneralNote(comparisonGeneralNote);
  }, [comparisonGeneralNote]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  if (!item) return null;

  const theme = getStatusTheme(item.status);

  const handleNoteChange = (val: string) => {
    setLocalNote(val);
    setSaveState("saving");
    try {
      onUpdateNote(item.id, val);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        setSaveState("saved");
      }, 300);
    } catch {
      setSaveState("error");
    }
  };

  const handleGeneralNoteChange = (val: string) => {
    setLocalGeneralNote(val);
    if (!onUpdateComparisonGeneralNote) return;
    setSaveState("saving");
    try {
      onUpdateComparisonGeneralNote(val);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        setSaveState("saved");
      }, 300);
    } catch {
      setSaveState("error");
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl bg-[#061120] text-slate-100 border-l border-white/10 p-0 flex flex-col shadow-2xl overflow-hidden z-50"
      >
        {/* Top Header */}
        <div className="p-6 border-b border-white/10 bg-[#07162B]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 border border-white/10 text-slate-400">
                {item.categoryLabel}
              </span>
              <Badge
                className={`text-[9px] uppercase tracking-wider font-bold ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
              >
                {theme.label}
              </Badge>
              {item.numericDiff && (
                <Badge className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/25 text-[9px] font-mono">
                  {item.numericDiff}
                </Badge>
              )}
            </div>

            {/* Navigation arrows & Close */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={onSelectPrev}
                disabled={!hasPrev}
                className="h-7 w-7 text-slate-400 hover:text-white disabled:opacity-30"
                title="Previous comparison item"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onSelectNext}
                disabled={!hasNext}
                className="h-7 w-7 text-slate-400 hover:text-white disabled:opacity-30"
                title="Next comparison item"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-7 w-7 text-slate-400 hover:text-white ml-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <h2 className="text-xl font-bold font-serif text-white leading-snug">
            {item.title}
          </h2>
          {item.highlightedField && (
            <p className="text-xs text-slate-400 mt-1">
              Focus area: <span className="text-slate-200 font-semibold">{item.highlightedField}</span>
            </p>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Dog-Eared Sticky-Note Phrase Cards (OLD Always Left, NEW Always Right) + Review Note Sticky Card */}
          <div className="space-y-3">
            <div className="text-[10px] font-bold text-[#FFE394] uppercase tracking-wider flex items-center justify-between">
              <span>Phrase Sticky Notes — Previous vs. Proposed Language</span>
              <span className="text-slate-400 font-normal">Exact phrase highlight</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
              {/* LEFT STICKY NOTE: OLD / PREVIOUS LANGUAGE */}
              <div className="relative rounded-xl bg-[#0B1428] border border-[#233154] p-4 flex flex-col justify-between shadow-[0_12px_30px_rgba(0,0,0,0.65)] overflow-hidden">
                {/* Dog-ear folded corner top-right */}
                <div
                  className="pointer-events-none absolute top-0 right-0 w-6 h-6 bg-[#1C2947] border-b border-l border-[#344670]"
                  style={{
                    clipPath: "polygon(0 0, 0 100%, 100% 100%)",
                  }}
                />

                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-[#9AA6C4] mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-[#E6EBF8]">Previous language</h4>
                      <p className="text-[10px] text-[#8E98B4]">Mar 3, 2026</p>
                    </div>
                  </div>

                  <div className="text-[14px] leading-[1.6] text-[#F1F4FC] font-normal">
                    {renderStickyHighlightedPhrase(
                      item.previousValue || "Not present in previous IEP.",
                      item.oldHighlightToken,
                      "old"
                    )}
                  </div>

                  {(item.measurement || item.frequency) && (
                    <div className="pt-1 space-y-0.5 text-[11px] text-[#9AA6C4]">
                      {item.measurement && <div>Measurement: {item.measurement}</div>}
                      {item.frequency && <div>Frequency: {item.frequency}</div>}
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-[#1A2642] flex items-center justify-between text-[11px] text-[#8E98B4]">
                  <span>{item.previousLocation || "Previous IEP"}</span>
                  {onOpenInOriginalDocuments && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenInOriginalDocuments(item.id);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 text-[#C5CCF0] hover:text-white cursor-pointer transition-colors"
                    >
                      <span>Open source</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* RIGHT STICKY NOTE: NEW / PROPOSED LANGUAGE */}
              <div className="relative rounded-xl bg-[#0B1428] border border-[#2F3D6B] p-4 flex flex-col justify-between shadow-[0_12px_30px_rgba(0,0,0,0.65)] overflow-hidden">
                {/* Dog-ear folded corner top-right */}
                <div
                  className="pointer-events-none absolute top-0 right-0 w-6 h-6 bg-[#243258] border-b border-l border-[#45588A]"
                  style={{
                    clipPath: "polygon(0 0, 0 100%, 100% 100%)",
                  }}
                />

                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-[#B8C0FF] mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-white">Proposed language</h4>
                      <p className="text-[10px] text-[#A8B2D8]">May 14, 2026</p>
                    </div>
                  </div>

                  <div className="text-[14px] leading-[1.6] text-white font-normal">
                    {renderStickyHighlightedPhrase(
                      item.newValue || "Removed in proposed IEP.",
                      item.newHighlightToken,
                      "new"
                    )}
                  </div>

                  {(item.measurement || item.frequency) && (
                    <div className="pt-1 space-y-0.5 text-[11px] text-[#9AA6C4]">
                      {item.measurement && <div>Measurement: {item.measurement}</div>}
                      {item.frequency && <div>Frequency: {item.frequency}</div>}
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-[#1A2642] flex items-center justify-between text-[11px] text-[#8E98B4]">
                  <span>{item.newLocation || "Proposed IEP"}</span>
                  {onOpenInOriginalDocuments && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenInOriginalDocuments(item.id);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 text-[#C5CCF0] hover:text-white cursor-pointer transition-colors"
                    >
                      <span>Open source</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Review Note Sticky Card for this Phrase */}
            <div className="rounded-xl bg-[#0A1326]/95 border border-[#3A2C18] p-4 flex items-start gap-3.5 shadow-md">
              <div className="p-2 rounded-lg bg-[#111D38] border border-[#3A2C18] text-[#E5B85B] shrink-0">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <h4 className="text-xs font-bold text-[#E5B85B]">Review note</h4>
                <p className="text-[13.5px] text-[#EEF2FC] leading-relaxed">
                  {localNote || item.reviewNote || item.suggestedQuestion}
                </p>
              </div>
            </div>
          </div>

          {/* Plain-Language Interpretation */}
          <div className="bg-[#0b1e36]/40 border border-indigo-500/20 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
              <BookOpen className="h-4 w-4 text-indigo-400" />
              <span>Plain-Language Advocacy Summary</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {item.explanation}
            </p>
          </div>

          {/* Suggested Question to Ask */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
              <HelpCircle className="h-4 w-4 text-amber-400" />
              <span>Suggested Question for the IEP Team</span>
            </div>
            <p className="text-xs text-white font-serif font-bold italic leading-relaxed">
              "{item.suggestedQuestion}"
            </p>
          </div>

          {/* Advocate Mode Audit Telemetry */}
          {advocateMode && (
            <div className="bg-slate-950/80 border border-dashed border-white/10 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                <span className="flex items-center gap-1.5 text-amber-400">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Advocate Mode Audit Telemetry
                </span>
                <span>Category: {item.category}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-slate-400 font-mono">
                <div>• Severity: <span className="text-slate-200">{item.severity}</span></div>
                <div>• Match status: <span className="text-slate-200">{item.status}</span></div>
                <div>• Calculated delta: <span className="text-slate-200">{item.numericDiff || "N/A"}</span></div>
                <div>• Confidence: <span className="text-emerald-400">Verified High</span></div>
              </div>
            </div>
          )}

          {/* Finding-Level Custom Notes Section */}
          <div className="space-y-2 bg-slate-950/50 p-4 rounded-xl border border-white/5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />
                Finding Note ({item.title})
              </label>
              {saveState === "saving" && (
                <span className="inline-flex items-center gap-1 text-[10px] text-amber-300">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </span>
              )}
              {saveState === "saved" && (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                  <Check className="h-3 w-3" />
                  Saved
                </span>
              )}
              {saveState === "error" && (
                <span className="inline-flex items-center gap-1 text-[10px] text-rose-400">
                  <AlertCircle className="h-3 w-3" />
                  Error saving note
                </span>
              )}
            </div>
            <textarea
              value={localNote}
              onChange={(e) => handleNoteChange(e.target.value)}
              placeholder="Record notes, questions to bring up, or team commitments for this finding..."
              className="w-full h-24 bg-slate-900 border border-white/10 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Broader Comparison-Level Notes Section */}
          {onUpdateComparisonGeneralNote && (
            <div className="space-y-2 bg-slate-950/50 p-4 rounded-xl border border-white/5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-[#E5C158]" />
                  Overall Comparison Session Notes
                </label>
                <span className="text-[10px] text-slate-500">Shared across all findings</span>
              </div>
              <textarea
                value={localGeneralNote}
                onChange={(e) => handleGeneralNoteChange(e.target.value)}
                placeholder="Broader comparison notes, overall parent priorities, or PWN follow-up summary..."
                className="w-full h-20 bg-slate-900 border border-white/10 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-[#07162B] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={item.isStarred ? "default" : "outline"}
              size="sm"
              onClick={() => onToggleStar(item.id)}
              className={`text-xs gap-1.5 font-bold ${
                item.isStarred
                  ? "bg-amber-500 hover:bg-amber-400 text-slate-950"
                  : "border-white/10 text-slate-300 hover:bg-white/5"
              }`}
            >
              <Star className={`h-3.5 w-3.5 ${item.isStarred ? "fill-slate-950" : ""}`} />
              {item.isStarred ? "Flagged" : "Flag for discussion"}
            </Button>

            <Button
              variant={item.isReviewed ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onToggleReviewed(item.id)}
              className={`text-xs gap-1.5 ${
                item.isReviewed
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {item.isReviewed ? "Reviewed" : "Mark Reviewed"}
            </Button>

            {onSendToBlueprint && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSendToBlueprint(item)}
                className={`text-xs gap-1.5 ${
                  item.sentToBlueprint
                    ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                    : "border-white/10 text-slate-300 hover:bg-white/5"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                {item.sentToBlueprint ? "Sent to Blueprint" : "Send to Blueprint"}
              </Button>
            )}

            {onOpenInOriginalDocuments && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onOpenInOriginalDocuments(item.id);
                  onClose();
                }}
                className="text-xs gap-1.5 text-indigo-300 hover:text-white"
              >
                <FileText className="h-3.5 w-3.5" />
                View in Original PDFs
              </Button>
            )}
          </div>

          <Button
            size="sm"
            onClick={onClose}
            className="bg-indigo-650 hover:bg-indigo-600 text-white text-xs px-4 font-bold"
          >
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

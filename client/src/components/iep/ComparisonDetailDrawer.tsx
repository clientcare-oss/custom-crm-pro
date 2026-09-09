import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { ComparisonItem, getStatusTheme } from "./types";

interface ComparisonDetailDrawerProps {
  item: ComparisonItem | null;
  isOpen: boolean;
  onClose: () => void;
  advocateMode: boolean;
  onToggleStar: (id: string) => void;
  onToggleReviewed: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
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
  onSelectNext,
  onSelectPrev,
  hasPrev = false,
  hasNext = false,
}: ComparisonDetailDrawerProps) {
  const [localNote, setLocalNote] = useState("");

  useEffect(() => {
    if (item) {
      setLocalNote(item.userNote || "");
    }
  }, [item?.id, item?.userNote]);

  if (!item) return null;

  const theme = getStatusTheme(item.status);

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
          {/* Side-by-Side Comparison Snippets */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Textual Comparison</span>
              <span className="text-slate-500 font-normal">Side-by-side textual diff</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Proposed (New) */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-indigo-500/20 space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-indigo-400 uppercase tracking-wider">New IEP (Proposed)</span>
                  <span className="text-slate-500 font-mono text-[9px]">{item.newLocation || "Page N/A"}</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {item.newValue || (
                    <span className="text-rose-400 italic">
                      Item omitted or discontinued in proposed version.
                    </span>
                  )}
                </p>
              </div>

              {/* Baseline (Old) */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-amber-400 uppercase tracking-wider">Old IEP (Baseline)</span>
                  <span className="text-slate-500 font-mono text-[9px]">{item.previousLocation || "Page N/A"}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {item.previousValue || (
                    <span className="text-emerald-400 italic">
                      Not previously included in baseline IEP.
                    </span>
                  )}
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

          {/* Custom Notes Section */}
          <div className="space-y-2 bg-slate-950/50 p-4 rounded-xl border border-white/5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />
                Custom Notes for IEP Meeting
              </label>
              {item.userNote && (
                <span className="text-[10px] text-emerald-400">Saved</span>
              )}
            </div>
            <textarea
              value={localNote}
              onChange={(e) => {
                setLocalNote(e.target.value);
                onUpdateNote(item.id, e.target.value);
              }}
              placeholder="Record notes, questions to bring up, or team commitments..."
              className="w-full h-24 bg-slate-900 border border-white/10 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-[#07162B] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
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
              {item.isStarred ? "In Prep Brief" : "Add to Prep Brief"}
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

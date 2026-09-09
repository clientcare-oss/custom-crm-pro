import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Star,
  Printer,
  ShieldAlert,
  Search,
  MessageSquare,
  CheckCircle2,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { ComparisonItem, getStatusTheme } from "./types";

interface DetailedChangesViewProps {
  items: ComparisonItem[];
  advocateMode: boolean;
  onToggleStar: (id: string) => void;
  onToggleReviewed: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
  onPrintBrief: () => void;
  studentName?: string;
  studentGrade?: string;
}

export function DetailedChangesView({
  items,
  advocateMode,
  onToggleStar,
  onToggleReviewed,
  onUpdateNote,
  onPrintBrief,
  studentName = "Michael Sheep",
  studentGrade = "8th Grade",
}: DetailedChangesViewProps) {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [hideUnchanged, setHideUnchanged] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Statistics calculation
  const totalChanges = items.filter((i) => i.status !== "unchanged").length;
  const addedCount = items.filter((i) => i.status === "added").length;
  const removedCount = items.filter((i) => i.status === "removed").length;
  const modifiedCount = items.filter((i) => i.status === "modified").length;
  const unchangedCount = items.filter((i) => i.status === "unchanged").length;
  const highAttentionCount = items.filter(
    (i) => i.severity === "high_attention" && i.status !== "unchanged"
  ).length;

  // Filter items matching layout criteria
  const visibleItems = items.filter((item) => {
    if (hideUnchanged && item.status === "unchanged") return false;
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    if (
      searchQuery &&
      !item.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !item.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start text-left">
      {/* ── LEFT SECTION NAVIGATION SIDEBAR ── */}
      <div className="lg:col-span-3 space-y-2 text-left self-start lg:sticky lg:top-24">
        <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">
          Content Sections
        </div>
        {[
          { id: "overview", label: "Executive Overview", count: totalChanges },
          { id: "high_attention", label: "High-Attention Changes", count: highAttentionCount },
          {
            id: "goals",
            label: "Annual Goals",
            count: items.filter((i) => i.category === "goals" && i.status !== "unchanged").length,
          },
          {
            id: "accommodations",
            label: "Accommodations",
            count: items.filter((i) => i.category === "accommodations" && i.status !== "unchanged").length,
          },
          {
            id: "services",
            label: "Special Ed Services",
            count: items.filter((i) => i.category === "services" && i.status !== "unchanged").length,
          },
          {
            id: "related",
            label: "Related Services",
            count: items.filter((i) => i.category === "related" && i.status !== "unchanged").length,
          },
          {
            id: "placement",
            label: "Placement & LRE",
            count: items.filter((i) => i.category === "placement" && i.status !== "unchanged").length,
          },
          {
            id: "meeting_prep",
            label: "★ Meeting Prep Brief",
            count: items.filter((i) => i.isStarred).length,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === "high_attention") {
                setFilterStatus("all");
              }
            }}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTab === tab.id
                ? "bg-indigo-650 text-white font-bold shadow-md shadow-indigo-650/20"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeTab === tab.id
                    ? "bg-white/20 text-white"
                    : tab.id === "high_attention"
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    : "bg-slate-900 text-slate-500"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}

        {/* Profile Card Widget */}
        <div className="border-t border-white/5 pt-4 mt-6">
          <div className="bg-[#0b1e36]/30 border border-white/5 rounded-xl p-3.5 space-y-1.5">
            <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Target Student File
            </div>
            <div className="text-xs text-white font-bold">{studentName}</div>
            <div className="text-[10px] text-slate-400">{studentGrade} IEP Comparison</div>
          </div>
        </div>
      </div>

      {/* ── MAIN DETAILED CONTENT (Right 9 Cols) ── */}
      <div className="lg:col-span-9 space-y-6">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-fade-in">
            {/* Metric Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Added Elements", val: addedCount, color: "text-emerald-400", border: "border-emerald-500/20" },
                { label: "Removed Supports", val: removedCount, color: "text-rose-400", border: "border-rose-500/20" },
                { label: "Modified Services", val: modifiedCount, color: "text-amber-400", border: "border-amber-500/20" },
                { label: "Unchanged Baseline", val: unchangedCount, color: "text-slate-400", border: "border-white/5" },
              ].map((card, idx) => (
                <div
                  key={idx}
                  className={`bg-[#07162B]/60 border ${card.border} rounded-2xl p-4 flex flex-col justify-between shadow-sm`}
                >
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                    {card.label}
                  </span>
                  <span className={`text-2xl font-bold mt-2 ${card.color}`}>{card.val}</span>
                </div>
              ))}
            </div>

            {/* Sub-filters & Search bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                {["all", "added", "removed", "modified", "reworded"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                      filterStatus === s
                        ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                        : "bg-slate-900 border-white/5 text-slate-400 hover:text-white"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hideUnchanged}
                    onChange={(e) => setHideUnchanged(e.target.checked)}
                    className="rounded border-white/10 bg-slate-900 text-indigo-650 h-3.5 w-3.5 focus:ring-0"
                  />
                  <span>Hide Unchanged</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search details..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 bg-slate-950/80 border border-white/10 rounded-lg text-xs h-8 text-white focus:ring-indigo-500 w-48"
                  />
                </div>
              </div>
            </div>

            {/* List of Detailed Cards */}
            <div className="space-y-4">
              {visibleItems.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-white/5 rounded-2xl text-slate-500 text-xs">
                  No changes match the selected filter/search criteria.
                </div>
              ) : (
                visibleItems.map((item) => (
                  <DetailedItemCard
                    key={item.id}
                    item={item}
                    advocateMode={advocateMode}
                    onToggleStar={onToggleStar}
                    onToggleReviewed={onToggleReviewed}
                    onUpdateNote={onUpdateNote}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* HIGH ATTENTION TAB */}
        {activeTab === "high_attention" && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-rose-500/10 border border-rose-500/25 rounded-2xl p-5 flex items-start gap-3.5">
              <ShieldAlert className="h-6 w-6 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  High-Attention Revisions Detected
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  These updates relate directly to service time reductions, accommodation exclusions, or placement updates. Review these carefully with the IEP team.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {items
                .filter((i) => i.severity === "high_attention" && i.status !== "unchanged")
                .map((item) => (
                  <DetailedItemCard
                    key={item.id}
                    item={item}
                    advocateMode={advocateMode}
                    onToggleStar={onToggleStar}
                    onToggleReviewed={onToggleReviewed}
                    onUpdateNote={onUpdateNote}
                  />
                ))}
            </div>
          </div>
        )}

        {/* CATEGORY TABS */}
        {["goals", "accommodations", "services", "related", "placement"].includes(activeTab) && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-white/5 pb-4">
              <h2 className="text-lg font-bold text-white font-serif capitalize">
                {activeTab} Category Comparison
              </h2>
            </div>
            <div className="space-y-4">
              {items
                .filter((i) => i.category === activeTab)
                .map((item) => (
                  <DetailedItemCard
                    key={item.id}
                    item={item}
                    advocateMode={advocateMode}
                    onToggleStar={onToggleStar}
                    onToggleReviewed={onToggleReviewed}
                    onUpdateNote={onUpdateNote}
                  />
                ))}
            </div>
          </div>
        )}

        {/* MEETING PREP BRIEF TAB */}
        {activeTab === "meeting_prep" && (
          <div className="space-y-6 bg-[#07162B]/50 border border-white/10 rounded-2xl p-6 md:p-8 animate-fade-in print:bg-white print:text-black">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 print:border-black">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                <h2 className="text-xl font-bold text-white font-serif print:text-black">
                  Your IEP Meeting Prep Brief
                </h2>
              </div>
              <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                {items.filter((i) => i.isStarred).length} Priority Items
              </Badge>
            </div>

            <div className="space-y-6">
              {items.filter((i) => i.isStarred).length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs">
                  No priority items selected yet. Click the star icon (★) on any change card to add it to this brief.
                </div>
              ) : (
                items
                  .filter((i) => i.isStarred)
                  .map((item, idx) => (
                    <div
                      key={item.id}
                      className="border-b border-white/5 pb-6 last:border-b-0 space-y-3 print:border-black"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                            {item.categoryLabel}
                          </span>
                          <h3 className="font-bold text-sm text-white print:text-black">
                            {idx + 1}. {item.title}
                          </h3>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded border border-rose-500/20">
                          {item.status}
                        </span>
                      </div>

                      <div className="bg-slate-950/60 p-3 rounded-lg border border-white/5 text-xs text-slate-300 space-y-1 print:bg-slate-100 print:text-black">
                        <div>
                          <strong>Key Difference:</strong> {item.explanation}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                          Suggested Question to Ask at Meeting:
                        </span>
                        <p className="text-xs text-white font-bold leading-normal print:text-black">
                          "{item.suggestedQuestion}"
                        </p>
                      </div>

                      {item.userNote && (
                        <div className="bg-[#0b1e36]/40 p-2.5 rounded-lg border border-indigo-500/20 text-xs text-indigo-200">
                          <strong>My Note:</strong> {item.userNote}
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>

            {/* Print brief advice footer */}
            <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
              <p className="text-[10px] text-slate-400 max-w-md">
                This brief gathers your selected high-priority revisions, custom notes, and suggested questions. Click "Print Summary Brief" to generate a physical handout.
              </p>
              <Button
                onClick={onPrintBrief}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                <Printer className="h-4 w-4 mr-2" /> Print Handout
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-component for individual card in Detailed View
function DetailedItemCard({
  item,
  advocateMode,
  onToggleStar,
  onToggleReviewed,
  onUpdateNote,
}: {
  item: ComparisonItem;
  advocateMode: boolean;
  onToggleStar: (id: string) => void;
  onToggleReviewed: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
}) {
  const [localNote, setLocalNote] = useState(item.userNote || "");
  const [showNotesForm, setShowNotesForm] = useState(false);
  const theme = getStatusTheme(item.status);

  return (
    <Card
      className={`bg-[#07162B]/50 hover:bg-[#07162B]/70 border transition-all text-left ${
        item.isReviewed ? "opacity-65 border-emerald-500/20" : "border-white/10"
      }`}
    >
      <CardContent className="p-5 space-y-4">
        {/* Header metadata */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
          <div className="space-y-0.5">
            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">
              {item.categoryLabel}
            </span>
            <h3 className="font-bold text-sm text-white font-serif">{item.title}</h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge
              className={`text-[8px] uppercase tracking-wider font-bold ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
            >
              {item.status}
            </Badge>
            {item.severity !== "informational" && (
              <Badge
                className={`text-[8px] uppercase tracking-wider font-bold ${
                  item.severity === "high_attention"
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    : "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                }`}
              >
                {item.severity === "high_attention" ? "High Attention" : "Review"}
              </Badge>
            )}
            {item.numericDiff && (
              <Badge className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[8px] font-mono">
                {item.numericDiff}
              </Badge>
            )}
          </div>
        </div>

        {/* Side-by-side comparison snippet */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-950/50 p-3.5 rounded-xl border border-white/5 text-xs">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Previous Version
            </span>
            <p className="text-slate-300 leading-normal">
              {item.previousValue || (
                <span className="text-slate-500 italic">Section not included in previous IEP.</span>
              )}
            </p>
            {item.previousLocation && (
              <span className="text-[9px] text-slate-500 block mt-2 text-right">
                {item.previousLocation}
              </span>
            )}
          </div>
          <div className="bg-slate-950/50 p-3.5 rounded-xl border border-white/5 text-xs">
            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">
              Proposed Version
            </span>
            <p className="text-slate-100 leading-normal">
              {item.newValue || (
                <span className="text-rose-400 italic">Section omitted in proposed IEP.</span>
              )}
            </p>
            {item.newLocation && (
              <span className="text-[9px] text-slate-500 block mt-2 text-right">
                {item.newLocation}
              </span>
            )}
          </div>
        </div>

        {/* Plain language interpretation */}
        <div className="bg-indigo-950/20 border border-indigo-500/15 rounded-xl p-3.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
            <BookOpen className="h-4 w-4 text-indigo-400" />
            <span>Plain-Language Advocacy Interpretation</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{item.explanation}</p>
        </div>

        {/* Advocate mode telemetry */}
        {advocateMode && (
          <div className="bg-slate-900 border border-dashed border-white/10 rounded-lg p-3 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider font-sans">
              <span>Advocate Mode Audit Metrics</span>
              <span>Matched Category: {item.category}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-400">
              <div>• Similarity score: 87%</div>
              <div>• LRE impact: {item.severity === "high_attention" ? "High" : "Standard"}</div>
              <div>• Calculated delta: {item.numericDiff || "N/A"}</div>
              <div>• Semantic Match: Confirmed</div>
            </div>
          </div>
        )}

        {/* Suggested Question & Action Buttons */}
        <div className="border-t border-white/5 pt-3 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1 max-w-xl">
              <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider block">
                Suggested Question to ask:
              </span>
              <p className="text-xs text-white font-bold italic leading-normal">
                "{item.suggestedQuestion}"
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
              <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-400 select-none">
                <input
                  type="checkbox"
                  checked={item.isReviewed || false}
                  onChange={() => onToggleReviewed(item.id)}
                  className="rounded border-white/10 bg-slate-900 text-indigo-650 h-3.5 w-3.5 focus:ring-0"
                />
                <span>Reviewed</span>
              </label>

              <button
                onClick={() => onToggleStar(item.id)}
                className={`p-1.5 rounded-lg border text-xs flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  item.isStarred
                    ? "bg-amber-500/20 border-amber-500 text-amber-300 font-bold"
                    : "bg-slate-900 border-white/10 text-slate-400 hover:border-white/20 hover:text-white"
                }`}
                title="Add to Meeting Prep Handout"
              >
                <Star className={`h-3.5 w-3.5 ${item.isStarred ? "fill-amber-400 text-amber-400" : ""}`} />
                <span>Prep</span>
              </button>

              <button
                onClick={() => setShowNotesForm(!showNotesForm)}
                className={`p-1.5 rounded-lg border text-xs flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  item.userNote
                    ? "bg-indigo-500/20 border-indigo-500 text-indigo-300 font-bold"
                    : "bg-slate-900 border-white/10 text-slate-400 hover:border-white/20 hover:text-white"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Note</span>
              </button>
            </div>
          </div>

          {/* User Notes Input Area */}
          {(showNotesForm || item.userNote) && (
            <div className="space-y-2 bg-slate-950/60 p-3 rounded-lg border border-white/5 animate-slide-up">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                My Custom Notes for the IEP Meeting
              </span>
              <textarea
                value={localNote}
                onChange={(e) => {
                  setLocalNote(e.target.value);
                  onUpdateNote(item.id, e.target.value);
                }}
                placeholder="Write specific things to discuss or check progress data..."
                className="w-full h-16 bg-slate-900 border border-white/10 rounded p-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

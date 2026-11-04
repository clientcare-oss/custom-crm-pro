import React from "react";
import {
  ShieldCheck,
  Plus,
  Bookmark,
  Send,
  Save,
  GitCompare,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  AccommodationWorkspaceItem,
  RelatedSupportExistence,
} from "./intelUnitTypes";
import type { FocusedSourcePassage } from "./IntelDocumentSurface";

interface IntelAccommodationsChapterProps {
  studentName: string;
  items: AccommodationWorkspaceItem[];
  selectedItemId: string;
  onSelectItem: (id: string) => void;
  onUpdateItem: (updated: AccommodationWorkspaceItem) => void;
  onAddAccommodationSlot: () => void;
  onSaveForDiscussion: (item: AccommodationWorkspaceItem) => void;
  onSendToBlueprint: (item: AccommodationWorkspaceItem) => void;
  onOpenPriorCheck: (scopeLabel: string, currentWording: string, sourceRef: string) => void;
  onFocusPassage: (passage: FocusedSourcePassage) => void;
}

const EXISTENCE_OPTIONS: {
  value: RelatedSupportExistence;
  label: string;
  badgeText: string;
}[] = [
  {
    value: "unverified",
    label: "Unverified — Pending Full-Document Search",
    badgeText: "Unverified",
  },
  {
    value: "none_found",
    label: "No Related Support Found in Current IEP",
    badgeText: "None Found",
  },
  {
    value: "partial_or_testing_only",
    label: "Related Support Exists (Partial / Testing Only)",
    badgeText: "Partial / Testing Only",
  },
  {
    value: "exists_needs_revision",
    label: "Related Support Exists (Needs Wording/Frequency Upgrade)",
    badgeText: "Exists · Needs Upgrade",
  },
];

export function IntelAccommodationsChapter({
  studentName,
  items,
  selectedItemId,
  onSelectItem,
  onUpdateItem,
  onAddAccommodationSlot,
  onSaveForDiscussion,
  onSendToBlueprint,
  onOpenPriorCheck,
  onFocusPassage,
}: IntelAccommodationsChapterProps) {
  const activeItem =
    items.find((i) => i.id === selectedItemId) || items[0];

  return (
    <div className="space-y-4">
      {/* ── Top Chapter Header & Secondary Prior-IEP Check Action ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#3A2C18]/80">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#DFBE77]" />
            <h3 className="text-sm sm:text-base font-serif font-bold text-[#FFF4D4]">
              Accommodations &amp; Classroom Supports
            </h3>
          </div>
          <p className="text-[11px] text-[#A69371]">
            Inspect current documented supports, link suggested accommodations to documented needs, and verify whether related supports already exist.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onOpenPriorCheck(
                activeItem?.category
                  ? `Accommodations · ${activeItem.category}`
                  : "Accommodations & Classroom Supports",
                activeItem?.currentDocumentedSupport || "",
                activeItem?.sourceReference || ""
              )
            }
            className="h-7 px-2.5 text-[11px] border-[#3A2C18] bg-[#020A1E] text-[#D8C7A5] hover:bg-[#081C3A] hover:text-[#FFF4D4] hover:border-[#C5A059]/60 cursor-pointer gap-1.5"
          >
            <GitCompare className="h-3.5 w-3.5 text-[#DFBE77]" />
            <span>Check against previous IEP</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddAccommodationSlot}
            className="h-7 px-2.5 text-[11px] border-[#3A2C18] bg-[#04112B] text-[#FFE394] hover:border-[#C5A059] cursor-pointer gap-1"
          >
            <Plus className="h-3.5 w-3.5 text-[#DFBE77]" />
            <span>New Accommodation Entry</span>
          </Button>
        </div>
      </div>

      {/* ── Accommodation Item Selector Rail ── */}
      <div className="rounded-xl bg-[#01071A] border border-[#3A2C18]/80 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-serif font-bold uppercase tracking-wider text-[#C6B697]">
            Accommodation Review Slots ({items.length})
          </span>
          <span className="text-[10.5px] text-[#8EA6C9]">
            Full-document search before missing flags connects in Phase 2
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Select accommodation to inspect">
          {items.map((item, idx) => {
            const isSelected = item.id === activeItem?.id;
            const statusMeta = EXISTENCE_OPTIONS.find(
              (o) => o.value === item.relatedSupportStatus
            );
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => onSelectItem(item.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-2",
                  isSelected
                    ? "bg-gradient-to-b from-[#102752] to-[#081633] border-[#C5A059] text-[#FFF4D4] shadow-[0_2px_10px_rgba(0,0,0,0.6)]"
                    : "bg-[#000820] border-[#263859] text-[#A69371] hover:text-[#FFF4D4] hover:border-[#3A5688]"
                )}
              >
                <span className="font-mono text-[10.5px] text-[#DFBE77]">
                  A{idx + 1}
                </span>
                <span className="truncate max-w-[165px]">
                  {item.suggestedAccommodation || item.category || `Support Slot ${idx + 1}`}
                </span>
                {item.sentToBlueprint ? (
                  <Badge className="bg-emerald-950/90 text-emerald-300 border-emerald-500/40 text-[9px] px-1 py-0">
                    In Blueprint
                  </Badge>
                ) : (
                  <span className="text-[9.5px] text-[#8EA6C9]/80 font-mono">
                    {statusMeta?.badgeText}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Accommodation Focused Review Surface ── */}
      {activeItem && (
        <div className="rounded-xl bg-[#020A1E]/95 border border-[#3A2C18] p-4 space-y-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
          {/* 1. Current Documented Supports & Source Location */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-serif font-bold uppercase tracking-wider text-[#FFE394]">
                1. Current Documented Supports
              </span>
              {activeItem.sourceReference && (
                <button
                  type="button"
                  onClick={() => {
                    const parsedNum = parseInt(
                      activeItem.sourceReference.replace(/[^0-9]/g, ""),
                      10
                    );
                    onFocusPassage({
                      chapterLabel: "Accommodations",
                      pageLabel: activeItem.sourceReference,
                      pageNumber: !isNaN(parsedNum) ? parsedNum : undefined,
                      quote: activeItem.currentDocumentedSupport || undefined,
                      sectionRef: activeItem.category || "Accommodations",
                    });
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0A1E40] border border-[#3E68A8]/60 text-[10.5px] font-mono text-[#FFE394] hover:border-[#C5A059] cursor-pointer"
                  title="Focus this reference in the Source Document Viewer"
                >
                  <Bookmark className="h-3 w-3 text-[#DFBE77]" />
                  <span>{activeItem.sourceReference}</span>
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10.5px] text-[#A69371] font-semibold mb-1 block">
                  Support Category
                </label>
                <Input
                  value={activeItem.category}
                  onChange={(e) =>
                    onUpdateItem({ ...activeItem, category: e.target.value })
                  }
                  placeholder="e.g., Environmental / Sensory, Instructional, Testing, Assistive Tech..."
                  className="h-8 text-xs bg-[#000820] border-[#283B5E] text-[#FFF4D4] placeholder:text-[#8EA6C9]/45"
                />
              </div>

              <div>
                <label className="text-[10.5px] text-[#A69371] font-semibold mb-1 block">
                  Source Page &amp; Section Reference
                </label>
                <Input
                  value={activeItem.sourceReference}
                  onChange={(e) =>
                    onUpdateItem({ ...activeItem, sourceReference: e.target.value })
                  }
                  placeholder="e.g., Page 12 · Section VIII (Accommodations)"
                  className="h-8 text-xs bg-[#000820] border-[#283B5E] text-[#FFF4D4] placeholder:text-[#8EA6C9]/45"
                />
              </div>
            </div>

            <div>
              <label className="text-[10.5px] text-[#A69371] font-semibold mb-1 block">
                Current Documented Support in IEP
              </label>
              <Textarea
                value={activeItem.currentDocumentedSupport}
                onChange={(e) =>
                  onUpdateItem({
                    ...activeItem,
                    currentDocumentedSupport: e.target.value,
                  })
                }
                rows={2}
                placeholder={`No current accommodation text extracted for ${studentName} yet. Select an IEP for Phase 2 extraction or record the current IEP language here...`}
                className="text-xs bg-[#000820] border-[#283B5E] text-[#FFF4D4] font-serif placeholder:text-[#8EA6C9]/45"
              />
            </div>
          </div>

          {/* 2. Whether Related Support Already Exists */}
          <div className="space-y-2 pt-2 border-t border-[#3A2C18]/60">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-serif font-bold uppercase tracking-wider text-[#FFE394] flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-[#DFBE77]" />
                <span>2. Whether Related Support Already Exists</span>
              </span>
              <span className="text-[10.5px] text-[#8EA6C9]">
                Verify across all IEP sections before flagging as missing
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EXISTENCE_OPTIONS.map((opt) => {
                const isSelected = activeItem.relatedSupportStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      onUpdateItem({
                        ...activeItem,
                        relatedSupportStatus: opt.value,
                      })
                    }
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left text-xs transition-all cursor-pointer flex items-center justify-between gap-2",
                      isSelected
                        ? "bg-[#0A1E42] border-[#C5A059] text-[#FFF4D4] font-semibold shadow-xs"
                        : "bg-[#000820] border-[#24385B] text-[#A69371] hover:border-[#3A5688] hover:text-[#FFF4D4]"
                    )}
                  >
                    <span>{opt.label}</span>
                    {isSelected ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#DFBE77] shrink-0" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-[#8EA6C9]/40 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Suggested Accommodation & Documented Need Supporting It */}
          <div className="space-y-2.5 pt-2 border-t border-[#3A2C18]/60">
            <span className="text-xs font-serif font-bold uppercase tracking-wider text-[#FFE394] block">
              3. Suggested Accommodation &amp; Supporting Need
            </span>

            <div>
              <label className="text-[10.5px] text-[#A69371] font-semibold mb-1 block">
                Suggested Accommodation Title / Summary
              </label>
              <Input
                value={activeItem.suggestedAccommodation}
                onChange={(e) =>
                  onUpdateItem({
                    ...activeItem,
                    suggestedAccommodation: e.target.value,
                  })
                }
                placeholder="e.g., Proactive sensory regulation breaks & quiet testing/transition environment"
                className="h-8 text-xs bg-[#000820] border-[#283B5E] text-[#FFF4D4] placeholder:text-[#8EA6C9]/45"
              />
            </div>

            <div>
              <label className="text-[10.5px] text-[#A69371] font-semibold mb-1 block">
                Documented Need Supporting This Suggestion (Present Levels / Evaluation Evidence)
              </label>
              <Textarea
                value={activeItem.documentedNeed}
                onChange={(e) =>
                  onUpdateItem({
                    ...activeItem,
                    documentedNeed: e.target.value,
                  })
                }
                rows={2}
                placeholder="Cite the documented student need in Present Levels, evaluations, or parent observations supporting this accommodation..."
                className="text-xs bg-[#000820] border-[#283B5E] text-[#FFF4D4] placeholder:text-[#8EA6C9]/45"
              />
            </div>
          </div>

          {/* 4. Editable Proposed Wording */}
          <div className="space-y-2 pt-2 border-t border-[#3A2C18]/60">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-serif font-bold uppercase tracking-wider text-[#FFE394]">
                4. Editable Proposed IEP Wording
              </span>
              <span className="text-[10.5px] text-[#8EA6C9]">
                Specify exact trigger, setting, frequency, and staff role
              </span>
            </div>

            <Textarea
              value={activeItem.proposedWording}
              onChange={(e) =>
                onUpdateItem({
                  ...activeItem,
                  proposedWording: e.target.value,
                })
              }
              rows={3}
              placeholder="Write or refine the exact accommodation wording to propose for the IEP team..."
              className="text-xs bg-[#000820] border-[#2C446E] text-[#FFF4D4] font-serif leading-relaxed placeholder:text-[#8EA6C9]/45"
            />
          </div>

          {/* 5. Footer Actions: Save for Discussion & Send to Blueprint */}
          <div className="pt-3 border-t border-[#3A2C18] flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] text-[#A69371]">
              {activeItem.savedToDiscussion ? (
                <span className="text-emerald-300 font-medium">
                  ✓ Saved to workspace discussion findings
                </span>
              ) : (
                <span>Save accommodation notes or send proposed wording directly to the Blueprint.</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onSaveForDiscussion(activeItem)}
                className="h-8 px-3 text-xs border-[#3A2C18] bg-[#000820] text-[#FFF4D4] hover:border-[#C5A059] cursor-pointer gap-1.5"
              >
                <Save className="h-3.5 w-3.5 text-[#DFBE77]" />
                <span>Save for Discussion</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => onSendToBlueprint(activeItem)}
                className="h-8 px-3.5 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-md cursor-pointer hover:brightness-105 gap-1.5"
              >
                <Send className="h-3.5 w-3.5 text-[#07162B]" />
                <span>
                  {activeItem.sentToBlueprint ? "Update in Blueprint" : "Send to Blueprint"}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


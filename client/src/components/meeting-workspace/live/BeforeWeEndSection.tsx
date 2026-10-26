import React, { useState } from "react";
import {
  CheckCircle2,
  CheckSquare,
  XCircle,
  RotateCcw,
  ArrowRight,
  AlertCircle,
  Calendar as CalendarIcon,
  MessageSquare,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Clock,
  Sparkles,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  BeforeWeEndItem,
  BeforeWeEndStatus,
  ParkingLotItem,
  CloseoutChecks,
} from "../types";
import { formatMeetingTime } from "./approvalEngine";

interface BeforeWeEndSectionProps {
  items: BeforeWeEndItem[];
  parkingLot: ParkingLotItem[];
  onUpdateItems: (items: BeforeWeEndItem[]) => void;
  onApproveItem: (
    sourceType: "before_we_end",
    sourceId: string,
    title: string,
    details?: string
  ) => void;
  onWithdrawApproval: (sourceId: string, newStatus: string) => void;
  onUpdateItemMetadata: (
    sourceId: string,
    metadata: {
      responsiblePerson?: string;
      deadlineDate?: string;
      conditionNote?: string;
    }
  ) => void;
}

export function BeforeWeEndSection({
  items,
  parkingLot,
  onUpdateItems,
  onApproveItem,
  onWithdrawApproval,
  onUpdateItemMetadata,
}: BeforeWeEndSectionProps) {
  const [inputVal, setInputVal] = useState("");
  const [filterTab, setFilterTab] = useState<"NEEDS_RESOLUTION" | "ALL" | "APPROVED" | "OTHER">("NEEDS_RESOLUTION");
  
  // Inline edit state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState("");

  // Contextual controls popover states (Calendar & Notes)
  const [openCalendarId, setOpenCalendarId] = useState<string | null>(null);
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);

  // Metadata form values
  const [metaPerson, setMetaPerson] = useState("");
  const [metaDeadline, setMetaDeadline] = useState("");
  const [metaNote, setMetaNote] = useState("");

  const handleAddItem = () => {
    const text = inputVal.trim();
    if (!text) return;

    const newItem: BeforeWeEndItem = {
      id: `bwe-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text,
      status: "UNRESOLVED",
      createdAt: formatMeetingTime(),
    };

    onUpdateItems([...items, newItem]);
    setInputVal("");
  };

  const handleStatusClick = (item: BeforeWeEndItem, newStatus: BeforeWeEndStatus) => {
    const previousStatus = item.status;
    const finalStatus = previousStatus === newStatus ? "UNRESOLVED" : newStatus;

    const updated = items.map((i) => {
      if (i.id === item.id) {
        return {
          ...i,
          status: finalStatus,
          approvedAt: finalStatus === "APPROVED" ? formatMeetingTime() : undefined,
        };
      }
      return i;
    });

    onUpdateItems(updated);

    if (finalStatus === "APPROVED") {
      // 1-click Approval: Immediately records into Meeting Minutes & Document Check
      onApproveItem("before_we_end", item.id, item.text, item.conditionNote);
    } else if (previousStatus === "APPROVED") {
      // Withdrawal: Updates linked minutes & marks document check as WITHDRAWN
      onWithdrawApproval(item.id, finalStatus);
    }
  };

  const handleDeleteItem = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item && item.status === "APPROVED") {
      onWithdrawApproval(id, "DELETED");
    }
    onUpdateItems(items.filter((i) => i.id !== id));
  };

  const handleStartEdit = (item: BeforeWeEndItem) => {
    setEditingItemId(item.id);
    setEditingItemText(item.text);
  };

  const handleSaveEdit = (id: string) => {
    if (editingItemText.trim()) {
      onUpdateItems(
        items.map((i) =>
          i.id === id ? { ...i, text: editingItemText.trim() } : i
        )
      );
    }
    setEditingItemId(null);
  };

  const handleOpenCalendar = (item: BeforeWeEndItem) => {
    setOpenCalendarId(openCalendarId === item.id ? null : item.id);
    setOpenNoteId(null);
    setMetaPerson(item.responsiblePerson || "");
    setMetaDeadline(item.deadlineDate || "");
  };

  const handleSaveCalendar = (item: BeforeWeEndItem) => {
    const updated = items.map((i) =>
      i.id === item.id
        ? {
            ...i,
            responsiblePerson: metaPerson.trim() || undefined,
            deadlineDate: metaDeadline.trim() || undefined,
          }
        : i
    );
    onUpdateItems(updated);
    onUpdateItemMetadata(item.id, {
      responsiblePerson: metaPerson.trim() || undefined,
      deadlineDate: metaDeadline.trim() || undefined,
    });
    setOpenCalendarId(null);
  };

  const handleOpenNote = (item: BeforeWeEndItem) => {
    setOpenNoteId(openNoteId === item.id ? null : item.id);
    setOpenCalendarId(null);
    setMetaNote(item.conditionNote || "");
  };

  const handleSaveNote = (item: BeforeWeEndItem) => {
    const updated = items.map((i) =>
      i.id === item.id ? { ...i, conditionNote: metaNote.trim() || undefined } : i
    );
    onUpdateItems(updated);
    onUpdateItemMetadata(item.id, {
      conditionNote: metaNote.trim() || undefined,
    });
    setOpenNoteId(null);
  };

  // Status counts for tab filters
  const unresolvedCount = items.filter(
    (i) => i.status === "UNRESOLVED" || i.status === "FOLLOW_UP" || i.status === "DEFERRED"
  ).length;
  const approvedCount = items.filter((i) => i.status === "APPROVED").length;
  const otherCount = items.filter(
    (i) => i.status === "DISCUSSED" || i.status === "DENIED"
  ).length;

  const filteredItems = items.filter((item) => {
    if (filterTab === "NEEDS_RESOLUTION") {
      return item.status === "UNRESOLVED" || item.status === "FOLLOW_UP" || item.status === "DEFERRED";
    }
    if (filterTab === "APPROVED") {
      return item.status === "APPROVED";
    }
    if (filterTab === "OTHER") {
      return item.status === "DISCUSSED" || item.status === "DENIED";
    }
    return true; // "ALL"
  });

  return (
    <div className="rounded-xl bg-[#05142B]/90 border border-[#3A2C18] p-4 sm:p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85)] space-y-4">
      {/* Header and Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#3A2C18] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-serif font-black text-[#FFF4D4] tracking-wide">
              ⚓ Before We End — Final Items to Resolve
            </span>
            <Badge className="text-[10px] bg-[#020A17] border border-[#3A2C18] text-[#DFBE77] font-mono">
              {items.length} Total
            </Badge>
          </div>
          <p className="text-xs text-[#C6B697] mt-0.5">
            Clarify and record agreements before adjourning. Approvals automatically flow to Meeting Minutes & Document Check.
          </p>
        </div>

        {/* Filter Tabs for quick ADHD navigation */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#020A17] border border-[#3A2C18] self-start sm:self-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterTab("NEEDS_RESOLUTION")}
            className={cn(
              "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1.5",
              filterTab === "NEEDS_RESOLUTION"
                ? "bg-amber-950/80 text-amber-200 border border-amber-500/50 shadow-sm"
                : "text-[#A69371] hover:text-[#FFF4D4]"
            )}
          >
            <span>Needs Resolution</span>
            {unresolvedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500/30 text-amber-200 font-mono">
                {unresolvedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFilterTab("ALL")}
            className={cn(
              "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer",
              filterTab === "ALL"
                ? "bg-[#05142B] text-[#FFF4D4] border border-[#3A2C18]"
                : "text-[#A69371] hover:text-[#FFF4D4]"
            )}
          >
            All ({items.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab("APPROVED")}
            className={cn(
              "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1.5",
              filterTab === "APPROVED"
                ? "bg-emerald-950/80 text-emerald-200 border border-emerald-500/50"
                : "text-[#A69371] hover:text-[#FFF4D4]"
            )}
          >
            <span>Approved</span>
            {approvedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-500/30 text-emerald-200 font-mono">
                {approvedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFilterTab("OTHER")}
            className={cn(
              "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer",
              filterTab === "OTHER"
                ? "bg-blue-950/80 text-blue-200 border border-blue-500/50"
                : "text-[#A69371] hover:text-[#FFF4D4]"
            )}
          >
            Other ({otherCount})
          </button>
        </div>
      </div>

      {/* Quick Add Bar */}
      <div className="flex items-center gap-2">
        <Input
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
          placeholder="Add a point or question to resolve before ending (e.g. 'Confirm date for draft IEP review')..."
          className="h-9 text-xs bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] placeholder:text-[#A69371]"
        />
        <Button
          size="sm"
          onClick={handleAddItem}
          disabled={!inputVal.trim()}
          className="h-9 px-3.5 text-xs bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shrink-0 cursor-pointer shadow-sm hover:brightness-105"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Item
        </Button>
      </div>

      {/* Parked Items Context Note if any */}
      {parkingLot.length > 0 && (
        <div className="p-2.5 rounded-lg bg-[#020A17] border border-[#3A2C18]/60 flex items-center justify-between text-xs text-[#C6B697]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#FFE394]">🅿 Parked during session:</span>
            <span>{parkingLot.length} parking lot thought(s)</span>
          </div>
          <span className="text-[11px] text-[#A69371]">Review before closing meeting</span>
        </div>
      )}

      {/* Items List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-[#3A2C18]/60 bg-[#020A17]/40 text-center">
            <p className="text-xs font-semibold text-[#FFF4D4]">
              {filterTab === "NEEDS_RESOLUTION"
                ? "No unresolved items remaining! Everything is either Approved or Discussed."
                : "No items in this view."}
            </p>
            <p className="text-[11px] text-[#A69371] mt-1">
              Add items above or convert scratch notes from the Scratch Pad.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                "p-3.5 rounded-xl border transition-all space-y-2.5",
                item.status === "APPROVED"
                  ? "bg-[#021815]/80 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.12)]"
                  : item.status === "DENIED"
                  ? "bg-[#18080C]/80 border-rose-500/40"
                  : item.status === "FOLLOW_UP"
                  ? "bg-[#1A1205]/80 border-amber-500/40"
                  : "bg-[#020A17] border-[#3A2C18] hover:border-[#DFBE77]/40"
              )}
            >
              {/* Top row: Item Text & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                <div className="flex-1 min-w-0">
                  {editingItemId === item.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editingItemText}
                        onChange={(e) => setEditingItemText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(item.id);
                          if (e.key === "Escape") setEditingItemId(null);
                        }}
                        className="h-8 text-xs bg-[#000820] border-[#DFBE77] text-white"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(item.id)}
                        className="h-8 px-2.5 text-xs bg-emerald-600 text-white"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingItemId(null)}
                        className="h-8 px-2 text-xs text-slate-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-[13px] font-bold text-[#FFF4D4] leading-snug">
                          {item.text}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          className="text-[#A69371] hover:text-[#DFBE77] p-0.5 rounded cursor-pointer transition-colors"
                          title="Edit text"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Display assigned deadline or responsible person clearly beside item */}
                      {(item.deadlineDate || item.responsiblePerson || item.conditionNote) && (
                        <div className="flex items-center gap-2 text-[11px] text-[#FFE394] font-medium flex-wrap pt-0.5">
                          {item.deadlineDate && (
                            <span className="inline-flex items-center gap-1 bg-[#05142B] border border-[#3A2C18] px-2 py-0.5 rounded text-[#DFBE77]">
                              <CalendarIcon className="w-3 h-3" />
                              <span>by {item.deadlineDate}</span>
                            </span>
                          )}
                          {item.responsiblePerson && (
                            <span className="inline-flex items-center gap-1 bg-[#05142B] border border-[#3A2C18] px-2 py-0.5 rounded text-blue-200">
                              <span>Lead: {item.responsiblePerson}</span>
                            </span>
                          )}
                          {item.conditionNote && (
                            <span className="inline-flex items-center gap-1 bg-[#05142B] border border-[#3A2C18] px-2 py-0.5 rounded text-slate-300 italic">
                              <MessageSquare className="w-3 h-3 text-[#DFBE77]" />
                              <span>"{item.conditionNote}"</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right controls: Contextual Icons (Calendar, Note) + Delete */}
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                  {item.status === "APPROVED" && (
                    <>
                      {/* Contextual Calendar Trigger */}
                      <button
                        type="button"
                        onClick={() => handleOpenCalendar(item)}
                        className={cn(
                          "px-2 py-1 rounded text-[11px] font-semibold border inline-flex items-center gap-1 cursor-pointer transition-all",
                          openCalendarId === item.id || item.deadlineDate || item.responsiblePerson
                            ? "bg-amber-950/70 border-amber-500/60 text-[#FFE394]"
                            : "bg-[#05142B] border-[#3A2C18] text-[#C6B697] hover:border-[#DFBE77]"
                        )}
                        title="Add/edit responsible person & deadline"
                      >
                        <CalendarIcon className="w-3 h-3 text-[#DFBE77]" />
                        <span>{item.deadlineDate ? item.deadlineDate : "+ Deadline"}</span>
                      </button>

                      {/* Contextual Note Trigger */}
                      <button
                        type="button"
                        onClick={() => handleOpenNote(item)}
                        className={cn(
                          "px-2 py-1 rounded text-[11px] font-semibold border inline-flex items-center gap-1 cursor-pointer transition-all",
                          openNoteId === item.id || item.conditionNote
                            ? "bg-blue-950/70 border-blue-500/60 text-blue-200"
                            : "bg-[#05142B] border-[#3A2C18] text-[#C6B697] hover:border-[#DFBE77]"
                        )}
                        title="Add/edit conditions or team's exact wording"
                      >
                        <MessageSquare className="w-3 h-3 text-blue-400" />
                        <span>{item.conditionNote ? "Condition" : "+ Note"}</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Contextual Calendar Form Popover/Expander */}
              {openCalendarId === item.id && (
                <div className="p-3 rounded-lg bg-[#000820] border border-amber-500/40 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#FFE394]">
                      📅 Assign Follow-Through & Deadline
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpenCalendarId(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      value={metaPerson}
                      onChange={(e) => setMetaPerson(e.target.value)}
                      placeholder="Responsible Person (e.g. Case Manager, OT)..."
                      className="h-8 text-xs bg-[#020A17] border-[#3A2C18] text-white"
                    />
                    <Input
                      value={metaDeadline}
                      onChange={(e) => setMetaDeadline(e.target.value)}
                      placeholder="Deadline or Start Date (e.g. Oct 30, 2026)..."
                      className="h-8 text-xs bg-[#020A17] border-[#3A2C18] text-white"
                    />
                  </div>
                  <div className="flex justify-end gap-1.5 pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleSaveCalendar(item)}
                      className="h-7 px-3 text-[11px] bg-gradient-to-r from-[#DFBE77] to-[#C5A059] text-[#07162B] font-bold"
                    >
                      Save Deadline
                    </Button>
                  </div>
                </div>
              )}

              {/* Contextual Note Form Popover/Expander */}
              {openNoteId === item.id && (
                <div className="p-3 rounded-lg bg-[#000820] border border-blue-500/40 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-200">
                      📝 Capture Conditions or Exact Phrasing
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpenNoteId(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <Input
                    value={metaNote}
                    onChange={(e) => setMetaNote(e.target.value)}
                    placeholder="Enter conditions, exact IEP phrasing agreed, or details..."
                    className="h-8 text-xs bg-[#020A17] border-[#3A2C18] text-white"
                  />
                  <div className="flex justify-end gap-1.5 pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleSaveNote(item)}
                      className="h-7 px-3 text-[11px] bg-blue-600 hover:bg-blue-500 text-white font-bold"
                    >
                      Save Note
                    </Button>
                  </div>
                </div>
              )}

              {/* Bottom Situation / Status Buttons — Consistent with IEP targets */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[#3A2C18]/40">
                {/* 1. APPROVED (Immediate Minutes + Doc Check Entry) */}
                <button
                  type="button"
                  onClick={() => handleStatusClick(item, "APPROVED")}
                  className={cn(
                    "px-2.5 py-1 rounded-md border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all",
                    item.status === "APPROVED"
                      ? "bg-emerald-950 text-emerald-200 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                      : "bg-[#020A17] border-[#3A2C18] text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300"
                  )}
                  title="Team agreed to this item (instantly records into Minutes & Document Check)"
                >
                  <CheckCircle2
                    className={cn(
                      "w-3.5 h-3.5",
                      item.status === "APPROVED" ? "text-emerald-400" : "text-slate-500"
                    )}
                  />
                  <span>Approved</span>
                </button>

                {/* 2. DISCUSSED */}
                <button
                  type="button"
                  onClick={() => handleStatusClick(item, "DISCUSSED")}
                  className={cn(
                    "px-2.5 py-1 rounded-md border text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-all",
                    item.status === "DISCUSSED"
                      ? "bg-blue-950 text-blue-200 border-blue-400 font-bold"
                      : "bg-[#020A17] border-[#3A2C18] text-slate-400 hover:border-blue-400/50 hover:text-blue-200"
                  )}
                >
                  <CheckSquare
                    className={cn(
                      "w-3.5 h-3.5",
                      item.status === "DISCUSSED" ? "text-blue-400" : "text-slate-500"
                    )}
                  />
                  <span>Discussed</span>
                </button>

                {/* 3. DENIED */}
                <button
                  type="button"
                  onClick={() => handleStatusClick(item, "DENIED")}
                  className={cn(
                    "px-2.5 py-1 rounded-md border text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-all",
                    item.status === "DENIED"
                      ? "bg-rose-950 text-rose-200 border-rose-400 font-bold"
                      : "bg-[#020A17] border-[#3A2C18] text-slate-400 hover:border-rose-400/50 hover:text-rose-200"
                  )}
                >
                  <XCircle
                    className={cn(
                      "w-3.5 h-3.5",
                      item.status === "DENIED" ? "text-rose-400" : "text-slate-500"
                    )}
                  />
                  <span>Denied</span>
                </button>

                {/* 4. DEFERRED */}
                <button
                  type="button"
                  onClick={() => handleStatusClick(item, "DEFERRED")}
                  className={cn(
                    "px-2.5 py-1 rounded-md border text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-all",
                    item.status === "DEFERRED"
                      ? "bg-purple-950 text-purple-200 border-purple-400 font-bold"
                      : "bg-[#020A17] border-[#3A2C18] text-slate-400 hover:border-purple-400/50 hover:text-purple-200"
                  )}
                >
                  <RotateCcw
                    className={cn(
                      "w-3.5 h-3.5",
                      item.status === "DEFERRED" ? "text-purple-400" : "text-slate-500"
                    )}
                  />
                  <span>Deferred</span>
                </button>

                {/* 5. FOLLOW-UP */}
                <button
                  type="button"
                  onClick={() => handleStatusClick(item, "FOLLOW_UP")}
                  className={cn(
                    "px-2.5 py-1 rounded-md border text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-all",
                    item.status === "FOLLOW_UP"
                      ? "bg-amber-950 text-amber-200 border-amber-400 font-bold"
                      : "bg-[#020A17] border-[#3A2C18] text-slate-400 hover:border-amber-400/50 hover:text-amber-200"
                  )}
                >
                  <ArrowRight
                    className={cn(
                      "w-3.5 h-3.5",
                      item.status === "FOLLOW_UP" ? "text-amber-400" : "text-slate-500"
                    )}
                  />
                  <span>Follow-Up</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

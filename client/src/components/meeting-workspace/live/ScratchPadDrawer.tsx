import React, { useState, useRef } from "react";
import {
  FileText,
  X,
  Plus,
  ArrowRight,
  Trash2,
  Pencil,
  Check,
  CheckCircle2,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ScratchNote, BeforeWeEndItem, CloseoutChecks, MeetingTimelineEvent } from "../types";
import { formatMeetingTime } from "./approvalEngine";
import { toast } from "sonner";

interface ScratchPadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  scratchNotes: ScratchNote[];
  beforeWeEndItems: BeforeWeEndItem[];
  onUpdateScratchNotes: (notes: ScratchNote[]) => void;
  onUpdateBeforeWeEndItems: (items: BeforeWeEndItem[]) => void;
  onAddTimelineEvent?: (event: MeetingTimelineEvent) => void;
}

export function ScratchPadDrawer({
  isOpen,
  onClose,
  scratchNotes,
  beforeWeEndItems,
  onUpdateScratchNotes,
  onUpdateBeforeWeEndItems,
  onAddTimelineEvent,
}: ScratchPadDrawerProps) {
  const [quickInput, setQuickInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Fast uninterrupted note capture
  const handleAddNote = () => {
    const trimmed = quickInput.trim();
    if (!trimmed) return;

    const newNote: ScratchNote = {
      id: `sn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: trimmed,
      createdAt: formatMeetingTime(),
      movedToBeforeWeEnd: false,
    };

    onUpdateScratchNotes([newNote, ...scratchNotes]);
    setQuickInput("");
    // Keep focus in input for rapid-fire typing
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddNote();
    }
  };

  // Turn note directly into a "Before We End" item without copy-paste
  const handleConvertToBeforeWeEnd = (note: ScratchNote) => {
    const existing = beforeWeEndItems.find((b) => b.sourceNoteId === note.id);
    if (existing) {
      toast.info("This note is already in Before We End");
      return;
    }

    const newItem: BeforeWeEndItem = {
      id: `bwe-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: note.text,
      status: "UNRESOLVED",
      sourceNoteId: note.id,
      createdAt: formatMeetingTime(),
    };

    onUpdateBeforeWeEndItems([...beforeWeEndItems, newItem]);

    // Mark note as converted
    const updatedNotes = scratchNotes.map((n) =>
      n.id === note.id ? { ...n, movedToBeforeWeEnd: true } : n
    );
    onUpdateScratchNotes(updatedNotes);

    if (onAddTimelineEvent) {
      onAddTimelineEvent({
        id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sourceId: newItem.id,
        sourceType: "before_we_end",
        timestamp: formatMeetingTime(),
        type: "NOTE_CONVERTED",
        title: `Added to Before We End`,
        description: note.text,
      });
    }

    toast.success("Added to 'Before We End' agenda!");
  };

  const handleDeleteNote = (id: string) => {
    onUpdateScratchNotes(scratchNotes.filter((n) => n.id !== id));
  };

  const handleStartEdit = (note: ScratchNote) => {
    setEditingId(note.id);
    setEditText(note.text);
  };

  const handleSaveEdit = (id: string) => {
    if (editText.trim()) {
      onUpdateScratchNotes(
        scratchNotes.map((n) =>
          n.id === id ? { ...n, text: editText.trim() } : n
        )
      );
    }
    setEditingId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-[#000820] border-l border-[#3A2C18] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-[#3A2C18] bg-[#05142B]/90 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#020A17] border border-[#3A2C18] flex items-center justify-center text-[#FFE394]">
            <FileText className="w-4 h-4 text-[#DFBE77]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-serif font-black text-[#FFF4D4] tracking-wide">
                Live Scratch Pad
              </h3>
              <Badge className="text-[10px] bg-[#020A17] border border-[#3A2C18] text-[#DFBE77] font-mono">
                {scratchNotes.length}
              </Badge>
            </div>
            <p className="text-[11px] text-[#A69371]">
              Capture verbatim words, side quotes, or quick questions
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg border border-[#3A2C18] bg-[#020A17] text-[#C6B697] hover:text-white hover:border-[#DFBE77]/60 cursor-pointer transition-colors"
          title="Close Scratch Pad"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Input Bar (Fast, uninterrupted ADHD-friendly typing) */}
      <div className="p-3.5 border-b border-[#3A2C18]/80 bg-[#020A17]/95">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type quick thought, press Enter to save..."
            className="h-9 text-xs bg-[#000820] border-[#3A2C18] text-[#FFF4D4] placeholder:text-[#A69371]/70 focus-visible:ring-[#DFBE77]"
            autoFocus
          />
          <Button
            size="sm"
            onClick={handleAddNote}
            disabled={!quickInput.trim()}
            className="h-9 px-3 text-xs bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shrink-0 cursor-pointer shadow-sm hover:brightness-105"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add
          </Button>
        </div>
        <p className="text-[10px] text-[#A69371] mt-1.5 flex items-center justify-between">
          <span>Autosaved continuously to meeting workspace</span>
          <span className="font-mono text-[9.5px]">Press Enter to add</span>
        </p>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {scratchNotes.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 rounded-xl border border-dashed border-[#3A2C18]/60 bg-[#05142B]/40">
            <Sparkles className="w-8 h-8 text-[#DFBE77]/40 mb-2" />
            <p className="text-xs font-semibold text-[#FFF4D4]">Scratch Pad is Empty</p>
            <p className="text-[11px] text-[#A69371] max-w-[260px] mt-1">
              Jot down thoughts, exact phrasing, or questions anytime. You can turn any note into a "Before We End" item with one click.
            </p>
          </div>
        ) : (
          scratchNotes.map((note) => (
            <div
              key={note.id}
              className={cn(
                "p-3 rounded-xl border transition-all text-xs flex flex-col gap-2 group",
                note.movedToBeforeWeEnd
                  ? "bg-[#05142B]/50 border-emerald-500/30 text-slate-200"
                  : "bg-[#05142B]/90 border-[#3A2C18] text-[#FFF4D4] hover:border-[#DFBE77]/50 shadow-md"
              )}
            >
              {editingId === note.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="min-h-[60px] text-xs bg-[#000820] border-[#DFBE77] text-white p-2 rounded"
                    autoFocus
                  />
                  <div className="flex justify-end gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(note.id)}
                      className="h-7 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(null)}
                      className="h-7 px-2 text-[11px] text-slate-400"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <p className="leading-relaxed whitespace-pre-wrap flex-1 break-words">
                      {note.text}
                    </p>
                    <span className="text-[10px] text-[#A69371] font-mono shrink-0">
                      {note.createdAt}
                    </span>
                  </div>

                  {/* Note Action Toolbar */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#3A2C18]/40">
                    <div className="flex items-center gap-1.5">
                      {note.movedToBeforeWeEnd ? (
                        <span className="text-[10px] font-bold text-emerald-400 inline-flex items-center gap-1 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          In Before We End
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleConvertToBeforeWeEnd(note)}
                          className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#020A17] border border-[#3A2C18] text-[#DFBE77] hover:text-[#FFF4D4] hover:border-[#DFBE77] inline-flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                          title="Convert this note into a Before We End action item"
                        >
                          <span>→ Before We End</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(note)}
                        className="p-1 rounded text-[#A69371] hover:text-[#DFBE77] hover:bg-[#020A17] transition-colors cursor-pointer"
                        title="Edit note"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 rounded text-[#A69371] hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title="Delete note"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer hint */}
      <div className="p-3 border-t border-[#3A2C18] bg-[#020A17] text-center text-[10.5px] text-[#A69371]">
        Items added to <span className="text-[#FFE394] font-bold">Before We End</span> are tracked until resolved or approved before meeting adjournment.
      </div>
    </div>
  );
}

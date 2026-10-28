import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Plus,
  ArrowRight,
  Trash2,
  Pencil,
  Check,
  X,
  Clock,
  Sparkles,
  ShieldAlert,
  Save,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ScratchNote, BeforeWeEndItem } from "../types";
import { formatMeetingTime } from "./approvalEngine";
import { toast } from "sonner";

interface MeetingScratchpadSectionProps {
  scratchpadText?: string;
  scratchNotes: ScratchNote[];
  beforeWeEndItems: BeforeWeEndItem[];
  onUpdateScratchpadText: (text: string) => void;
  onUpdateScratchNotes: (notes: ScratchNote[]) => void;
  onUpdateBeforeWeEndItems: (items: BeforeWeEndItem[]) => void;
}

export function MeetingScratchpadSection({
  scratchpadText = "",
  scratchNotes = [],
  beforeWeEndItems = [],
  onUpdateScratchpadText,
  onUpdateScratchNotes,
  onUpdateBeforeWeEndItems,
}: MeetingScratchpadSectionProps) {
  const [localText, setLocalText] = useState(scratchpadText);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync incoming prop if it changes externally
  useEffect(() => {
    setLocalText(scratchpadText || "");
  }, [scratchpadText]);

  // Debounced auto-save of running multiline scratchpad text
  useEffect(() => {
    if (localText === scratchpadText) return;

    setSaveStatus("saving");
    const timer = setTimeout(() => {
      onUpdateScratchpadText(localText);
      setSaveStatus("saved");
    }, 450);

    return () => clearTimeout(timer);
  }, [localText, scratchpadText, onUpdateScratchpadText]);

  // Inline editing state for individual captured notes
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");

  // Convert current text (or selected snippet) directly into a "Before We End" checklist item
  const handleAddToBeforeWeEndFromScratchpad = () => {
    let textToConvert = "";
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      if (start !== end) {
        textToConvert = localText.substring(start, end).trim();
      }
    }

    if (!textToConvert) {
      textToConvert = localText.trim();
    }

    if (!textToConvert) {
      toast.info("Type or select scratchpad text to add to Before We End.");
      return;
    }

    // Check for exact duplicate in Before We End
    const existing = beforeWeEndItems.find(
      (b) => b.text.toLowerCase() === textToConvert.toLowerCase()
    );
    if (existing) {
      toast.info("This item is already on the 'Before We End' checklist.");
      return;
    }

    const newItem: BeforeWeEndItem = {
      id: `bwe-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: textToConvert,
      status: "UNRESOLVED",
      completed: false,
      createdAt: formatMeetingTime(),
    };

    onUpdateBeforeWeEndItems([...beforeWeEndItems, newItem]);
    toast.success("Added to 'Before We End' checklist!");
  };

  // Capture current textarea text as a permanent discrete scratch note entry
  const handleCaptureAsNote = () => {
    const trimmed = localText.trim();
    if (!trimmed) {
      toast.info("Please enter notes before capturing.");
      return;
    }

    const newNote: ScratchNote = {
      id: `sn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: trimmed,
      createdAt: formatMeetingTime(),
      movedToBeforeWeEnd: false,
    };

    onUpdateScratchNotes([newNote, ...scratchNotes]);
    setLocalText("");
    onUpdateScratchpadText("");
    toast.success("Note captured to session scratchpad!");
  };

  // Convert a specific note card to Before We End
  const handleConvertNoteToBeforeWeEnd = (note: ScratchNote) => {
    const alreadyConverted = beforeWeEndItems.some(
      (b) => b.sourceNoteId === note.id || b.text.toLowerCase() === note.text.toLowerCase()
    );
    if (alreadyConverted) {
      toast.info("This note is already in 'Before We End'");
      return;
    }

    const newItem: BeforeWeEndItem = {
      id: `bwe-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: note.text,
      status: "UNRESOLVED",
      completed: false,
      sourceNoteId: note.id,
      createdAt: formatMeetingTime(),
    };

    onUpdateBeforeWeEndItems([...beforeWeEndItems, newItem]);

    // Mark note as moved
    onUpdateScratchNotes(
      scratchNotes.map((n) =>
        n.id === note.id ? { ...n, movedToBeforeWeEnd: true } : n
      )
    );

    toast.success("Added to 'Before We End' checklist!");
  };

  // Edit / Delete individual captured notes
  const handleStartEditNote = (note: ScratchNote) => {
    setEditingNoteId(note.id);
    setEditingNoteText(note.text);
  };

  const handleSaveEditNote = (id: string) => {
    if (editingNoteText.trim()) {
      onUpdateScratchNotes(
        scratchNotes.map((n) =>
          n.id === id ? { ...n, text: editingNoteText.trim() } : n
        )
      );
    }
    setEditingNoteId(null);
  };

  const handleDeleteNote = (id: string) => {
    onUpdateScratchNotes(scratchNotes.filter((n) => n.id !== id));
  };

  return (
    <div className="rounded-xl bg-[#05142B]/90 border border-[#3A2C18] p-4 sm:p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85)] space-y-4">
      {/* ─── Header & Metadata ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[#3A2C18] pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-serif font-black text-[#FFF4D4] tracking-wide flex items-center gap-1.5">
              <span>✏️</span> Meeting Scratchpad
            </span>
            <Badge className="text-[10px] bg-[#020A17] border border-[#3A2C18] text-[#DFBE77] font-mono">
              Internal Only
            </Badge>
            <span className="text-[10px] text-[#A69371] font-mono">
              {saveStatus === "saving" ? "Auto-saving..." : "Saved to Session"}
            </span>
          </div>
          <p className="text-xs text-[#C6B697]">
            Quickly capture thoughts, questions, exact quotes, or observations without interrupting your flow. Private to Waypoint Advocates.
          </p>
        </div>

        {/* Action Triggers */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={handleAddToBeforeWeEndFromScratchpad}
            disabled={!localText.trim()}
            className="h-8 px-3 text-xs bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold cursor-pointer shadow-sm hover:brightness-105"
            title="Convert selected or typed scratchpad text into a Before We End item"
          >
            <ArrowRight className="w-3.5 h-3.5 mr-1" />
            Add to Before We End
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleCaptureAsNote}
            disabled={!localText.trim()}
            className="h-8 px-2.5 text-xs border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] cursor-pointer"
            title="Save as discrete timestamped note in this meeting"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Capture Note
          </Button>
        </div>
      </div>

      {/* ─── Large Multiline Writing Area ─── */}
      <div className="space-y-1.5">
        <Textarea
          ref={textareaRef}
          value={localText}
          onChange={(e) => setLocalText(e.target.value)}
          placeholder="Jot down quick thoughts, exact teacher phrasing, questions, or observations during the live meeting... Highlight text and click 'Add to Before We End' anytime."
          rows={4}
          className="w-full bg-[#000820] border-[#3A2C18] text-[#FFF4D4] placeholder:text-[#A69371]/70 text-xs sm:text-[13px] leading-relaxed focus:border-[#DFBE77] focus:ring-1 focus:ring-[#DFBE77]/40 resize-y min-h-[100px]"
        />
        <div className="flex items-center justify-between text-[11px] text-[#A69371] px-1">
          <span>Auto-saves continuously · Private internal scratch notes</span>
          {localText.trim() && (
            <button
              type="button"
              onClick={() => {
                setLocalText("");
                onUpdateScratchpadText("");
              }}
              className="text-[#A69371] hover:text-rose-400 cursor-pointer transition-colors"
            >
              Clear Editor
            </button>
          )}
        </div>
      </div>

      {/* ─── Captured Notes Collection (if any) ─── */}
      {scratchNotes.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-[#3A2C18]/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#FFE394]">
              Captured Notes ({scratchNotes.length})
            </span>
            <span className="text-[11px] text-[#A69371]">
              Saved to this student's meeting record
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {scratchNotes.map((note) => {
              const isAlreadyInBwe =
                note.movedToBeforeWeEnd ||
                beforeWeEndItems.some(
                  (b) =>
                    b.sourceNoteId === note.id ||
                    b.text.toLowerCase() === note.text.toLowerCase()
                );

              return (
                <div
                  key={note.id}
                  className="p-3 rounded-lg bg-[#020A17] border border-[#3A2C18] flex flex-col justify-between gap-2 text-xs"
                >
                  {editingNoteId === note.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editingNoteText}
                        onChange={(e) => setEditingNoteText(e.target.value)}
                        rows={2}
                        className="text-xs bg-[#000820] border-[#DFBE77] text-white"
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => handleSaveEditNote(note.id)}
                          className="h-6 px-2 text-[11px] bg-emerald-600 text-white"
                        >
                          <Check className="w-3 h-3 mr-1" /> Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingNoteId(null)}
                          className="h-6 px-2 text-[11px] text-slate-400"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[#FFF4D4] leading-relaxed whitespace-pre-wrap flex-1 min-w-0">
                          {note.text}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditNote(note)}
                            className="p-1 rounded text-[#A69371] hover:text-[#DFBE77] cursor-pointer"
                            title="Edit note"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 cursor-pointer"
                            title="Delete note"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-[#3A2C18]/40 text-[10.5px]">
                        <span className="text-[#A69371] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {note.createdAt || "Live Note"}
                        </span>

                        {isAlreadyInBwe ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            In Before We End
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleConvertNoteToBeforeWeEnd(note)}
                            className="inline-flex items-center gap-1 text-[#DFBE77] hover:text-[#FFE394] font-bold cursor-pointer"
                          >
                            <span>→ Add to Before We End</span>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

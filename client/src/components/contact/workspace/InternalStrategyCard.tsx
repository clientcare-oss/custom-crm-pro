import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Lock, Plus, Pencil, ShieldAlert } from "lucide-react";

export interface StrategyNoteItem {
  id: number | string;
  author: string;
  date: string;
  content: string;
}

interface InternalStrategyCardProps {
  notes: StrategyNoteItem[];
  onAddNote: () => void;
  onEditNote?: (note: StrategyNoteItem) => void;
}

export function InternalStrategyCard({
  notes,
  onAddNote,
  onEditNote,
}: InternalStrategyCardProps) {
  const latestNote = notes[0];

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#0A1A33] to-[#07162B] border border-[#0E274D] p-5 shadow-lg relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-80 h-40 bg-[#F5B544]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-[#0E274D] pb-3 mb-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Lock className="h-4 w-4 text-[#F5B544]" />
          <h3 className="text-base font-bold text-white font-serif tracking-wide">
            Internal Notes & Strategy
          </h3>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider bg-[#F5B544]/15 text-[#F5B544] border border-[#F5B544]/30">
            <Lock className="h-3 w-3" />
            Waypoint Only
          </span>
        </div>

        <span className="text-[11px] italic text-slate-400 font-serif hidden sm:inline">
          Behind every case is a bigger purpose.
        </span>
      </div>

      {/* Note Content */}
      <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {latestNote ? (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-[#F5B544] font-mono">
                {latestNote.date} – {latestNote.author}
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-4xl">
                {latestNote.content}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">
              No internal strategy notes added yet. Add a private case strategy note below.
            </p>
          )}
        </div>

        <Button
          size="sm"
          onClick={onAddNote}
          className="h-9 px-3.5 bg-[#0F2342] hover:bg-[#153460] border border-[#F5B544]/30 text-white hover:text-[#F5B544] text-xs font-bold gap-1.5 shrink-0 cursor-pointer shadow-xs rounded-xl"
        >
          <Pencil className="h-3.5 w-3.5 text-[#F5B544]" />
          Add Note
        </Button>
      </div>
    </div>
  );
}

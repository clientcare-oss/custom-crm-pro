import React from "react";
import { BrainItem, getCategoryStyle, PRIORITY_CONFIG } from "./types";
import Pushpin, { PinColor } from "./Pushpin";
import { Calendar, Star, Image as ImageIcon, Mic, Link as LinkIcon, CheckCircle2 } from "lucide-react";

interface StickyNoteProps {
  note: BrainItem;
  onClick: (note: BrainItem) => void;
  index: number;
}

// Consistent slight rotation for natural physical corkboard feel
const ROTATIONS = [
  "-rotate-1",
  "rotate-1",
  "-rotate-2",
  "rotate-0",
  "rotate-2",
  "-rotate-1.5",
  "rotate-1.5",
  "-rotate-0.5",
  "rotate-0.5",
];

const PIN_COLORS: PinColor[] = ["blue", "yellow", "magenta", "purple", "green", "red"];

export default function StickyNote({ note, onClick, index }: StickyNoteProps) {
  const rotationClass = note.wallRotation !== undefined && note.wallRotation !== 0
    ? `rotate-[${note.wallRotation}deg]`
    : ROTATIONS[index % ROTATIONS.length];

  const pinColor = (note.pinColor as PinColor) || PIN_COLORS[index % PIN_COLORS.length];
  const priorityInfo = PRIORITY_CONFIG[note.priority] || PRIORITY_CONFIG.medium;

  // Format date preview cleanly e.g. "Sep 28" or "Oct 2"
  const formatBringUp = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const formattedBringUp = formatBringUp(note.bringUpDate);
  const isDone = note.status === "done";
  const categoryStyle = getCategoryStyle(note.category);

  return (
    <div
      onClick={() => onClick(note)}
      className={`group relative cursor-pointer select-none transition-all duration-200 transform ${rotationClass} hover:rotate-0 hover:scale-[1.04] hover:z-30 w-full`}
    >
      {/* 3D Pushpin on top center */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 transition-transform group-hover:-translate-y-0.5">
        <Pushpin color={pinColor} size={22} />
      </div>

      {/* Sticky Paper Note Card */}
      <div
        className={`relative rounded-sm p-4 pt-5 pb-3.5 flex flex-col justify-between min-h-[175px] sm:min-h-[190px] shadow-[0_4px_12px_rgba(0,0,0,0.35),0_1px_3px_rgba(0,0,0,0.2)] group-hover:shadow-[0_12px_28px_rgba(0,0,0,0.45)] transition-shadow border-t border-white/40 ${
          isDone
            ? "bg-[#fefce8]/90 opacity-80"
            : "bg-gradient-to-b from-[#fef9c3] via-[#fef08a] to-[#fde047]/90"
        }`}
        style={{
          boxShadow: "2px 4px 10px rgba(0,0,0,0.25), inset 0 -1px 2px rgba(0,0,0,0.08)",
        }}
      >
        {/* Top Indicators: Star if pinned, or media icon */}
        <div className="absolute top-2 right-2 flex items-center gap-1 text-slate-700/80">
          {note.pinned && (
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-600 drop-shadow-xs" />
          )}
          {note.taskConvertedId && (
            <span title="Task Created">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </span>
          )}
        </div>

        {/* Content Area */}
        <div className="space-y-1.5 pr-2">
          {/* Note Title */}
          <h3
            className={`text-sm sm:text-[15px] font-bold text-slate-900 leading-snug line-clamp-3 tracking-tight ${
              isDone ? "line-through text-slate-600" : ""
            }`}
          >
            {note.title}
          </h3>

          {/* Short preview if available */}
          {note.body && (
            <p className="text-[11px] text-slate-700/90 line-clamp-2 leading-relaxed font-normal">
              {note.body}
            </p>
          )}
        </div>

        {/* Middle: Category Pills */}
        <div className="pt-2 flex flex-wrap gap-1.5 items-center">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border}`}
          >
            {note.category}
          </span>
          {(note.tags || []).slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-white/70 text-slate-700 border border-slate-300/60"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Footer: Bring Up Date & Priority Badge */}
        <div className="pt-2 mt-2 border-t border-amber-900/10 flex items-center justify-between text-[11px] font-semibold text-slate-700">
          {/* Bring Up Date (Calendar Icon) */}
          <div className="flex items-center gap-1 text-slate-700">
            <Calendar className="w-3 h-3 text-slate-600 shrink-0" />
            <span className="text-[10px] font-medium tracking-tight">
              {formattedBringUp || "No Date"}
            </span>
          </div>

          {/* Priority Indicator Pill */}
          <div className="flex items-center gap-1">
            <span
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 ${
                note.priority === "high" || note.priority === "urgent"
                  ? "bg-red-500"
                  : note.priority === "medium"
                  ? "bg-blue-500"
                  : "bg-emerald-500"
              }`}
            >
              {priorityInfo.symbol}
            </span>
            <span
              className={`text-[10px] font-bold ${
                note.priority === "high" || note.priority === "urgent"
                  ? "text-red-700"
                  : note.priority === "medium"
                  ? "text-blue-700"
                  : "text-emerald-700"
              }`}
            >
              {priorityInfo.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

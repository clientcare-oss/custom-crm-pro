import React, { useState } from "react";
import { BrainItem, getCategoryStyle, PRIORITY_CONFIG, STATUS_CONFIG } from "./types";
import {
  FileText,
  Pin,
  Clock,
  CheckCircle2,
  Calendar,
  Edit2,
  Zap,
  Copy,
  Trash2,
  MoreVertical,
  Star,
  CheckSquare,
  Square,
  AlertCircle,
  Building,
  User,
  Archive,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface NotesListViewProps {
  notes: BrainItem[];
  summaryCounts: {
    total: number;
    pinned: number;
    inProgress: number;
    done: number;
    notStarted: number;
  };
  onEditClick: (note: BrainItem) => void;
  onTakeActionClick: (note: BrainItem) => void;
  onTogglePin: (note: BrainItem) => void;
  onDuplicate: (note: BrainItem) => void;
  onDelete: (id: number) => void;
  onBulkMove: (ids: number[], targetScope: "employee" | "company") => void;
  onBulkStatusChange: (ids: number[], status: any) => void;
  companyName?: string;
}

export default function NotesListView({
  notes,
  summaryCounts,
  onEditClick,
  onTakeActionClick,
  onTogglePin,
  onDuplicate,
  onDelete,
  onBulkMove,
  onBulkStatusChange,
  companyName = "Waypoint Advocates",
}: NotesListViewProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const allSelected = notes.length > 0 && notes.every((n) => selectedIds.includes(n.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notes.map((n) => n.id));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const formatDate = (dateVal: string | Date | undefined | null) => {
    if (!dateVal) return "—";
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return String(dateVal);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* ── Top Summary & Inspirational Postcard Cards ─────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
        {/* Card 1: Total Notes */}
        <div className="lg:col-span-2 rounded-2xl bg-[#0d1424] border border-blue-900/60 p-4 flex items-center gap-3.5 shadow-lg relative overflow-hidden">
          <div className="p-2.5 rounded-xl bg-amber-400/15 text-amber-400 border border-amber-400/30">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Notes
            </div>
            <div className="text-2xl font-black text-white font-mono mt-0.5">
              {summaryCounts.total}
            </div>
          </div>
        </div>

        {/* Card 2: Pinned */}
        <div className="lg:col-span-2 rounded-2xl bg-[#0d1424] border border-blue-900/60 p-4 flex items-center gap-3.5 shadow-lg relative overflow-hidden">
          <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <Pin className="w-5 h-5 fill-rose-500/30" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Pinned
            </div>
            <div className="text-2xl font-black text-white font-mono mt-0.5">
              {summaryCounts.pinned}
            </div>
          </div>
        </div>

        {/* Card 3: In Progress */}
        <div className="lg:col-span-2 rounded-2xl bg-[#0d1424] border border-blue-900/60 p-4 flex items-center gap-3.5 shadow-lg relative overflow-hidden">
          <div className="p-2.5 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              In Progress
            </div>
            <div className="text-2xl font-black text-white font-mono mt-0.5">
              {summaryCounts.inProgress}
            </div>
          </div>
        </div>

        {/* Card 4: Done */}
        <div className="lg:col-span-2 rounded-2xl bg-[#0d1424] border border-blue-900/60 p-4 flex items-center gap-3.5 shadow-lg relative overflow-hidden">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Done
            </div>
            <div className="text-2xl font-black text-white font-mono mt-0.5">
              {summaryCounts.done}
            </div>
          </div>
        </div>

        {/* Right Decorative Quote Card + Sunset Lighthouse Postcard (Cols 9-12) */}
        <div className="lg:col-span-4 rounded-2xl bg-[#0d1424] border border-blue-900/60 p-2 sm:p-2.5 flex items-center justify-between gap-3 shadow-lg relative overflow-hidden">
          {/* Paper Note Quote */}
          <div className="flex-1 p-3 rounded-xl bg-[#fef9c3] text-slate-900 shadow-md transform -rotate-1 border border-amber-200">
            <p className="text-xs sm:text-[13px] font-serif italic font-bold leading-snug">
              "Ideas become progress when you capture them." <span className="text-rose-600 font-sans">♥</span>
            </p>
          </div>

          {/* Lighthouse Sunset Painting */}
          <div className="w-24 sm:w-28 h-16 sm:h-18 rounded-xl overflow-hidden shrink-0 relative shadow-inner bg-gradient-to-br from-amber-500 via-rose-600 to-indigo-950 border border-white/20">
            {/* Sun */}
            <div className="absolute top-2 left-3 w-4 h-4 rounded-full bg-amber-200 blur-[0.5px] shadow-[0_0_8px_#fde047]" />
            {/* Water */}
            <div className="absolute bottom-0 inset-x-0 h-4 bg-gradient-to-t from-sky-900 to-sky-700 opacity-90" />
            {/* Lighthouse */}
            <div className="absolute bottom-1 right-3 w-2.5 h-10 flex flex-col items-center">
              <div className="w-1.5 h-2 bg-amber-200 rounded-t-xs shadow-[0_0_6px_#fde047]" />
              <div className="w-2.5 h-8 bg-slate-100 flex flex-col justify-around py-0.5">
                <div className="w-full h-1 bg-red-600" />
                <div className="w-full h-1 bg-red-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bulk Actions Floating Toolbar (When items are selected) ─────── */}
      {selectedIds.length > 0 && (
        <div className="w-full rounded-xl bg-blue-950 border border-amber-400/80 p-2.5 px-4 flex flex-wrap items-center justify-between gap-2 shadow-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-300 font-mono">
              {selectedIds.length} notes selected
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => onBulkMove(selectedIds, "employee")}
              className="text-xs h-7 bg-sky-600 hover:bg-sky-500 text-white font-bold gap-1 cursor-pointer"
            >
              <User className="w-3 h-3" />
              Move to 👤 My Notes
            </Button>
            <Button
              size="sm"
              onClick={() => onBulkMove(selectedIds, "company")}
              className="text-xs h-7 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold gap-1 cursor-pointer"
            >
              <Building className="w-3 h-3" />
              Move to 🏢 Company Notes
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onBulkStatusChange(selectedIds, "done")}
              className="text-xs h-7 border-slate-700 text-slate-200 hover:bg-slate-800 gap-1 cursor-pointer"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Mark Done
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
              className="text-xs h-7 text-slate-400 hover:text-white"
            >
              Deselect All
            </Button>
          </div>
        </div>
      )}

      {/* ── Main List View Table ────────────────────────────────────────── */}
      <div className="w-full rounded-2xl bg-[#0c121e] border border-blue-900/60 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="border-b border-blue-900/50 bg-[#090f19] text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="py-3 px-3 w-10 text-center">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                    className="border-slate-600"
                  />
                </th>
                <th className="py-3 px-3">Note / Title</th>
                <th className="py-3 px-3 w-32">Category</th>
                <th className="py-3 px-3 w-28">Status</th>
                <th className="py-3 px-3 w-28">Priority</th>
                <th className="py-3 px-3 w-32">Bring Up Date</th>
                <th className="py-3 px-3 w-28">Created</th>
                <th className="py-3 px-3 w-28 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-950/60 text-xs">
              {notes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                    No matching notes found. Try adjusting your search or filters.
                  </td>
                </tr>
              ) : (
                notes.map((note) => {
                  const isSelected = selectedIds.includes(note.id);
                  const isDone = note.status === "done";
                  const catStyle = getCategoryStyle(note.category);
                  const statusInfo = STATUS_CONFIG[note.status] || STATUS_CONFIG.not_started;
                  const priorityInfo = PRIORITY_CONFIG[note.priority] || PRIORITY_CONFIG.medium;

                  return (
                    <tr
                      key={note.id}
                      className={`group hover:bg-[#121c2e] transition-colors ${
                        isSelected ? "bg-blue-950/40" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectOne(note.id)}
                          className="border-slate-600"
                        />
                      </td>

                      {/* Note / Title + Preview */}
                      <td
                        onClick={() => onEditClick(note)}
                        className="py-3 px-3 cursor-pointer select-none max-w-md"
                      >
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTogglePin(note);
                            }}
                            className="mt-0.5 text-slate-500 hover:text-amber-400 transition-colors shrink-0"
                            title={note.pinned ? "Unpin note" : "Pin note"}
                          >
                            <Pin
                              className={`w-3.5 h-3.5 ${
                                note.pinned
                                  ? "fill-amber-400 text-amber-400 drop-shadow-xs"
                                  : "opacity-40 hover:opacity-100"
                              }`}
                            />
                          </button>

                          <div className="flex-1 min-w-0">
                            <span
                              className={`font-bold text-white text-xs sm:text-[13px] leading-snug line-clamp-1 group-hover:text-amber-300 transition-colors ${
                                isDone ? "line-through text-slate-400" : ""
                              }`}
                            >
                              {note.title}
                            </span>
                            {note.body && (
                              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 font-normal">
                                {note.body}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs whitespace-nowrap ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                        >
                          {note.category}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#070d18] border border-slate-800 text-slate-200">
                          <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
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
                            className={
                              note.priority === "high" || note.priority === "urgent"
                                ? "text-red-400 font-bold"
                                : note.priority === "medium"
                                ? "text-blue-400"
                                : "text-emerald-400"
                            }
                          >
                            {priorityInfo.label}
                          </span>
                        </span>
                      </td>

                      {/* Bring Up Date */}
                      <td className="py-3 px-3 text-slate-300">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{formatDate(note.bringUpDate)}</span>
                        </div>
                      </td>

                      {/* Created */}
                      <td className="py-3 px-3 text-slate-400 text-[11px]">
                        {formatDate(note.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onEditClick(note)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Edit Note"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onTakeActionClick(note)}
                            className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 transition-colors"
                            title="Take Action (Task, Recommend, Bring Up)"
                          >
                            <Zap className="w-3.5 h-3.5 fill-amber-400/20" />
                          </button>
                          <button
                            onClick={() => onDuplicate(note)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Duplicate"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDelete(note.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

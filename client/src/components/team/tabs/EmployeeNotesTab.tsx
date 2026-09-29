import { useState } from "react";
import {
  MessageSquare,
  Lock,
  Plus,
  ShieldAlert,
  Trash2,
  Calendar,
  User,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmployeeNote, EmployeeRecord } from "../teamTypes";
import { toast } from "sonner";

interface EmployeeNotesTabProps {
  employee: EmployeeRecord;
  onSave: (updated: EmployeeRecord) => void;
}

export default function EmployeeNotesTab({
  employee,
  onSave,
}: EmployeeNotesTabProps) {
  const [newNote, setNewNote] = useState("");
  const [category, setCategory] = useState<EmployeeNote["category"]>("Administrative");
  const [isConfidential, setIsConfidential] = useState(true);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    const noteItem: EmployeeNote = {
      id: `nt-${Date.now()}`,
      author: "Byron Honea",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      category,
      note: newNote.trim(),
      isConfidential,
    };

    const updated: EmployeeRecord = {
      ...employee,
      notes: [noteItem, ...(employee.notes || [])],
      activity: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          actor: "Byron Honea",
          action: "Management Note Added",
          details: `Recorded ${category} note for ${employee.name}.`,
        },
        ...employee.activity,
      ],
    };

    onSave(updated);
    setNewNote("");
    toast.success("Management note recorded securely!");
  };

  const handleDeleteNote = (noteId: string) => {
    const updatedNotes = (employee.notes || []).filter((n) => n.id !== noteId);
    const updated: EmployeeRecord = {
      ...employee,
      notes: updatedNotes,
    };
    onSave(updated);
    toast.info("Note deleted");
  };

  return (
    <div className="space-y-6 text-xs text-white">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#000d2b] border border-blue-900/60 rounded-2xl p-4 shadow-lg">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-white text-sm">
              Management-Only Coaching &amp; Administrative Notes
            </h3>
          </div>
          <p className="text-[11px] text-blue-200/70">
            Internal practice observations. <strong>These notes are never visible to the employee</strong> in their Crew Quarters experience.
          </p>
        </div>

        <span className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-amber-400/10 text-amber-300 border border-amber-400/30">
          Executive Confidential
        </span>
      </div>

      {/* Add New Note Box */}
      <form onSubmit={handleAddNote} className="p-4 rounded-2xl border border-blue-900/50 bg-[#000820] space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-white flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-sky-400" />
            <span>Add Management Note</span>
          </h4>

          <div className="flex items-center gap-2">
            <Select value={category} onValueChange={(v) => setCategory(v as any)}>
              <SelectTrigger className="w-[140px] bg-[#000d2b] border-blue-900/60 text-xs text-white h-8 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#000821] border border-blue-800 text-white text-xs">
                <SelectItem value="Administrative">Administrative</SelectItem>
                <SelectItem value="Coaching">Coaching / Mentorship</SelectItem>
                <SelectItem value="Scheduling">Scheduling Note</SelectItem>
                <SelectItem value="Performance">Performance Review</SelectItem>
                <SelectItem value="General">General Note</SelectItem>
              </SelectContent>
            </Select>

            <button
              type="button"
              onClick={() => setIsConfidential(!isConfidential)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                isConfidential
                  ? "bg-amber-400/20 text-amber-300 border-amber-400/40"
                  : "bg-blue-950 text-blue-300 border-blue-800"
              }`}
            >
              {isConfidential ? "Confidential" : "Standard"}
            </button>
          </div>
        </div>

        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder={`Enter observations, coaching notes, or administrative milestones for ${employee.name}…`}
          className="bg-[#000d2b] border-blue-900/60 text-white text-xs rounded-xl min-h-[80px]"
          required
        />

        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            size="sm"
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl h-8 px-4 cursor-pointer"
          >
            <span>Record Note</span>
          </Button>
        </div>
      </form>

      {/* Notes Feed */}
      <div className="space-y-3">
        {(employee.notes || []).map((n) => (
          <div
            key={n.id}
            className="p-4 rounded-2xl border border-blue-900/50 bg-[#000d2b] space-y-2 relative group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-xs">{n.author}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/60">
                  {n.category}
                </span>
                {n.isConfidential && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                    Confidential
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-mono">{n.date}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteNote(n.id)}
                  className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1"
                  title="Delete Note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <p className="text-xs text-blue-100/90 leading-relaxed whitespace-pre-wrap">
              {n.note}
            </p>
          </div>
        ))}

        {(!employee.notes || employee.notes.length === 0) && (
          <div className="p-8 rounded-2xl border border-blue-900/30 bg-[#000820] text-center space-y-1">
            <MessageSquare className="w-6 h-6 text-slate-500 mx-auto" />
            <p className="text-sm font-semibold text-white">No administrative notes on record</p>
            <p className="text-xs text-slate-400">
              Add coaching notes or case feedback using the box above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

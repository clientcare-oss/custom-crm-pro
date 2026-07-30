import React, { useState } from "react";
import { FileText, Plus, Eye, EyeOff, Trash2, Edit3 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface NoteItem {
  id: number;
  title: string;
  content: string;
  isVisibleToClient: boolean;
  createdAt: string | Date;
}

interface ContactNotesTabProps {
  notes?: NoteItem[];
  onCreateNote?: (title: string, content: string, isVisibleToClient: boolean) => void;
  onToggleVisibility?: (noteId: number, isVisible: boolean) => void;
  onDeleteNote?: (noteId: number) => void;
}

export default function ContactNotesTab({
  notes = [],
  onCreateNote,
  onToggleVisibility,
  onDeleteNote,
}: ContactNotesTabProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isVisibleToClient, setIsVisibleToClient] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Please provide both a title and content for the note");
      return;
    }
    onCreateNote?.(title, content, isVisibleToClient);
    setTitle("");
    setContent("");
    setIsVisibleToClient(false);
  };

  return (
    <div className="space-y-6">
      {/* New Note Form */}
      <Card className="border-slate-800 bg-[#0A1628]/90 text-slate-100 shadow-xl">
        <CardHeader className="border-b border-slate-800/80 pb-3">
          <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-amber-400" />
            Add Case Note
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note Title (e.g. Call with School Counselor)"
              className="bg-slate-900 border-slate-700 text-white"
            />
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Case note details and observations..."
              rows={3}
              className="bg-slate-900 border-slate-700 text-white"
            />
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isVisibleToClient}
                  onChange={(e) => setIsVisibleToClient(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-amber-400 focus:ring-amber-400"
                />
                Make visible to parent in Client Portal
              </label>
              <Button type="submit" size="sm" className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs">
                Save Note
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Note List */}
      <div className="space-y-3">
        {notes.length === 0 ? (
          <div className="text-center p-8 bg-[#0A1628]/60 rounded-xl border border-slate-800 text-slate-400 text-xs">
            No notes added yet for this contact.
          </div>
        ) : (
          notes.map((note) => (
            <Card key={note.id} className="border-slate-800 bg-[#0A1628]/80 text-slate-100 shadow-md">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">{note.title}</h4>
                  <div className="flex items-center gap-2">
                    <Badge
                      onClick={() => onToggleVisibility?.(note.id, !note.isVisibleToClient)}
                      className={`cursor-pointer text-[10px] font-semibold gap-1 ${
                        note.isVisibleToClient
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {note.isVisibleToClient ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {note.isVisibleToClient ? "Visible to Parent" : "Internal Advocate Only"}
                    </Badge>
                    {onDeleteNote && (
                      <button
                        onClick={() => onDeleteNote(note.id)}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                        title="Delete note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                  {new Date(note.createdAt).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

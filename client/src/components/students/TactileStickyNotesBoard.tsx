import React, { useState } from "react";
import { Plus, Trash2, Edit3, Eye, EyeOff, Check, X, Lock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface TactileStickyNotesBoardProps {
  studentId: number;
  studentName?: string;
  projectId?: number;
  onProjectCreated?: (projectId: number) => void;
}

interface NoteItem {
  id: number;
  projectId: number;
  title: string;
  content: string;
  isVisibleToClient: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

// Subtle natural rotations for tactile organic realism without geometric depth
const NOTE_ROTATIONS = [
  "-rotate-[0.6deg]",
  "rotate-[0.5deg]",
  "-rotate-[0.4deg]",
  "rotate-[0.7deg]",
  "-rotate-[0.8deg]",
  "rotate-[0.4deg]",
];

export function TactileStickyNotesBoard({
  studentId,
  studentName = "Student",
  projectId,
  onProjectCreated,
}: TactileStickyNotesBoardProps) {
  const [activeProjectId, setActiveProjectId] = useState<number | undefined>(projectId);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newIsVisible, setNewIsVisible] = useState(false);

  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editIsVisible, setEditIsVisible] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // Load notes if active project exists
  const notesQuery = trpc.notes.list.useQuery(
    { projectId: activeProjectId! },
    { enabled: !!activeProjectId }
  );

  const notes: NoteItem[] = (notesQuery.data as any) || [];

  // Mutations
  const createProjectMutation = trpc.projects.create.useMutation();

  const createNoteMutation = trpc.notes.create.useMutation({
    onSuccess: () => {
      toast.success("Sticky note added to case");
      setIsCreating(false);
      setNewTitle("");
      setNewContent("");
      setNewIsVisible(false);
      notesQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add note");
    },
  });

  const updateNoteMutation = trpc.notes.update.useMutation({
    onSuccess: () => {
      toast.success("Note saved");
      setEditingNoteId(null);
      notesQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update note");
    },
  });

  const deleteNoteMutation = trpc.notes.delete.useMutation({
    onSuccess: () => {
      toast.success("Note removed");
      setDeletingNoteId(null);
      notesQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete note");
    },
  });

  // Handle Save New Note (ensures a project exists first)
  const handleSaveNewNote = async () => {
    if (!newTitle.trim()) {
      toast.error("Please enter a note title");
      return;
    }

    try {
      let targetProjectId = activeProjectId;
      if (!targetProjectId) {
        // Auto-create advocacy case project for this student if missing
        const newProj = await createProjectMutation.mutateAsync({
          clientId: studentId,
          name: `${studentName} — Advocacy Case`,
          description: `Active advocacy case and notes for ${studentName}.`,
          status: "In Progress",
        });
        const createdId = Number(newProj?.id || (newProj as any)?.[0]?.id || (newProj as any)?.insertId);
        if (!createdId) throw new Error("Could not initialize case project");
        targetProjectId = createdId;
        setActiveProjectId(targetProjectId);
        onProjectCreated?.(targetProjectId);
      }

      await createNoteMutation.mutateAsync({
        projectId: targetProjectId!,
        title: newTitle.trim(),
        content: newContent.trim(),
        isVisibleToClient: newIsVisible,
      });
    } catch (e: any) {
      toast.error(e?.message || "Could not save note");
    }
  };

  const handleStartEdit = (note: NoteItem) => {
    setEditingNoteId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditIsVisible(note.isVisibleToClient);
  };

  const handleSaveEdit = async () => {
    if (!editingNoteId || !activeProjectId) return;
    if (!editTitle.trim()) {
      toast.error("Title cannot be empty");
      return;
    }

    await updateNoteMutation.mutateAsync({
      id: editingNoteId,
      projectId: activeProjectId,
      title: editTitle.trim(),
      content: editContent.trim(),
      isVisibleToClient: editIsVisible,
    });
  };

  const handleDelete = async (noteId: number) => {
    if (!activeProjectId) return;
    await deleteNoteMutation.mutateAsync({
      id: noteId,
      projectId: activeProjectId,
    });
  };

  return (
    <div className="w-full">
      {/* ─── Notes Grid: Tactile Yellow Sticky Notes + Grey Dotted Line Box ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
        
        {/* ─── INLINE CREATION STICKY NOTE (When active) ──────────────────── */}
        {isCreating && (
          <div
            className="aspect-square min-h-[250px] max-h-[310px] w-full p-4 sm:p-5 rounded-[2px] relative flex flex-col justify-between shadow-[0_6px_18px_rgba(0,0,0,0.4),0_2px_4px_rgba(0,0,0,0.25)] transition-all animate-in fade-in zoom-in-95 duration-150"
            style={{
              background: "linear-gradient(180deg, #FFFBAE 0%, #FEF08A 28%, #FDE047 100%)",
            }}
          >
            {/* Top Adhesive Strip */}
            <div className="absolute top-0 left-0 right-0 h-5 bg-gradient-to-b from-black/[0.07] to-transparent border-b border-black/[0.06] pointer-events-none rounded-t-[2px]" />

            <div className="relative z-10 flex flex-col h-full justify-between pt-1">
              {/* Note Inputs */}
              <div className="space-y-2 flex-1 flex flex-col">
                <input
                  type="text"
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Note Title..."
                  className="w-full bg-transparent font-bold text-neutral-900 text-sm sm:text-base border-b border-neutral-900/20 pb-1 focus:outline-none placeholder:text-neutral-600/70"
                />

                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Write case note here..."
                  rows={4}
                  className="w-full flex-1 bg-transparent text-neutral-900 text-xs sm:text-sm leading-relaxed focus:outline-none placeholder:text-neutral-600/60 resize-none font-normal"
                />
              </div>

              {/* Bottom Controls */}
              <div className="pt-2 border-t border-neutral-900/15 flex flex-col gap-2">
                <label className="flex items-center gap-1.5 text-[11px] text-neutral-800 font-medium cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newIsVisible}
                    onChange={(e) => setNewIsVisible(e.target.checked)}
                    className="rounded border-neutral-600/40 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                  />
                  <span>Share with parent portal</span>
                </label>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setNewTitle("");
                      setNewContent("");
                    }}
                    className="px-2.5 py-1 text-xs text-neutral-700 hover:text-neutral-950 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={createNoteMutation.isPending || createProjectMutation.isPending}
                    onClick={handleSaveNewNote}
                    className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 text-amber-100 text-xs font-semibold rounded shadow-sm cursor-pointer transition-colors"
                  >
                    {createNoteMutation.isPending ? "Attaching..." : "Attach Note"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── EXISTING TACTILE YELLOW STICKY NOTES ───────────────────────── */}
        {notes.map((note, index) => {
          const rotationClass = NOTE_ROTATIONS[index % NOTE_ROTATIONS.length];
          const isEditing = editingNoteId === note.id;
          const isDeleting = deletingNoteId === note.id;

          if (isEditing) {
            return (
              <div
                key={note.id}
                className="aspect-square min-h-[250px] max-h-[310px] w-full p-4 sm:p-5 rounded-[2px] relative flex flex-col justify-between shadow-[0_6px_18px_rgba(0,0,0,0.4),0_2px_4px_rgba(0,0,0,0.25)] transition-all"
                style={{
                  background: "linear-gradient(180deg, #FFFBAE 0%, #FEF08A 28%, #FDE047 100%)",
                }}
              >
                <div className="absolute top-0 left-0 right-0 h-5 bg-gradient-to-b from-black/[0.07] to-transparent border-b border-black/[0.06] pointer-events-none rounded-t-[2px]" />

                <div className="relative z-10 flex flex-col h-full justify-between pt-1">
                  <div className="space-y-2 flex-1 flex flex-col">
                    <input
                      type="text"
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-transparent font-bold text-neutral-900 text-sm sm:text-base border-b border-neutral-900/20 pb-1 focus:outline-none"
                    />

                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={4}
                      className="w-full flex-1 bg-transparent text-neutral-900 text-xs sm:text-sm leading-relaxed focus:outline-none resize-none font-normal"
                    />
                  </div>

                  <div className="pt-2 border-t border-neutral-900/15 flex flex-col gap-2">
                    <label className="flex items-center gap-1.5 text-[11px] text-neutral-800 font-medium cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editIsVisible}
                        onChange={(e) => setEditIsVisible(e.target.checked)}
                        className="rounded border-neutral-600/40 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                      />
                      <span>Share with parent portal</span>
                    </label>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingNoteId(null)}
                        className="px-2.5 py-1 text-xs text-neutral-700 hover:text-neutral-950 font-medium cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={updateNoteMutation.isPending}
                        onClick={handleSaveEdit}
                        className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 text-amber-100 text-xs font-semibold rounded shadow-sm cursor-pointer transition-colors"
                      >
                        {updateNoteMutation.isPending ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={note.id}
              className={`aspect-square min-h-[250px] max-h-[310px] w-full p-4 sm:p-5 rounded-[2px] relative flex flex-col justify-between shadow-[0_4px_12px_rgba(0,0,0,0.32),0_1px_3px_rgba(0,0,0,0.18)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.45)] hover:-translate-y-0.5 transition-all duration-150 group cursor-default select-none ${rotationClass}`}
              style={{
                background: "linear-gradient(180deg, #FFFBAE 0%, #FEF08A 28%, #FDE047 100%)",
              }}
            >
              {/* Authentic Top Adhesive Strip & Paper Micro-Shadow */}
              <div className="absolute top-0 left-0 right-0 h-5 bg-gradient-to-b from-black/[0.06] to-transparent border-b border-black/[0.05] pointer-events-none rounded-t-[2px]" />

              {/* Top Header Row on Sticky Note */}
              <div className="relative z-10 pt-1 flex items-start justify-between gap-2">
                <h4 className="font-bold text-neutral-900 text-sm sm:text-base leading-snug tracking-tight line-clamp-2 pr-1">
                  {note.title}
                </h4>

                {/* Quick Action Icons */}
                <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(note)}
                    title="Edit Note"
                    className="p-1 rounded text-neutral-800 hover:text-black hover:bg-black/10 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingNoteId(note.id)}
                    title="Delete Note"
                    className="p-1 rounded text-neutral-800 hover:text-red-700 hover:bg-black/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Note Content Body */}
              <div className="relative z-10 flex-1 my-2 overflow-hidden">
                <p className="text-neutral-900/90 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap line-clamp-6 font-normal">
                  {note.content || <span className="italic text-neutral-600/70">No text content</span>}
                </p>
              </div>

              {/* Delete Confirmation Overlay */}
              {isDeleting && (
                <div className="absolute inset-0 z-20 bg-amber-100/95 backdrop-blur-[1px] p-4 flex flex-col items-center justify-center text-center rounded-[2px] animate-in fade-in duration-100">
                  <p className="text-xs font-bold text-neutral-900 mb-2">Delete this sticky note?</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDeletingNoteId(null)}
                      className="px-2.5 py-1 text-xs bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded font-medium cursor-pointer"
                    >
                      Keep
                    </button>
                    <button
                      type="button"
                      disabled={deleteNoteMutation.isPending}
                      onClick={() => handleDelete(note.id)}
                      className="px-2.5 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded font-bold cursor-pointer transition-colors"
                    >
                      {deleteNoteMutation.isPending ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              )}

              {/* Note Footer: Date & Portal Visibility */}
              <div className="relative z-10 pt-2 border-t border-neutral-900/10 flex items-center justify-between text-[11px] text-neutral-700">
                <span className="font-medium text-neutral-600">
                  {note.createdAt ? new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Today"}
                </span>

                <div className="flex items-center gap-1">
                  {note.isVisibleToClient ? (
                    <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-600/15 px-1.5 py-0.5 rounded text-[10px] font-semibold" title="Visible in Parent Portal">
                      <Eye className="w-3 h-3 text-emerald-700" />
                      <span>Shared</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-neutral-600 bg-neutral-900/10 px-1.5 py-0.5 rounded text-[10px] font-medium" title="Advocate Private Note">
                      <Lock className="w-2.5 h-2.5 text-neutral-600" />
                      <span>Private</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* ─── GREY DOTTED LINE BOX (SAME SIZE AS NOTES) ───────────────────── */}
        <button
          type="button"
          onClick={() => {
            setIsCreating(true);
            setEditingNoteId(null);
          }}
          className="aspect-square min-h-[250px] max-h-[310px] w-full rounded-[2px] bg-transparent border-2 border-dashed border-slate-400/50 hover:border-amber-300/80 hover:bg-white/[0.02] transition-all duration-200 cursor-pointer group flex flex-col items-center justify-center p-6 text-center select-none"
          title="Add note to this case"
        >
          {/* Plus Sign in Middle of Box */}
          <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-400/60 group-hover:border-amber-300/80 group-hover:bg-amber-400/10 flex items-center justify-center text-slate-300 group-hover:text-amber-300 transition-all mb-3 shadow-inner">
            <Plus className="w-6 h-6 stroke-[2.2] transition-transform group-hover:scale-110" />
          </div>

          {/* Text: Add note to this case */}
          <span className="text-sm sm:text-base font-semibold text-slate-300 group-hover:text-white tracking-wide transition-colors">
            Add note to this case
          </span>

          <span className="text-[11px] text-slate-400/70 group-hover:text-amber-200/80 mt-1 transition-colors">
            Click to attach a new sticky note
          </span>
        </button>

      </div>
    </div>
  );
}

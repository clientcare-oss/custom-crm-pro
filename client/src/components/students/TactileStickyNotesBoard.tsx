import React, { useState } from "react";
import { Plus, Trash2, Edit3, Eye, EyeOff, Lock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CaseNoteEditorModal } from "./CaseNoteEditorModal";

interface TactileStickyNotesBoardProps {
  studentId: number;
  studentName?: string;
  projectId?: number;
  appointments?: Array<{ id: number; title?: string | null; date?: string | null }>;
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

// Strip HTML tags for clean plaintext ink preview on tactile sticky notes
function stripHtml(html: string) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
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
  appointments = [],
  onProjectCreated,
}: TactileStickyNotesBoardProps) {
  const [activeProjectId, setActiveProjectId] = useState<number | undefined>(projectId);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [selectedNoteForModal, setSelectedNoteForModal] = useState<NoteItem | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null);

  // Sync projectId when parent query loads
  React.useEffect(() => {
    if (projectId && !activeProjectId) {
      setActiveProjectId(projectId);
    }
  }, [projectId, activeProjectId]);

  // Load notes if active project exists
  const notesQuery = trpc.notes.list.useQuery(
    { projectId: activeProjectId! },
    { enabled: !!activeProjectId }
  );

  const notes: NoteItem[] = (notesQuery.data as any) || [];

  // Mutations
  const createProjectMutation = trpc.projects.create.useMutation();
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

  // Ensure project exists before opening editor for new note
  const handleOpenAddNote = async () => {
    try {
      let targetProjectId = activeProjectId;
      if (!targetProjectId) {
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

      setSelectedNoteForModal(null);
      setIsEditorModalOpen(true);
    } catch (e: any) {
      toast.error(e?.message || "Could not open note editor");
    }
  };

  const handleOpenEditNote = (note: NoteItem) => {
    setSelectedNoteForModal(note);
    setIsEditorModalOpen(true);
  };

  const handleDelete = async (noteId: number, e: React.MouseEvent) => {
    e.stopPropagation();
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
        
        {/* ─── EXISTING TACTILE YELLOW STICKY NOTES ───────────────────────── */}
        {notes.map((note, index) => {
          const rotationClass = NOTE_ROTATIONS[index % NOTE_ROTATIONS.length];
          const isDeleting = deletingNoteId === note.id;
          const cleanText = stripHtml(note.content);

          return (
            <div
              key={note.id}
              onClick={() => handleOpenEditNote(note)}
              className={`aspect-square min-h-[250px] max-h-[310px] w-full p-4 sm:p-5 rounded-[2px] relative flex flex-col justify-between shadow-[0_4px_12px_rgba(0,0,0,0.32),0_1px_3px_rgba(0,0,0,0.18)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.45)] hover:-translate-y-0.5 transition-all duration-150 group cursor-pointer select-none ${rotationClass}`}
              style={{
                background: "linear-gradient(180deg, #FFFBAE 0%, #FEF08A 28%, #FDE047 100%)",
              }}
              title="Click to open note in editor"
            >
              {/* Authentic Top Adhesive Strip & Paper Micro-Shadow */}
              <div className="absolute top-0 left-0 right-0 h-5 bg-gradient-to-b from-black/[0.06] to-transparent border-b border-black/[0.05] pointer-events-none rounded-t-[2px]" />

              {/* Top Header Row on Sticky Note */}
              <div className="relative z-10 pt-1 flex items-start justify-between gap-2">
                <h4 className="font-bold text-neutral-900 text-sm sm:text-base leading-snug tracking-tight line-clamp-2 pr-1">
                  {note.title || "Untitled note"}
                </h4>

                {/* Quick Action Icons */}
                <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditNote(note);
                    }}
                    title="Edit Note"
                    className="p-1 rounded text-neutral-800 hover:text-black hover:bg-black/10 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingNoteId(note.id);
                    }}
                    title="Delete Note"
                    className="p-1 rounded text-neutral-800 hover:text-red-700 hover:bg-black/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Note Content Body (Clean Plaintext Ink Preview) */}
              <div className="relative z-10 flex-1 my-2 overflow-hidden">
                <p className="text-neutral-900/90 text-xs sm:text-sm leading-relaxed line-clamp-6 font-normal">
                  {cleanText || <span className="italic text-neutral-600/70">No text content</span>}
                </p>
              </div>

              {/* Delete Confirmation Overlay */}
              {isDeleting && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="absolute inset-0 z-20 bg-amber-100/95 backdrop-blur-[1px] p-4 flex flex-col items-center justify-center text-center rounded-[2px] animate-in fade-in duration-100"
                >
                  <p className="text-xs font-bold text-neutral-900 mb-2">Delete this sticky note?</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingNoteId(null);
                      }}
                      className="px-2.5 py-1 text-xs bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded font-medium cursor-pointer"
                    >
                      Keep
                    </button>
                    <button
                      type="button"
                      disabled={deleteNoteMutation.isPending}
                      onClick={(e) => handleDelete(note.id, e)}
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
          onClick={handleOpenAddNote}
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

      {/* ─── CASE NOTE FULL RICH TEXT EDITOR MODAL ───────────────────────── */}
      {isEditorModalOpen && (
        <CaseNoteEditorModal
          isOpen={isEditorModalOpen}
          onClose={() => {
            setIsEditorModalOpen(false);
            setSelectedNoteForModal(null);
          }}
          note={selectedNoteForModal}
          projectId={selectedNoteForModal?.projectId || activeProjectId || projectId || 0}
          studentId={studentId}
          studentName={studentName}
          appointments={appointments}
          onSaveSuccess={(savedProjectId) => {
            if (savedProjectId && !activeProjectId) {
              setActiveProjectId(savedProjectId);
            }
            notesQuery.refetch();
          }}
          onDeleteSuccess={() => {
            notesQuery.refetch();
          }}
        />
      )}
    </div>
  );
}

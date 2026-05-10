import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { NoteEditor } from "./NoteEditor";

interface NotesSectionProps {
  projectId: number;
  studentName?: string;
  isClientView?: boolean;
}

export function NotesSection({ projectId, studentName, isClientView = false }: NotesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Advocate view: use admin list (all notes). Client view: use listForClient (only visible ones)
  const adminQuery = trpc.notes.list.useQuery(
    { projectId },
    { enabled: !isClientView }
  );
  const clientQuery = trpc.notes.listForClient.useQuery(
    { projectId },
    { enabled: isClientView }
  );

  const allNotes = isClientView ? (clientQuery.data ?? []) : (adminQuery.data ?? []);
  const refetch = isClientView ? clientQuery.refetch : adminQuery.refetch;
  const notes = allNotes;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 font-semibold text-lg hover:text-blue-600"
        >
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
          Notes {notes.length > 0 && `(${notes.length})`}
        </button>

        {isExpanded && !isClientView && (
          <Button
            size="sm"
            onClick={() => setIsCreating(!isCreating)}
            variant={isCreating ? "secondary" : "default"}
          >
            <Plus className="w-4 h-4 mr-1" />
            {isCreating ? "Cancel" : "Add Note"}
          </Button>
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="space-y-4">
          {/* Create New Note (advocate only) */}
          {isCreating && !isClientView && (
            <NoteEditor
              projectId={projectId}
              onSave={() => {
                setIsCreating(false);
                refetch();
              }}
            />
          )}

          {/* Existing Notes */}
          {notes.length > 0 ? (
            <div className="space-y-3">
              {notes.map((note: any) => (
                <Card
                  key={note.id}
                  className="p-4 hover:shadow-md transition-shadow"
                >
                  <NoteEditor
                    projectId={projectId}
                    note={note}
                    onSave={() => refetch()}
                    onDelete={() => refetch()}
                    isReadOnly={isClientView}
                  />
                </Card>
              ))}
            </div>
          ) : !isCreating ? (
            <p className="text-sm text-gray-500 text-center py-8">
              {isClientView ? "No shared notes yet. Your advocate will share notes with you here." : "No notes yet. Create one to get started."}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

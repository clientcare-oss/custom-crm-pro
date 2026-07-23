import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import VoiceInput from "@/components/VoiceInput";
import RichTextEditor from "@/components/RichTextEditor";
import { Eye, EyeOff, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Note {
  id: number;
  projectId: number;
  title: string;
  content: string;
  isVisibleToClient: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface NoteEditorProps {
  projectId: number;
  note?: Note;
  onSave?: () => void;
  onDelete?: () => void;
  isReadOnly?: boolean;
}

export function NoteEditor({
  projectId,
  note,
  onSave,
  onDelete,
  isReadOnly = false,
}: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title || "");
  const [content, setContent] = useState(note?.content || "");
  const [isVisibleToClient, setIsVisibleToClient] = useState(
    note?.isVisibleToClient ?? false
  );
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const createMutation = trpc.notes.create.useMutation({
    onSuccess: () => {
      toast.success("Note created");
      setTitle("");
      setContent("");
      setIsVisibleToClient(false);
      onSave?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.notes.update.useMutation({
    onSuccess: () => {
      toast.success("Note saved");
      onSave?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.notes.delete.useMutation({
    onSuccess: () => {
      toast.success("Note deleted");
      onDelete?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const { data: history } = trpc.notes.getHistory.useQuery(
    {
      noteId: note?.id || 0,
      projectId,
    },
    {
      enabled: showHistory && !!note?.id,
    }
  );

  // Auto-save with debounce (disabled in read-only mode)
  useEffect(() => {
    if (!note || !title || !content || isReadOnly) return;

    const timer = setTimeout(async () => {
      setIsSaving(true);
      await updateMutation.mutateAsync({
        id: note.id,
        projectId,
        title,
        content,
        isVisibleToClient,
      });
      setIsSaving(false);
    }, 1000); // Auto-save after 1 second of inactivity

    return () => clearTimeout(timer);
  }, [title, content, isVisibleToClient, note, projectId, updateMutation]);

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    await createMutation.mutateAsync({
      projectId,
      title,
      content,
      isVisibleToClient,
    });
  };

  const handleToggleVisibility = async () => {
    if (!note) return;

    setIsVisibleToClient(!isVisibleToClient);
    await updateMutation.mutateAsync({
      id: note.id,
      projectId,
      isVisibleToClient: !isVisibleToClient,
    });
  };

  const handleDelete = async () => {
    if (!note) return;

    if (
      confirm(
        "Are you sure you want to delete this note? This action cannot be undone."
      )
    ) {
      await deleteMutation.mutateAsync({
        id: note.id,
        projectId,
      });
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        {isReadOnly ? (
          <h3 className="flex-1 font-semibold text-foreground">{title}</h3>
        ) : (
          <VoiceInput
            placeholder="Note title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 font-semibold"
          />
        )}
        <div className="flex items-center gap-2 ml-4">
          {/* Visibility Toggle — hidden in read-only mode */}
          {!isReadOnly && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleVisibility}
            title={
              isVisibleToClient
                ? "Visible to client"
                : "Visible to advocate only"
            }
          >
            {isVisibleToClient ? (
              <Eye className="w-4 h-4 text-blue-500" />
            ) : (
              <EyeOff className="w-4 h-4 text-gray-400" />
            )}
          </Button>
          )}

          {/* History — hidden in read-only mode */}
          {note && !isReadOnly && (
            <Dialog open={showHistory} onOpenChange={setShowHistory}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" title="View edit history">
                  <Clock className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit History</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {history && history.length > 0 ? (
                    history.map((h: any) => (
                      <div
                        key={h.id}
                        className="border-l-2 border-gray-200 pl-3 py-2"
                      >
                        <p className="text-xs text-gray-500">
                          {new Date(h.savedAt).toLocaleString()}
                        </p>
                        <p className="text-sm font-medium">{h.title}</p>
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {h.content}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No history available</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Delete — hidden in read-only mode */}
          {note && !isReadOnly && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              title="Delete note"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          )}
        </div>
      </div>

      {/* Rich Text Editor / Read-only view */}
      {isReadOnly ? (
        <div className="w-full min-h-24 p-3 border rounded-md bg-muted/30 text-sm prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
      ) : (
        <RichTextEditor
          content={content}
          onChange={(html: string) => setContent(html)}
          placeholder="Start typing your note..."
          minHeight="180px"
          showInsertOptions={false}
        />
      )}

      {/* Status Bar */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="space-x-2">
          {!isReadOnly && (
            <span>
              {isVisibleToClient ? "✓ Visible to client" : "🔒 Advocate only"}
            </span>
          )}
          {isSaving && <span className="text-blue-500">Saving...</span>}
        </div>
        {note && (
          <span>
            Last edited: {new Date(note.updatedAt).toLocaleString()}
          </span>
        )}
      </div>

      {/* Create Button (for new notes, hidden in read-only mode) */}
      {!note && !isReadOnly && (
        <Button
          onClick={handleCreate}
          disabled={!title.trim() || !content.trim()}
          className="w-full"
        >
          Create Note
        </Button>
      )}
    </Card>
  );
}

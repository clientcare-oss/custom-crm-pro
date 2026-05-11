import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import VoiceTextarea from "@/components/VoiceTextarea";
import {
  FileText, Upload, GitCompare, CheckCircle2, Lock, Loader2,
  ExternalLink, FilePen, Trash2, Pencil, Clock, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface IepDocumentBlocksProps {
  contactId: number;
}

export function IepDocumentBlocks({ contactId }: IepDocumentBlocksProps) {
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftFileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingDraft, setUploadingDraft] = useState(false);
  // Per-row notes editing state: { [draftId]: string }
  const [editingNotes, setEditingNotes] = useState<Record<number, string | null>>({});
  // Expand/collapse draft history
  const [draftHistoryExpanded, setDraftHistoryExpanded] = useState(true);

  // ── Official IEP (current + previous) ──────────────────────────────────────
  const { data: iepDoc, isLoading: iepLoading } = trpc.iep.get.useQuery(
    { contactId },
    { enabled: !!contactId }
  );

  // ── Draft IEP History (completely separate table) ───────────────────────────
  const { data: draftHistory = [], isLoading: draftLoading } = trpc.iep.listDraftHistory.useQuery(
    { contactId },
    { enabled: !!contactId }
  );

  // ── Mutations ───────────────────────────────────────────────────────────────
  const uploadMutation = trpc.iep.upload.useMutation({
    onSuccess: () => {
      toast.success("IEP/504 uploaded successfully");
      utils.iep.get.invalidate({ contactId });
      setUploading(false);
    },
    onError: (e) => {
      toast.error("Upload failed: " + e.message);
      setUploading(false);
    },
  });

  const uploadDraftMutation = trpc.iep.uploadDraft.useMutation({
    onSuccess: () => {
      toast.success("Draft IEP saved to history");
      utils.iep.listDraftHistory.invalidate({ contactId });
      setUploadingDraft(false);
    },
    onError: (e) => {
      toast.error("Upload failed: " + e.message);
      setUploadingDraft(false);
    },
  });

  const deleteDraftMutation = trpc.iep.deleteDraftHistory.useMutation({
    onSuccess: () => {
      toast.success("Draft removed from history");
      utils.iep.listDraftHistory.invalidate({ contactId });
    },
    onError: (e) => toast.error("Failed to remove draft: " + e.message),
  });

  const updateNotesMutation = trpc.iep.updateDraftNotes.useMutation({
    onSuccess: (_, vars) => {
      toast.success("Notes saved");
      utils.iep.listDraftHistory.invalidate({ contactId });
      setEditingNotes((prev) => { const n = { ...prev }; delete n[vars.id]; return n; });
    },
    onError: (e) => toast.error("Failed to save notes: " + e.message),
  });

  // ── File upload helpers ─────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const presignRes = await fetch("/api/files/iep-presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileSize: file.size }),
      });
      if (!presignRes.ok) {
        const err = await presignRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to get upload URL");
      }
      const { uploadUrl, fileKey, fileUrl } = await presignRes.json();
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Failed to upload file to storage");
      uploadMutation.mutate({ contactId, fileKey, fileName: file.name, fileUrl });
    } catch (err: any) {
      toast.error("Upload failed: " + (err?.message ?? "Unknown error"));
      setUploading(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDraftFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDraft(true);
    try {
      const presignRes = await fetch("/api/files/iep-presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileSize: file.size }),
      });
      if (!presignRes.ok) {
        const err = await presignRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to get upload URL");
      }
      const { uploadUrl, fileKey, fileUrl } = await presignRes.json();
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Failed to upload file to storage");
      uploadDraftMutation.mutate({ contactId, fileKey, fileName: file.name, fileUrl });
    } catch (err: any) {
      toast.error("Upload failed: " + (err?.message ?? "Unknown error"));
      setUploadingDraft(false);
    }
    if (draftFileInputRef.current) draftFileInputRef.current.value = "";
  };

  // ── Derived state ───────────────────────────────────────────────────────────
  const hasCurrent = !!(iepDoc?.currentFileKey);
  const hasPrevious = !!(iepDoc?.previousFileKey);
  const compareUnlocked = hasCurrent && hasPrevious;

  if (iepLoading || draftLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading IEP documents…
      </div>
    );
  }

  return (
    <div className="mb-6 space-y-6">
      {/* ── Section label ── */}
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        IEP / 504 Documents
      </p>

      {/* ── 3 Official IEP blocks ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Block 1: Current IEP on file */}
        <Card className="p-4 rounded-xl border border-border flex flex-col gap-2">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <FileText className="h-4 w-4 flex-shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wide">Current IEP/504 on File</span>
          </div>
          {hasCurrent ? (
            <div className="flex flex-col gap-1 flex-1">
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm font-semibold text-foreground break-all leading-tight">
                  {iepDoc!.currentFileName}
                </span>
              </div>
              {iepDoc!.currentUploadedAt && (
                <p className="text-xs text-muted-foreground pl-5">
                  Uploaded {new Date(iepDoc!.currentUploadedAt).toLocaleDateString()}
                </p>
              )}
              <a
                href={iepDoc!.currentFileUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto inline-flex items-center gap-1 text-xs text-accent hover:underline font-semibold pt-1"
              >
                <ExternalLink className="h-3 w-3" /> Open
              </a>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground flex-1">No IEP/504 on file yet.</p>
          )}
        </Card>

        {/* Block 2: Upload New/Amended IEP */}
        <Card className="p-4 rounded-xl border border-border flex flex-col gap-2">
          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
            <Upload className="h-4 w-4 flex-shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wide">Upload New / Amended IEP</span>
          </div>
          <p className="text-xs text-muted-foreground flex-1">
            {hasCurrent
              ? "Uploading a new file will automatically archive the current one as the previous version."
              : "Upload the current IEP or 504 plan for this student."}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="mt-auto inline-flex items-center gap-1.5 text-xs"
          >
            {uploading ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</>
            ) : (
              <><Upload className="h-3.5 w-3.5" /> {hasCurrent ? "Upload Amended IEP" : "Upload IEP/504"}</>
            )}
          </Button>
        </Card>

        {/* Block 3: Compare IEP to Previous */}
        <Card
          className={`p-4 rounded-xl border flex flex-col gap-2 transition-colors ${
            compareUnlocked
              ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20"
              : "border-border opacity-60"
          }`}
        >
          <div className={`flex items-center gap-2 ${compareUnlocked ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
            {compareUnlocked ? (
              <GitCompare className="h-4 w-4 flex-shrink-0" />
            ) : (
              <Lock className="h-4 w-4 flex-shrink-0" />
            )}
            <span className="text-xs font-bold uppercase tracking-wide">Compare IEP to Previous</span>
          </div>
          {compareUnlocked ? (
            <>
              <div className="text-xs text-muted-foreground flex-1 space-y-1">
                <p className="font-medium text-foreground">Two versions available:</p>
                <p className="truncate">Current: {iepDoc!.currentFileName}</p>
                <p className="truncate">Previous: {iepDoc!.previousFileName}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLocation(`/tools?contactId=${contactId}`)}
                className="mt-auto inline-flex items-center gap-1.5 text-xs border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              >
                <GitCompare className="h-3.5 w-3.5" /> Compare IEP/504 →
              </Button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground flex-1">
              {hasCurrent
                ? "Upload a second version to unlock comparison."
                : "Upload an IEP/504 to unlock comparison."}
            </p>
          )}
        </Card>
      </div>

      {/* ── Draft IEP History section (completely separate) ── */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/15 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2">
            <FilePen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">
              Draft IEP History
            </span>
            <span className="text-xs text-amber-600/70 dark:text-amber-400/70 font-normal normal-case tracking-normal">
              — school-proposed drafts before meetings
            </span>
            {draftHistory.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 text-[10px] font-bold w-5 h-5">
                {draftHistory.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Upload button */}
            <input
              ref={draftFileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              className="hidden"
              onChange={handleDraftFileChange}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={uploadingDraft}
              onClick={() => draftFileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 text-xs border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/50 h-7 px-2"
            >
              {uploadingDraft ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</>
              ) : (
                <><Upload className="h-3 w-3" /> Add Draft</>
              )}
            </Button>
            {/* Expand/collapse */}
            <button
              onClick={() => setDraftHistoryExpanded((v) => !v)}
              className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors"
              title={draftHistoryExpanded ? "Collapse" : "Expand"}
            >
              {draftHistoryExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Body */}
        {draftHistoryExpanded && (
          <div className="px-4 py-3">
            {draftHistory.length === 0 ? (
              <p className="text-sm text-amber-700/60 dark:text-amber-400/60 py-2">
                No draft IEPs on file yet. Upload a draft received from the school before a meeting — each upload is saved as a separate history entry.
              </p>
            ) : (
              <div className="space-y-2">
                {draftHistory.map((draft) => {
                  const isEditingThis = draft.id in editingNotes;
                  return (
                    <div
                      key={draft.id}
                      className="flex flex-col gap-1.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-white/60 dark:bg-amber-950/20 px-3 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-1.5 min-w-0">
                          <FileText className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground break-all leading-tight">
                              {draft.fileName}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                Received {new Date(draft.uploadedAt).toLocaleDateString("en-US", {
                                  month: "short", day: "numeric", year: "numeric",
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <a
                            href={draft.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold"
                            title="Open draft"
                          >
                            <ExternalLink className="h-3 w-3" /> Open
                          </a>
                          <button
                            onClick={() => deleteDraftMutation.mutate({ id: draft.id })}
                            disabled={deleteDraftMutation.isPending}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                            title="Remove this draft"
                          >
                            {deleteDraftMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Notes row */}
                      {isEditingThis ? (
                        <div className="flex flex-col gap-1.5 mt-0.5">
                          <VoiceTextarea
                            value={editingNotes[draft.id] ?? ""}
                            onChange={(e) =>
                              setEditingNotes((prev) => ({ ...prev, [draft.id]: e.target.value }))
                            }
                            placeholder="Add notes about this draft…"
                            className="text-xs min-h-[56px] resize-none border-amber-200 dark:border-amber-700 focus-visible:ring-amber-400"
                          />
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              className="text-xs h-7 px-2 bg-amber-600 hover:bg-amber-700 text-white"
                              onClick={() =>
                                updateNotesMutation.mutate({
                                  id: draft.id,
                                  notes: editingNotes[draft.id] ?? "",
                                })
                              }
                              disabled={updateNotesMutation.isPending}
                            >
                              {updateNotesMutation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Save"
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7 px-2"
                              onClick={() =>
                                setEditingNotes((prev) => {
                                  const n = { ...prev };
                                  delete n[draft.id];
                                  return n;
                                })
                              }
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="flex items-start gap-1 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors group"
                          onClick={() =>
                            setEditingNotes((prev) => ({ ...prev, [draft.id]: draft.notes ?? "" }))
                          }
                        >
                          <Pencil className="h-3 w-3 mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
                          <span className="italic">
                            {draft.notes || "Click to add notes about this draft…"}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

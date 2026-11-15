import React, { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  formatDoNotServeTimestamp,
  type DoNotServeNoteRecord,
  type DoNotServeSupportingLink,
} from "@shared/doNotServe";
import { DNS_THEME } from "./doNotServeStyles";

interface AuditRecord {
  id: number;
  summary: string;
  actorName: string;
  createdAt: string;
}

interface DoNotServeNotesAndHistorySectionProps {
  entryId: number;
  entryVersion: number;
  canEdit: boolean;
  crmTz: string;
  staffStampName: string;
  notes: DoNotServeNoteRecord[];
  links: DoNotServeSupportingLink[];
  auditLog: AuditRecord[];
  onInvalidated: () => Promise<void>;
}

export function DoNotServeNotesAndHistorySection({
  entryId,
  entryVersion,
  canEdit,
  crmTz,
  staffStampName,
  notes,
  links,
  auditLog,
  onInvalidated,
}: DoNotServeNotesAndHistorySectionProps) {
  const [newNoteBody, setNewNoteBody] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [showOlderNotes, setShowOlderNotes] = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [showAudit, setShowAudit] = useState(false);

  const visibleNotes = showOlderNotes ? notes : notes.slice(0, 3);

  const addNoteMutation = trpc.doNotServe.addNote.useMutation({
    onSuccess: async () => {
      setNewNoteBody("");
      await onInvalidated();
      toast.success("Note added with automatic employee stamp.");
    },
    onError: (err) => toast.error(err.message || "Unable to save note. Your text is preserved."),
  });

  const correctNoteMutation = trpc.doNotServe.correctNote.useMutation({
    onSuccess: async () => {
      setEditingNoteId(null);
      setEditingNoteText("");
      await onInvalidated();
      toast.success("Note updated and previous text preserved in history.");
    },
    onError: (err) => toast.error(err.message || "Unable to update note."),
  });

  const updateLinksMutation = trpc.doNotServe.updateEntry.useMutation({
    onSuccess: async () => {
      setNewLinkLabel("");
      setNewLinkUrl("");
      await onInvalidated();
      toast.success("Internal reference added.");
    },
    onError: (err) => toast.error(err.message || "Unable to add reference link."),
  });

  const handleAddSupportingLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkLabel.trim() || !newLinkUrl.trim()) return;
    const nextLinks: DoNotServeSupportingLink[] = [
      ...links,
      {
        id: `lnk_${Date.now()}`,
        label: newLinkLabel.trim(),
        url: newLinkUrl.trim(),
        addedByName: staffStampName,
        addedAt: new Date().toISOString(),
      },
    ];
    updateLinksMutation.mutate({
      id: entryId,
      expectedVersion: entryVersion,
      supportingLinks: nextLinks,
    });
  };

  return (
    <>
      {/* Additional Notes & Dated Updates */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs uppercase tracking-[0.14em] text-[#8EA2C8] font-medium">
            Additional notes ({notes.length})
          </h3>
          <span className="text-[11px] text-[#7387AC]">Latest first</span>
        </div>

        {canEdit && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newNoteBody.trim()) return;
              addNoteMutation.mutate({
                entryId,
                body: newNoteBody.trim(),
              });
            }}
            className="space-y-2"
          >
            <textarea
              rows={3}
              value={newNoteBody}
              onChange={(e) => setNewNoteBody(e.target.value)}
              placeholder="Add dated update or context (automatically stamped with your name and server time)…"
              className={cn(DNS_THEME.input, "px-3.5 py-2.5 text-sm leading-relaxed resize-y")}
            />
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] text-[#7387AC]">
                Stamp: {staffStampName} · Automatic ({crmTz})
              </span>
              <button
                type="submit"
                disabled={!newNoteBody.trim() || addNoteMutation.isPending}
                className={cn(DNS_THEME.secondaryBtn, "h-8 px-3 text-xs inline-flex items-center gap-1.5")}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add note</span>
              </button>
            </div>
          </form>
        )}

        {visibleNotes.length === 0 ? (
          <p className="text-xs text-[#7387AC]">No additional notes recorded yet.</p>
        ) : (
          <div className="space-y-2.5">
            {visibleNotes.map((n) => (
              <div
                key={n.id}
                className="rounded-md bg-[#051029] border border-[#182746] p-3.5 space-y-2"
              >
                {editingNoteId === n.id ? (
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      value={editingNoteText}
                      onChange={(e) => setEditingNoteText(e.target.value)}
                      className={cn(DNS_THEME.input, "px-3 py-2 text-sm")}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingNoteId(null)}
                        className={cn(DNS_THEME.secondaryBtn, "h-7 px-2.5 text-xs")}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          correctNoteMutation.mutate({
                            entryId,
                            noteId: n.id,
                            body: editingNoteText.trim(),
                          })
                        }
                        disabled={!editingNoteText.trim() || correctNoteMutation.isPending}
                        className={cn(DNS_THEME.goldPrimaryBtn, "h-7 px-3 text-xs")}
                      >
                        Save correction
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-[#E9EFFA] whitespace-pre-wrap leading-relaxed break-words">
                      {n.body}
                    </p>
                    <div className="flex items-center justify-between gap-2 flex-wrap pt-1 text-[11px] text-[#7E92B8]">
                      <span>
                        {n.authorName} · {formatDoNotServeTimestamp(n.createdAt, crmTz)}
                        {n.updatedAt
                          ? ` · Edited by ${n.updatedByName} (${formatDoNotServeTimestamp(
                              n.updatedAt,
                              crmTz
                            )})`
                          : ""}
                      </span>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNoteId(n.id);
                            setEditingNoteText(n.body);
                          }}
                          className="text-[#9FB0CF] hover:text-white cursor-pointer"
                        >
                          Correct
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}

            {notes.length > 3 && (
              <button
                type="button"
                onClick={() => setShowOlderNotes((v) => !v)}
                className="text-xs text-[#9FB0CF] hover:text-white cursor-pointer"
              >
                {showOlderNotes
                  ? "Collapse older notes"
                  : `Show ${notes.length - 3} older note(s)`}
              </button>
            )}
          </div>
        )}
      </section>

      {/* Progressive Disclosure: Internal Supporting Links */}
      <section className="pt-2 border-t border-[#192848]">
        <button
          type="button"
          onClick={() => setShowLinks((v) => !v)}
          className="w-full flex items-center justify-between py-1.5 text-left text-xs text-[#9FB0CF] hover:text-white cursor-pointer"
        >
          <span className="inline-flex items-center gap-1.5">
            {showLinks ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
            <span>Supporting internal references ({links.length})</span>
          </span>
          <span className="text-[11px] text-[#6E82A6]">Internal only</span>
        </button>

        {showLinks && (
          <div className="mt-2.5 space-y-2.5 pl-4 border-l border-[#1C2E54]">
            <p className="text-[11px] text-[#7387AC]">
              Confidential staff references. Never visible in the Parent Portal.
            </p>
            {links.map((lnk, idx) => (
              <a
                key={`${lnk.url}-${idx}`}
                href={lnk.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-2 text-xs text-[#DFC07C] hover:underline break-all"
              >
                <span>{lnk.label}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            ))}
            {canEdit && (
              <form
                onSubmit={handleAddSupportingLink}
                className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1"
              >
                <input
                  type="text"
                  value={newLinkLabel}
                  onChange={(e) => setNewLinkLabel(e.target.value)}
                  placeholder="Reference label"
                  className={cn(DNS_THEME.input, "h-8 px-2.5 text-xs sm:col-span-2")}
                />
                <input
                  type="url"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="https://…"
                  className={cn(DNS_THEME.input, "h-8 px-2.5 text-xs sm:col-span-2")}
                />
                <button
                  type="submit"
                  disabled={!newLinkLabel.trim() || !newLinkUrl.trim()}
                  className={cn(DNS_THEME.secondaryBtn, "h-8 px-2.5 text-xs sm:col-span-1")}
                >
                  Add
                </button>
              </form>
            )}
          </div>
        )}
      </section>

      {/* Progressive Disclosure: Audit History */}
      <section className="pt-2 border-t border-[#192848]">
        <button
          type="button"
          onClick={() => setShowAudit((v) => !v)}
          className="w-full flex items-center justify-between py-1.5 text-left text-xs text-[#9FB0CF] hover:text-white cursor-pointer"
        >
          <span className="inline-flex items-center gap-1.5">
            {showAudit ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
            <span>Activity &amp; audit history ({auditLog.length})</span>
          </span>
        </button>

        {showAudit && (
          <div className="mt-2.5 space-y-2.5 pl-4 border-l border-[#1C2E54]">
            {auditLog.map((log) => (
              <div key={log.id} className="space-y-0.5 text-xs">
                <p className="text-[#DCE5F5] break-words">{log.summary}</p>
                <p className="text-[11px] text-[#7387AC]">
                  {log.actorName} · {formatDoNotServeTimestamp(log.createdAt, crmTz)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "../workspaceContext";
import { Field, GhostButton, GoldButton, SectionCard, inputCls, selectCls } from "@/components/complaint/atoms";
import { EVIDENCE_CATEGORIES } from "@shared/complaintEngine";
import { Check, ExternalLink, Link2, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

export function SectionEvidence() {
  const { caseDbId } = useWorkspace();
  const utils = trpc.useUtils();
  const { data } = trpc.complaintEngine.listEvidence.useQuery({ caseId: caseDbId });
  const { data: allegData } = trpc.complaintEngine.listAllegations.useQuery({ caseId: caseDbId });
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [linkFor, setLinkFor] = useState<number | null>(null);

  const invalidate = () => { utils.complaintEngine.listEvidence.invalidate({ caseId: caseDbId }); utils.complaintEngine.readiness.invalidate({ caseId: caseDbId }); };
  const upload = trpc.complaintEngine.uploadEvidence.useMutation({
    onSuccess: (r) => { invalidate(); toast.success(`Added as ${r.evidenceId}`); },
    onError: (e) => toast.error(e.message),
    onSettled: () => setUploading(false),
  });
  const update = trpc.complaintEngine.updateEvidence.useMutation({ onSuccess: invalidate });
  const del = trpc.complaintEngine.deleteEvidence.useMutation({
    onSuccess: invalidate,
    onError: (e, vars) => {
      if (e.data?.code === "PRECONDITION_FAILED") {
        if (confirm(e.message)) del.mutate({ id: vars.id, confirmed: true });
      } else toast.error(e.message);
    },
  });
  const link = trpc.complaintEngine.linkEvidence.useMutation({ onSuccess: () => { invalidate(); setLinkFor(null); } });
  const unlink = trpc.complaintEngine.unlinkEvidence.useMutation({ onSuccess: invalidate });

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const buf = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 8192)));
      upload.mutate({ caseId: caseDbId, fileName: file.name, mimeType: file.type || "application/octet-stream", base64: btoa(binary) });
    }
  }

  const items = data?.items ?? [];
  const links = data?.links ?? [];
  const allegations = (allegData?.allegations ?? []).filter(a => !["suggested", "rejected", "excluded"].includes(a.status));

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Evidence</h2>
          <p className="mt-1 text-sm text-slate-400">Evidence IDs (EV-0001…) are permanent once assigned, so exhibit references stay stable. Link each item to the allegations it supports.</p>
        </div>
        <GoldButton disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Add Evidence
        </GoldButton>
        <input ref={fileRef} type="file" multiple hidden accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic,.eml,.msg,.txt" onChange={e => onFiles(e.target.files)} />
      </div>

      {items.length === 0 && (
        <SectionCard><p className="py-8 text-center text-sm text-slate-500">No evidence yet. Upload IEPs, evaluations, emails, notices, service logs, or photos (PDF, Word, images — up to 20 MB each).</p></SectionCard>
      )}

      <div className="space-y-3">
        {items.map(ev => {
          const evLinks = links.filter(l => l.evidenceItemId === ev.id && l.targetType === "allegation");
          return (
            <div key={ev.id} className="rounded-lg border border-[#22355499] bg-[#0B1F3A] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-[#D9A441]/15 px-2 py-0.5 text-xs font-bold text-[#E4B65B]">{ev.evidenceId}</span>
                    <input
                      className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#D9A441]/50 rounded px-1"
                      defaultValue={ev.title}
                      onBlur={e => { if (e.target.value !== ev.title) update.mutate({ id: ev.id, data: { title: e.target.value } }); }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <select
                      className="rounded border border-[#22355499] bg-[#081A33] px-2 py-1 text-xs text-slate-300"
                      value={ev.category}
                      onChange={e => update.mutate({ id: ev.id, data: { category: e.target.value } })}
                    >
                      {EVIDENCE_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                    <input
                      type="date"
                      className="rounded border border-[#22355499] bg-[#081A33] px-2 py-1 text-xs text-slate-300"
                      defaultValue={ev.docDate ? new Date(ev.docDate).toISOString().slice(0, 10) : ""}
                      onBlur={e => update.mutate({ id: ev.id, data: { docDate: e.target.value || null } })}
                      title="Document date"
                    />
                    <span className="text-xs text-slate-500">{ev.fileName} · {ev.fileSize ? `${Math.round(ev.fileSize / 1024)} KB` : ""}</span>
                  </div>
                  <div className="mt-2">
                    <textarea
                      className="w-full rounded border border-[#22355499] bg-[#081A33] px-2 py-1.5 text-xs text-slate-300 placeholder:text-slate-600"
                      rows={2}
                      placeholder="Short summary — what this document shows (you verify it; nothing is auto-trusted)…"
                      defaultValue={ev.summary ?? ""}
                      onBlur={e => { if (e.target.value !== (ev.summary ?? "")) update.mutate({ id: ev.id, data: { summary: e.target.value || null } }); }}
                    />
                    <label className="flex items-center gap-1.5 text-xs text-slate-400">
                      <input type="checkbox" checked={ev.summaryVerified} onChange={e => update.mutate({ id: ev.id, data: { summaryVerified: e.target.checked } })} />
                      Summary verified by me — allow AI drafting to use it
                    </label>
                  </div>
                  {evLinks.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {evLinks.map(l => {
                        const alg = allegations.find(a => a.id === l.targetId);
                        return (
                          <span key={l.id} className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-xs text-sky-300">
                            Allegation {alg ? String(alg.seqNumber).padStart(2, "0") : l.targetId}
                            <button onClick={() => unlink.mutate({ linkId: l.id })} className="text-slate-500 hover:text-red-400">×</button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  {ev.fileUrl && <a href={ev.fileUrl} target="_blank" rel="noreferrer" className="rounded p-1.5 text-slate-400 hover:text-[#D9A441]" title="Open file"><ExternalLink className="h-4 w-4" /></a>}
                  <button title="Link to allegation" onClick={() => setLinkFor(linkFor === ev.id ? null : ev.id)} className="rounded p-1.5 text-slate-400 hover:text-sky-400"><Link2 className="h-4 w-4" /></button>
                  <button title="Delete" onClick={() => del.mutate({ id: ev.id, confirmed: false })} className="rounded p-1.5 text-slate-400 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              {linkFor === ev.id && (
                <div className="mt-3 rounded-md border border-sky-500/30 bg-sky-500/5 p-3">
                  <p className="text-xs text-sky-200">Link {ev.evidenceId} to:</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {allegations.filter(a => !evLinks.some(l => l.targetId === a.id)).map(a => (
                      <GhostButton key={a.id} onClick={() => link.mutate({ evidenceItemId: ev.id, targetType: "allegation", targetId: a.id })}>
                        <Check className="h-3.5 w-3.5" /> {String(a.seqNumber).padStart(2, "0")} — {a.plainTitle.slice(0, 50)}
                      </GhostButton>
                    ))}
                    {allegations.length === 0 && <p className="text-xs text-slate-500">Accept an allegation first, then link evidence to it.</p>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

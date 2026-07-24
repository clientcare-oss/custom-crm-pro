import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "../workspaceContext";
import { AiBadge, Field, GhostButton, GoldButton, SectionCard, StatusPill, inputCls, selectCls } from "@/components/complaint/atoms";
import { VoiceTextarea } from "@/components/complaint/VoiceTextarea";
import { ISSUE_CATEGORIES } from "@shared/complaintEngine";
import { Check, GitMerge, Loader2, Pencil, Plus, Scale, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";

type Allegation = {
  id: number; seqNumber: number; plainTitle: string; formalTitle: string | null;
  status: string; confidence: string; reasonSuggested: string | null;
  issueCategories: unknown; requiredElements: unknown; missingInfo: unknown; factsUsed: unknown;
  districtNotice: string | null; districtResponse: string; districtResponseDetail: string | null;
  aiSuggested: boolean;
};

const STATUS_LABEL: Record<string, { label: string; kind: "ok" | "warning" | "error" | "info" | "gold" }> = {
  suggested: { label: "Suggested", kind: "info" },
  accepted: { label: "Accepted", kind: "gold" },
  needs_facts: { label: "Needs Facts", kind: "warning" },
  needs_evidence: { label: "Needs Evidence", kind: "warning" },
  drafted: { label: "Drafted", kind: "ok" },
  ready_for_review: { label: "Ready for Review", kind: "ok" },
  excluded: { label: "Saved for Later", kind: "info" },
  rejected: { label: "Rejected", kind: "error" },
};

export function SectionAllegations() {
  const { caseDbId } = useWorkspace();
  const utils = trpc.useUtils();
  const { data } = trpc.complaintEngine.listAllegations.useQuery({ caseId: caseDbId });
  const [editing, setEditing] = useState<number | null>(null);
  const [mergeSource, setMergeSource] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);

  const invalidate = () => {
    utils.complaintEngine.listAllegations.invalidate({ caseId: caseDbId });
    utils.complaintEngine.readiness.invalidate({ caseId: caseDbId });
  };
  const suggest = trpc.complaintEngine.suggestAllegations.useMutation({
    onSuccess: (r) => { invalidate(); toast.success(r.count ? `${r.count} allegation(s) suggested` : "No new allegations could be grounded in the current facts"); },
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.complaintEngine.updateAllegation.useMutation({ onSuccess: invalidate, onError: e => toast.error(e.message) });
  const merge = trpc.complaintEngine.mergeAllegations.useMutation({
    onSuccess: () => { invalidate(); setMergeSource(null); toast.success("Allegations merged"); },
    onError: e => toast.error(e.message),
  });
  const del = trpc.complaintEngine.deleteAllegation.useMutation({ onSuccess: invalidate });

  const allegs = (data?.allegations ?? []) as Allegation[];
  const active = allegs.filter(a => !["rejected"].includes(a.status));
  const suggestions = active.filter(a => a.status === "suggested");
  const accepted = active.filter(a => a.status !== "suggested" && a.status !== "excluded");
  const saved = active.filter(a => a.status === "excluded");

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Allegations</h2>
          <p className="mt-1 text-sm text-slate-400">Each allegation is a separate claim. AI can suggest allegations from your confirmed facts — you decide what enters the complaint.</p>
        </div>
        <div className="flex gap-2">
          <GhostButton onClick={() => setShowNew(true)}><Plus className="h-4 w-4" /> Add Manually</GhostButton>
          <GoldButton disabled={suggest.isPending} onClick={() => suggest.mutate({ caseId: caseDbId })}>
            {suggest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Review Suggested Allegations
          </GoldButton>
        </div>
      </div>

      {showNew && <NewAllegationForm onClose={() => setShowNew(false)} />}

      {suggestions.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Suggested — awaiting your decision</h3>
          <div className="space-y-3">
            {suggestions.map(a => (
              <AllegationCard
                key={a.id} a={a}
                editing={editing === a.id} setEditing={setEditing}
                mergeSource={mergeSource} setMergeSource={setMergeSource}
                candidates={active.filter(x => x.id !== a.id)}
                onUpdate={(data) => update.mutate({ id: a.id, data })}
                onMergeInto={(keepId) => merge.mutate({ keepId, mergeId: a.id })}
                onDelete={() => del.mutate({ id: a.id })}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">In the complaint ({accepted.length})</h3>
        {accepted.length === 0 && (
          <SectionCard><p className="py-4 text-center text-sm text-slate-500">No accepted allegations yet. Review AI suggestions or add one manually.</p></SectionCard>
        )}
        <div className="space-y-3">
          {accepted.map(a => (
            <AllegationCard
              key={a.id} a={a}
              editing={editing === a.id} setEditing={setEditing}
              mergeSource={mergeSource} setMergeSource={setMergeSource}
              candidates={active.filter(x => x.id !== a.id)}
              onUpdate={(data) => update.mutate({ id: a.id, data })}
              onMergeInto={(keepId) => merge.mutate({ keepId, mergeId: a.id })}
              onDelete={() => del.mutate({ id: a.id })}
            />
          ))}
        </div>
      </div>

      {saved.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Saved for later</h3>
          <div className="space-y-3">
            {saved.map(a => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-[#22355499] bg-[#0B1F3A] px-4 py-3">
                <p className="text-sm text-slate-300">{String(a.seqNumber).padStart(2, "0")} — {a.plainTitle}</p>
                <GhostButton onClick={() => update.mutate({ id: a.id, data: { status: "accepted" } })}>Restore</GhostButton>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NewAllegationForm({ onClose }: { onClose: () => void }) {
  const { caseDbId } = useWorkspace();
  const utils = trpc.useUtils();
  const [title, setTitle] = useState("");
  const create = trpc.complaintEngine.createAllegation.useMutation({
    onSuccess: () => { utils.complaintEngine.listAllegations.invalidate({ caseId: caseDbId }); onClose(); },
  });
  return (
    <SectionCard title="New Allegation">
      <Field label="What is the school alleged to have done (or failed to do)?" required>
        <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., The district failed to provide the counseling services in the IEP" />
      </Field>
      <div className="mt-3 flex justify-end gap-2">
        <GhostButton onClick={onClose}>Cancel</GhostButton>
        <GoldButton disabled={!title.trim() || create.isPending} onClick={() => create.mutate({ caseId: caseDbId, plainTitle: title })}>Add This Allegation</GoldButton>
      </div>
    </SectionCard>
  );
}

function AllegationCard({ a, editing, setEditing, mergeSource, setMergeSource, candidates, onUpdate, onMergeInto, onDelete }: {
  a: Allegation;
  editing: boolean;
  setEditing: (id: number | null) => void;
  mergeSource: number | null;
  setMergeSource: (id: number | null) => void;
  candidates: Allegation[];
  onUpdate: (data: Record<string, unknown>) => void;
  onMergeInto: (keepId: number) => void;
  onDelete: () => void;
}) {
  const cats = (a.issueCategories ?? []) as string[];
  const elements = (a.requiredElements ?? []) as { text: string; met: boolean }[];
  const missing = (a.missingInfo ?? []) as string[];
  const facts = (a.factsUsed ?? []) as { type: string; refId: number | null; text: string }[];
  const st = STATUS_LABEL[a.status] ?? STATUS_LABEL.accepted;
  const isSuggestion = a.status === "suggested";
  const [expanded, setExpanded] = useState(isSuggestion);

  return (
    <div className={`rounded-lg border p-4 ${isSuggestion ? "border-[#D9A441]/40 bg-[#D9A441]/5" : "border-[#22355499] bg-[#0B1F3A]"}`}>
      <div className="flex items-start justify-between gap-3">
        <button className="min-w-0 flex-1 text-left" onClick={() => setExpanded(!expanded)}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">{String(a.seqNumber).padStart(2, "0")}</span>
            <StatusPill kind={st.kind} label={st.label} />
            {a.aiSuggested && <AiBadge />}
            {isSuggestion && <span className="text-xs text-slate-400 capitalize">Confidence: {a.confidence}</span>}
          </div>
          <p className="mt-1.5 font-medium text-slate-100">{a.plainTitle}</p>
          {a.formalTitle && <p className="mt-0.5 text-sm italic text-slate-400">{a.formalTitle}</p>}
        </button>
        <div className="flex shrink-0 gap-1">
          <button title="Edit" onClick={() => setEditing(editing ? null : a.id)} className="rounded p-1.5 text-slate-400 hover:text-[#D9A441]"><Pencil className="h-4 w-4" /></button>
          <button title="Merge into another allegation" onClick={() => setMergeSource(mergeSource === a.id ? null : a.id)} className="rounded p-1.5 text-slate-400 hover:text-sky-400"><GitMerge className="h-4 w-4" /></button>
          <button title="Delete" onClick={() => { if (confirm("Delete this allegation?")) onDelete(); }} className="rounded p-1.5 text-slate-400 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>

      {a.reasonSuggested && isSuggestion && (
        <p className="mt-2 rounded-md bg-[#081A33] px-3 py-2 text-xs text-slate-400"><span className="font-semibold text-slate-300">Why suggested:</span> {a.reasonSuggested}</p>
      )}

      {mergeSource === a.id && (
        <div className="mt-3 rounded-md border border-sky-500/30 bg-sky-500/5 p-3">
          <p className="text-xs text-sky-200">Merge this allegation into:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {candidates.map(cand => (
              <GhostButton key={cand.id} onClick={() => onMergeInto(cand.id)}>{String(cand.seqNumber).padStart(2, "0")} — {cand.plainTitle.slice(0, 60)}</GhostButton>
            ))}
            {candidates.length === 0 && <p className="text-xs text-slate-500">No other allegations to merge with.</p>}
          </div>
        </div>
      )}

      {expanded && (
        <div className="mt-3 space-y-3">
          {cats.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {cats.map(c => <span key={c} className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-xs text-sky-300">{ISSUE_CATEGORIES.find(i => i.key === c)?.label ?? c}</span>)}
            </div>
          )}
          {facts.length > 0 && (
            <div className="rounded-md border border-sky-500/25 bg-sky-500/5 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-300">Built From</p>
              <ul className="mt-1 space-y-0.5">{facts.map((fa, i) => <li key={i} className="text-xs text-slate-300"><span className="text-sky-300">{fa.type}</span>{fa.refId ? ` #${fa.refId}` : ""} — {fa.text}</li>)}</ul>
            </div>
          )}
          {elements.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Required elements</p>
              <div className="mt-1 space-y-1">
                {elements.map((el, i) => (
                  <label key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox" checked={el.met} className="mt-1"
                      onChange={() => onUpdate({ requiredElements: elements.map((e2, j) => (j === i ? { ...e2, met: !e2.met } : e2)) })}
                    />
                    <span className={el.met ? "text-slate-300" : "text-slate-400"}>{el.text}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {missing.length > 0 && (
            <div className="rounded-md border border-amber-500/25 bg-amber-500/5 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">What would confirm or strengthen this</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">{missing.map((m, i) => <li key={i} className="text-xs text-slate-300">{m}</li>)}</ul>
            </div>
          )}
          {!isSuggestion && <AuthoritiesPanel allegationId={a.id} title={a.formalTitle || a.plainTitle} />}
        </div>
      )}

      {editing && <EditForm a={a} onUpdate={onUpdate} onClose={() => setEditing(null)} />}

      {isSuggestion && (
        <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-[#22355499] pt-3">
          <GhostButton onClick={() => onUpdate({ status: "excluded" })}>Save for Later</GhostButton>
          <GhostButton danger onClick={() => onUpdate({ status: "rejected" })}><X className="h-4 w-4" /> Not Part of My Complaint</GhostButton>
          <GoldButton onClick={() => onUpdate({ status: "accepted" })}><Check className="h-4 w-4" /> Add This Allegation</GoldButton>
        </div>
      )}
    </div>
  );
}

function EditForm({ a, onUpdate, onClose }: { a: Allegation; onUpdate: (d: Record<string, unknown>) => void; onClose: () => void }) {
  const [plainTitle, setPlainTitle] = useState(a.plainTitle);
  const [formalTitle, setFormalTitle] = useState(a.formalTitle ?? "");
  const [districtNotice, setDistrictNotice] = useState(a.districtNotice ?? "");
  const [districtResponse, setDistrictResponse] = useState(a.districtResponse);
  const [status, setStatus] = useState(a.status);
  return (
    <div className="mt-3 space-y-3 rounded-md border border-[#22355499] bg-[#081A33] p-4">
      <Field label="Plain-language title"><input className={inputCls} value={plainTitle} onChange={e => setPlainTitle(e.target.value)} /></Field>
      <Field label="Formal title"><input className={inputCls} value={formalTitle} onChange={e => setFormalTitle(e.target.value)} /></Field>
      <Field label="How and when did the district know? (notice)">
        <VoiceTextarea rows={2} value={districtNotice} onChange={setDistrictNotice} />
      </Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="District response">
          <select className={selectCls} value={districtResponse} onChange={e => setDistrictResponse(e.target.value)}>
            <option value="none">Not recorded</option><option value="action">Took action</option>
            <option value="denial">Denied</option><option value="delay">Delayed</option>
            <option value="no_response">No response</option><option value="incomplete">Incomplete response</option>
            <option value="disputed">Disputed the facts</option>
          </select>
        </Field>
        <Field label="Workflow status">
          <select className={selectCls} value={status} onChange={e => setStatus(e.target.value)}>
            {Object.entries(STATUS_LABEL).filter(([k]) => k !== "suggested").map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <GhostButton onClick={onClose}>Cancel</GhostButton>
        <GoldButton onClick={() => { onUpdate({ plainTitle, formalTitle: formalTitle || null, districtNotice: districtNotice || null, districtResponse, status }); onClose(); }}>Save Changes</GoldButton>
      </div>
    </div>
  );
}

function AuthoritiesPanel({ allegationId, title }: { allegationId: number; title: string }) {
  const { caseDbId } = useWorkspace();
  const utils = trpc.useUtils();
  const { data } = trpc.complaintEngine.listAllegations.useQuery({ caseId: caseDbId });
  const authorities = (data?.authorities ?? []).filter(x => x.allegationId === allegationId && x.status !== "removed");
  const suggest = trpc.complaintEngine.suggestAuthorities.useMutation({
    onSuccess: () => utils.complaintEngine.listAllegations.invalidate({ caseId: caseDbId }),
    onError: e => toast.error(e.message),
  });
  const update = trpc.complaintEngine.updateAuthority.useMutation({
    onSuccess: () => utils.complaintEngine.listAllegations.invalidate({ caseId: caseDbId }),
  });

  return (
    <div className="rounded-md border border-[#22355499] bg-[#081A33] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400"><Scale className="h-3.5 w-3.5 text-[#D9A441]" /> Legal Authority</p>
        <GhostButton className="!px-2 !py-1 text-xs" disabled={suggest.isPending} onClick={() => suggest.mutate({ allegationId })}>
          {suggest.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Suggest Authority
        </GhostButton>
      </div>
      {authorities.length === 0 && <p className="mt-2 text-xs text-slate-500">No authority linked yet. Suggestions come from a verified IDEA/Georgia library and are labeled potentially relevant until you confirm them.</p>}
      <div className="mt-2 space-y-1.5">
        {authorities.map(au => (
          <div key={au.id} className="flex items-start justify-between gap-2 rounded border border-[#22355499] px-2.5 py-1.5">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-200">
                <span className={au.group === "georgia" ? "text-[#E4B65B]" : "text-sky-300"}>[{au.group === "georgia" ? "Georgia" : "Federal"}]</span> {au.citation}
                {au.status === "suggested" && <span className="ml-1.5 text-[10px] text-amber-300">potentially relevant — review</span>}
              </p>
              {au.subject && <p className="text-[11px] text-slate-400">{au.subject}</p>}
              {au.whyApplies && <p className="mt-0.5 text-[11px] text-slate-500">{au.whyApplies}</p>}
            </div>
            <div className="flex shrink-0 gap-1">
              {au.status !== "confirmed" && (
                <button title="Confirm" onClick={() => update.mutate({ id: au.id, data: { status: "confirmed" } })} className="rounded p-1 text-emerald-400 hover:bg-emerald-500/10"><Check className="h-3.5 w-3.5" /></button>
              )}
              <button title="Remove" onClick={() => update.mutate({ id: au.id, data: { status: "removed" } })} className="rounded p-1 text-slate-500 hover:text-red-400"><X className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "../workspaceContext";
import { Field, GhostButton, GoldButton, SectionCard, inputCls, selectCls } from "@/components/complaint/atoms";
import { VoiceTextarea } from "@/components/complaint/VoiceTextarea";
import { REMEDY_OPTIONS } from "@shared/complaintEngine";
import { Pencil, Plus, Scale, Trash2 } from "lucide-react";

type RemedyForm = {
  id?: number; remedyType: string; title: string; detail: string;
  purpose: string; quantification: string; allegationId: number | null;
};
const empty: RemedyForm = { remedyType: "compensatory_education", title: "", detail: "", purpose: "", quantification: "", allegationId: null };

export function SectionRemedies() {
  const { caseDbId } = useWorkspace();
  const utils = trpc.useUtils();
  const { data: remedies } = trpc.complaintEngine.listRemedies.useQuery({ caseId: caseDbId });
  const { data: allegData } = trpc.complaintEngine.listAllegations.useQuery({ caseId: caseDbId });
  const [form, setForm] = useState<RemedyForm | null>(null);
  const allegations = (allegData?.allegations ?? []).filter(a => !["suggested", "rejected", "excluded"].includes(a.status));

  const invalidate = () => { utils.complaintEngine.listRemedies.invalidate({ caseId: caseDbId }); utils.complaintEngine.readiness.invalidate({ caseId: caseDbId }); };
  const save = trpc.complaintEngine.saveRemedy.useMutation({ onSuccess: () => { invalidate(); setForm(null); } });
  const del = trpc.complaintEngine.deleteRemedy.useMutation({ onSuccess: invalidate });

  const set = (k: keyof RemedyForm) => (v: string | number | null) => setForm(f => (f ? { ...f, [k]: v } : f));

  function pickType(key: string) {
    const opt = REMEDY_OPTIONS.find(o => o.key === key);
    setForm(f => f ? { ...f, remedyType: key, title: f.title || opt?.label || "", purpose: f.purpose || opt?.purpose || "" } : f);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Requested Remedies</h2>
          <p className="mt-1 text-sm text-slate-400">Georgia asks for a proposed resolution to the extent known. Ask for what would actually fix the problem, quantified where possible.</p>
        </div>
        <GoldButton onClick={() => setForm(empty)}><Plus className="h-4 w-4" /> Add Remedy</GoldButton>
      </div>

      {form && (
        <SectionCard title={form.id ? "Edit Remedy" : "New Requested Remedy"}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Remedy type">
              <select className={selectCls} value={form.remedyType} onChange={e => pickType(e.target.value)}>
                {REMEDY_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Related allegation">
              <select className={selectCls} value={form.allegationId ?? ""} onChange={e => set("allegationId")(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Whole complaint</option>
                {allegations.map(a => <option key={a.id} value={a.id}>{String(a.seqNumber).padStart(2, "0")} — {a.plainTitle.slice(0, 60)}</option>)}
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="What are you asking for?" required>
                <input className={inputCls} value={form.title} onChange={e => set("title")(e.target.value)} />
              </Field>
            </div>
            <Field label="Quantification">
              <input className={inputCls} value={form.quantification} onChange={e => set("quantification")(e.target.value)} placeholder="e.g., 40 hours of 1:1 reading instruction" />
            </Field>
            <Field label="Purpose">
              <input className={inputCls} value={form.purpose} onChange={e => set("purpose")(e.target.value)} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Details">
                <VoiceTextarea rows={2} value={form.detail} onChange={set("detail")} />
              </Field>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <GhostButton onClick={() => setForm(null)}>Cancel</GhostButton>
            <GoldButton
              disabled={!form.title.trim() || save.isPending}
              onClick={() => save.mutate({
                id: form.id, caseId: caseDbId, allegationId: form.allegationId, remedyType: form.remedyType,
                title: form.title, detail: form.detail || null, purpose: form.purpose || null,
                quantification: form.quantification || null,
              })}
            >Save Remedy</GoldButton>
          </div>
        </SectionCard>
      )}

      <div className="space-y-3">
        {remedies?.length === 0 && !form && (
          <SectionCard><p className="py-6 text-center text-sm text-slate-500">No remedies yet. Common requests: compensatory education, evaluations, IEP meetings, staff training.</p></SectionCard>
        )}
        {remedies?.map((r, idx) => (
          <div key={r.id} className="flex gap-4 rounded-lg border border-[#22355499] bg-[#0B1F3A] p-4">
            <Scale className="h-5 w-5 shrink-0 text-[#D9A441]" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-100">{idx + 1}. {r.title}</p>
              <p className="mt-0.5 text-xs text-slate-400">{[REMEDY_OPTIONS.find(o => o.key === r.remedyType)?.label, r.quantification, r.purpose].filter(Boolean).join(" · ")}</p>
              {r.detail && <p className="mt-1 text-xs text-slate-500">{r.detail}</p>}
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <button className="rounded p-1.5 text-slate-400 hover:text-[#D9A441]" onClick={() => setForm({
                id: r.id, remedyType: r.remedyType, title: r.title, detail: r.detail ?? "",
                purpose: r.purpose ?? "", quantification: r.quantification ?? "", allegationId: r.allegationId,
              })}><Pencil className="h-4 w-4" /></button>
              <button className="rounded p-1.5 text-slate-400 hover:text-red-400" onClick={() => { if (confirm("Delete this remedy?")) del.mutate({ id: r.id }); }}><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


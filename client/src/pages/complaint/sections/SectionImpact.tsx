import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "../workspaceContext";
import { Field, GhostButton, GoldButton, SectionCard, inputCls, selectCls } from "@/components/complaint/atoms";
import { VoiceTextarea } from "@/components/complaint/VoiceTextarea";
import { IMPACT_CATEGORIES } from "@shared/complaintEngine";
import { HeartPulse, Pencil, Plus, Trash2 } from "lucide-react";

type ImpactForm = {
  id?: number; category: string; allegationId: number | null;
  whatChanged: string; frequency: string; duration: string;
  supportBasis: "direct_evidence" | "parent_observation" | "student_report" | "school_report" | "inference";
  supportDetail: string; narrative: string;
};
const empty: ImpactForm = { category: "academic", allegationId: null, whatChanged: "", frequency: "", duration: "", supportBasis: "parent_observation", supportDetail: "", narrative: "" };

const BASIS_LABEL: Record<string, string> = {
  direct_evidence: "Direct evidence", parent_observation: "Parent observation",
  student_report: "Student report", school_report: "School report", inference: "Reasonable inference",
};

export function SectionImpact() {
  const { caseDbId } = useWorkspace();
  const utils = trpc.useUtils();
  const { data: impacts } = trpc.complaintEngine.listImpacts.useQuery({ caseId: caseDbId });
  const { data: allegData } = trpc.complaintEngine.listAllegations.useQuery({ caseId: caseDbId });
  const [form, setForm] = useState<ImpactForm | null>(null);
  const allegations = (allegData?.allegations ?? []).filter(a => !["suggested", "rejected", "excluded"].includes(a.status));

  const save = trpc.complaintEngine.saveImpact.useMutation({
    onSuccess: () => { utils.complaintEngine.listImpacts.invalidate({ caseId: caseDbId }); setForm(null); },
  });
  const del = trpc.complaintEngine.deleteImpact.useMutation({
    onSuccess: () => utils.complaintEngine.listImpacts.invalidate({ caseId: caseDbId }),
  });

  const set = (k: keyof ImpactForm) => (v: string | number | null) => setForm(f => (f ? { ...f, [k]: v } : f));

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Student Impact</h2>
          <p className="mt-1 text-sm text-slate-400">How the violations affected the student. Be specific about what changed, how often, and what supports it.</p>
        </div>
        <GoldButton onClick={() => setForm(empty)}><Plus className="h-4 w-4" /> Add Impact</GoldButton>
      </div>

      {form && (
        <SectionCard title={form.id ? "Edit Impact" : "New Impact Statement"}>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Category">
              <select className={selectCls} value={form.category} onChange={e => set("category")(e.target.value)}>
                {IMPACT_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Related allegation">
              <select className={selectCls} value={form.allegationId ?? ""} onChange={e => set("allegationId")(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Whole complaint</option>
                {allegations.map(a => <option key={a.id} value={a.id}>{String(a.seqNumber).padStart(2, "0")} — {a.plainTitle.slice(0, 60)}</option>)}
              </select>
            </Field>
            <Field label="Basis of support">
              <select className={selectCls} value={form.supportBasis} onChange={e => set("supportBasis")(e.target.value)}>
                {Object.entries(BASIS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <div className="md:col-span-3">
              <Field label="What changed for the student?" required>
                <VoiceTextarea rows={2} value={form.whatChanged} onChange={set("whatChanged")} placeholder="e.g., Reading level dropped from grade level to two years behind" />
              </Field>
            </div>
            <Field label="How often?"><input className={inputCls} value={form.frequency} onChange={e => set("frequency")(e.target.value)} placeholder="Daily, weekly…" /></Field>
            <Field label="For how long?"><input className={inputCls} value={form.duration} onChange={e => set("duration")(e.target.value)} placeholder="Since Nov 2025…" /></Field>
            <Field label="What supports this?"><input className={inputCls} value={form.supportDetail} onChange={e => set("supportDetail")(e.target.value)} placeholder="Report cards, teacher emails…" /></Field>
            <div className="md:col-span-3">
              <Field label="Narrative (optional — used in the complaint draft)">
                <VoiceTextarea rows={3} value={form.narrative} onChange={set("narrative")} />
              </Field>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <GhostButton onClick={() => setForm(null)}>Cancel</GhostButton>
            <GoldButton
              disabled={!form.whatChanged.trim() || save.isPending}
              onClick={() => save.mutate({
                id: form.id, caseId: caseDbId, allegationId: form.allegationId, category: form.category,
                whatChanged: form.whatChanged || null, frequency: form.frequency || null, duration: form.duration || null,
                supportBasis: form.supportBasis, supportDetail: form.supportDetail || null, narrative: form.narrative || null,
              })}
            >Save Impact</GoldButton>
          </div>
        </SectionCard>
      )}

      <div className="space-y-3">
        {impacts?.length === 0 && !form && (
          <SectionCard><p className="py-6 text-center text-sm text-slate-500">No impact statements yet. Investigators weigh student impact heavily — add at least one.</p></SectionCard>
        )}
        {impacts?.map(im => (
          <div key={im.id} className="flex gap-4 rounded-lg border border-[#22355499] bg-[#0B1F3A] p-4">
            <HeartPulse className="h-5 w-5 shrink-0 text-[#D9A441]" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-xs text-sky-300">{IMPACT_CATEGORIES.find(c => c.key === im.category)?.label ?? im.category}</span>
                <span className="text-xs text-slate-500">{BASIS_LABEL[im.supportBasis]}</span>
                {im.allegationId && <span className="text-xs text-slate-500">→ Allegation {String(allegations.find(a => a.id === im.allegationId)?.seqNumber ?? "?").padStart(2, "0")}</span>}
              </div>
              <p className="mt-1 text-sm text-slate-200">{im.whatChanged}</p>
              <p className="mt-0.5 text-xs text-slate-500">{[im.frequency, im.duration, im.supportDetail].filter(Boolean).join(" · ")}</p>
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <button className="rounded p-1.5 text-slate-400 hover:text-[#D9A441]" onClick={() => setForm({
                id: im.id, category: im.category, allegationId: im.allegationId,
                whatChanged: im.whatChanged ?? "", frequency: im.frequency ?? "", duration: im.duration ?? "",
                supportBasis: im.supportBasis, supportDetail: im.supportDetail ?? "", narrative: im.narrative ?? "",
              })}><Pencil className="h-4 w-4" /></button>
              <button className="rounded p-1.5 text-slate-400 hover:text-red-400" onClick={() => { if (confirm("Delete this impact?")) del.mutate({ id: im.id }); }}><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

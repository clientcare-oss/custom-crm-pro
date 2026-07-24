import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "../workspaceContext";
import { BuiltFrom, GhostButton, GoldButton, SectionCard, selectCls } from "@/components/complaint/atoms";
import { ISSUE_CATEGORIES, calcAge } from "@shared/complaintEngine";
import { Check, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";

/** Required complaint sections in filing order. */
export const DRAFT_SECTIONS = [
  { key: "parties", label: "Parties", editable: false },
  { key: "public_agency", label: "Public Agency", editable: false },
  { key: "jurisdiction", label: "Jurisdiction & Timeliness", editable: true, ai: true },
  { key: "violations", label: "Alleged Violations", editable: false },
  { key: "facts", label: "Statement of Facts", editable: true, ai: true },
  { key: "impact", label: "Student Impact", editable: true, ai: true },
  { key: "resolution", label: "Proposed Resolution", editable: false },
  { key: "mediation", label: "Mediation", editable: true, ai: false },
  { key: "signature", label: "Signature", editable: false },
  { key: "district_copy", label: "District-Copy Certification", editable: true, ai: false },
  { key: "exhibit_index", label: "Exhibit Index", editable: false },
] as const;

type Tone = "plain" | "formal" | "concise" | "detailed" | "advocate";
type BuiltFromSrc = { type: string; refId: number | null; label: string };

export function SectionDraft() {
  const { caseDbId } = useWorkspace();
  const { data: c } = trpc.complaintEngine.getCase.useQuery({ id: caseDbId });
  const { data: allegData } = trpc.complaintEngine.listAllegations.useQuery({ caseId: caseDbId });
  const { data: evidence } = trpc.complaintEngine.listEvidence.useQuery({ caseId: caseDbId });
  const { data: impacts } = trpc.complaintEngine.listImpacts.useQuery({ caseId: caseDbId });
  const { data: remedies } = trpc.complaintEngine.listRemedies.useQuery({ caseId: caseDbId });
  const { data: blocks } = trpc.complaintEngine.listDraftBlocks.useQuery({ caseId: caseDbId });
  const [tone, setTone] = useState<Tone>("formal");

  if (!c) return null;
  const accepted = (allegData?.allegations ?? []).filter(a => !["suggested", "rejected", "excluded"].includes(a.status));
  const authorities = (allegData?.authorities ?? []).filter(a => a.status === "confirmed");
  const links = (evidence?.links ?? []).filter(l => l.targetType === "allegation");

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Complaint Draft</h2>
          <p className="mt-1 text-sm text-slate-400">Assembled live from your accepted allegations and confirmed facts. AI-drafted passages always show their sources.</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          Tone
          <select className={selectCls + " !w-auto !py-1 text-xs"} value={tone} onChange={e => setTone(e.target.value as Tone)}>
            <option value="plain">Plain language</option><option value="formal">Formal</option>
            <option value="concise">Concise</option><option value="detailed">Detailed</option>
            <option value="advocate">Advocate voice</option>
          </select>
        </label>
      </div>

      {accepted.length === 0 && (
        <SectionCard><p className="py-4 text-center text-sm text-amber-200">No accepted allegations yet — the draft will be mostly empty. Accept allegations first.</p></SectionCard>
      )}

      <div className="space-y-4">
        {/* 1. Parties (auto) */}
        <AutoBlock label="1. Parties">
          <p>Complainant: {c.complainantName || "—"} ({c.complainantRelationship || "relationship not set"}), {c.complainantAddress || "address not set"}. Phone: {c.complainantPhone || "—"}. Email: {c.complainantEmail || "—"}.</p>
          <p className="mt-1">
            Student: {c.studentName || "—"}{c.studentDob ? `, born ${new Date(c.studentDob).toLocaleDateString()} (age ${calcAge(c.studentDob)})` : ""}{c.studentGrade ? `, grade ${c.studentGrade}` : ""}, attending {c.studentSchool || "—"} in {c.studentDistrict || "—"}.
            {(c.disabilityCategories as string[] | null)?.length ? ` Eligibility categor${((c.disabilityCategories as string[]).length > 1) ? "ies" : "y"}: ${(c.disabilityCategories as string[]).join(", ")}.` : ""}
          </p>
          {c.parentDifferent && <p className="mt-1">Parent/guardian: {c.parentName || "—"}{c.parentAddress ? `, ${c.parentAddress}` : ""}.</p>}
        </AutoBlock>

        {/* 2. Public agency (auto) */}
        <AutoBlock label="2. Public Agency">
          <p>This complaint is filed against {c.agencyName || c.studentDistrict || "—"}{c.agencyContact ? `, attention: ${c.agencyContact}` : ""}{c.agencyAddress ? `, ${c.agencyAddress}` : ""}.</p>
        </AutoBlock>

        {/* 3. Jurisdiction (editable + AI) */}
        <EditableBlock sectionKey="jurisdiction" label="3. Jurisdiction & Timeliness" tone={tone} blocks={blocks}
          placeholder="This complaint is filed with the Georgia Department of Education under 34 C.F.R. §§ 300.151–300.153 and Ga. Comp. R. & Regs. 160-4-7-.12. The violations alleged occurred within one year of the date this complaint is filed…" />

        {/* 4. Alleged violations (auto) */}
        <AutoBlock label="4. Alleged Violations">
          {accepted.length === 0 && <p className="text-slate-500">No accepted allegations.</p>}
          <ol className="list-inside list-decimal space-y-2">
            {accepted.map(a => {
              const auth = authorities.filter(x => x.allegationId === a.id);
              const cats = (a.issueCategories ?? []) as string[];
              return (
                <li key={a.id}>
                  <span className="font-medium">{a.formalTitle || a.plainTitle}</span>
                  {cats.length > 0 && <span className="text-slate-400"> ({cats.map(k => ISSUE_CATEGORIES.find(i => i.key === k)?.label ?? k).join(", ")})</span>}
                  {auth.length > 0 && <span className="text-slate-400"> — {auth.map(x => x.citation).join("; ")}</span>}
                </li>
              );
            })}
          </ol>
        </AutoBlock>

        {/* 4b. Per-allegation statement & facts (editable + AI, feeds readiness) */}
        {accepted.map(a => <AllegationDraft key={a.id} allegation={a} tone={tone} />)}

        {/* 5. Facts (editable + AI) */}
        <EditableBlock sectionKey="facts" label="5. Statement of Facts" tone={tone} blocks={blocks}
          placeholder="A chronological statement of the facts supporting each allegation. Use Draft with AI to build this from your confirmed facts and timeline…" />

        {/* 6. Impact (editable + AI, seeded from impact statements) */}
        <EditableBlock sectionKey="impact" label="6. Student Impact" tone={tone} blocks={blocks}
          placeholder={impacts?.length ? `You have ${impacts.length} impact statement(s). Use Draft with AI to weave them into a narrative…` : "Describe how the violations affected the student…"} />

        {/* 7. Resolution (auto from remedies) */}
        <AutoBlock label="7. Proposed Resolution">
          {(remedies?.length ?? 0) === 0 && <p className="text-slate-500">No remedies yet — add them in Requested Remedies.</p>}
          <ol className="list-inside list-decimal space-y-1">
            {remedies?.map(r => (
              <li key={r.id}>{r.title}{r.quantification ? ` — ${r.quantification}` : ""}{r.detail ? `. ${r.detail}` : ""}</li>
            ))}
          </ol>
        </AutoBlock>

        {/* 8. Mediation (editable) */}
        <EditableBlock sectionKey="mediation" label="8. Mediation" tone={tone} blocks={blocks} noAi
          placeholder="State whether the complainant is willing to participate in mediation to resolve this complaint…" />

        {/* 9. Signature (auto) */}
        <AutoBlock label="9. Signature">
          <p>Signed: ______________________________ Date: ______________</p>
          <p className="mt-1">{c.complainantName || "—"}{c.advocateName && c.advocateName !== c.complainantName ? ` (prepared with the assistance of ${c.advocateName}, advocate)` : ""}</p>
          <p className="mt-1 text-xs text-slate-500">Georgia requires a signed complaint. The exported packet includes a signature line.</p>
        </AutoBlock>

        {/* 10. District copy (editable) */}
        <EditableBlock sectionKey="district_copy" label="10. District-Copy Certification" tone={tone} blocks={blocks} noAi
          placeholder="I certify that a copy of this complaint was forwarded to the district serving the student at the same time it was filed with the Georgia Department of Education, by [method] on [date]…" />

        {/* 11. Exhibit index (auto) */}
        <AutoBlock label="11. Exhibit Index">
          {(evidence?.items.length ?? 0) === 0 && <p className="text-slate-500">No evidence uploaded yet.</p>}
          <ul className="space-y-1">
            {evidence?.items.map(ev => {
              const supports = links.filter(l => l.evidenceItemId === ev.id)
                .map(l => accepted.find(a => a.id === l.targetId)?.seqNumber)
                .filter(Boolean)
                .map(n => String(n).padStart(2, "0"));
              return (
                <li key={ev.id}>
                  <span className="font-medium text-[#E4B65B]">{ev.evidenceId}</span> — {ev.title}
                  {ev.docDate ? ` (${new Date(ev.docDate).toLocaleDateString()})` : ""}
                  {supports.length > 0 && <span className="text-slate-400"> · supports allegation(s) {supports.join(", ")}</span>}
                </li>
              );
            })}
          </ul>
        </AutoBlock>
      </div>
    </div>
  );
}

function AutoBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <SectionCard title={label} subtitle="Assembled automatically from your case data.">
      <div className="text-sm leading-relaxed text-slate-200">{children}</div>
    </SectionCard>
  );
}

type AllegationRow = {
  id: number; seqNumber: number; plainTitle: string; formalTitle: string | null;
  draftStatement: string | null; draftFacts: string | null;
  factsUsed: { type: string; refId: number | null; text: string }[] | null; issueCategories: unknown;
};

function AllegationDraft({ allegation: a, tone }: { allegation: AllegationRow; tone: Tone }) {
  const { caseDbId } = useWorkspace();
  const utils = trpc.useUtils();
  const [statement, setStatement] = useState(a.draftStatement ?? "");
  const [facts, setFacts] = useState(a.draftFacts ?? "");
  const [builtFrom, setBuiltFrom] = useState<BuiltFromSrc[]>(
    (a.factsUsed ?? []).map(f => ({ type: f.type, refId: f.refId, label: f.text }))
  );
  const [pendingAi, setPendingAi] = useState<{ field: "statement" | "facts"; text: string; builtFrom: BuiltFromSrc[] } | null>(null);

  const update = trpc.complaintEngine.updateAllegation.useMutation({
    onSuccess: () => { utils.complaintEngine.listAllegations.invalidate({ caseId: caseDbId }); utils.complaintEngine.readiness.invalidate({ caseId: caseDbId }); },
    onError: e => toast.error(e.message),
  });
  const assist = trpc.complaintEngine.assistWriting.useMutation({
    onSuccess: (r, vars) => setPendingAi({ field: vars.fieldLabel.includes("statement") ? "statement" : "facts", text: r.text, builtFrom: r.builtFrom }),
    onError: e => toast.error(e.message),
  });

  const num = String(a.seqNumber).padStart(2, "0");
  const areaCls = "w-full rounded-md border border-[#22355499] bg-[#081A33] px-3 py-2 text-sm leading-relaxed text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D9A441]/60";

  function aiDraft(field: "statement" | "facts", current: string) {
    assist.mutate({
      caseId: caseDbId, allegationId: a.id, tone,
      mode: current.trim() ? "improve" : "from_answers",
      fieldLabel: field === "statement" ? `Allegation ${num} statement — ${a.formalTitle || a.plainTitle}` : `Allegation ${num} facts narrative — ${a.formalTitle || a.plainTitle}`,
      currentText: current || null,
    });
  }

  return (
    <SectionCard
      title={`Allegation ${num} — ${a.formalTitle || a.plainTitle}`}
      subtitle="The drafted statement and facts narrative for this allegation. Both are required by Filing Review."
    >
      <div className="space-y-4">
        {(["statement", "facts"] as const).map(field => {
          const val = field === "statement" ? statement : facts;
          const setVal = field === "statement" ? setStatement : setFacts;
          const saved = field === "statement" ? a.draftStatement : a.draftFacts;
          return (
            <div key={field}>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{field === "statement" ? "Allegation statement" : "Facts narrative"}</p>
                <GhostButton disabled={assist.isPending} onClick={() => aiDraft(field, val)}>
                  {assist.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {val.trim() ? "Improve with AI" : "Help Me Write This"}
                </GhostButton>
              </div>
              <textarea
                className={areaCls} rows={4} value={val}
                placeholder={field === "statement" ? "State the violation: what the district was required to do, and what it failed to do…" : "Chronological facts supporting this allegation, citing exhibits where possible…"}
                onChange={e => setVal(e.target.value)}
                onBlur={() => { if (val !== (saved ?? "")) update.mutate({ id: a.id, data: field === "statement" ? { draftStatement: val || null } : { draftFacts: val || null } }); }}
              />
              {pendingAi?.field === field && (
                <div className="mt-2 rounded-md border border-[#D9A441]/40 bg-[#D9A441]/5 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#E4B65B]">AI draft — review before accepting</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{pendingAi.text}</p>
                  <BuiltFrom sources={pendingAi.builtFrom} />
                  <div className="mt-3 flex justify-end gap-2">
                    <GhostButton onClick={() => setPendingAi(null)}><RotateCcw className="h-4 w-4" /> Discard</GhostButton>
                    <GoldButton onClick={() => {
                      setVal(pendingAi.text);
                      const bf = [...builtFrom.filter(s => !pendingAi.builtFrom.some(n => n.label === s.label)), ...pendingAi.builtFrom];
                      setBuiltFrom(bf);
                      update.mutate({ id: a.id, data: { ...(field === "statement" ? { draftStatement: pendingAi.text } : { draftFacts: pendingAi.text }), factsUsed: bf.map(s => ({ type: s.type, refId: s.refId, text: s.label })) } });
                      setPendingAi(null);
                    }}><Check className="h-4 w-4" /> Accept Draft</GoldButton>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {builtFrom.length > 0 && <BuiltFrom sources={builtFrom} />}
      </div>
    </SectionCard>
  );
}

function EditableBlock({ sectionKey, label, tone, blocks, placeholder, noAi }: {
  sectionKey: string; label: string; tone: Tone;
  blocks: { sectionKey: string; allegationId: number | null; content: string | null; builtFrom: unknown; aiGenerated: boolean }[] | undefined;
  placeholder: string; noAi?: boolean;
}) {
  const { caseDbId } = useWorkspace();
  const utils = trpc.useUtils();
  const existing = useMemo(() => blocks?.find(b => b.sectionKey === sectionKey && b.allegationId === null), [blocks, sectionKey]);
  const [text, setText] = useState("");
  const [builtFrom, setBuiltFrom] = useState<BuiltFromSrc[]>([]);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [pendingAi, setPendingAi] = useState<{ text: string; builtFrom: BuiltFromSrc[] } | null>(null);
  useEffect(() => {
    if (existing) { setText(existing.content ?? ""); setBuiltFrom((existing.builtFrom ?? []) as BuiltFromSrc[]); setAiGenerated(existing.aiGenerated); }
  }, [existing]);

  const save = trpc.complaintEngine.saveDraftBlock.useMutation({
    onSuccess: () => { utils.complaintEngine.listDraftBlocks.invalidate({ caseId: caseDbId }); utils.complaintEngine.readiness.invalidate({ caseId: caseDbId }); },
  });
  const assist = trpc.complaintEngine.assistWriting.useMutation({
    onSuccess: (r) => setPendingAi({ text: r.text, builtFrom: r.builtFrom }),
    onError: (e) => toast.error(e.message),
  });

  function persist(content: string, bf: BuiltFromSrc[], ai: boolean) {
    save.mutate({ caseId: caseDbId, sectionKey, allegationId: null, content, builtFrom: bf, aiGenerated: ai, userAccepted: true });
  }

  return (
    <SectionCard
      title={label}
      actions={!noAi ? (
        <GhostButton disabled={assist.isPending} onClick={() => assist.mutate({ caseId: caseDbId, mode: text.trim() ? "improve" : "from_answers", tone, fieldLabel: label, currentText: text || null })}>
          {assist.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {text.trim() ? "Improve with AI" : "Draft with AI"}
        </GhostButton>
      ) : undefined}
    >
      <textarea
        className="w-full rounded-md border border-[#22355499] bg-[#081A33] px-3 py-2 text-sm leading-relaxed text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#D9A441]/60"
        rows={Math.max(4, Math.min(14, text.split("\n").length + 2))}
        value={text}
        placeholder={placeholder}
        onChange={e => setText(e.target.value)}
        onBlur={() => { if (text !== (existing?.content ?? "")) persist(text, builtFrom, aiGenerated); }}
      />
      {aiGenerated && <BuiltFrom sources={builtFrom} />}

      {pendingAi && (
        <div className="mt-3 rounded-md border border-[#D9A441]/40 bg-[#D9A441]/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#E4B65B]">AI draft — review before accepting</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{pendingAi.text}</p>
          <BuiltFrom sources={pendingAi.builtFrom} />
          <div className="mt-3 flex justify-end gap-2">
            <GhostButton onClick={() => setPendingAi(null)}><RotateCcw className="h-4 w-4" /> Discard</GhostButton>
            <GoldButton onClick={() => {
              setText(pendingAi.text); setBuiltFrom(pendingAi.builtFrom); setAiGenerated(true);
              persist(pendingAi.text, pendingAi.builtFrom, true); setPendingAi(null);
            }}><Check className="h-4 w-4" /> Accept Draft</GoldButton>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

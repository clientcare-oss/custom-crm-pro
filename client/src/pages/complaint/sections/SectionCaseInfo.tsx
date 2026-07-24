import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "../workspaceContext";
import { Field, SectionCard, inputCls } from "@/components/complaint/atoms";
import { VoiceTextarea } from "@/components/complaint/VoiceTextarea";
import { DISABILITY_CATEGORIES, calcAge } from "@shared/complaintEngine";
import { toast } from "sonner";

function d2s(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export function SectionCaseInfo() {
  const { caseDbId } = useWorkspace();
  const utils = trpc.useUtils();
  const { data: c } = trpc.complaintEngine.getCase.useQuery({ id: caseDbId });
  const update = trpc.complaintEngine.updateCase.useMutation({
    onSuccess: () => { utils.complaintEngine.getCase.invalidate({ id: caseDbId }); utils.complaintEngine.readiness.invalidate({ caseId: caseDbId }); },
    onError: (e) => toast.error(e.message),
  });

  const [f, setF] = useState<Record<string, string | boolean | string[]>>({});
  useEffect(() => {
    if (!c) return;
    setF({
      complainantName: c.complainantName ?? "", complainantRelationship: c.complainantRelationship ?? "",
      complainantAddress: c.complainantAddress ?? "", complainantPhone: c.complainantPhone ?? "",
      complainantEmail: c.complainantEmail ?? "",
      studentName: c.studentName ?? "", studentDob: d2s(c.studentDob), studentAddress: c.studentAddress ?? "",
      studentGrade: c.studentGrade ?? "", studentGtid: c.studentGtid ?? "", studentSchool: c.studentSchool ?? "",
      studentDistrict: c.studentDistrict ?? "",
      disabilityCategories: (c.disabilityCategories ?? []) as string[],
      isHomeless: c.isHomeless, homelessContactInfo: c.homelessContactInfo ?? "",
      parentDifferent: c.parentDifferent, parentName: c.parentName ?? "", parentAddress: c.parentAddress ?? "",
      parentPhone: c.parentPhone ?? "", parentEmail: c.parentEmail ?? "",
      agencyName: c.agencyName ?? "", agencyContact: c.agencyContact ?? "", agencyAddress: c.agencyAddress ?? "",
      advocateName: c.advocateName ?? "", complaintOwner: c.complaintOwner ?? "",
      targetFilingDate: d2s(c.targetFilingDate), intakeDate: d2s(c.intakeDate),
    });
  }, [c]);

  if (!c) return null;

  const set = (k: string) => (v: string | boolean | string[]) => setF(p => ({ ...p, [k]: v }));
  const save = (keys: string[]) => () => {
    const data: Record<string, unknown> = {};
    for (const k of keys) {
      const v = f[k];
      if (["studentDob", "targetFilingDate", "intakeDate"].includes(k)) data[k] = v || null;
      else data[k] = typeof v === "string" ? (v || null) : v;
    }
    update.mutate({ id: caseDbId, data });
  };
  const txt = (k: string, onSaveKeys?: string[]) => ({
    value: (f[k] as string) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k)(e.target.value),
    onBlur: save(onSaveKeys ?? [k]),
    className: inputCls,
  });

  const age = calcAge((f.studentDob as string) || null);
  const lookback = new Date();
  lookback.setFullYear(lookback.getFullYear() - 1);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Case Information</h2>
        <p className="mt-1 text-sm text-slate-400">Georgia's complaint form requires the fields marked with <span className="text-[#D9A441]">*</span>. Everything autosaves when you leave a field.</p>
      </div>

      <SectionCard title="Complainant" subtitle="The person filing this complaint.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Full name" required><input {...txt("complainantName")} /></Field>
          <Field label="Relationship to student" required><input {...txt("complainantRelationship")} placeholder="Parent, guardian, advocate…" /></Field>
          <Field label="Telephone" required><input {...txt("complainantPhone")} /></Field>
          <Field label="Email" required><input {...txt("complainantEmail")} /></Field>
          <div className="md:col-span-2">
            <Field label="Mailing address" required>
              <VoiceTextarea rows={2} value={(f.complainantAddress as string) ?? ""} onChange={set("complainantAddress")} onBlur={save(["complainantAddress"])} />
            </Field>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Student" subtitle="Age is calculated automatically from the date of birth.">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Student name" required><input {...txt("studentName")} /></Field>
          <Field label="Date of birth" required><input type="date" {...txt("studentDob")} /></Field>
          <Field label="Age (auto)"><input className={inputCls + " opacity-70"} value={age !== null ? `${age} years` : "—"} readOnly /></Field>
          <Field label="GTID"><input {...txt("studentGtid")} placeholder="If known" /></Field>
          <Field label="Grade"><input {...txt("studentGrade")} /></Field>
          <Field label="School" required><input {...txt("studentSchool")} /></Field>
          <Field label="District" required><input {...txt("studentDistrict")} /></Field>
          <div className="md:col-span-2">
            <Field label="Student address" required>
              <VoiceTextarea rows={2} value={(f.studentAddress as string) ?? ""} onChange={set("studentAddress")} onBlur={save(["studentAddress"])} />
            </Field>
          </div>
        </div>
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-slate-300">Disability categories</p>
          <div className="flex flex-wrap gap-2">
            {DISABILITY_CATEGORIES.map(cat => {
              const selected = ((f.disabilityCategories as string[]) ?? []).includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => {
                    const cur = (f.disabilityCategories as string[]) ?? [];
                    const next = selected ? cur.filter(x => x !== cat) : [...cur, cat];
                    set("disabilityCategories")(next);
                    update.mutate({ id: caseDbId, data: { disabilityCategories: next } });
                  }}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${selected ? "border-[#D9A441] bg-[#D9A441]/15 text-[#E4B65B]" : "border-[#22355499] text-slate-400 hover:text-slate-200"}`}
                >{cat}</button>
              );
            })}
          </div>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={!!f.isHomeless} onChange={e => { set("isHomeless")(e.target.checked); update.mutate({ id: caseDbId, data: { isHomeless: e.target.checked } }); }} />
          Student is homeless (McKinney-Vento) — address not required
        </label>
        {!!f.isHomeless && (
          <div className="mt-3">
            <Field label="Available contact information">
              <VoiceTextarea rows={2} value={(f.homelessContactInfo as string) ?? ""} onChange={set("homelessContactInfo")} onBlur={save(["homelessContactInfo"])} />
            </Field>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Parent / Guardian" subtitle="Only needed when the parent differs from the complainant.">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={!!f.parentDifferent} onChange={e => { set("parentDifferent")(e.target.checked); update.mutate({ id: caseDbId, data: { parentDifferent: e.target.checked } }); }} />
          Parent/guardian is different from the complainant
        </label>
        {!!f.parentDifferent && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Parent name" required><input {...txt("parentName")} /></Field>
            <Field label="Parent phone"><input {...txt("parentPhone")} /></Field>
            <Field label="Parent email"><input {...txt("parentEmail")} /></Field>
            <Field label="Parent address"><input {...txt("parentAddress")} /></Field>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Public Agency" subtitle="The district or agency the complaint is filed against.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Agency / district name" required><input {...txt("agencyName")} /></Field>
          <Field label="Contact (superintendent / SPED director)"><input {...txt("agencyContact")} /></Field>
          <div className="md:col-span-2">
            <Field label="Agency address">
              <VoiceTextarea rows={2} value={(f.agencyAddress as string) ?? ""} onChange={set("agencyAddress")} onBlur={save(["agencyAddress"])} />
            </Field>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Internal Metadata" subtitle="For your practice — not included in the filed complaint.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Advocate"><input {...txt("advocateName")} /></Field>
          <Field label="Complaint owner"><input {...txt("complaintOwner")} /></Field>
          <Field label="Intake date"><input type="date" {...txt("intakeDate")} /></Field>
          <Field label="Target filing date"><input type="date" {...txt("targetFilingDate")} /></Field>
        </div>
        <p className="mt-3 rounded-md border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
          One-year lookback: filed today, GaDOE can investigate violations on or after {lookback.toLocaleDateString()}. Case ID {c.caseId} was assigned automatically.
        </p>
      </SectionCard>
    </div>
  );
}


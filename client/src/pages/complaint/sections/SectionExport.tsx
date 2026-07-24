import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "../workspaceContext";
import { Field, GhostButton, GoldButton, SectionCard, StatusPill, inputCls, selectCls } from "@/components/complaint/atoms";
import { FileDown, Loader2, Mail, Printer, Send } from "lucide-react";
import { toast } from "sonner";

export function SectionExport() {
  const { caseDbId, goTo } = useWorkspace();
  const utils = trpc.useUtils();
  const { data: c } = trpc.complaintEngine.getCase.useQuery({ id: caseDbId });
  const { data: readiness } = trpc.complaintEngine.readiness.useQuery({ caseId: caseDbId });
  const [generating, setGenerating] = useState(false);

  const update = trpc.complaintEngine.updateCase.useMutation({
    onSuccess: () => { utils.complaintEngine.getCase.invalidate({ id: caseDbId }); utils.complaintEngine.readiness.invalidate({ caseId: caseDbId }); },
  });

  const blockers = readiness?.blockers ?? 1;

  async function exportPacket() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/complaint-export/${caseDbId}`, { credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${c?.caseId ?? "complaint"}-packet.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Complaint packet downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setGenerating(false);
    }
  }

  if (!c) return null;
  const districtOk = c.districtCopyDelivered && c.districtCopyRecipient && c.districtCopyDate && c.districtCopyMethod;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Export</h2>
        <p className="mt-1 text-sm text-slate-400">Sign, confirm, generate the complaint packet, and track delivery of the required district copy.</p>
      </div>

      <SectionCard title="Signature" subtitle="Georgia requires a signed written complaint.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Signature (type full legal name)" required>
            <input
              className={inputCls}
              defaultValue={c.signatureName ?? ""}
              placeholder={c.complainantName ?? "Full legal name"}
              onBlur={e => update.mutate({ id: caseDbId, data: { signatureName: e.target.value || null, signatureDate: e.target.value ? new Date().toISOString().slice(0, 10) : null } })}
            />
          </Field>
          <Field label="Date signed">
            <input className={inputCls + " opacity-70"} readOnly value={c.signatureDate ? new Date(c.signatureDate).toLocaleDateString() : "Set automatically when signed"} />
          </Field>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Mediation">
            <select
              className={selectCls}
              value={c.mediationRequested}
              onChange={e => update.mutate({ id: caseDbId, data: { mediationRequested: e.target.value as "undecided" | "yes" | "no" } })}
            >
              <option value="undecided">Undecided</option>
              <option value="yes">Request mediation</option>
              <option value="no">Do not request mediation</option>
            </select>
          </Field>
          <label className="flex items-end gap-2 pb-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={c.confirmedAccuracy}
              onChange={e => update.mutate({ id: caseDbId, data: { confirmedAccuracy: e.target.checked } })}
            />
            I confirm the facts, evidence selection, and recipient information are accurate.
          </label>
        </div>
      </SectionCard>

      <SectionCard title="District Copy Delivery" subtitle="Georgia requires forwarding a copy of the complaint to the district serving the student at the same time it is filed with GaDOE.">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Recipient (superintendent / SPED director)">
            <input
              className={inputCls}
              defaultValue={c.districtCopyRecipient ?? ""}
              onBlur={e => update.mutate({ id: caseDbId, data: { districtCopyRecipient: e.target.value || null } })}
            />
          </Field>
          <Field label="Method">
            <select
              className={selectCls}
              value={c.districtCopyMethod ?? ""}
              onChange={e => update.mutate({ id: caseDbId, data: { districtCopyMethod: e.target.value || null } })}
            >
              <option value="">—</option>
              <option value="email">Email</option>
              <option value="certified_mail">Certified mail</option>
              <option value="hand_delivery">Hand delivery</option>
              <option value="fax">Fax</option>
            </select>
          </Field>
          <Field label="Date sent">
            <input
              type="date" className={inputCls}
              defaultValue={c.districtCopyDate ? new Date(c.districtCopyDate).toISOString().slice(0, 10) : ""}
              onBlur={e => update.mutate({ id: caseDbId, data: { districtCopyDate: e.target.value || null } })}
            />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={c.districtCopyDelivered}
              onChange={e => update.mutate({ id: caseDbId, data: { districtCopyDelivered: e.target.checked } })}
            />
            District copy has been delivered
          </label>
          {districtOk
            ? <StatusPill kind="ok" label="District copy confirmed" />
            : <StatusPill kind="warning" label="District copy details incomplete" />}
        </div>
      </SectionCard>

      <SectionCard title="Complaint Packet (PDF)" subtitle="Cover page, complaint, signature block, district-copy certification, and exhibit index — assembled in filing order.">
        {blockers > 0 ? (
          <div className="rounded-md border border-red-500/30 bg-red-500/5 px-4 py-3">
            <p className="text-sm text-red-300">{blockers} blocking issue(s) must be resolved before the packet can be exported.</p>
            <GhostButton className="mt-2" onClick={() => goTo("filing-review")}>Open Filing Review</GhostButton>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <GoldButton disabled={generating} onClick={exportPacket}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Download Complaint Packet
            </GoldButton>
            <p className="text-xs text-slate-500">PDF · includes exhibit index. Attach exhibit files when you file.</p>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Where to File" subtitle="Georgia Department of Education — Division for Special Education Services and Supports.">
        <div className="space-y-1 text-sm text-slate-300">
          <p className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-[#D9A441]" /> Georgia Department of Education, Division for Special Education Services and Supports, 1870 Twin Towers East, 205 Jesse Hill Jr. Drive SE, Atlanta, GA 30334</p>
          <p className="flex items-center gap-2"><Printer className="h-4 w-4 shrink-0 text-[#D9A441]" /> A signed written complaint may be mailed or delivered; check the current GaDOE dispute resolution page for electronic submission options.</p>
        </div>
      </SectionCard>

      <SectionCard title="Mark as Filed" subtitle="Once filed with GaDOE and the district copy is served, update the case status.">
        <div className="flex flex-wrap items-center gap-3">
          <GoldButton
            disabled={c.status === "filed" || update.isPending}
            onClick={() => update.mutate({ id: caseDbId, data: { status: "filed" } })}
          >
            <Send className="h-4 w-4" /> {c.status === "filed" ? "Filed" : "Mark Complaint as Filed"}
          </GoldButton>
          <p className="text-xs text-slate-400">GaDOE generally issues a written decision within 60 days of receipt.</p>
        </div>
      </SectionCard>
    </div>
  );
}


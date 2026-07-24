import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { GoldButton, PageIdBadge, SectionCard, StatusPill, inputCls, Field } from "@/components/complaint/atoms";
import { COMPLAINT_STATUS_LABELS, calcAge } from "@shared/complaintEngine";
import { Compass, FileText, Loader2, Plus } from "lucide-react";
import { startLogin } from "@/const";
import CrmShell from "@/components/CrmShell";

const statusKind: Record<string, "ok" | "warning" | "error" | "info" | "gold"> = {
  draft: "warning", in_review: "info", ready_to_file: "gold", filed: "ok", investigation: "info", closed: "ok",
};

export default function ComplaintCases() {
  const [, navigate] = useLocation();
  const { user, loading, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const { data: cases, isLoading } = trpc.complaintEngine.listCases.useQuery(undefined, { enabled: isAuthenticated });
  const [showNew, setShowNew] = useState(false);
  const [studentName, setStudentName] = useState("");
  const createCase = trpc.complaintEngine.createCase.useMutation({
    onSuccess: (r) => { utils.complaintEngine.listCases.invalidate(); navigate(`/tools/state-complaint-builder/${r.id}`); },
  });

  if (loading) return <Shell><Loader2 className="mx-auto mt-24 h-6 w-6 animate-spin text-[#D9A441]" /></Shell>;
  if (!isAuthenticated) {
    return (
      <Shell>
        <div className="mx-auto mt-24 max-w-md text-center">
          <Compass className="mx-auto h-10 w-10 text-[#D9A441]" />
          <h1 className="mt-4 text-xl font-semibold text-slate-100">Waypoint Complaint Engine</h1>
          <p className="mt-2 text-sm text-slate-400">Sign in to build and manage Georgia IDEA state complaints.</p>
          <GoldButton className="mt-6" onClick={() => startLogin()}>Sign In</GoldButton>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D9A441]">Waypoint Complaint Engine™</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-100">State Complaint Builder</h1>
            <p className="mt-1 text-sm text-slate-400">State Complaint · Georgia — guided drafting from intake to filing-ready packet.</p>
          </div>
          <GoldButton onClick={() => setShowNew(true)}><Plus className="h-4 w-4" /> Start Complaint</GoldButton>
        </div>

        {showNew && (
          <SectionCard className="mt-6" title="Start a New Complaint" subtitle="You can fill in full case details in the next step.">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Field label="Student name (optional)">
                  <input className={inputCls} value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="e.g., Mason Miller" />
                </Field>
              </div>
              <GoldButton disabled={createCase.isPending} onClick={() => createCase.mutate({ studentName: studentName || undefined, advocateName: user?.name ?? undefined })}>
                {createCase.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create Case
              </GoldButton>
            </div>
          </SectionCard>
        )}

        <div className="mt-8 space-y-3">
          {isLoading && <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#D9A441]" />}
          {cases?.length === 0 && !showNew && (
            <SectionCard>
              <div className="py-10 text-center">
                <FileText className="mx-auto h-8 w-8 text-slate-500" />
                <p className="mt-3 text-slate-300">No complaints yet.</p>
                <p className="text-sm text-slate-500">Start your first Georgia state complaint to begin.</p>
              </div>
            </SectionCard>
          )}
          {cases?.map(c => (
            <button
              key={c.id}
              onClick={() => navigate(`/tools/state-complaint-builder/${c.id}`)}
              className="block w-full rounded-lg border border-[#22355499] bg-[#0B1F3A] p-4 text-left transition-colors hover:border-[#D9A441]/50"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-100">
                    {c.studentName || "Unnamed student"}
                    {c.studentDob ? <span className="ml-2 text-sm text-slate-400">Age {calcAge(c.studentDob)}</span> : null}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-400">
                    {c.caseId} · {c.studentDistrict || "District not set"} {c.studentSchool ? `· ${c.studentSchool}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {c.targetFilingDate && <span className="text-xs text-slate-400">Deadline {new Date(c.targetFilingDate).toLocaleDateString()}</span>}
                  <StatusPill kind={statusKind[c.status] ?? "info"} label={COMPLAINT_STATUS_LABELS[c.status] ?? c.status} />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <PageIdBadge id="PG-020" />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <CrmShell><div className="min-h-screen bg-[#07162B]">{children}</div></CrmShell>;
}

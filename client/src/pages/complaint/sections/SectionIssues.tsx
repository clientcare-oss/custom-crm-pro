import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "../workspaceContext";
import { AiBadge, GhostButton, GoldButton, SectionCard, StatusPill } from "@/components/complaint/atoms";
import { VoiceTextarea } from "@/components/complaint/VoiceTextarea";
import { ISSUE_CATEGORIES, STORY_PROMPTS } from "@shared/complaintEngine";
import { Check, Loader2, MessageSquareText, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

export function SectionIssues() {
  const { caseDbId } = useWorkspace();
  const [tab, setTab] = useState<"story" | "issues">("story");
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Issues</h2>
        <p className="mt-1 text-sm text-slate-400">Tell us what happened in plain language, confirm the facts we heard, then choose the issue categories for this complaint.</p>
      </div>
      <div className="flex gap-2">
        <TabButton active={tab === "story"} onClick={() => setTab("story")}><MessageSquareText className="h-4 w-4" /> Tell Us What Happened</TabButton>
        <TabButton active={tab === "issues"} onClick={() => setTab("issues")}><Check className="h-4 w-4" /> Confirm Issue Categories</TabButton>
      </div>
      {tab === "story" ? <StoryIntake /> : <IssuePicker />}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm transition-colors ${active ? "bg-[#D9A441]/15 text-[#E4B65B] font-medium border border-[#D9A441]/40" : "border border-[#22355499] text-slate-300 hover:text-slate-100"}`}>
      {children}
    </button>
  );
}

function StoryIntake() {
  const { caseDbId } = useWorkspace();
  const utils = trpc.useUtils();
  const { data } = trpc.complaintEngine.getStory.useQuery({ caseId: caseDbId });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  useEffect(() => {
    if (data) setAnswers(Object.fromEntries(data.answers.map(a => [a.promptKey, a.answerText ?? ""])));
  }, [data]);

  const save = trpc.complaintEngine.saveStoryAnswer.useMutation();
  const extract = trpc.complaintEngine.extractFacts.useMutation({
    onSuccess: () => { utils.complaintEngine.getStory.invalidate({ caseId: caseDbId }); toast.success("Facts extracted — confirm them in the panel"); },
    onError: (e) => toast.error(e.message),
  });
  const setFactStatus = trpc.complaintEngine.setFactStatus.useMutation({
    onSuccess: () => utils.complaintEngine.getStory.invalidate({ caseId: caseDbId }),
  });

  const facts = data?.facts ?? [];

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-3">
        {STORY_PROMPTS.map(p => (
          <SectionCard key={p.key} title={p.question} subtitle={p.helper}>
            <VoiceTextarea
              value={answers[p.key] ?? ""}
              onChange={v => setAnswers(a => ({ ...a, [p.key]: v }))}
              onBlur={() => { if ((answers[p.key] ?? "") !== "") save.mutate({ caseId: caseDbId, promptKey: p.key, answerText: answers[p.key] ?? "" }); }}
              rows={3}
              placeholder="Type or use the microphone…"
            />
            <div className="mt-2 flex justify-end">
              <GhostButton
                disabled={!(answers[p.key] ?? "").trim() || extract.isPending}
                onClick={() => {
                  save.mutate({ caseId: caseDbId, promptKey: p.key, answerText: answers[p.key] ?? "" }, {
                    onSuccess: () => extract.mutate({ caseId: caseDbId, promptKey: p.key }),
                  });
                }}
              >
                {extract.isPending && extract.variables?.promptKey === p.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Extract Facts
              </GhostButton>
            </div>
          </SectionCard>
        ))}
      </div>

      <div className="lg:col-span-2">
        <SectionCard title="Facts We Heard" subtitle="Confirm or reject each fact. Only confirmed facts feed AI drafting." className="sticky top-20">
          {facts.length === 0 && <p className="text-sm text-slate-500">No extracted facts yet. Answer a question and select Extract Facts.</p>}
          <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {facts.filter(f => f.status !== "rejected").map(f => (
              <div key={f.id} className={`rounded-md border px-3 py-2 ${f.status === "confirmed" ? "border-emerald-500/30 bg-emerald-500/5" : "border-[#22355499] bg-[#081A33]"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-sky-300">{f.factType.replace("_", " ")}</span>
                    <p className="mt-0.5 text-sm text-slate-200">{f.factText}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {f.status !== "confirmed" && (
                      <button title="Confirm" onClick={() => setFactStatus.mutate({ id: f.id, status: "confirmed" })} className="rounded p-1 text-emerald-400 hover:bg-emerald-500/10"><Check className="h-4 w-4" /></button>
                    )}
                    <button title="Reject" onClick={() => setFactStatus.mutate({ id: f.id, status: "rejected" })} className="rounded p-1 text-slate-400 hover:bg-red-500/10 hover:text-red-400"><X className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function IssuePicker() {
  const { caseDbId } = useWorkspace();
  const utils = trpc.useUtils();
  const { data: c } = trpc.complaintEngine.getCase.useQuery({ id: caseDbId });
  const { data: story } = trpc.complaintEngine.getStory.useQuery({ caseId: caseDbId });
  const update = trpc.complaintEngine.updateCase.useMutation({
    onSuccess: () => { utils.complaintEngine.getCase.invalidate({ id: caseDbId }); utils.complaintEngine.readiness.invalidate({ caseId: caseDbId }); },
  });
  const confirmed = (c?.confirmedIssues ?? []) as string[];
  const aiSuggestedKeys = new Set(
    (story?.facts ?? []).filter(f => f.factType === "issue_category" && f.status !== "rejected").map(f => f.factText.trim()),
  );

  function toggle(key: string) {
    const next = confirmed.includes(key) ? confirmed.filter(k => k !== key) : [...confirmed, key];
    update.mutate({ id: caseDbId, data: { confirmedIssues: next } });
  }

  return (
    <div>
      <p className="mb-3 rounded-md border border-sky-500/25 bg-sky-500/5 px-3 py-2 text-xs text-sky-200">
        Issues with an <span className="font-semibold">AI Suggested</span> badge came from your story — but a suggestion never activates an issue. Only your selection confirms it.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ISSUE_CATEGORIES.map(cat => {
          const on = confirmed.includes(cat.key);
          const suggested = aiSuggestedKeys.has(cat.key);
          return (
            <button
              key={cat.key}
              onClick={() => toggle(cat.key)}
              className={`rounded-lg border p-4 text-left transition-colors ${on ? "border-[#D9A441] bg-[#D9A441]/10" : "border-[#22355499] bg-[#0B1F3A] hover:border-[#D9A441]/40"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className={`text-sm font-semibold ${on ? "text-[#E4B65B]" : "text-slate-100"}`}>{cat.label}</p>
                {on ? <StatusPill kind="gold" label="Confirmed" /> : suggested ? <AiBadge /> : null}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{cat.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

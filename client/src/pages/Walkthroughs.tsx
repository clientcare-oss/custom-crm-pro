import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VoiceInput from "@/components/VoiceInput";
import { Textarea } from "@/components/ui/textarea";
import VoiceTextarea from "@/components/VoiceTextarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus, Trash2, ChevronUp, ChevronDown, Play, CheckCircle2,
  Circle, Pencil, X, BookOpen, ListChecks, ArrowLeft, GripVertical,
  ClipboardList, Loader2, CheckCheck, RotateCcw
} from "lucide-react";
import PageIdBadge from "@/components/PageIdBadge";

const CATEGORIES = ["All", "General", "Intake", "Discovery Call", "Follow-Up", "Meetings", "Compliance", "Billing", "Other"];

// ─── Unique ID helper ─────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 10); }

// ─── Category badge color ─────────────────────────────────────────────────────
function catColor(cat: string) {
  const map: Record<string, string> = {
    "Discovery Call": "border border-[#3A2C18] bg-[#020A17] text-[#93C5FD]",
    "Follow-Up": "border border-[#3A2C18] bg-[#020A17] text-[#FDE047]",
    "Intake": "border border-[#3A2C18] bg-[#020A17] text-[#C4B5FD]",
    "Meetings": "border border-[#3A2C18] bg-[#020A17] text-[#86EFAC]",
    "Compliance": "border border-[#3A2C18] bg-[#020A17] text-[#FCA5A5]",
    "Billing": "border border-[#3A2C18] bg-[#020A17] text-[#6EE7B7]",
  };
  return map[cat] ?? "border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5]";
}

type Step = { id: string; title: string; instructions: string; script?: string; notes?: string; order: number; };
type Walkthrough = { id: number; title: string; description?: string | null; category: string; steps: Step[]; createdAt: Date; };

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Walkthroughs() {
  const [view, setView] = useState<"list" | "builder" | "runner">("list");
  const [selectedCat, setSelectedCat] = useState("All");
  const [editing, setEditing] = useState<Walkthrough | null>(null);
  const [running, setRunning] = useState<{ wt: Walkthrough; runId: number } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: walkthroughs = [], isLoading } = trpc.walkthroughs.list.useQuery({ category: selectedCat === "All" ? undefined : selectedCat });

  const deleteMutation = trpc.walkthroughs.delete.useMutation({
    onSuccess: () => { toast.success("Walkthrough deleted"); utils.walkthroughs.list.invalidate(); setDeleteConfirm(null); },
    onError: (e) => toast.error(e.message),
  });

  const startRunMutation = trpc.walkthroughs.startRun.useMutation({
    onSuccess: (data, vars) => {
      const wt = walkthroughs.find((w: any) => w.id === vars.walkthroughId);
      if (wt) { setRunning({ wt: wt as any, runId: data.id }); setView("runner"); }
    },
    onError: (e) => toast.error(e.message),
  });

  if (view === "builder") {
    return (
      <WalkthroughBuilder
        initial={editing}
        onBack={() => { setEditing(null); setView("list"); }}
        onSaved={() => { setEditing(null); setView("list"); utils.walkthroughs.list.invalidate(); }}
      />
    );
  }

  if (view === "runner" && running) {
    return (
      <WalkthroughRunner
        walkthrough={running.wt}
        runId={running.runId}
        onBack={() => { setRunning(null); setView("list"); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-[#3A2C18]">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-[#FFF4D4] flex items-center gap-2.5">
              <ClipboardList className="h-6 w-6 text-[#C5A059]" />
              Standard Operating Procedures (SOPs)
            </h2>
            <PageIdBadge id="PG-017" name="System Walkthroughs" />
          </div>
          <p className="text-xs sm:text-sm text-[#C6B697] mt-1 font-medium">
            Step-by-step interactive guides to maintain quality, legal rigor, and consistency across client operations.
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setView("builder"); }}
          className="h-9 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-md hover:brightness-110 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> New SOP Walkthrough
        </button>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              selectedCat === cat
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border-[#FFE394]/50 shadow-md font-bold"
                : "bg-[#020A17] text-[#D8C7A5] border-[#3A2C18] hover:border-[#C5A059] hover:text-[#FFF4D4]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Walkthrough list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#C5A059]" />
        </div>
      ) : walkthroughs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-[#3A2C18] rounded-2xl bg-[#020A17]/40 text-center p-8">
          <div className="p-3 rounded-2xl bg-[#07162B] text-[#C5A059] border border-[#3A2C18] mb-3">
            <ClipboardList className="h-8 w-8" />
          </div>
          <p className="text-base font-serif font-bold text-[#FFF4D4]">No walkthroughs found</p>
          <p className="text-xs text-[#C6B697] mt-1 mb-5 max-w-sm">Create your first SOP to guide advocates through intake, live meetings, or post-meeting review.</p>
          <button
            onClick={() => setView("builder")}
            className="h-9 px-4 rounded-xl text-xs font-bold flex items-center gap-2 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-md cursor-pointer hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> Create Walkthrough
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(walkthroughs as any[]).map((wt) => (
            <div
              key={wt.id}
              className="relative rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 hover:border-[#C5A059]/80 p-5 transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:shadow-[0_10px_35px_rgba(197,160,89,0.25)] flex flex-col justify-between group min-h-[200px]"
            >
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#C5A059]/10 rounded-full blur-2xl pointer-events-none group-hover:bg-[#C5A059]/20 transition-all duration-300" />
              <div>
                <div className="relative z-10 flex items-start justify-between gap-2 mb-2">
                  <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${catColor(wt.category)}`}>
                    {wt.category}
                  </span>
                </div>
                <h3 className="relative z-10 font-serif font-bold text-[#FFF4D4] group-hover:text-[#FFE394] text-base leading-snug">
                  {wt.title}
                </h3>
                {wt.description && (
                  <p className="relative z-10 text-xs text-[#C6B697] mt-1.5 leading-relaxed line-clamp-2">
                    {wt.description}
                  </p>
                )}
              </div>

              <div className="relative z-10 mt-4 pt-3 border-t border-[#3A2C18]/60 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-mono text-[#C6B697]">
                  <ListChecks className="h-3.5 w-3.5 text-[#C5A059]" />
                  <span>{(wt.steps as Step[]).length} step{(wt.steps as Step[]).length !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    className="h-8 px-3 rounded-lg text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-sm hover:brightness-110 flex items-center gap-1 cursor-pointer"
                    onClick={() => startRunMutation.mutate({ walkthroughId: wt.id })}
                    disabled={startRunMutation.isPending}
                  >
                    <Play className="h-3 w-3" /> Run
                  </button>
                  <button
                    className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-[#020A17] text-[#D8C7A5] hover:text-[#FFF4D4] border border-[#3A2C18] hover:border-[#C5A059] flex items-center gap-1 cursor-pointer"
                    onClick={() => { setEditing(wt as any); setView("builder"); }}
                    title="Edit Walkthrough"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    className="h-8 px-2 rounded-lg text-xs text-red-400 hover:text-red-200 bg-[#020A17] border border-[#3A2C18] hover:border-red-400/50 flex items-center cursor-pointer"
                    onClick={() => setDeleteConfirm(wt.id)}
                    title="Delete Walkthrough"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm dialog */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-md bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] rounded-2xl shadow-2xl">
          <DialogHeader><DialogTitle className="text-lg font-serif font-bold text-[#FFF4D4]">Delete Walkthrough SOP?</DialogTitle></DialogHeader>
          <p className="text-xs text-[#C6B697]">This will permanently delete this procedure and its execution history. This action cannot be undone.</p>
          <DialogFooter className="gap-2 pt-2">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="h-9 px-4 rounded-xl text-xs font-semibold bg-[#020A17] text-[#D8C7A5] hover:text-[#FFF4D4] border border-[#3A2C18]"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteConfirm && deleteMutation.mutate({ id: deleteConfirm })}
              disabled={deleteMutation.isPending}
              className="h-9 px-4 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-md disabled:opacity-50"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Builder ──────────────────────────────────────────────────────────────────
function WalkthroughBuilder({
  initial,
  onBack,
  onSaved,
}: {
  initial: Walkthrough | null;
  onBack: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "General");
  const [steps, setSteps] = useState<Step[]>(
    initial?.steps?.length
      ? [...initial.steps].sort((a, b) => a.order - b.order)
      : [{ id: uid(), title: "", instructions: "", script: "", notes: "", order: 0 }]
  );
  const [expandedStep, setExpandedStep] = useState<string | null>(steps[0]?.id ?? null);

  const createMutation = trpc.walkthroughs.create.useMutation({ onSuccess: onSaved, onError: (e) => toast.error(e.message) });
  const updateMutation = trpc.walkthroughs.update.useMutation({ onSuccess: onSaved, onError: (e) => toast.error(e.message) });

  function addStep() {
    const newStep: Step = { id: uid(), title: "", instructions: "", script: "", notes: "", order: steps.length };
    setSteps([...steps, newStep]);
    setExpandedStep(newStep.id);
  }

  function removeStep(id: string) {
    if (steps.length <= 1) { toast.error("A walkthrough must have at least one step"); return; }
    const filtered = steps.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i }));
    setSteps(filtered);
    if (expandedStep === id) setExpandedStep(filtered[0]?.id ?? null);
  }

  function moveStep(id: string, dir: -1 | 1) {
    const idx = steps.findIndex((s) => s.id === id);
    if (idx < 0 || idx + dir < 0 || idx + dir >= steps.length) return;
    const updated = [...steps];
    [updated[idx], updated[idx + dir]] = [updated[idx + dir], updated[idx]];
    setSteps(updated.map((s, i) => ({ ...s, order: i })));
  }

  function updateStep(id: string, field: keyof Step, value: string) {
    setSteps(steps.map((s) => s.id === id ? { ...s, [field]: value } : s));
  }

  function handleSave() {
    if (!title.trim()) { toast.error("Please enter a walkthrough title"); return; }
    if (steps.some((s) => !s.title.trim())) { toast.error("All steps need a title"); return; }
    const payload = { title: title.trim(), description: description.trim() || undefined, category, steps };
    if (initial) {
      updateMutation.mutate({ id: initial.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="h-8 px-3 rounded-lg text-xs font-semibold bg-[#020A17] text-[#D8C7A5] hover:text-[#FFF4D4] border border-[#3A2C18] hover:border-[#C5A059] flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#FFF4D4]">
          {initial ? "Edit Walkthrough SOP" : "Create New Walkthrough SOP"}
        </h1>
      </div>

      {/* Meta Card */}
      <div className="p-6 space-y-4 rounded-2xl border border-[#3A2C18] bg-[#05142B]/95 shadow-xl">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#C6B697] block">SOP Title *</label>
            <VoiceInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Discovery Call Intake & PWN Preparation"
              className="text-sm font-semibold bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] placeholder:text-[#C6B697]/50 rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#C6B697] block">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] rounded-xl text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4]">
                {CATEGORIES.filter((c) => c !== "All").map((c) => (
                  <SelectItem key={c} value={c} className="focus:bg-[#07162B] focus:text-[#FFE394]">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#C6B697] block">Description</label>
            <VoiceInput
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of this operational protocol…"
              className="bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] placeholder:text-[#C6B697]/50 rounded-xl text-xs sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Steps List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#C6B697]">Sequence Steps ({steps.length})</h2>
          <button
            onClick={addStep}
            className="h-8 px-3 rounded-lg text-xs font-bold bg-[#020A17] text-[#C5A059] border border-[#3A2C18] hover:border-[#C5A059] hover:text-[#FFF4D4] flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Add Step
          </button>
        </div>

        <div className="space-y-3">
          {steps.map((step, idx) => (
            <div key={step.id} className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 overflow-hidden shadow-md">
              {/* Step Header */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#07162B]/80 transition-colors"
                onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
              >
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#020A17] text-[#C5A059] border border-[#3A2C18] text-xs font-bold flex-shrink-0 font-mono">
                  {idx + 1}
                </div>
                <span className="flex-1 text-sm font-serif font-bold text-[#FFF4D4] truncate">
                  {step.title || <span className="text-[#C6B697]/60 italic font-sans font-normal">Untitled step</span>}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); moveStep(step.id, -1); }} disabled={idx === 0} className="p-1 rounded text-[#C6B697] hover:text-[#FFF4D4] disabled:opacity-30">
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); moveStep(step.id, 1); }} disabled={idx === steps.length - 1} className="p-1 rounded text-[#C6B697] hover:text-[#FFF4D4] disabled:opacity-30">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); removeStep(step.id); }} className="p-1 rounded text-red-400 hover:text-red-200 hover:bg-red-500/20">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Step Body */}
              {expandedStep === step.id && (
                <div className="px-4 pb-4 space-y-3 border-t border-[#3A2C18] bg-[#020A17]/60 pt-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[#C6B697] mb-1 block">Step Title *</label>
                    <VoiceInput
                      value={step.title}
                      onChange={(e) => updateStep(step.id, "title", e.target.value)}
                      placeholder="e.g. Confirm student evaluations and review IEP eligibility dates"
                      className="bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] rounded-xl text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[#C6B697] mb-1 block">Instructions</label>
                    <VoiceTextarea
                      rows={3}
                      value={step.instructions}
                      onChange={(e) => updateStep(step.id, "instructions", e.target.value)}
                      placeholder="Specific operational instructions for the advocate or case worker…"
                      className="bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] rounded-xl text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[#C6B697] mb-1 block">
                      Script / Verbatim Talking Points <span className="font-normal opacity-60">(optional)</span>
                    </label>
                    <VoiceTextarea
                      rows={3}
                      value={step.script ?? ""}
                      onChange={(e) => updateStep(step.id, "script", e.target.value)}
                      placeholder="Verbatim script to read to parents, school psychologists, or LEA representatives…"
                      className="bg-[#020A17] border-[#3A2C18] text-[#FFE394] font-mono rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[#C6B697] mb-1 block">
                      Notes & Exception Guidance <span className="font-normal opacity-60">(optional)</span>
                    </label>
                    <VoiceTextarea
                      rows={2}
                      value={step.notes ?? ""}
                      onChange={(e) => updateStep(step.id, "notes", e.target.value)}
                      placeholder="e.g. If school denies evaluation, cite 34 CFR § 300.503 prior written notice timeline."
                      className="bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] rounded-xl text-xs sm:text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Save Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={onBack}
          className="h-10 px-4 rounded-xl text-xs font-semibold bg-[#020A17] text-[#D8C7A5] hover:text-[#FFF4D4] border border-[#3A2C18]"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="h-10 px-5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-md hover:brightness-110 flex items-center gap-2 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          <span>{initial ? "Save Changes" : "Create SOP Walkthrough"}</span>
        </button>
      </div>
    </div>
  );
}

// ─── Runner ───────────────────────────────────────────────────────────────────
function WalkthroughRunner({
  walkthrough,
  runId,
  onBack,
}: {
  walkthrough: Walkthrough;
  runId: number;
  onBack: () => void;
}) {
  const steps = [...walkthrough.steps].sort((a, b) => a.order - b.order);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [activeStep, setActiveStep] = useState(steps[0]?.id ?? "");
  const [runNotes, setRunNotes] = useState("");
  const [finished, setFinished] = useState(false);

  const updateRun = trpc.walkthroughs.updateRun.useMutation({
    onError: (e) => toast.error(e.message),
  });

  function toggleStep(id: string) {
    const updated = new Set(completedSteps);
    if (updated.has(id)) { updated.delete(id); } else { updated.add(id); }
    setCompletedSteps(updated);
    updateRun.mutate({ runId, completedSteps: Array.from(updated) });
    if (!updated.has(id)) return;
    const nextStep = steps.find((s) => !updated.has(s.id) && s.id !== id);
    if (nextStep) setActiveStep(nextStep.id);
  }

  function handleComplete() {
    updateRun.mutate({
      runId,
      completedSteps: Array.from(completedSteps),
      status: "completed",
      notes: runNotes,
    });
    setFinished(true);
  }

  function handleAbandon() {
    updateRun.mutate({ runId, completedSteps: Array.from(completedSteps), status: "abandoned" });
    onBack();
  }

  const progress = steps.length > 0 ? Math.round((completedSteps.size / steps.length) * 100) : 0;
  const allDone = completedSteps.size === steps.length;

  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-5 p-8 text-center">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-[#020A17] border-2 border-[#C5A059] shadow-xl text-[#C5A059]">
          <CheckCheck className="h-10 w-10 text-[#C5A059]" />
        </div>
        <div>
          <h2 className="text-2xl font-serif font-bold text-[#FFF4D4]">SOP Walkthrough Completed!</h2>
          <p className="text-xs sm:text-sm text-[#C6B697] mt-1 font-medium">
            "{walkthrough.title}" — {completedSteps.size} of {steps.length} steps certified
          </p>
        </div>
        <button
          onClick={onBack}
          className="h-10 px-5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-md hover:brightness-110 flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Walkthroughs</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleAbandon}
          className="h-8 px-3 rounded-lg text-xs font-semibold bg-[#020A17] text-[#D8C7A5] hover:text-[#FFF4D4] border border-[#3A2C18] hover:border-[#C5A059] flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Exit
        </button>
        <div className="flex-1">
          <h1 className="text-lg sm:text-xl font-serif font-bold text-[#FFF4D4]">{walkthrough.title}</h1>
          <p className="text-xs font-mono text-[#C5A059] uppercase tracking-wider">{walkthrough.category}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-[#C6B697] font-mono">
          <span>{completedSteps.size} of {steps.length} steps certified</span>
          <span className="font-bold text-[#FFE394]">{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-[#020A17] border border-[#3A2C18] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step List */}
      <div className="space-y-3">
        {steps.map((step, idx) => {
          const isDone = completedSteps.has(step.id);
          const isActive = activeStep === step.id;
          return (
            <div
              key={step.id}
              className={`rounded-2xl border transition-all overflow-hidden bg-[#05142B]/90 shadow-md ${
                isDone
                  ? "opacity-60 border-[#3A2C18]"
                  : isActive
                  ? "border-[#C5A059] shadow-[0_4px_16px_rgba(197,160,89,0.2)]"
                  : "border-[#3A2C18]"
              }`}
            >
              {/* Step Header */}
              <div
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${
                  isActive ? "bg-[#07162B]" : "hover:bg-[#07162B]/50"
                }`}
                onClick={() => setActiveStep(isActive ? "" : step.id)}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); toggleStep(step.id); }}
                  className="flex-shrink-0 cursor-pointer"
                >
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5 text-[#C5A059]" />
                  ) : (
                    <Circle className="h-5 w-5 text-[#C6B697] hover:text-[#FFF4D4] transition-colors" />
                  )}
                </button>
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#020A17] text-[#C5A059] border border-[#3A2C18] text-xs font-bold flex-shrink-0 font-mono">
                  {idx + 1}
                </div>
                <span className={`flex-1 text-sm font-serif font-bold ${isDone ? "line-through text-[#C6B697]" : "text-[#FFF4D4]"}`}>
                  {step.title}
                </span>
              </div>

              {/* Step Details */}
              {isActive && !isDone && (
                <div className="px-4 pb-4 space-y-3 border-t border-[#3A2C18] bg-[#020A17]/60 pt-3">
                  {step.instructions && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#C6B697] mb-1">Operational Instructions</p>
                      <p className="text-xs sm:text-sm text-[#FFF4D4] whitespace-pre-wrap leading-relaxed">{step.instructions}</p>
                    </div>
                  )}
                  {step.script && (
                    <div className="rounded-xl border border-[#3A2C18] bg-[#07162B] p-3 shadow-inner">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#C5A059] mb-1">Verbatim Talking Points</p>
                      <p className="text-xs text-[#FFE394] font-mono whitespace-pre-wrap leading-relaxed">{step.script}</p>
                    </div>
                  )}
                  {step.notes && (
                    <div className="rounded-xl border border-[#3A2C18] bg-[#020A17] p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#FDBA74] mb-1">Exception / If-Then Guidance</p>
                      <p className="text-xs text-[#FFF4D4] whitespace-pre-wrap leading-relaxed">{step.notes}</p>
                    </div>
                  )}
                  <button
                    className="w-full mt-2 h-9 rounded-xl text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-md hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer"
                    onClick={() => toggleStep(step.id)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Certify Step Complete</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Run Notes */}
      <div className="space-y-1">
        <label className="text-xs font-bold uppercase tracking-wider text-[#C6B697] block">Session Logs / Advocate Notes</label>
        <VoiceTextarea
          rows={3}
          value={runNotes}
          onChange={(e) => setRunNotes(e.target.value)}
          placeholder="Any operational observations or follow-ups from this walkthrough…"
          className="bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] rounded-xl text-xs sm:text-sm"
        />
      </div>

      {/* Completion Buttons */}
      <div className="flex gap-3">
        <button
          className={`flex-1 h-10 rounded-xl text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-md hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50`}
          onClick={handleComplete}
          disabled={updateRun.isPending}
        >
          {updateRun.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
          <span>{allDone ? "Certify SOP Complete" : `Complete (${completedSteps.size}/${steps.length} done)`}</span>
        </button>
        <button
          onClick={handleAbandon}
          className="h-10 px-4 rounded-xl text-xs font-semibold bg-[#020A17] text-[#D8C7A5] hover:text-[#FFF4D4] border border-[#3A2C18] flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Abandon</span>
        </button>
      </div>
    </div>
  );
}

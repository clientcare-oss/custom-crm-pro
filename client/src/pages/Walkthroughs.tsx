import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus, Trash2, ChevronUp, ChevronDown, Play, CheckCircle2,
  Circle, Pencil, X, BookOpen, ListChecks, ArrowLeft, GripVertical,
  ClipboardList, Loader2, CheckCheck, RotateCcw
} from "lucide-react";

const CATEGORIES = ["All", "General", "Intake", "Discovery Call", "Follow-Up", "Meetings", "Compliance", "Billing", "Other"];

// ─── Unique ID helper ─────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 10); }

// ─── Category badge color ─────────────────────────────────────────────────────
function catColor(cat: string) {
  const map: Record<string, string> = {
    "Discovery Call": "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    "Follow-Up": "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
    "Intake": "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300",
    "Meetings": "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
    "Compliance": "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300",
    "Billing": "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  };
  return map[cat] ?? "bg-muted text-muted-foreground";
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
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-accent" />
            Walkthroughs (SOP)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Step-by-step guides to maintain quality and consistency across every client interaction</p>
        </div>
        <Button className="gap-2" onClick={() => { setEditing(null); setView("builder"); }}>
          <Plus className="h-4 w-4" /> New Walkthrough
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              selectedCat === cat
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-muted text-muted-foreground border-border hover:border-accent/50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Walkthrough list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : walkthroughs.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-20 border-dashed text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-lg font-semibold text-foreground">No walkthroughs yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-6">Create your first SOP to guide your team through key processes</p>
          <Button onClick={() => setView("builder")} className="gap-2"><Plus className="h-4 w-4" /> Create Walkthrough</Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(walkthroughs as any[]).map((wt) => (
            <Card key={wt.id} className="p-5 rounded-xl border hover:border-accent/40 transition-colors group flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2 ${catColor(wt.category)}`}>{wt.category}</span>
                  <h3 className="font-bold text-foreground text-base leading-tight">{wt.title}</h3>
                  {wt.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{wt.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ListChecks className="h-3.5 w-3.5" />
                <span>{(wt.steps as Step[]).length} step{(wt.steps as Step[]).length !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border">
                <Button
                  size="sm"
                  className="flex-1 gap-1.5 bg-accent hover:bg-accent/90 text-accent-foreground"
                  onClick={() => startRunMutation.mutate({ walkthroughId: wt.id })}
                  disabled={startRunMutation.isPending}
                >
                  <Play className="h-3.5 w-3.5" /> Run
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => { setEditing(wt as any); setView("builder"); }}
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteConfirm(wt.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirm dialog */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Walkthrough?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete the walkthrough and all its run history. This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteMutation.mutate({ id: deleteConfirm })} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
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
    const updated = steps.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i }));
    setSteps(updated);
    if (expandedStep === id) setExpandedStep(updated[0]?.id ?? null);
  }

  function moveStep(id: string, dir: -1 | 1) {
    const idx = steps.findIndex((s) => s.id === id);
    if (idx + dir < 0 || idx + dir >= steps.length) return;
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
    <div className="space-y-6 p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{initial ? "Edit Walkthrough" : "New Walkthrough"}</h1>
      </div>

      {/* Meta */}
      <Card className="p-6 space-y-4 rounded-xl border">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Title *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Discovery Call SOP" className="text-base font-semibold" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.filter((c) => c !== "All").map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief summary of this SOP..." />
          </div>
        </div>
      </Card>

      {/* Steps */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Steps ({steps.length})</h2>
          <Button size="sm" variant="outline" onClick={addStep} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Step
          </Button>
        </div>

        <div className="space-y-3">
          {steps.map((step, idx) => (
            <Card key={step.id} className="rounded-xl border overflow-hidden">
              {/* Step header */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
              >
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-bold flex-shrink-0">
                  {idx + 1}
                </div>
                <span className="flex-1 text-sm font-semibold text-foreground truncate">
                  {step.title || <span className="text-muted-foreground italic">Untitled step</span>}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); moveStep(step.id, -1); }} disabled={idx === 0} className="p-1 rounded hover:bg-muted disabled:opacity-30">
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); moveStep(step.id, 1); }} disabled={idx === steps.length - 1} className="p-1 rounded hover:bg-muted disabled:opacity-30">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); removeStep(step.id); }} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Step body */}
              {expandedStep === step.id && (
                <div className="px-4 pb-4 space-y-3 border-t border-border bg-muted/10">
                  <div className="pt-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Step Title *</label>
                    <Input value={step.title} onChange={(e) => updateStep(step.id, "title", e.target.value)} placeholder="e.g. Introduce yourself and the company" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Instructions</label>
                    <Textarea
                      rows={3}
                      value={step.instructions}
                      onChange={(e) => updateStep(step.id, "instructions", e.target.value)}
                      placeholder="What should the advocate do in this step? Be specific."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                      Script / What to Say <span className="font-normal text-muted-foreground">(optional)</span>
                    </label>
                    <Textarea
                      rows={3}
                      value={step.script ?? ""}
                      onChange={(e) => updateStep(step.id, "script", e.target.value)}
                      placeholder="Hi [Name], this is [Advocate] from Waypoint Advocates. I'm calling about..."
                      className="font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                      Notes / If-Then Guidance <span className="font-normal text-muted-foreground">(optional)</span>
                    </label>
                    <Textarea
                      rows={2}
                      value={step.notes ?? ""}
                      onChange={(e) => updateStep(step.id, "notes", e.target.value)}
                      placeholder="e.g. If no answer → leave voicemail using the script above. If voicemail full → send email."
                    />
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onBack}>Cancel</Button>
        <Button onClick={handleSave} disabled={isPending} className="gap-2 min-w-32">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {initial ? "Save Changes" : "Create Walkthrough"}
        </Button>
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
    // Auto-advance to next uncompleted step
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 p-8">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <CheckCheck className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">Walkthrough Complete!</h2>
          <p className="text-muted-foreground mt-1">"{walkthrough.title}" — {completedSteps.size} of {steps.length} steps completed</p>
        </div>
        <Button onClick={onBack} className="gap-2"><ArrowLeft className="h-4 w-4" /> Back to Walkthroughs</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={handleAbandon} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Exit
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">{walkthrough.title}</h1>
          <p className="text-xs text-muted-foreground">{walkthrough.category}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{completedSteps.size} of {steps.length} steps complete</span>
          <span className="font-semibold">{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step list */}
      <div className="space-y-3">
        {steps.map((step, idx) => {
          const isDone = completedSteps.has(step.id);
          const isActive = activeStep === step.id;
          return (
            <Card
              key={step.id}
              className={`rounded-xl border transition-all overflow-hidden ${
                isDone ? "opacity-60 border-emerald-200 dark:border-emerald-800" :
                isActive ? "border-accent shadow-md" : "border-border"
              }`}
            >
              {/* Step header */}
              <div
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${isActive ? "bg-accent/5" : "hover:bg-muted/20"}`}
                onClick={() => setActiveStep(isActive ? "" : step.id)}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); toggleStep(step.id); }}
                  className="flex-shrink-0"
                >
                  {isDone
                    ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    : <Circle className="h-5 w-5 text-muted-foreground hover:text-accent transition-colors" />
                  }
                </button>
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-muted-foreground text-xs font-bold flex-shrink-0">
                  {idx + 1}
                </div>
                <span className={`flex-1 text-sm font-semibold ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {step.title}
                </span>
              </div>

              {/* Step detail — shown when active and not done */}
              {isActive && !isDone && (
                <div className="px-4 pb-4 space-y-3 border-t border-border bg-muted/5">
                  {step.instructions && (
                    <div className="pt-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Instructions</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{step.instructions}</p>
                    </div>
                  )}
                  {step.script && (
                    <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1.5">Script / What to Say</p>
                      <p className="text-sm text-foreground font-mono whitespace-pre-wrap leading-relaxed">{step.script}</p>
                    </div>
                  )}
                  {step.notes && (
                    <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1.5">If-Then Guidance</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{step.notes}</p>
                    </div>
                  )}
                  <Button
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white mt-2"
                    onClick={() => toggleStep(step.id)}
                  >
                    <CheckCircle2 className="h-4 w-4" /> Mark Step Complete
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Run notes */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Session Notes (optional)</label>
        <Textarea
          rows={3}
          value={runNotes}
          onChange={(e) => setRunNotes(e.target.value)}
          placeholder="Any notes about this walkthrough session..."
        />
      </div>

      {/* Complete button */}
      <div className="flex gap-3">
        <Button
          className={`flex-1 gap-2 ${allDone ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
          onClick={handleComplete}
          disabled={updateRun.isPending}
        >
          {updateRun.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
          {allDone ? "Complete Walkthrough" : `Complete (${completedSteps.size}/${steps.length} done)`}
        </Button>
        <Button variant="outline" onClick={handleAbandon} className="gap-1.5">
          <RotateCcw className="h-4 w-4" /> Abandon
        </Button>
      </div>
    </div>
  );
}

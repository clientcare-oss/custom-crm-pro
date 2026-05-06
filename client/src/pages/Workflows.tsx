import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Plus, Pencil, Trash2, ChevronDown, ChevronUp, X, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

const COLOR_OPTIONS = [
  "#3b82f6", "#6366f1", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#64748b",
];

type Step = {
  id?: number;
  stepNumber: number;
  title: string;
  description?: string;
  notes?: string;
  role?: string;
};

type WorkflowForm = {
  title: string;
  description: string;
  category: string;
  color: string;
};

const defaultForm: WorkflowForm = { title: "", description: "", category: "", color: "#3b82f6" };

export default function Workflows() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();

  const { data: workflows = [], isLoading } = trpc.workflows.list.useQuery();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: selected } = trpc.workflows.get.useQuery(
    { id: selectedId! },
    { enabled: selectedId !== null }
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<WorkflowForm>(defaultForm);
  const [editingSteps, setEditingSteps] = useState<Step[] | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const createMutation = trpc.workflows.create.useMutation({
    onSuccess: () => {
      utils.workflows.list.invalidate();
      toast.success("Workflow created");
      setDialogOpen(false);
    },
    onError: () => toast.error("Failed to create workflow"),
  });
  const updateMutation = trpc.workflows.update.useMutation({
    onSuccess: () => {
      utils.workflows.list.invalidate();
      if (selectedId) utils.workflows.get.invalidate({ id: selectedId });
      toast.success("Workflow updated");
      setDialogOpen(false);
    },
    onError: () => toast.error("Failed to update workflow"),
  });
  const deleteMutation = trpc.workflows.delete.useMutation({
    onSuccess: () => {
      utils.workflows.list.invalidate();
      setSelectedId(null);
      toast.success("Workflow deleted");
    },
    onError: () => toast.error("Failed to delete workflow"),
  });
  const saveStepsMutation = trpc.workflows.saveSteps.useMutation({
    onSuccess: () => {
      if (selectedId) utils.workflows.get.invalidate({ id: selectedId });
      utils.workflows.list.invalidate();
      setEditingSteps(null);
      toast.success("Steps saved");
    },
    onError: () => toast.error("Failed to save steps"),
  });

  function openCreate() {
    setEditingId(null);
    setForm(defaultForm);
    setDialogOpen(true);
  }

  function openEdit(w: typeof workflows[0]) {
    setEditingId(w.id);
    setForm({ title: w.title, description: w.description ?? "", category: w.category ?? "", color: w.color ?? "#3b82f6" });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form });
    } else {
      createMutation.mutate(form);
    }
  }

  function startEditSteps() {
    setEditingSteps((selected?.steps ?? []).map(s => ({
      id: s.id,
      stepNumber: s.stepNumber,
      title: s.title,
      description: s.description ?? undefined,
      notes: s.notes ?? undefined,
      role: s.role ?? undefined,
    })));
    setExpandedStep(null);
  }

  function addStep() {
    const cur = editingSteps ?? [];
    setEditingSteps([...cur, { stepNumber: cur.length + 1, title: "", description: "", notes: "", role: "" }]);
    setExpandedStep(cur.length);
  }

  function updateStep(idx: number, field: keyof Step, value: string) {
    if (!editingSteps) return;
    setEditingSteps(editingSteps.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  function removeStep(idx: number) {
    if (!editingSteps) return;
    const updated = editingSteps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepNumber: i + 1 }));
    setEditingSteps(updated);
    setExpandedStep(null);
  }

  function moveStep(idx: number, dir: -1 | 1) {
    if (!editingSteps) return;
    const next = [...editingSteps];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setEditingSteps(next.map((s, i) => ({ ...s, stepNumber: i + 1 })));
  }

  function handleSaveSteps() {
    if (!selectedId || !editingSteps) return;
    saveStepsMutation.mutate({ workflowId: selectedId, steps: editingSteps });
  }

  const displaySteps = editingSteps ?? (selected?.steps ?? []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <GitBranch className="h-7 w-7 text-accent" />
          <div>
            <h1 className="text-2xl font-bold">Workflows</h1>
            <p className="text-sm text-muted-foreground">
              {isAdmin
                ? "Build and manage step-by-step process flows for your team"
                : "Reference guides for your daily processes"}
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> New Workflow
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflow list */}
        <div className="lg:col-span-1 space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {!isLoading && workflows.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <GitBranch className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No workflows yet.</p>
                {isAdmin && (
                  <Button variant="link" onClick={openCreate} className="mt-1 text-sm">
                    Create your first workflow
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
          {workflows.map((w) => (
            <Card
              key={w.id}
              className={`cursor-pointer transition-all hover:shadow-md ${selectedId === w.id ? "ring-2 ring-accent" : ""}`}
              onClick={() => { setSelectedId(w.id); setEditingSteps(null); setExpandedStep(null); }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: w.color }} />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{w.title}</p>
                      {w.category && <p className="text-xs text-muted-foreground">{w.category}</p>}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs flex-shrink-0">{w.stepCount} steps</Badge>
                </div>
                {w.description && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{w.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Detail / step view */}
        <div className="lg:col-span-2">
          {!selectedId && (
            <Card className="border-dashed h-full flex items-center justify-center">
              <CardContent className="text-center py-16">
                <GitBranch className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Select a workflow to view its steps</p>
              </CardContent>
            </Card>
          )}

          {selectedId && selected && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: selected.color }} />
                    <CardTitle className="text-lg">{selected.title}</CardTitle>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" variant="outline" onClick={() => openEdit(workflows.find(w => w.id === selectedId)!)} className="gap-1">
                        <Pencil className="h-3 w-3" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive gap-1"
                        onClick={() => {
                          if (confirm("Delete this workflow and all its steps?")) {
                            deleteMutation.mutate({ id: selectedId });
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </Button>
                    </div>
                  )}
                </div>
                {selected.category && (
                  <Badge variant="outline" className="w-fit mt-1">{selected.category}</Badge>
                )}
                {selected.description && (
                  <p className="text-sm text-muted-foreground mt-2">{selected.description}</p>
                )}
              </CardHeader>

              <CardContent className="space-y-3">
                {displaySteps.length === 0 && !editingSteps && (
                  <p className="text-sm text-muted-foreground text-center py-4">No steps defined yet.</p>
                )}

                {displaySteps.map((step, idx) => {
                  const expanded = expandedStep === idx;
                  return (
                    <div key={idx} className="border rounded-lg overflow-hidden">
                      <div
                        className="flex items-center gap-3 p-3 bg-muted/30 cursor-pointer select-none"
                        onClick={() => setExpandedStep(expanded ? null : idx)}
                      >
                        <div className="w-6 h-6 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center font-bold flex-shrink-0">
                          {idx + 1}
                        </div>
                        {editingSteps ? (
                          <Input
                            value={step.title}
                            onChange={(e) => { e.stopPropagation(); updateStep(idx, "title", e.target.value); }}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Step title"
                            className="h-7 text-sm flex-1"
                          />
                        ) : (
                          <span className="font-medium text-sm flex-1">{step.title}</span>
                        )}
                        <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          {editingSteps && (
                            <>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveStep(idx, -1)} disabled={idx === 0}>
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveStep(idx, 1)} disabled={idx === displaySteps.length - 1}>
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeStep(idx)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>
                      {expanded && (
                        <div className="p-3 border-t space-y-2">
                          {editingSteps ? (
                            <>
                              <Textarea
                                value={step.description ?? ""}
                                onChange={(e) => updateStep(idx, "description", e.target.value)}
                                placeholder="Description — what to do in this step"
                                rows={2}
                                className="text-sm"
                              />
                              <Textarea
                                value={step.notes ?? ""}
                                onChange={(e) => updateStep(idx, "notes", e.target.value)}
                                placeholder="Notes / tips"
                                rows={2}
                                className="text-sm"
                              />
                              <Input
                                value={step.role ?? ""}
                                onChange={(e) => updateStep(idx, "role", e.target.value)}
                                placeholder="Responsible role (e.g. Advocate, Admin)"
                                className="h-8 text-sm"
                              />
                            </>
                          ) : (
                            <>
                              {step.description && <p className="text-sm">{step.description}</p>}
                              {step.notes && <p className="text-xs text-muted-foreground italic">{step.notes}</p>}
                              {step.role && <Badge variant="outline" className="text-xs">{step.role}</Badge>}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {isAdmin && (
                  <div className="flex gap-2 pt-2 flex-wrap">
                    {!editingSteps ? (
                      <Button variant="outline" size="sm" onClick={startEditSteps} className="gap-1">
                        <Pencil className="h-3 w-3" /> Edit Steps
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" onClick={addStep} className="gap-1">
                          <Plus className="h-3 w-3" /> Add Step
                        </Button>
                        <Button size="sm" onClick={handleSaveSteps} disabled={saveStepsMutation.isPending}>
                          Save Steps
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingSteps(null)}>
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Workflow" : "New Workflow"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Title *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. New Client Onboarding"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. Onboarding, IEP, Admin"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief overview of this workflow"
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Color</label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_OPTIONS.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${form.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setForm({ ...form, color: c })}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingId ? "Save Changes" : "Create Workflow"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

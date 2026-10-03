import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import VoiceInput from "@/components/VoiceInput";
import VoiceTextarea from "@/components/VoiceTextarea";
import NotesWorkspace from "@/components/braindump/NotesWorkspace";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  GitBranch,
  Plus,
  ExternalLink,
  Pencil,
  Trash2,
  Workflow,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  CheckCircle2,
  FolderGit2,
  Network,
  HelpCircle,
  Clock,
  Lightbulb,
  Building,
} from "lucide-react";

const WORKFLOW_COLORS = [
  "#3b82f6", "#6366f1", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#64748b",
];

const STANDARD_CATEGORIES = [
  "Lead Handling & Intake",
  "Discovery & Consultation Process",
  "Client Onboarding & Retainer",
  "Project & Case Lifecycle",
  "Review & Follow-Up Procedures",
  "Internal Operations & Escalations",
  "Decision Trees & Governance",
];

export function BusinessOperationsSection() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const isAdmin = user?.role === "admin";

  const [activeSubTab, setActiveSubTab] = useState<"company_notes" | "workflows">(() => {
    if (typeof window !== "undefined") {
      const search = window.location.search;
      if (search.includes("workflows")) return "workflows";
    }
    return "company_notes";
  });

  const { data: workflows = [], isLoading } = trpc.workflows.list.useQuery();

  // Create / Edit Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: STANDARD_CATEGORIES[0],
    color: "#3b82f6",
  });

  const createMutation = trpc.workflows.create.useMutation({
    onSuccess: (data) => {
      utils.workflows.list.invalidate();
      toast.success("Workflow created in Workflow Designer");
      setDialogOpen(false);
      // Directly open the designer for the new workflow
      setLocation(`/workflows?id=${data.id}`);
    },
    onError: (err) => toast.error(err.message || "Failed to create workflow"),
  });

  const updateMutation = trpc.workflows.update.useMutation({
    onSuccess: () => {
      utils.workflows.list.invalidate();
      toast.success("Workflow details updated");
      setDialogOpen(false);
    },
    onError: (err) => toast.error(err.message || "Failed to update workflow"),
  });

  const deleteMutation = trpc.workflows.delete.useMutation({
    onSuccess: () => {
      utils.workflows.list.invalidate();
      toast.success("Workflow deleted");
    },
    onError: (err) => toast.error(err.message || "Failed to delete workflow"),
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({
      title: "",
      description: "",
      category: STANDARD_CATEGORIES[0],
      color: "#3b82f6",
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (wf: any) => {
    setEditingId(wf.id);
    setForm({
      title: wf.title,
      description: wf.description || "",
      category: wf.category || STANDARD_CATEGORIES[0],
      color: wf.color || "#3b82f6",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      toast.error("Please enter a workflow title");
      return;
    }
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category: form.category || undefined,
        color: form.color,
      });
    } else {
      createMutation.mutate({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category: form.category || undefined,
        color: form.color,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* ── SUB-TAB NAVIGATION: COMPANY NOTES vs WORKFLOW DESIGNER ── */}
      <div className="flex items-center gap-2 border-b border-[#3A2C18]/60 pb-3 flex-wrap">
        <button
          onClick={() => setActiveSubTab("company_notes")}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === "company_notes"
              ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)]"
              : "border border-[#3A2C18] bg-[#020A17] text-[#C6B697] hover:bg-[#07162B] hover:text-[#FFF4D4]"
          }`}
        >
          <Building className="w-4 h-4" />
          Company Notes (Organization Thinking & Planning)
        </button>

        <button
          onClick={() => setActiveSubTab("workflows")}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === "workflows"
              ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)]"
              : "border border-[#3A2C18] bg-[#020A17] text-[#C6B697] hover:bg-[#07162B] hover:text-[#FFF4D4]"
          }`}
        >
          <GitBranch className="w-4 h-4" />
          Process Workflows (Workflow Designer)
        </button>
      </div>

      {activeSubTab === "company_notes" && (
        <NotesWorkspace
          scope="company"
          companyName="Waypoint Advocates"
          isCeoOrAdmin={isAdmin}
        />
      )}

      {activeSubTab === "workflows" && (
        <>
          {/* ── ARCHITECTURAL DISTINCTION CALLOUT ─────────────────────────────── */}
          <div className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-center text-[#FFE394] shrink-0">
                  <Network className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-serif font-bold text-[#FFF4D4] tracking-tight flex items-center gap-2">
                    Business Operations · Workflow Designer
                  </h2>
                  <p className="text-xs text-[#C6B697]">
                    Visual process planning, lifecycle mapping, and operational decision trees for executive leadership.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setLocation("/workflows")}
                  className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-9 px-4 rounded-xl gap-2 shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 hover:brightness-105 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  Launch Fullscreen Designer
                </Button>
                {isAdmin && (
                  <Button
                    variant="outline"
                    onClick={handleOpenCreate}
                    className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs h-9 px-3.5 rounded-xl gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#DFBE77]" />
                    New Workflow
                  </Button>
                )}
              </div>
            </div>

            {/* System Clarity: Automations vs Workflow Designer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-[#020A17]/80 border border-[#3A2C18]/80 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#DFBE77]">
                  <Workflow className="w-3.5 h-3.5" />
                  <span>Automations Engine (Operational System)</span>
                </div>
                <p className="text-[#C6B697] text-[11px] leading-relaxed">
                  Executable system triggers, webhooks, and automated background tasks that run automatically when CRM events occur. Located in the main tools suite.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#020A17]/80 border border-[#3A2C18]/80 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>Workflow Designer (Administrative Planning)</span>
                </div>
                <p className="text-[#C6B697] text-[11px] leading-relaxed">
                  Visual business architecture and flowchart canvas. Used by CEO and Management to model standard operating procedures, decision gates, and service lifecycles.
                </p>
              </div>
            </div>
          </div>

          {/* ── WORKFLOWS LIST & REPOSITORY ────────────────────────────────────── */}
          <Card className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
            <CardHeader className="pb-3 border-b border-[#3A2C18]/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-serif font-bold text-[#FFF4D4] flex items-center gap-2">
                    <FolderGit2 className="h-4 w-4 text-[#FFE394]" />
                    Active Company Process Workflows
                  </CardTitle>
                  <CardDescription className="text-xs text-[#C6B697]">
                    Business workflows saved across the organization. Click any workflow to view or edit in the interactive canvas.
                  </CardDescription>
                </div>
            <Badge variant="outline" className="text-xs font-mono self-start sm:self-auto">
              {workflows.length} {workflows.length === 1 ? "Workflow" : "Workflows"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Loading company workflows...
            </div>
          ) : workflows.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                <GitBranch className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">No Process Workflows Defined Yet</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                  Start mapping company lifecycles such as Lead Handling, Discovery, Client Onboarding, or Internal Escalations.
                </p>
              </div>
              {isAdmin && (
                <Button
                  onClick={handleOpenCreate}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs h-8 px-4 rounded-xl gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create First Workflow
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows.map((wf: any) => {
                let nodeCount = 0;
                let edgeCount = 0;
                try {
                  if (wf.canvasData) {
                    const parsed = JSON.parse(wf.canvasData);
                    nodeCount = parsed.nodes?.length || 0;
                    edgeCount = parsed.edges?.length || 0;
                  }
                } catch {
                  // Fallback
                }

                return (
                  <div
                    key={wf.id}
                    onClick={() => setLocation(`/workflows?id=${wf.id}`)}
                    className="group relative rounded-xl border border-border/80 bg-card/60 hover:bg-card hover:border-emerald-500/50 p-4 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md space-y-3 flex flex-col justify-between"
                  >
                    {/* Top color indicator */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
                      style={{ backgroundColor: wf.color || "#3b82f6" }}
                    />

                    <div className="space-y-2 pt-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold text-foreground group-hover:text-emerald-400 transition-colors leading-tight">
                          {wf.title}
                        </h3>
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {isAdmin && (
                            <>
                              <button
                                title="Edit metadata"
                                onClick={() => handleOpenEdit(wf)}
                                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                title="Delete workflow"
                                onClick={() => {
                                  if (confirm(`Delete workflow "${wf.title}"?`)) {
                                    deleteMutation.mutate({ id: wf.id });
                                  }
                                }}
                                className="p-1 rounded-md text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {wf.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {wf.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-medium py-0 px-2 rounded-md"
                        >
                          {wf.category || "General Process"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 font-mono text-[10px]">
                        <span>{nodeCount} nodes</span>
                        <span>•</span>
                        <span>{edgeCount} links</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── CREATE / EDIT WORKFLOW DIALOG ──────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-card border border-border text-foreground shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-emerald-500" />
              {editingId ? "Edit Workflow Details" : "Create Process Workflow"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Process Title *</label>
              <VoiceInput
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Inbound Lead Intake & Discovery"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Category / Lifecycle Phase</label>
              <select
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {STANDARD_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Process Description</label>
              <VoiceTextarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Outline the operational objectives and scope of this workflow..."
                className="mt-1 min-h-[70px] text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Accent Color</label>
              <div className="flex items-center gap-2 flex-wrap">
                {WORKFLOW_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, color: c }))}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      form.color === c ? "scale-110 border-white shadow-sm" : "border-transparent opacity-80 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDialogOpen(false)}
              className="text-xs text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs"
            >
              {editingId ? "Save Changes" : "Create & Open Canvas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
      )}
    </div>
  );
}

export default BusinessOperationsSection;

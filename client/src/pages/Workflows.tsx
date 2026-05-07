import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  type NodeTypes,
  Handle,
  Position,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  GitBranch, Plus, Pencil, Trash2, Save, Square, Diamond,
  StickyNote, ChevronLeft, Loader2
} from "lucide-react";
import { toast } from "sonner";

// ─── Color palette ───────────────────────────────────────────────────────────
const NODE_COLORS = [
  { label: "Blue",   value: "#3b82f6" },
  { label: "Teal",   value: "#14b8a6" },
  { label: "Green",  value: "#10b981" },
  { label: "Amber",  value: "#f59e0b" },
  { label: "Orange", value: "#f97316" },
  { label: "Red",    value: "#ef4444" },
  { label: "Pink",   value: "#ec4899" },
  { label: "Purple", value: "#8b5cf6" },
  { label: "Indigo", value: "#6366f1" },
  { label: "Slate",  value: "#64748b" },
  { label: "Rose",   value: "#f43f5e" },
  { label: "Lime",   value: "#84cc16" },
];

const WORKFLOW_COLORS = [
  "#3b82f6", "#6366f1", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#64748b",
];

// ─── Custom node: Card ───────────────────────────────────────────────────────
function CardNode({ data, selected }: { data: { label: string; notes?: string; color: string }; selected?: boolean }) {
  return (
    <div
      className="rounded-lg shadow-md min-w-[120px] max-w-[200px] border-2 transition-all"
      style={{
        backgroundColor: data.color,
        borderColor: selected ? "#1e293b" : "transparent",
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-white/80 !border-slate-400" />
      <Handle type="target" position={Position.Left} className="!bg-white/80 !border-slate-400" />
      <div className="px-3 py-2">
        <p className="text-white font-semibold text-xs leading-tight break-words">{data.label}</p>
        {data.notes && (
          <p className="text-white/80 text-[10px] mt-1 leading-tight break-words">{data.notes}</p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-white/80 !border-slate-400" />
      <Handle type="source" position={Position.Right} className="!bg-white/80 !border-slate-400" />
    </div>
  );
}

// ─── Custom node: Diamond (decision) ─────────────────────────────────────────
function DiamondNode({ data, selected }: { data: { label: string; color: string }; selected?: boolean }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 120, height: 80 }}>
      <Handle type="target" position={Position.Top} className="!bg-white/80 !border-slate-400" />
      <Handle type="target" position={Position.Left} className="!bg-white/80 !border-slate-400" />
      <div
        className="absolute inset-0 border-2 transition-all"
        style={{
          backgroundColor: data.color,
          borderColor: selected ? "#1e293b" : "transparent",
          transform: "rotate(45deg)",
          borderRadius: 4,
        }}
      />
      <p className="relative z-10 text-white font-semibold text-[10px] text-center leading-tight px-2 break-words" style={{ maxWidth: 90 }}>
        {data.label}
      </p>
      <Handle type="source" position={Position.Bottom} className="!bg-white/80 !border-slate-400" />
      <Handle type="source" position={Position.Right} className="!bg-white/80 !border-slate-400" />
    </div>
  );
}

// ─── Custom node: Sticky note ─────────────────────────────────────────────────
function StickyNoteNode({ data, selected }: { data: { label: string; color: string }; selected?: boolean }) {
  return (
    <div
      className="rounded shadow-md min-w-[140px] max-w-[220px] border-2 transition-all p-3"
      style={{
        backgroundColor: data.color,
        borderColor: selected ? "#1e293b" : "transparent",
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-white/80 !border-slate-400" />
      <Handle type="target" position={Position.Left} className="!bg-white/80 !border-slate-400" />
      <p className="text-white text-[11px] leading-relaxed break-words whitespace-pre-wrap">{data.label}</p>
      <Handle type="source" position={Position.Bottom} className="!bg-white/80 !border-slate-400" />
      <Handle type="source" position={Position.Right} className="!bg-white/80 !border-slate-400" />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  card: CardNode,
  diamond: DiamondNode,
  sticky: StickyNoteNode,
};

// ─── Empty canvas ─────────────────────────────────────────────────────────────
const EMPTY_CANVAS = { nodes: [], edges: [] };

// ─── Main component ───────────────────────────────────────────────────────────
export default function Workflows() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();

  // Workflow list
  const { data: workflows = [], isLoading } = trpc.workflows.list.useQuery();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: selectedWorkflow } = trpc.workflows.get.useQuery(
    { id: selectedId! },
    { enabled: selectedId !== null }
  );

  // Canvas state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Node edit dialog
  const [nodeDialog, setNodeDialog] = useState<{ open: boolean; nodeId: string | null; label: string; notes: string; color: string; type: string }>({
    open: false, nodeId: null, label: "", notes: "", color: "#3b82f6", type: "card",
  });

  // Workflow create/edit dialog
  const [wfDialog, setWfDialog] = useState(false);
  const [editingWfId, setEditingWfId] = useState<number | null>(null);
  const [wfForm, setWfForm] = useState({ title: "", description: "", category: "", color: "#3b82f6" });

  // Load canvas when workflow selected
  useEffect(() => {
    if (!selectedWorkflow) return;
    try {
      const data = selectedWorkflow.canvasData ? JSON.parse(selectedWorkflow.canvasData) : EMPTY_CANVAS;
      setNodes(data.nodes ?? []);
      setEdges(data.edges ?? []);
    } catch {
      setNodes([]);
      setEdges([]);
    }
    setIsDirty(false);
  }, [selectedWorkflow?.id, selectedWorkflow?.canvasData]);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge({ ...connection, animated: true, style: { stroke: "#64748b", strokeWidth: 2 } }, eds));
    setIsDirty(true);
  }, [setEdges]);

  function markDirty() { setIsDirty(true); }

  // Mutations
  const createMutation = trpc.workflows.create.useMutation({
    onSuccess: (data) => {
      utils.workflows.list.invalidate();
      toast.success("Workflow created");
      setWfDialog(false);
      setSelectedId(data.id);
    },
    onError: () => toast.error("Failed to create workflow"),
  });
  const updateMutation = trpc.workflows.update.useMutation({
    onSuccess: () => {
      utils.workflows.list.invalidate();
      if (selectedId) utils.workflows.get.invalidate({ id: selectedId });
      toast.success("Workflow updated");
      setWfDialog(false);
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
  const saveCanvasMutation = trpc.workflows.saveCanvas.useMutation({
    onSuccess: () => {
      if (selectedId) utils.workflows.get.invalidate({ id: selectedId });
      setIsDirty(false);
      setIsSaving(false);
      toast.success("Canvas saved");
    },
    onError: () => { setIsSaving(false); toast.error("Failed to save canvas"); },
  });

  function handleSaveCanvas() {
    if (!selectedId) return;
    setIsSaving(true);
    saveCanvasMutation.mutate({ id: selectedId, canvasData: JSON.stringify({ nodes, edges }) });
  }

  function addNode(type: "card" | "diamond" | "sticky") {
    const id = `node-${Date.now()}`;
    const color = type === "sticky" ? "#f59e0b" : type === "diamond" ? "#ef4444" : "#3b82f6";
    const newNode: Node = {
      id,
      type,
      position: { x: 200 + Math.random() * 100, y: 100 + Math.random() * 100 },
      data: { label: type === "diamond" ? "Decision?" : type === "sticky" ? "Note..." : "Step", notes: "", color },
    };
    setNodes((nds) => [...nds, newNode]);
    setIsDirty(true);
  }

  function deleteSelected() {
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => eds.filter((e) => !e.selected));
    setIsDirty(true);
  }

  function onNodeDoubleClick(_: React.MouseEvent, node: Node) {
    if (!isAdmin) return;
    const d = node.data as { label: string; notes?: string; color: string };
    setNodeDialog({ open: true, nodeId: node.id, label: d.label, notes: d.notes ?? "", color: d.color, type: node.type ?? "card" });
  }

  function saveNodeEdit() {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeDialog.nodeId
          ? { ...n, data: { ...n.data, label: nodeDialog.label, notes: nodeDialog.notes, color: nodeDialog.color } }
          : n
      )
    );
    setIsDirty(true);
    setNodeDialog((d) => ({ ...d, open: false }));
  }

  function openCreateWf() {
    setEditingWfId(null);
    setWfForm({ title: "", description: "", category: "", color: "#3b82f6" });
    setWfDialog(true);
  }

  function openEditWf() {
    if (!selectedWorkflow) return;
    setEditingWfId(selectedWorkflow.id);
    setWfForm({
      title: selectedWorkflow.title,
      description: selectedWorkflow.description ?? "",
      category: selectedWorkflow.category ?? "",
      color: selectedWorkflow.color ?? "#3b82f6",
    });
    setWfDialog(true);
  }

  function handleSaveWf() {
    if (!wfForm.title.trim()) { toast.error("Title is required"); return; }
    if (editingWfId) {
      updateMutation.mutate({ id: editingWfId, ...wfForm });
    } else {
      createMutation.mutate(wfForm);
    }
  }

  const selectedWfMeta = workflows.find((w) => w.id === selectedId);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left panel: workflow list */}
      <div className="w-64 flex-shrink-0 border-r bg-background flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-accent" />
            <span className="font-semibold text-sm">Workflows</span>
          </div>
          {isAdmin && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={openCreateWf}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading && <p className="text-xs text-muted-foreground p-2">Loading...</p>}
          {!isLoading && workflows.length === 0 && (
            <div className="text-center py-8">
              <p className="text-xs text-muted-foreground">No workflows yet.</p>
              {isAdmin && (
                <Button variant="link" size="sm" onClick={openCreateWf} className="text-xs mt-1">
                  Create one
                </Button>
              )}
            </div>
          )}
          {workflows.map((w) => (
            <button
              key={w.id}
              onClick={() => setSelectedId(w.id)}
              className={`w-full text-left rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted flex items-center gap-2 ${selectedId === w.id ? "bg-accent/10 text-accent font-medium" : ""}`}
            >
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: w.color }} />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{w.title}</p>
                {w.category && <p className="truncate text-[10px] text-muted-foreground">{w.category}</p>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedId ? (
          <div className="flex-1 flex items-center justify-center bg-muted/20">
            <div className="text-center">
              <GitBranch className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Select a workflow to view its canvas</p>
              {isAdmin && (
                <Button variant="link" size="sm" onClick={openCreateWf} className="mt-2">
                  Or create a new workflow
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Canvas toolbar */}
            <div className="border-b bg-background px-4 py-2 flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: selectedWfMeta?.color }} />
                <span className="font-semibold text-sm truncate">{selectedWfMeta?.title}</span>
                {selectedWfMeta?.category && <Badge variant="outline" className="text-xs">{selectedWfMeta.category}</Badge>}
              </div>
              {isAdmin && (
                <div className="flex items-center gap-1 flex-wrap">
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => addNode("card")}>
                    <Square className="h-3 w-3" /> Card
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => addNode("diamond")}>
                    <Diamond className="h-3 w-3" /> Decision
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => addNode("sticky")}>
                    <StickyNote className="h-3 w-3" /> Note
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-xs text-destructive" onClick={deleteSelected}>
                    <Trash2 className="h-3 w-3" /> Delete
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={openEditWf}>
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={handleSaveCanvas}
                    disabled={!isDirty || isSaving}
                  >
                    {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    {isDirty ? "Save*" : "Saved"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 text-xs text-destructive"
                    onClick={() => { if (confirm("Delete this workflow?")) deleteMutation.mutate({ id: selectedId }); }}
                  >
                    <Trash2 className="h-3 w-3" /> Delete Workflow
                  </Button>
                </div>
              )}
            </div>

            {/* React Flow canvas */}
            <div className="flex-1 min-h-0">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={(changes) => { onNodesChange(changes); if (changes.some(c => c.type !== "select")) markDirty(); }}
                onEdgesChange={(changes) => { onEdgesChange(changes); if (changes.some(c => c.type !== "select")) markDirty(); }}
                onConnect={onConnect}
                onNodeDoubleClick={onNodeDoubleClick}
                nodeTypes={nodeTypes}
                fitView
                nodesDraggable={isAdmin}
                nodesConnectable={isAdmin}
                elementsSelectable={isAdmin}
                deleteKeyCode={isAdmin ? "Delete" : null}
                className="bg-muted/10"
              >
                <Background gap={16} color="#e2e8f0" />
                <Controls />
                <MiniMap nodeColor={(n) => (n.data as { color: string }).color ?? "#64748b"} />
                {!isAdmin && (
                  <Panel position="top-right">
                    <Badge variant="secondary" className="text-xs">Read-only view</Badge>
                  </Panel>
                )}
                {isAdmin && nodes.length === 0 && (
                  <Panel position="top-center">
                    <p className="text-xs text-muted-foreground bg-background/80 px-3 py-1.5 rounded-full border shadow-sm">
                      Add nodes using the toolbar above, then drag to connect them
                    </p>
                  </Panel>
                )}
              </ReactFlow>
            </div>
          </>
        )}
      </div>

      {/* Node edit dialog */}
      <Dialog open={nodeDialog.open} onOpenChange={(o) => setNodeDialog((d) => ({ ...d, open: o }))}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Node</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Label</label>
              <Input
                value={nodeDialog.label}
                onChange={(e) => setNodeDialog((d) => ({ ...d, label: e.target.value }))}
                placeholder="Node label"
              />
            </div>
            {nodeDialog.type !== "diamond" && (
              <div>
                <label className="text-sm font-medium mb-1 block">Notes / details</label>
                <Textarea
                  value={nodeDialog.notes}
                  onChange={(e) => setNodeDialog((d) => ({ ...d, notes: e.target.value }))}
                  placeholder="Optional notes shown below the label"
                  rows={2}
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-2 block">Color</label>
              <div className="flex gap-2 flex-wrap">
                {NODE_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${nodeDialog.color === c.value ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c.value }}
                    onClick={() => setNodeDialog((d) => ({ ...d, color: c.value }))}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNodeDialog((d) => ({ ...d, open: false }))}>Cancel</Button>
            <Button onClick={saveNodeEdit}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Workflow create/edit dialog */}
      <Dialog open={wfDialog} onOpenChange={setWfDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingWfId ? "Edit Workflow" : "New Workflow"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Title *</label>
              <Input value={wfForm.title} onChange={(e) => setWfForm({ ...wfForm, title: e.target.value })} placeholder="e.g. New Client Onboarding" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <Input value={wfForm.category} onChange={(e) => setWfForm({ ...wfForm, category: e.target.value })} placeholder="e.g. Onboarding, IEP, Admin" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea value={wfForm.description} onChange={(e) => setWfForm({ ...wfForm, description: e.target.value })} placeholder="Brief overview" rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Color</label>
              <div className="flex gap-2 flex-wrap">
                {WORKFLOW_COLORS.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${wfForm.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setWfForm({ ...wfForm, color: c })}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWfDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveWf} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingWfId ? "Save Changes" : "Create Workflow"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

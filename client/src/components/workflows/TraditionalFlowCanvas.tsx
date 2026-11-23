import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  type NodeTypes,
  type ReactFlowInstance,
  Handle,
  Position,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import VoiceInput from "@/components/VoiceInput";
import VoiceTextarea from "@/components/VoiceTextarea";
import {
  GitBranch,
  Plus,
  Square,
  Diamond,
  StickyNote,
  Trash2,
  Pencil,
  PlusCircle,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import type {
  TraditionalFlowEdge,
  TraditionalFlowNode,
} from "@shared/workflowModel";

const NODE_COLORS = [
  { label: "Blue", value: "#3b82f6" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Green", value: "#10b981" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Orange", value: "#f97316" },
  { label: "Red", value: "#ef4444" },
  { label: "Pink", value: "#ec4899" },
  { label: "Purple", value: "#8b5cf6" },
  { label: "Indigo", value: "#6366f1" },
  { label: "Slate", value: "#64748b" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Lime", value: "#84cc16" },
];

type CardData = {
  label: string;
  notes?: string;
  color: string;
  onAddBelow?: (nodeId: string) => void;
  isAdmin?: boolean;
};

function CardNode({
  id,
  data,
  selected,
}: {
  id: string;
  data: CardData;
  selected?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="rounded-lg shadow-md min-w-[120px] max-w-[200px] border-2 transition-all relative"
      style={{
        backgroundColor: data.color || "#3b82f6",
        borderColor: selected ? "#FFF1C7" : "transparent",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Handle type="target" position={Position.Top} className="!bg-white/80 !border-slate-400" />
      <Handle type="target" position={Position.Left} className="!bg-white/80 !border-slate-400" />
      <div className="px-3 py-2">
        <p className="text-white font-semibold text-xs leading-tight break-words">
          {data.label}
        </p>
        {data.notes && (
          <p className="text-white/80 text-[10px] mt-1 leading-tight break-words">
            {data.notes}
          </p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-white/80 !border-slate-400" />
      <Handle type="source" position={Position.Right} className="!bg-white/80 !border-slate-400" />

      {data.isAdmin && (
        <button
          type="button"
          title="Add card below"
          onClick={(e) => {
            e.stopPropagation();
            data.onAddBelow?.(id);
          }}
          className="nodrag absolute left-1/2 -translate-x-1/2 -bottom-4 z-10 flex items-center justify-center w-6 h-6 rounded-full bg-white shadow-md border border-slate-200 text-slate-600 hover:text-slate-900 hover:scale-110 transition-all cursor-pointer"
          style={{
            opacity: hovered ? 1 : 0,
            pointerEvents: hovered ? "auto" : "none",
          }}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function DiamondNode({
  data,
  selected,
}: {
  data: { label: string; color: string };
  selected?: boolean;
}) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 120, height: 80 }}>
      <Handle type="target" position={Position.Top} className="!bg-white/80 !border-slate-400" />
      <Handle type="target" position={Position.Left} className="!bg-white/80 !border-slate-400" />
      <div
        className="absolute inset-0 border-2 transition-all"
        style={{
          backgroundColor: data.color || "#ef4444",
          borderColor: selected ? "#FFF1C7" : "transparent",
          transform: "rotate(45deg)",
          borderRadius: 4,
        }}
      />
      <p
        className="relative z-10 text-white font-semibold text-[10px] text-center leading-tight px-2 break-words"
        style={{ maxWidth: 90 }}
      >
        {data.label}
      </p>
      <Handle type="source" position={Position.Bottom} className="!bg-white/80 !border-slate-400" />
      <Handle type="source" position={Position.Right} className="!bg-white/80 !border-slate-400" />
    </div>
  );
}

function StickyNoteNode({
  id,
  data,
  selected,
}: {
  id: string;
  data: CardData;
  selected?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="rounded shadow-md min-w-[140px] max-w-[220px] border-2 transition-all p-3 relative"
      style={{
        backgroundColor: data.color || "#f59e0b",
        borderColor: selected ? "#FFF1C7" : "transparent",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Handle type="target" position={Position.Top} className="!bg-white/80 !border-slate-400" />
      <Handle type="target" position={Position.Left} className="!bg-white/80 !border-slate-400" />
      <p className="text-white text-[11px] leading-relaxed break-words whitespace-pre-wrap">
        {data.label}
      </p>
      <Handle type="source" position={Position.Bottom} className="!bg-white/80 !border-slate-400" />
      <Handle type="source" position={Position.Right} className="!bg-white/80 !border-slate-400" />

      {data.isAdmin && (
        <button
          type="button"
          title="Add card below"
          onClick={(e) => {
            e.stopPropagation();
            data.onAddBelow?.(id);
          }}
          className="nodrag absolute left-1/2 -translate-x-1/2 -bottom-4 z-10 flex items-center justify-center w-6 h-6 rounded-full bg-white shadow-md border border-slate-200 text-slate-600 hover:text-slate-900 hover:scale-110 transition-all cursor-pointer"
          style={{
            opacity: hovered ? 1 : 0,
            pointerEvents: hovered ? "auto" : "none",
          }}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = {
  card: CardNode as NodeTypes["card"],
  diamond: DiamondNode,
  sticky: StickyNoteNode as NodeTypes["sticky"],
};

export interface TraditionalWorkflowMeta {
  id: number;
  title: string;
  category?: string | null;
  color: string;
}

interface TraditionalFlowCanvasProps {
  workflows: TraditionalWorkflowMeta[];
  selectedWorkflowId: number | null;
  selectedWorkflowMeta: TraditionalWorkflowMeta | null;
  externalNodes: TraditionalFlowNode[];
  externalEdges: TraditionalFlowEdge[];
  syncRevision: number;
  selectedStageId: string | null;
  canEdit: boolean;
  onSelectWorkflow: (id: number) => void;
  onCreateWorkflow: () => void;
  onEditWorkflow: () => void;
  onDeleteWorkflow: () => void;
  onOpenBusinessOperations: () => void;
  onOpenAutomations: () => void;
  onSelectNode: (nodeId: string | null) => void;
  onSyncBack: (nodes: TraditionalFlowNode[], edges: TraditionalFlowEdge[]) => void;
}

/**
 * Preserved Traditional React Flow Workflow Designer.
 * Keeps the complete original left workflow list sidebar, toolbar, node types, and canvas intact,
 * while staying live-synchronized with Monorail through shared state.
 */
export function TraditionalFlowCanvas({
  workflows,
  selectedWorkflowId,
  selectedWorkflowMeta,
  externalNodes,
  externalEdges,
  syncRevision,
  selectedStageId,
  canEdit,
  onSelectWorkflow,
  onCreateWorkflow,
  onEditWorkflow,
  onDeleteWorkflow,
  onOpenBusinessOperations,
  onOpenAutomations,
  onSelectNode,
  onSyncBack,
}: TraditionalFlowCanvasProps) {
  const rfInstanceRef = useRef<ReactFlowInstance<any, any> | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(
    externalNodes as unknown as Node[]
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    externalEdges as unknown as Edge[]
  );

  // Hydrate React Flow whenever workflow switches or Monorail syncs changes in, and auto-fit all cards into view!
  useEffect(() => {
    setNodes(
      externalNodes.map((n) => ({
        ...n,
        selected: selectedStageId ? n.id === selectedStageId : Boolean(n.selected),
      })) as unknown as Node[]
    );
    setEdges(externalEdges as unknown as Edge[]);

    if (externalNodes.length > 0) {
      const timer = setTimeout(() => {
        try {
          rfInstanceRef.current?.fitView({ padding: 0.18, duration: 220 });
        } catch {}
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [selectedWorkflowId, syncRevision, externalNodes, externalEdges]);

  const [nodeDialog, setNodeDialog] = useState<{
    open: boolean;
    nodeId: string | null;
    label: string;
    notes: string;
    color: string;
    type: string;
    nodePosition: { x: number; y: number };
  }>({
    open: false,
    nodeId: null,
    label: "",
    notes: "",
    color: "#3b82f6",
    type: "card",
    nodePosition: { x: 200, y: 100 },
  });

  const emitSync = useCallback(
    (nextNodes: Node[], nextEdges: Edge[]) => {
      const cleanNodes: TraditionalFlowNode[] = nextNodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: {
          ...(n.data as any),
          label: String((n.data as any)?.label ?? ""),
          color: String((n.data as any)?.color ?? "#3b82f6"),
          onAddBelow: undefined,
          isAdmin: undefined,
        },
      }));
      const cleanEdges: TraditionalFlowEdge[] = nextEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: typeof e.label === "string" ? e.label : undefined,
        animated: e.animated,
        style: e.style as Record<string, any> | undefined,
      }));
      onSyncBack(cleanNodes, cleanEdges);
    },
    [onSyncBack]
  );

  const handleAddBelowFromNode = useCallback(
    (sourceNodeId: string) => {
      setNodes((nds) => {
        const sourceNode = nds.find((n) => n.id === sourceNodeId);
        if (!sourceNode) return nds;
        const newId = `node-${Date.now()}`;
        const newNode: Node = {
          id: newId,
          type: "card",
          position: { x: sourceNode.position.x, y: sourceNode.position.y + 160 },
          data: {
            label: "Step",
            notes: "",
            color: (sourceNode.data as CardData).color ?? "#3b82f6",
          },
        };
        const newEdge: Edge = {
          id: `edge-${Date.now()}`,
          source: sourceNodeId,
          target: newId,
          animated: true,
          style: { stroke: "#64748b", strokeWidth: 2 },
        };
        const updatedNodes = [...nds, newNode];
        setEdges((eds) => {
          const updatedEdges = [...eds, newEdge];
          emitSync(updatedNodes, updatedEdges);
          return updatedEdges;
        });
        return updatedNodes;
      });
      toast.success("Card added below");
    },
    [setNodes, setEdges, emitSync]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const newEdges = addEdge(
          { ...connection, animated: true, style: { stroke: "#64748b", strokeWidth: 2 } },
          eds
        );
        emitSync(nodes, newEdges);
        return newEdges;
      });
    },
    [setEdges, nodes, emitSync]
  );

  const addNode = (type: "card" | "diamond" | "sticky") => {
    const id = `node-${Date.now()}`;
    const color = type === "sticky" ? "#f59e0b" : type === "diamond" ? "#ef4444" : "#3b82f6";
    const newNode: Node = {
      id,
      type,
      position: { x: 200 + Math.random() * 100, y: 100 + Math.random() * 100 },
      data: {
        label: type === "diamond" ? "Decision?" : type === "sticky" ? "Note..." : "Step",
        notes: "",
        color,
      },
    };
    setNodes((nds) => {
      const updated = [...nds, newNode];
      emitSync(updated, edges);
      return updated;
    });
  };

  const deleteSelected = () => {
    setNodes((nds) => {
      const updated = nds.filter((n) => !n.selected);
      setEdges((eds) => {
        const updatedEdges = eds.filter((e) => !e.selected);
        emitSync(updated, updatedEdges);
        return updatedEdges;
      });
      return updated;
    });
  };

  const saveNodeEdit = () => {
    setNodes((nds) => {
      const updated = nds.map((n) =>
        n.id === nodeDialog.nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                label: nodeDialog.label,
                notes: nodeDialog.notes,
                color: nodeDialog.color,
              },
            }
          : n
      );
      emitSync(updated, edges);
      return updated;
    });
    setNodeDialog((d) => ({ ...d, open: false }));
  };

  const addCardBelowDialog = () => {
    if (!nodeDialog.nodeId) return;
    handleAddBelowFromNode(nodeDialog.nodeId);
    setNodeDialog((d) => ({ ...d, open: false }));
  };

  const nodesWithCallbacks = nodes.map((n) => ({
    ...n,
    data: {
      ...n.data,
      onAddBelow: handleAddBelowFromNode,
      isAdmin: canEdit,
    },
  }));

  return (
    <div
      data-testid="traditional-workflow-canvas"
      className="flex w-full h-full overflow-hidden bg-[#000820]"
    >
      {/* ── Restored Left Workflow List Panel (Original Traditional Setup) ── */}
      <div className="w-60 sm:w-64 flex-shrink-0 border-r border-[#182C54] bg-[#040D24] flex flex-col">
        <div className="p-3 border-b border-[#182C54] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-emerald-400" />
              <span className="font-bold text-xs tracking-tight text-[#FFF4D4]">
                Saved Workflows ({workflows.length})
              </span>
            </div>
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[11px] gap-1 bg-[#081736] border-[#243B64] text-[#E5C784] hover:bg-[#112652] cursor-pointer"
                onClick={onCreateWorkflow}
              >
                <Plus className="h-3 w-3" /> New
              </Button>
            )}
          </div>
          <button
            type="button"
            onClick={onOpenBusinessOperations}
            className="flex items-center gap-1.5 text-[11px] text-[#9FB2CE] hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Business Operations</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {workflows.length === 0 && (
            <div className="text-center py-8">
              <p className="text-xs text-[#9FB2CE]">No workflows yet.</p>
              {canEdit && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={onCreateWorkflow}
                  className="text-xs mt-1 text-[#E5C784]"
                >
                  Create one
                </Button>
              )}
            </div>
          )}
          {workflows.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => onSelectWorkflow(w.id)}
              className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors flex items-center gap-2 cursor-pointer ${
                selectedWorkflowId === w.id
                  ? "bg-[#11264F] text-[#FFF4D4] border border-[#C9A55A]/55 font-semibold"
                  : "text-[#C8D7EC] hover:bg-[#091838] border border-transparent"
              }`}
            >
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: w.color || "#3b82f6" }}
              />
              <div className="min-w-0">
                <p className="truncate text-xs">{w.title}</p>
                {w.category && (
                  <p className="truncate text-[10px] text-[#8FA4C2]">{w.category}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Right Traditional Canvas Column ── */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Preserved Process-Mapping Notice Banner & Direct Link to PG-013 */}
        <div className="bg-[#07162B] border-b border-[#3A2C18] px-4 py-2 flex items-center justify-between gap-3 flex-wrap shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold uppercase tracking-wider shrink-0">
              Traditional Canvas
            </Badge>
            <p className="text-xs text-[#D8C7A5] truncate">
              <strong>{selectedWorkflowMeta?.title || "Workflow"}</strong> · {nodes.length} node(s), {edges.length} connection(s) — edits sync automatically with Monorail.
            </p>
          </div>
          <Button
            size="sm"
            onClick={onOpenAutomations}
            className="h-7 px-3 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 hover:opacity-95 shrink-0 cursor-pointer"
          >
            Open Real Automation Maker (PG-013) →
          </Button>
        </div>

        {/* Preserved Traditional Node Toolbar */}
        {canEdit && (
          <div className="px-4 py-2 border-b border-[#182C54] bg-[#040E27] flex items-center gap-1.5 flex-wrap shrink-0">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: selectedWorkflowMeta?.color || "#3b82f6" }}
              />
              <span className="font-semibold text-xs sm:text-sm text-white truncate">
                {selectedWorkflowMeta?.title}
              </span>
              {selectedWorkflowMeta?.category && (
                <Badge variant="outline" className="text-[10px] border-[#243B64] text-[#C8D7EC]">
                  {selectedWorkflowMeta.category}
                </Badge>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs bg-[#081736] border-[#243B64] text-[#DCE6F5] hover:bg-[#112652] hover:text-white cursor-pointer"
              onClick={() => addNode("card")}
            >
              <Square className="h-3 w-3" /> Card
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs bg-[#081736] border-[#243B64] text-[#DCE6F5] hover:bg-[#112652] hover:text-white cursor-pointer"
              onClick={() => addNode("diamond")}
            >
              <Diamond className="h-3 w-3" /> Decision
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs bg-[#081736] border-[#243B64] text-[#DCE6F5] hover:bg-[#112652] hover:text-white cursor-pointer"
              onClick={() => addNode("sticky")}
            >
              <StickyNote className="h-3 w-3" /> Note
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs bg-[#081736] border-rose-500/40 text-rose-300 hover:bg-rose-950/60 cursor-pointer"
              onClick={deleteSelected}
            >
              <Trash2 className="h-3 w-3" /> Delete
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs bg-[#081736] border-[#243B64] text-[#DCE6F5] hover:bg-[#112652] cursor-pointer"
              onClick={onEditWorkflow}
            >
              <Pencil className="h-3 w-3" /> Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs bg-[#081736] border-rose-500/40 text-rose-300 hover:bg-rose-950/60 cursor-pointer"
              onClick={onDeleteWorkflow}
            >
              <Trash2 className="h-3 w-3" /> Delete Workflow
            </Button>
          </div>
        )}

        {/* Preserved React Flow Canvas */}
        <div className="flex-1 min-h-0 w-full relative">
          <ReactFlow
            key={`rf-${selectedWorkflowId ?? "none"}`}
            nodes={nodesWithCallbacks}
            edges={edges}
            onInit={(instance) => {
              rfInstanceRef.current = instance;
              if (externalNodes.length > 0) {
                setTimeout(() => {
                  try {
                    instance.fitView({ padding: 0.18, duration: 200 });
                  } catch {}
                }, 40);
              }
            }}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStop={() => {
              if (canEdit) emitSync(nodes, edges);
            }}
            onNodesDelete={(deleted) => {
              if (!canEdit) return;
              const delIds = new Set(deleted.map((d) => d.id));
              const remainingNodes = nodes.filter((n) => !delIds.has(n.id));
              const remainingEdges = edges.filter(
                (e) => !delIds.has(e.source) && !delIds.has(e.target)
              );
              emitSync(remainingNodes, remainingEdges);
            }}
            onEdgesDelete={(deleted) => {
              if (!canEdit) return;
              const delIds = new Set(deleted.map((d) => d.id));
              const remainingEdges = edges.filter((e) => !delIds.has(e.id));
              emitSync(nodes, remainingEdges);
            }}
            onConnect={onConnect}
            onNodeClick={(_, node) => onSelectNode(node.id)}
            onPaneClick={() => onSelectNode(null)}
            onNodeDoubleClick={(_, node) => {
              if (!canEdit) return;
              const d = node.data as CardData;
              setNodeDialog({
                open: true,
                nodeId: node.id,
                label: d.label,
                notes: d.notes ?? "",
                color: d.color || "#3b82f6",
                type: node.type ?? "card",
                nodePosition: node.position,
              });
            }}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.18 }}
            nodesDraggable={canEdit}
            nodesConnectable={canEdit}
            elementsSelectable={true}
            deleteKeyCode={canEdit ? "Delete" : null}
            className="bg-[#020B24]"
          >
            <Background gap={18} color="#1E355E" />
            <Controls />
            {!canEdit && (
              <Panel position="top-right">
                <Badge variant="secondary" className="text-xs">
                  Read-only view
                </Badge>
              </Panel>
            )}
            {canEdit && nodes.length === 0 && (
              <Panel position="top-center">
                <p className="text-xs text-[#C8D7EC] bg-[#06122E]/90 px-3 py-1.5 rounded-full border border-[#243B64] shadow-sm">
                  Add nodes using the toolbar above, then drag to connect them
                </p>
              </Panel>
            )}
          </ReactFlow>
        </div>
      </div>

      {/* Node Edit Dialog (Preserved from original Traditional Designer) */}
      <Dialog open={nodeDialog.open} onOpenChange={(o) => setNodeDialog((d) => ({ ...d, open: o }))}>
        <DialogContent className="max-w-sm bg-[#06122E] border-[#C9A55A]/50 text-white">
          <DialogHeader>
            <DialogTitle className="text-[#FFF4D4]">Edit Node</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block text-[#C8D7EC]">Label</label>
              <VoiceInput
                value={nodeDialog.label}
                onChange={(e) => setNodeDialog((d) => ({ ...d, label: e.target.value }))}
                placeholder="Node label"
              />
            </div>
            {nodeDialog.type !== "diamond" && (
              <div>
                <label className="text-sm font-medium mb-1 block text-[#C8D7EC]">
                  Notes / details
                </label>
                <VoiceTextarea
                  value={nodeDialog.notes}
                  onChange={(e) => setNodeDialog((d) => ({ ...d, notes: e.target.value }))}
                  placeholder="Optional notes shown below the label"
                  rows={2}
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-2 block text-[#C8D7EC]">Color</label>
              <div className="flex gap-2 flex-wrap">
                {NODE_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer ${
                      nodeDialog.color === c.value ? "border-white scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c.value }}
                    onClick={() => setNodeDialog((d) => ({ ...d, color: c.value }))}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {nodeDialog.type !== "diamond" && (
              <Button
                type="button"
                variant="outline"
                className="gap-1.5 text-xs sm:mr-auto"
                onClick={addCardBelowDialog}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Add Card Below
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setNodeDialog((d) => ({ ...d, open: false }))}
            >
              Cancel
            </Button>
            <Button onClick={saveNodeEdit}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

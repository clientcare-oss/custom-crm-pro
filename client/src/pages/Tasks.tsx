import { trpc } from "@/lib/trpc";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Trash2,
  ExternalLink,
  Link2,
  User,
  FolderOpen,
  Calendar,
  CheckCircle2,
  Circle,
  X,
  BookOpen,
  Paperclip,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

// ─── Types ────────────────────────────────────────────────────────────────────
type Resource = { id: number; label: string; url: string };
type Subtask = {
  id: number;
  taskId: number;
  title: string;
  isComplete: boolean;
  assigneeId: number | null;
  assigneeName: string | null;
  dueDate: Date | null;
  resources: Resource[];
  sortOrder: number;
};
type Task = {
  id: number;
  title: string;
  description: string | null;
  status: "not_started" | "in_progress" | "stuck" | "complete";
  projectId: number | null;
  projectName: string | null;
  assigneeId: number | null;
  assigneeName: string | null;
  dueDate: Date | null;
  resources: Resource[];
  subtasks: Subtask[];
  createdBy: number;
  createdAt: Date;
  linkedFileId: number | null;
  linkedFileName: string | null;
  linkedFileUrl: string | null;
  linkedStudentId: number | null;
  linkedStudentName: string | null;
};

type StudentWithFiles = {
  id: number;
  name: string;
  files: { id: number; fileName: string; fileUrl: string; uploadedAt: Date }[];
};

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  not_started: { label: "Not Started", color: "bg-gray-100 text-gray-600 border-gray-200" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700 border-blue-200" },
  stuck: { label: "Stuck", color: "bg-red-100 text-red-700 border-red-200" },
  complete: { label: "Complete", color: "bg-green-100 text-green-700 border-green-200" },
};

// ─── Confetti burst ───────────────────────────────────────────────────────────
function fireConfetti() {
  const end = Date.now() + 1200;
  const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"];
  (function frame() {
    confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

// ─── Format datetime ──────────────────────────────────────────────────────────
function formatDateTime(d: Date | null | undefined): string {
  if (!d) return "";
  const dt = new Date(d);
  // Check if time is midnight (date-only)
  if (dt.getHours() === 0 && dt.getMinutes() === 0) {
    return dt.toLocaleDateString();
  }
  return dt.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

// ─── Resource panel ───────────────────────────────────────────────────────────
function ResourcePanel({
  resources,
  onAdd,
  onRemove,
}: {
  resources: Resource[];
  onAdd: (label: string, url: string) => void;
  onRemove: (id: number) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  function handleAdd() {
    if (label.trim() && url.trim()) {
      onAdd(label.trim(), url.trim());
      setLabel(""); setUrl(""); setAdding(false);
    }
  }
  return (
    <div className="mt-1">
      <div className="flex items-center gap-1 mb-1">
        <span className="text-xs font-medium text-muted-foreground">Resources</span>
        <button
          onClick={() => setAdding(!adding)}
          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>
      {resources.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1">
          {resources.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded px-2 py-0.5 text-xs"
            >
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                {r.label}
              </a>
              <button
                onClick={() => onRemove(r.id)}
                className="text-gray-400 hover:text-red-500 ml-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {adding && (
        <div className="flex gap-1.5 items-center mt-1 flex-wrap">
          <Input
            placeholder="Label (e.g. Loom video)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="h-7 text-xs w-40"
          />
          <Input
            placeholder="URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-7 text-xs flex-1 min-w-[160px]"
          />
          <Button size="sm" onClick={handleAdd} className="h-7 px-2 text-xs">
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAdding(false)} className="h-7 px-2 text-xs">
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Subtask row ──────────────────────────────────────────────────────────────
function SubtaskRow({
  subtask,
  onToggle,
  onDelete,
  onAddResource,
  onRemoveResource,
}: {
  subtask: Subtask;
  onToggle: (id: number, val: boolean) => void;
  onDelete: (id: number) => void;
  onAddResource: (subtaskId: number, label: string, url: string) => void;
  onRemoveResource: (subtaskId: number, resourceId: number) => void;
}) {
  const [showResources, setShowResources] = useState(false);
  return (
    <div className="pl-8 py-2 border-b border-gray-50 last:border-0 group">
      <div className="flex items-start gap-2">
        <button
          onClick={() => onToggle(subtask.id, !subtask.isComplete)}
          className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-green-600 transition-colors"
        >
          {subtask.isComplete ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <Circle className="h-4 w-4" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <span className={`text-sm ${subtask.isComplete ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {subtask.title}
          </span>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {subtask.assigneeName && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />{subtask.assigneeName}
              </span>
            )}
            {subtask.dueDate && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />{formatDateTime(subtask.dueDate)}
              </span>
            )}
            <button
              onClick={() => setShowResources(!showResources)}
              className={`text-xs flex items-center gap-0.5 transition-colors ${
                subtask.resources.length > 0
                  ? "text-blue-600"
                  : "text-muted-foreground opacity-0 group-hover:opacity-100"
              }`}
            >
              <BookOpen className="h-3 w-3" />
              {subtask.resources.length > 0 ? `${subtask.resources.length} resource${subtask.resources.length !== 1 ? "s" : ""}` : "Resources"}
            </button>
          </div>
          {showResources && (
            <ResourcePanel
              resources={subtask.resources}
              onAdd={(l, u) => onAddResource(subtask.id, l, u)}
              onRemove={(rid) => onRemoveResource(subtask.id, rid)}
            />
          )}
        </div>
        <button
          onClick={() => onDelete(subtask.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 flex-shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Task row ─────────────────────────────────────────────────────────────────
function TaskRow({
  task,
  users,
  projects,
}: {
  task: Task;
  users: { id: number; name: string }[];
  projects: { id: number; name: string }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskDue, setNewSubtaskDue] = useState("");
  const [showResources, setShowResources] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const prevComplete = useRef(false);
  const utils = trpc.useUtils();
  const subtaskCount = task.subtasks.length;
  const done = task.subtasks.filter((s) => s.isComplete).length;
  const progress = subtaskCount > 0 ? Math.round((done / subtaskCount) * 100) : 0;
  const isComplete = task.status === "complete";
  const statusCfg = STATUS_CONFIG[task.status];

  useEffect(() => {
    if (isComplete && !prevComplete.current && subtaskCount > 0) {
      fireConfetti();
    }
    prevComplete.current = isComplete;
  }, [isComplete, subtaskCount]);

  const toggleSubtask = trpc.internalTasks.toggleSubtask.useMutation({
    onSuccess: (_data, vars) => {
      utils.internalTasks.list.invalidate().then(() => {
        const updatedSubtasks = task.subtasks.map((s) =>
          s.id === vars.subtaskId ? { ...s, isComplete: vars.isComplete } : s
        );
        const allDone = updatedSubtasks.length > 0 && updatedSubtasks.every((s) => s.isComplete);
        if (allDone && !isComplete) {
          updateStatus.mutate({ id: task.id, status: "complete" });
        }
      });
    },
  });
  const addSubtask = trpc.internalTasks.addSubtask.useMutation({
    onSuccess: () => {
      utils.internalTasks.list.invalidate();
      setNewSubtaskTitle("");
      setNewSubtaskDue("");
      setAddingSubtask(false);
    },
  });
  const deleteSubtask = trpc.internalTasks.deleteSubtask.useMutation({
    onSuccess: () => utils.internalTasks.list.invalidate(),
  });
  const deleteTask = trpc.internalTasks.delete.useMutation({
    onSuccess: () => {
      utils.internalTasks.list.invalidate();
      toast("Task deleted");
    },
  });
  const updateStatus = trpc.internalTasks.update.useMutation({
    onSuccess: () => utils.internalTasks.list.invalidate(),
  });
  const addResource = trpc.internalTasks.addResource.useMutation({
    onSuccess: () => utils.internalTasks.list.invalidate(),
  });
  const removeResource = trpc.internalTasks.removeResource.useMutation({
    onSuccess: () => utils.internalTasks.list.invalidate(),
  });
  const addSubtaskResource = trpc.internalTasks.addSubtaskResource.useMutation({
    onSuccess: () => utils.internalTasks.list.invalidate(),
  });
  const removeSubtaskResource = trpc.internalTasks.removeSubtaskResource.useMutation({
    onSuccess: () => utils.internalTasks.list.invalidate(),
  });

  return (
    <div className={`border rounded-lg mb-3 overflow-hidden transition-all ${isComplete ? "border-green-200 bg-green-50/30" : "border-border bg-card"}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-medium text-sm ${isComplete ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {task.title}
            </span>
            {task.projectName && (
              <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded px-1.5 py-0.5 flex items-center gap-1">
                <FolderOpen className="h-3 w-3" />{task.projectName}
              </span>
            )}
            {task.assigneeName && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />{task.assigneeName}
              </span>
            )}
            {task.dueDate && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />{formatDateTime(task.dueDate)}
              </span>
            )}
            {task.linkedFileName && (
              <a
                href={task.linkedFileUrl ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5 flex items-center gap-1 hover:bg-amber-100 transition-colors"
                title={task.linkedStudentName ? `${task.linkedStudentName} — ${task.linkedFileName}` : task.linkedFileName}
              >
                <FileText className="h-3 w-3" />
                {task.linkedStudentName ? `${task.linkedStudentName}: ` : ""}{task.linkedFileName}
              </a>
            )}
          </div>
          {subtaskCount > 0 && (
            <div className="flex items-center gap-2 mt-1.5">
              <Progress
                value={progress}
                className={`h-1.5 flex-1 max-w-[200px] transition-all duration-700 ${progress === 100 ? "[&>div]:bg-green-500" : "[&>div]:bg-blue-500"}`}
              />
              <span className="text-xs text-muted-foreground">{done}/{subtaskCount}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {editingStatus ? (
            <Select
              value={task.status}
              onValueChange={(val) => {
                updateStatus.mutate({ id: task.id, status: val as Task["status"] });
                setEditingStatus(false);
              }}
            >
              <SelectTrigger className="h-7 text-xs w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <button onClick={() => setEditingStatus(true)}>
              <Badge variant="outline" className={`text-xs cursor-pointer hover:opacity-80 ${statusCfg.color}`}>
                {statusCfg.label}
              </Badge>
            </button>
          )}
          <button
            onClick={() => { setExpanded(true); setShowResources(!showResources); }}
            className={`text-muted-foreground hover:text-blue-600 transition-colors ${task.resources.length > 0 ? "text-blue-500" : ""}`}
            title="Resources"
          >
            <Link2 className="h-4 w-4" />
          </button>
          <button onClick={() => deleteTask.mutate({ id: task.id })} className="text-muted-foreground hover:text-red-500 transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      {/* Expanded */}
      {expanded && (
        <div className="border-t border-border">
          {task.description && (
            <div className="px-10 py-2 text-sm text-muted-foreground bg-muted/20">{task.description}</div>
          )}
          {showResources && (
            <div className="px-10 py-2 bg-blue-50/50 border-b border-blue-100">
              <ResourcePanel
                resources={task.resources}
                onAdd={(l, u) => addResource.mutate({ taskId: task.id, label: l, url: u })}
                onRemove={(rid) => removeResource.mutate({ taskId: task.id, resourceId: rid })}
              />
            </div>
          )}
          <div>
            {task.subtasks.map((subtask) => (
              <SubtaskRow
                key={subtask.id}
                subtask={subtask}
                onToggle={(id, val) => toggleSubtask.mutate({ subtaskId: id, isComplete: val })}
                onDelete={(id) => deleteSubtask.mutate({ subtaskId: id })}
                onAddResource={(sid, l, u) => addSubtaskResource.mutate({ subtaskId: sid, label: l, url: u })}
                onRemoveResource={(sid, rid) => removeSubtaskResource.mutate({ subtaskId: sid, resourceId: rid })}
              />
            ))}
          </div>
          <div className="px-8 py-2">
            {addingSubtask ? (
              <div className="flex flex-wrap gap-2 items-center">
                <Input
                  autoFocus
                  placeholder="Subtask title..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newSubtaskTitle.trim()) {
                      addSubtask.mutate({ taskId: task.id, title: newSubtaskTitle.trim(), dueDate: newSubtaskDue || undefined });
                    }
                    if (e.key === "Escape") setAddingSubtask(false);
                  }}
                  className="h-7 text-sm flex-1 min-w-[160px]"
                />
                <input
                  type="datetime-local"
                  value={newSubtaskDue}
                  onChange={(e) => setNewSubtaskDue(e.target.value)}
                  className="h-7 text-xs border border-input rounded-md px-2 bg-background text-foreground"
                  placeholder="Due date & time"
                />
                <Button size="sm" onClick={() => { if (newSubtaskTitle.trim()) addSubtask.mutate({ taskId: task.id, title: newSubtaskTitle.trim(), dueDate: newSubtaskDue || undefined }); }} className="h-7 px-3 text-xs">
                  Add
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setAddingSubtask(false); setNewSubtaskDue(""); }} className="h-7 px-2 text-xs">
                  Cancel
                </Button>
              </div>
            ) : (
              <button onClick={() => setAddingSubtask(true)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 py-1">
                <Plus className="h-3.5 w-3.5" />Add subtask
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Student Task Row ───────────────────────────────────────────────────────
type StudentTask = {
  id: number;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  dueDate: Date | null;
  clientName: string | null;
  projectName: string | null;
  steps: { id: number; taskId: number; title: string; isComplete: boolean; sortOrder: number }[];
};

const STUDENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  Todo: { label: "Todo", color: "bg-gray-100 text-gray-600 border-gray-200" },
  "In Progress": { label: "In Progress", color: "bg-blue-100 text-blue-700 border-blue-200" },
  Done: { label: "Done", color: "bg-green-100 text-green-700 border-green-200" },
};

function StudentTaskRow({ task }: { task: StudentTask }) {
  const [expanded, setExpanded] = useState(false);
  const [addingStep, setAddingStep] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState("");
  const [editingStatus, setEditingStatus] = useState(false);
  const prevDone = useRef(false);
  const utils = trpc.useUtils();

  const stepCount = task.steps?.length ?? 0;
  const doneCount = (task.steps ?? []).filter((s) => s.isComplete).length;
  const progress = stepCount > 0 ? Math.round((doneCount / stepCount) * 100) : 0;
  const isDone = (task.status ?? "Todo") === "Done";
  const statusCfg = STUDENT_STATUS_CONFIG[task.status ?? "Todo"] ?? STUDENT_STATUS_CONFIG["Todo"];

  useEffect(() => {
    if (isDone && !prevDone.current && stepCount > 0) fireConfetti();
    prevDone.current = isDone;
  }, [isDone, stepCount]);

  const updateTask = trpc.tasks.update.useMutation({ onSuccess: () => utils.tasks.getAll.invalidate() });
  const deleteTask = trpc.tasks.delete.useMutation({
    onSuccess: () => { utils.tasks.getAll.invalidate(); toast("Task deleted"); },
  });
  const addStep = trpc.tasks.addStep.useMutation({
    onSuccess: () => { utils.tasks.getAll.invalidate(); setNewStepTitle(""); setAddingStep(false); },
  });
  const toggleStep = trpc.tasks.toggleStep.useMutation({
    onSuccess: (_data, vars) => {
      utils.tasks.getAll.invalidate().then(() => {
        // After invalidation, check if all steps are now complete
        const updatedSteps = (task.steps ?? []).map((s) =>
          s.id === vars.stepId ? { ...s, isComplete: vars.isComplete } : s
        );
        const allDone = updatedSteps.length > 0 && updatedSteps.every((s) => s.isComplete);
        if (allDone && !isDone) {
          updateTask.mutate({ id: task.id, status: "Done" });
        }
      });
    },
  });
  const deleteStep = trpc.tasks.deleteStep.useMutation({ onSuccess: () => utils.tasks.getAll.invalidate() });
  return (
    <div className={`border rounded-lg mb-3 overflow-hidden transition-all ${
      isDone ? "border-green-200 bg-green-50/30" : "border-border bg-card"
    }`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <button
          onClick={() => updateTask.mutate({ id: task.id, status: isDone ? "In Progress" : "Done" })}
          className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
        >
          {isDone ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Circle className="h-4 w-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-medium text-sm ${
              isDone ? "line-through text-muted-foreground" : "text-foreground"
            }`}>{task.title}</span>
            {task.clientName && (
              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5 flex items-center gap-1">
                <User className="h-3 w-3" />{task.clientName}
              </span>
            )}
            {task.dueDate && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />{formatDateTime(task.dueDate)}
              </span>
            )}
            {task.priority && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                task.priority === "High" ? "bg-red-100 text-red-700" :
                task.priority === "Medium" ? "bg-amber-100 text-amber-700" :
                "bg-muted text-muted-foreground"
              }`}>{task.priority}</span>
            )}
          </div>
          {stepCount > 0 && (
            <div className="flex items-center gap-2 mt-1.5">
              <Progress
                value={progress}
                className={`h-1.5 flex-1 max-w-[200px] transition-all duration-700 ${
                  progress === 100 ? "[&>div]:bg-green-500" : "[&>div]:bg-blue-500"
                }`}
              />
              <span className="text-xs text-muted-foreground">{doneCount}/{stepCount}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {editingStatus ? (
            <Select
              value={task.status ?? "Todo"}
              onValueChange={(val) => { updateTask.mutate({ id: task.id, status: val as any }); setEditingStatus(false); }}
            >
              <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STUDENT_STATUS_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <button onClick={() => setEditingStatus(true)}>
              <Badge variant="outline" className={`text-xs cursor-pointer hover:opacity-80 ${statusCfg.color}`}>
                {statusCfg.label}
              </Badge>
            </button>
          )}
          <button onClick={() => deleteTask.mutate({ id: task.id })} className="text-muted-foreground hover:text-red-500 transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-border">
          {task.description && (
            <div className="px-10 py-2 text-sm text-muted-foreground bg-muted/20">{task.description}</div>
          )}
          <div>
            {(task.steps ?? []).map((step) => (
              <div key={step.id} className="flex items-center gap-3 px-10 py-2 border-b border-border/50 last:border-0 hover:bg-muted/20 group">
                <button
                  onClick={() => toggleStep.mutate({ stepId: step.id, isComplete: !step.isComplete })}
                  className="shrink-0 text-muted-foreground hover:text-primary"
                >
                  {step.isComplete ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Circle className="h-3.5 w-3.5" />}
                </button>
                <span className={`text-sm flex-1 ${
                  step.isComplete ? "line-through text-muted-foreground" : "text-foreground"
                }`}>{step.title}</span>
                <button
                  onClick={() => deleteStep.mutate({ stepId: step.id })}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="px-8 py-2">
            {addingStep ? (
              <div className="flex gap-2 items-center">
                <Input
                  autoFocus
                  placeholder="Step title..."
                  value={newStepTitle}
                  onChange={(e) => setNewStepTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newStepTitle.trim()) addStep.mutate({ taskId: task.id, title: newStepTitle.trim() });
                    if (e.key === "Escape") setAddingStep(false);
                  }}
                  className="h-7 text-sm flex-1"
                />
                <Button size="sm" onClick={() => { if (newStepTitle.trim()) addStep.mutate({ taskId: task.id, title: newStepTitle.trim() }); }} className="h-7 px-3 text-xs">Add</Button>
                <Button size="sm" variant="ghost" onClick={() => setAddingStep(false)} className="h-7 px-2 text-xs">Cancel</Button>
              </div>
            ) : (
              <button onClick={() => setAddingStep(true)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 py-1">
                <Plus className="h-3.5 w-3.5" />Add step
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Create task dialog ───────────────────────────────────────────────────────
function CreateTaskDialog({
  open,
  onClose,
  users,
  projects,
  studentsWithFiles,
}: {
  open: boolean;
  onClose: () => void;
  users: { id: number; name: string }[];
  projects: { id: number; name: string }[];
  studentsWithFiles: StudentWithFiles[];
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<Task["status"]>("not_started");
  // File picker state
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedFileId, setSelectedFileId] = useState<string>("");
  const utils = trpc.useUtils();

  const selectedStudent = studentsWithFiles.find(s => String(s.id) === selectedStudentId);
  const selectedFile = selectedStudent?.files.find(f => String(f.id) === selectedFileId);

  const createTask = trpc.internalTasks.create.useMutation({
    onSuccess: () => {
      utils.internalTasks.list.invalidate();
      toast("Task created");
      setTitle(""); setDescription(""); setAssigneeId(""); setProjectId("");
      setDueDate(""); setStatus("not_started");
      setSelectedStudentId(""); setSelectedFileId("");
      onClose();
    },
  });

  function handleCreate() {
    if (!title.trim()) return;
    createTask.mutate({
      title: title.trim(),
      description: description || undefined,
      assigneeId: assigneeId ? Number(assigneeId) : undefined,
      projectId: projectId ? Number(projectId) : undefined,
      dueDate: dueDate || undefined,
      status,
      linkedFileId: selectedFile ? selectedFile.id : undefined,
      linkedFileName: selectedFile ? selectedFile.fileName : undefined,
      linkedFileUrl: selectedFile ? selectedFile.fileUrl : undefined,
      linkedStudentId: selectedStudent ? selectedStudent.id : undefined,
      linkedStudentName: selectedStudent ? selectedStudent.name : undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs">Title *</Label>
            <Input autoFocus placeholder="Task title..." value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea placeholder="Optional description..." value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 resize-none" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Assign to</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Due Date & Time</Label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 w-full h-9 border border-input rounded-md px-3 text-sm bg-background text-foreground"
              />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Task["status"])}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Student file attachment */}
          <div className="border border-dashed border-border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs text-muted-foreground">Attach Student File (optional)</Label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Student</Label>
                <Select value={selectedStudentId} onValueChange={(v) => { setSelectedStudentId(v); setSelectedFileId(""); }}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>
                    {studentsWithFiles.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)} className="text-xs">{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">File</Label>
                <Select
                  value={selectedFileId}
                  onValueChange={setSelectedFileId}
                  disabled={!selectedStudentId || !selectedStudent?.files.length}
                >
                  <SelectTrigger className="mt-1 h-8 text-xs">
                    <SelectValue placeholder={!selectedStudentId ? "Select student first" : selectedStudent?.files.length === 0 ? "No files" : "Select file"} />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedStudent?.files.map((f) => (
                      <SelectItem key={f.id} value={String(f.id)} className="text-xs">{f.fileName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {selectedFile && (
              <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                <FileText className="h-3 w-3" />
                <span className="truncate">{selectedFile.fileName}</span>
                <button onClick={() => { setSelectedFileId(""); setSelectedStudentId(""); }} className="ml-auto text-gray-400 hover:text-red-500">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!title.trim() || createTask.isPending}>
            {createTask.isPending ? "Creating..." : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Tasks page ──────────────────────────────────────────────────────────
export default function Tasks() {
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | Task["status"]>("all");
  const { user } = useAuth();
  const { data: tasks = [], isLoading } = trpc.internalTasks.list.useQuery({ status: statusFilter });
  const { data: projectsData = [] } = trpc.projects.list.useQuery();
  const { data: teamUsers = [] } = trpc.internalTasks.getTeamUsers.useQuery();
  const { data: studentsData = [] } = trpc.internalTasks.getStudentsWithFiles.useQuery();
  const users: { id: number; name: string }[] = (teamUsers as { id: number; name: string | null }[]).map(u => ({ id: u.id, name: u.name ?? "" }));
  const projects: { id: number; name: string }[] = (projectsData as any[]).map((p) => ({ id: p.id, name: p.name }));
  const studentsWithFiles: StudentWithFiles[] = (studentsData as any[]).map((s) => ({
    id: s.id,
    name: s.name,
    files: (s.files || []).map((f: any) => ({ id: f.id, fileName: f.fileName, fileUrl: f.fileUrl, uploadedAt: new Date(f.uploadedAt) })),
  }));
  // Student case tasks (from projectTasks table)
  const { data: studentTasks = [], isLoading: studentTasksLoading } = trpc.tasks.getAll.useQuery();
  const utils = trpc.useUtils();
  const totalTasks = tasks.length;
  const completedTasks = (tasks as Task[]).filter((t) => t.status === "complete").length;
  return (
    <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{completedTasks}/{totalTasks} tasks complete</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />New Task
          </Button>
        </div>
        {/* Status filter */}
        <div className="flex gap-1 mb-5 border-b border-border pb-3 flex-wrap">
          {(["all", "not_started", "in_progress", "stuck", "complete"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            >
              {s === "all" ? "All" : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
        {/* Task list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted/40 rounded-lg animate-pulse" />)}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-semibold text-foreground">No tasks yet</p>
            <p className="text-sm text-muted-foreground mt-1">Click "New Task" to create your first task.</p>
          </div>
        ) : (
          <div>
            {(tasks as Task[]).map((task) => (
              <TaskRow key={task.id} task={task} users={users} projects={projects} />
            ))}
          </div>
        )}
        {/* Student Case Tasks (parent-assigned) stub */}
        <div className="mt-8 border border-dashed border-border rounded-lg p-4 text-center">
          <p className="text-sm font-medium text-muted-foreground">Student Case Tasks</p>
          <p className="text-xs text-muted-foreground mt-1">Parent/client-assigned tasks will appear here — coming soon.</p>
        </div>
        {/* Student Case Tasks */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-semibold text-foreground">Student Case Tasks</h2>
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
              {(studentTasks as any[]).filter((t: any) => t.status !== "Done").length} open
            </span>
          </div>
          {studentTasksLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted/40 rounded-lg animate-pulse" />)}</div>
          ) : (studentTasks as any[]).length === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground">No student case tasks yet — create one from a student’s Contact Detail page.</p>
            </div>
          ) : (
            <div>
              {(studentTasks as StudentTask[]).map((t) => (
                <StudentTaskRow key={t.id} task={t} />
              ))}
            </div>
          )}
        </div>
      <CreateTaskDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        users={users}
        projects={projects}
        studentsWithFiles={studentsWithFiles}
      />
    </div>
  );
}

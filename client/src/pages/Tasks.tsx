import { trpc } from "@/lib/trpc";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
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

  const handleAdd = () => {
    if (!label.trim() || !url.trim()) return;
    onAdd(label.trim(), url.trim());
    setLabel("");
    setUrl("");
    setAdding(false);
  };

  return (
    <div className="mt-2">
      <div className="flex items-center gap-1 mb-1">
        <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Resources</span>
        <button
          onClick={() => setAdding(true)}
          className="ml-1 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
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
                <Calendar className="h-3 w-3" />{new Date(subtask.dueDate).toLocaleDateString()}
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
  const [showResources, setShowResources] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const prevComplete = useRef(false);
  const utils = trpc.useUtils();

  const total = task.subtasks.length;
  const done = task.subtasks.filter((s) => s.isComplete).length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const isComplete = task.status === "complete";

  useEffect(() => {
    if (isComplete && !prevComplete.current && total > 0) {
      fireConfetti();
    }
    prevComplete.current = isComplete;
  }, [isComplete, total]);

  const toggleSubtask = trpc.internalTasks.toggleSubtask.useMutation({
    onSuccess: () => utils.internalTasks.list.invalidate(),
  });
  const addSubtask = trpc.internalTasks.addSubtask.useMutation({
    onSuccess: () => {
      utils.internalTasks.list.invalidate();
      setNewSubtaskTitle("");
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

  const statusCfg = STATUS_CONFIG[task.status];

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
                <Calendar className="h-3 w-3" />{new Date(task.dueDate).toLocaleDateString()}
              </span>
            )}
          </div>
          {total > 0 && (
            <div className="flex items-center gap-2 mt-1.5">
              <Progress
                value={progress}
                className={`h-1.5 flex-1 max-w-[200px] transition-all duration-700 ${progress === 100 ? "[&>div]:bg-green-500" : "[&>div]:bg-blue-500"}`}
              />
              <span className="text-xs text-muted-foreground">{done}/{total}</span>
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
              <div className="flex gap-2 items-center">
                <Input
                  autoFocus
                  placeholder="Subtask title..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newSubtaskTitle.trim()) {
                      addSubtask.mutate({ taskId: task.id, title: newSubtaskTitle.trim() });
                    }
                    if (e.key === "Escape") setAddingSubtask(false);
                  }}
                  className="h-7 text-sm"
                />
                <Button size="sm" onClick={() => { if (newSubtaskTitle.trim()) addSubtask.mutate({ taskId: task.id, title: newSubtaskTitle.trim() }); }} className="h-7 px-3 text-xs">
                  Add
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAddingSubtask(false)} className="h-7 px-2 text-xs">
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

// ─── Create task dialog ───────────────────────────────────────────────────────
function CreateTaskDialog({
  open,
  onClose,
  users,
  projects,
}: {
  open: boolean;
  onClose: () => void;
  users: { id: number; name: string }[];
  projects: { id: number; name: string }[];
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<Task["status"]>("not_started");
  const utils = trpc.useUtils();
  const createTask = trpc.internalTasks.create.useMutation({
    onSuccess: () => {
      utils.internalTasks.list.invalidate();
      toast("Task created");
      setTitle(""); setDescription(""); setAssigneeId(""); setProjectId(""); setDueDate(""); setStatus("not_started");
      onClose();
    },
  });

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
              <Label className="text-xs">Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1" />
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => createTask.mutate({ title: title.trim(), description: description || undefined, assigneeId: assigneeId ? Number(assigneeId) : undefined, projectId: projectId ? Number(projectId) : undefined, dueDate: dueDate || undefined, status })} disabled={!title.trim() || createTask.isPending}>
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
  const users: { id: number; name: string }[] = (teamUsers as { id: number; name: string | null }[]).map(u => ({ id: u.id, name: u.name ?? "" }));
  const projects: { id: number; name: string }[] = (projectsData as any[]).map((p) => ({ id: p.id, name: p.name }));

  const totalTasks = tasks.length;
  const completedTasks = (tasks as Task[]).filter((t) => t.status === "complete").length;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
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

        {/* Client Tasks stub */}
        <div className="mt-8 border border-dashed border-border rounded-lg p-4 text-center">
          <p className="text-sm font-medium text-muted-foreground">Client Tasks</p>
          <p className="text-xs text-muted-foreground mt-1">Client-assigned tasks will appear here — coming soon.</p>
        </div>
      </div>

      <CreateTaskDialog open={createOpen} onClose={() => setCreateOpen(false)} users={users} projects={projects} />
    </DashboardLayout>
  );
}

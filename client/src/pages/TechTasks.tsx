import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  CheckSquare,
  Square,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  User,
  Calendar,
  Tag,
  Zap,
  Shield,
  Bug,
  Server,
  Wrench,
  Layers,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type TaskStatus = "Backlog" | "In Progress" | "In Review" | "Done" | "Stuck";
type TaskPriority = "High" | "Medium" | "Low";
type TaskCategory = "Implementation" | "Refinement" | "Compliance" | "Bug Fix" | "Infrastructure";

interface Subtask {
  id: number;
  taskId: number;
  title: string;
  isComplete: boolean;
  sortOrder: number;
  createdAt: Date;
}

interface TechTask {
  id: number;
  ownerId: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  assignee: string | null;
  dueDate: Date | null;
  resourceUrl: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  subtasks: Subtask[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_ORDER: TaskStatus[] = ["Backlog", "In Progress", "In Review", "Stuck", "Done"];

const STATUS_COLORS: Record<TaskStatus, string> = {
  Backlog: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  "In Progress": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "In Review": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  Done: "bg-green-500/20 text-green-300 border-green-500/30",
  Stuck: "bg-red-500/20 text-red-300 border-red-500/30",
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  High: "bg-red-500/20 text-red-300 border-red-500/30",
  Medium: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  Low: "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

const CATEGORY_ICONS: Record<TaskCategory, React.ReactNode> = {
  Implementation: <Zap className="w-3 h-3" />,
  Refinement: <Wrench className="w-3 h-3" />,
  Compliance: <Shield className="w-3 h-3" />,
  "Bug Fix": <Bug className="w-3 h-3" />,
  Infrastructure: <Server className="w-3 h-3" />,
};

const CATEGORY_COLORS: Record<TaskCategory, string> = {
  Implementation: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  Refinement: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  Compliance: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "Bug Fix": "bg-red-500/20 text-red-300 border-red-500/30",
  Infrastructure: "bg-teal-500/20 text-teal-300 border-teal-500/30",
};

// ─── Task Form Dialog ─────────────────────────────────────────────────────────
interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  editTask?: TechTask | null;
  onSaved: () => void;
}

function TaskFormDialog({ open, onClose, editTask, onSaved }: TaskFormProps) {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState(editTask?.title ?? "");
  const [description, setDescription] = useState(editTask?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(editTask?.status ?? "Backlog");
  const [priority, setPriority] = useState<TaskPriority>(editTask?.priority ?? "Medium");
  const [category, setCategory] = useState<TaskCategory>(editTask?.category ?? "Implementation");
  const [assignee, setAssignee] = useState(editTask?.assignee ?? "");
  const [dueDate, setDueDate] = useState(
    editTask?.dueDate ? new Date(editTask.dueDate).toISOString().slice(0, 16) : ""
  );
  const [resourceUrl, setResourceUrl] = useState(editTask?.resourceUrl ?? "");
  const [newSubtask, setNewSubtask] = useState("");
  const [subtasks, setSubtasks] = useState<{ title: string }[]>([]);

  const createMutation = trpc.techTasks.create.useMutation({
    onSuccess: () => {
      utils.techTasks.list.invalidate();
      toast.success("Tech task created");
      onSaved();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.techTasks.update.useMutation({
    onSuccess: () => {
      utils.techTasks.list.invalidate();
      toast.success("Task updated");
      onSaved();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    if (!title.trim()) return toast.error("Title is required");
    if (editTask) {
      updateMutation.mutate({
        id: editTask.id,
        title: title.trim(),
        description: description || undefined,
        status,
        priority,
        category,
        assignee: assignee || undefined,
        dueDate: dueDate || null,
        resourceUrl: resourceUrl || undefined,
      });
    } else {
      createMutation.mutate({
        title: title.trim(),
        description: description || undefined,
        status,
        priority,
        category,
        assignee: assignee || undefined,
        dueDate: dueDate || undefined,
        resourceUrl: resourceUrl || undefined,
        subtasks: subtasks.length > 0 ? subtasks : undefined,
      });
    }
  };

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks((prev) => [...prev, { title: newSubtask.trim() }]);
    setNewSubtask("");
  };

  const removeSubtask = (i: number) => setSubtasks((prev) => prev.filter((_, idx) => idx !== i));

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg bg-[#0d1117] border border-white/10 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            {editTask ? "Edit Tech Task" : "New Tech Task"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wide mb-1 block">Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title..."
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wide mb-1 block">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the task..."
              rows={3}
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 resize-none"
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-1 block">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0d1117] border-white/10">
                  {STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s} className="text-white hover:bg-white/10">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-1 block">Priority</label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0d1117] border-white/10">
                  {(["High", "Medium", "Low"] as TaskPriority[]).map((p) => (
                    <SelectItem key={p} value={p} className="text-white hover:bg-white/10">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wide mb-1 block">Category</label>
            <Select value={category} onValueChange={(v) => setCategory(v as TaskCategory)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0d1117] border-white/10">
                {(["Implementation", "Refinement", "Compliance", "Bug Fix", "Infrastructure"] as TaskCategory[]).map((c) => (
                  <SelectItem key={c} value={c} className="text-white hover:bg-white/10">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignee + Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-1 block">Assignee</label>
              <Input
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="Name or team..."
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-1 block">Due Date</label>
              <Input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>

          {/* Resource URL */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wide mb-1 block">Resource / Guide URL</label>
            <Input
              value={resourceUrl}
              onChange={(e) => setResourceUrl(e.target.value)}
              placeholder="https://docs.example.com/..."
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
            />
          </div>

          {/* Subtasks (create only) */}
          {!editTask && (
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-1 block">Subtasks</label>
              <div className="space-y-1 mb-2">
                {subtasks.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white/5 rounded px-3 py-1.5">
                    <span className="flex-1 text-sm text-white">{s.title}</span>
                    <button onClick={() => removeSubtask(i)} className="text-slate-400 hover:text-red-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSubtask()}
                  placeholder="Add subtask..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                />
                <Button size="sm" variant="outline" onClick={addSubtask} className="border-white/10 text-white hover:bg-white/10">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
            {isSaving ? "Saving..." : editTask ? "Save Changes" : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────
interface TaskCardProps {
  task: TechTask;
  onEdit: (task: TechTask) => void;
  onDelete: (id: number) => void;
}

function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {
  const utils = trpc.useUtils();
  const [expanded, setExpanded] = useState(false);
  const [newSubtask, setNewSubtask] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);

  const completedCount = task.subtasks.filter((s) => s.isComplete).length;
  const totalSubtasks = task.subtasks.length;
  const progress = totalSubtasks > 0 ? Math.round((completedCount / totalSubtasks) * 100) : 0;

  const toggleSubtask = trpc.techTasks.subtasks.update.useMutation({
    onSuccess: () => utils.techTasks.list.invalidate(),
  });

  const addSubtaskMutation = trpc.techTasks.subtasks.create.useMutation({
    onSuccess: () => {
      utils.techTasks.list.invalidate();
      setNewSubtask("");
      setAddingSubtask(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteSubtask = trpc.techTasks.subtasks.delete.useMutation({
    onSuccess: () => utils.techTasks.list.invalidate(),
  });

  const updateStatus = trpc.techTasks.update.useMutation({
    onSuccess: () => utils.techTasks.list.invalidate(),
  });

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    addSubtaskMutation.mutate({ taskId: task.id, title: newSubtask.trim() });
  };

  const isOverdue =
    task.dueDate && task.status !== "Done" && new Date(task.dueDate) < new Date();

  return (
    <div className="bg-[#0d1117] border border-white/10 rounded-lg p-4 hover:border-white/20 transition-colors">
      {/* Header row */}
      <div className="flex items-start gap-3">
        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-0.5 text-slate-500 hover:text-white transition-colors flex-shrink-0"
        >
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium text-white leading-tight">{task.title}</h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-slate-500 hover:text-white flex-shrink-0">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#0d1117] border-white/10">
                <DropdownMenuItem onClick={() => onEdit(task)} className="text-white hover:bg-white/10 cursor-pointer">
                  <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(task.id)}
                  className="text-red-400 hover:bg-red-500/10 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {/* Status selector */}
            <Select
              value={task.status}
              onValueChange={(v) => updateStatus.mutate({ id: task.id, status: v as TaskStatus })}
            >
              <SelectTrigger className={`h-5 text-[10px] px-2 border rounded-full w-auto gap-1 ${STATUS_COLORS[task.status]}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0d1117] border-white/10">
                {STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s} className="text-white hover:bg-white/10 text-xs">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[task.priority]}`}>
              {task.priority}
            </span>

            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[task.category]}`}>
              {CATEGORY_ICONS[task.category]}
              {task.category}
            </span>

            {task.assignee && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">
                <User className="w-2.5 h-2.5" />
                {task.assignee}
              </span>
            )}

            {task.dueDate && (
              <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${isOverdue ? "bg-red-500/20 text-red-300 border-red-500/30" : "bg-white/5 text-slate-300 border-white/10"}`}>
                <Calendar className="w-2.5 h-2.5" />
                {new Date(task.dueDate).toLocaleDateString()}
              </span>
            )}

            {task.resourceUrl && (
              <a
                href={task.resourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-blue-300 border border-blue-500/20 hover:bg-blue-500/10"
              >
                <ExternalLink className="w-2.5 h-2.5" />
                Resource
              </a>
            )}
          </div>

          {/* Subtask progress bar */}
          {totalSubtasks > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-500">
                  {completedCount}/{totalSubtasks} subtasks
                </span>
                <span className="text-[10px] text-slate-500">{progress}%</span>
              </div>
              <Progress value={progress} className="h-1 bg-white/10" />
            </div>
          )}
        </div>
      </div>

      {/* Expanded: description + subtasks */}
      {expanded && (
        <div className="mt-3 pl-7 space-y-3">
          {task.description && (
            <p className="text-xs text-slate-400 leading-relaxed">{task.description}</p>
          )}

          {/* Subtasks list */}
          {task.subtasks.length > 0 && (
            <div className="space-y-1">
              {task.subtasks.map((sub) => (
                <div key={sub.id} className="flex items-center gap-2 group">
                  <button
                    onClick={() => toggleSubtask.mutate({ id: sub.id, isComplete: !sub.isComplete })}
                    className={`flex-shrink-0 transition-colors ${sub.isComplete ? "text-green-400" : "text-slate-500 hover:text-white"}`}
                  >
                    {sub.isComplete ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                  </button>
                  <span className={`text-xs flex-1 ${sub.isComplete ? "line-through text-slate-500" : "text-slate-300"}`}>
                    {sub.title}
                  </span>
                  <button
                    onClick={() => deleteSubtask.mutate({ id: sub.id })}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add subtask inline */}
          {addingSubtask ? (
            <div className="flex gap-2">
              <Input
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddSubtask();
                  if (e.key === "Escape") setAddingSubtask(false);
                }}
                placeholder="Subtask title..."
                autoFocus
                className="h-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              />
              <Button size="sm" onClick={handleAddSubtask} disabled={addSubtaskMutation.isPending} className="h-7 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3">
                Add
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAddingSubtask(false)} className="h-7 text-slate-400 hover:text-white text-xs px-2">
                Cancel
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setAddingSubtask(true)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-400 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add subtask
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TechTasks() {
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState<TechTask | null>(null);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "All">("All");
  const [filterCategory, setFilterCategory] = useState<TaskCategory | "All">("All");
  const [filterPriority, setFilterPriority] = useState<TaskPriority | "All">("All");
  const [search, setSearch] = useState("");

  const { data: tasks = [], isLoading } = trpc.techTasks.list.useQuery();
  const utils = trpc.useUtils();

  const deleteTask = trpc.techTasks.delete.useMutation({
    onSuccess: () => {
      utils.techTasks.list.invalidate();
      toast.success("Task deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    return (tasks as TechTask[]).filter((t) => {
      if (filterStatus !== "All" && t.status !== filterStatus) return false;
      if (filterCategory !== "All" && t.category !== filterCategory) return false;
      if (filterPriority !== "All" && t.priority !== filterPriority) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tasks, filterStatus, filterCategory, filterPriority, search]);

  // Group by status
  const grouped = useMemo(() => {
    const groups: Record<TaskStatus, TechTask[]> = {
      Backlog: [],
      "In Progress": [],
      "In Review": [],
      Stuck: [],
      Done: [],
    };
    filtered.forEach((t) => {
      if (groups[t.status]) groups[t.status].push(t);
    });
    return groups;
  }, [filtered]);

  const handleEdit = (task: TechTask) => {
    setEditTask(task);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this task and all its subtasks?")) {
      deleteTask.mutate({ id });
    }
  };

  const handleClose = () => {
    setShowForm(false);
    setEditTask(null);
  };

  // Summary stats
  const total = (tasks as TechTask[]).length;
  const done = (tasks as TechTask[]).filter((t) => t.status === "Done").length;
  const inProgress = (tasks as TechTask[]).filter((t) => t.status === "In Progress").length;
  const stuck = (tasks as TechTask[]).filter((t) => t.status === "Stuck").length;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Layers className="w-6 h-6 text-blue-400" />
              Tech Tasks
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Technology department — implementation, refinement &amp; compliance
            </p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            New Task
          </Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total", value: total, color: "text-white" },
            { label: "In Progress", value: inProgress, color: "text-blue-400" },
            { label: "Stuck", value: stuck, color: "text-red-400" },
            { label: "Done", value: done, color: "text-green-400" },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#0d1117] border border-white/10 rounded-lg p-3 text-center">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-5">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-48 h-8 text-sm bg-white/5 border-white/10 text-white placeholder:text-slate-500"
          />
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as TaskStatus | "All")}>
            <SelectTrigger className="w-36 h-8 text-sm bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-[#0d1117] border-white/10">
              <SelectItem value="All" className="text-white hover:bg-white/10">All Statuses</SelectItem>
              {STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s} className="text-white hover:bg-white/10">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v as TaskCategory | "All")}>
            <SelectTrigger className="w-40 h-8 text-sm bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-[#0d1117] border-white/10">
              <SelectItem value="All" className="text-white hover:bg-white/10">All Categories</SelectItem>
              {(["Implementation", "Refinement", "Compliance", "Bug Fix", "Infrastructure"] as TaskCategory[]).map((c) => (
                <SelectItem key={c} value={c} className="text-white hover:bg-white/10">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v as TaskPriority | "All")}>
            <SelectTrigger className="w-36 h-8 text-sm bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent className="bg-[#0d1117] border-white/10">
              <SelectItem value="All" className="text-white hover:bg-white/10">All Priorities</SelectItem>
              {(["High", "Medium", "Low"] as TaskPriority[]).map((p) => (
                <SelectItem key={p} value={p} className="text-white hover:bg-white/10">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Task list grouped by status */}
        {isLoading ? (
          <div className="text-center py-12 text-slate-500">Loading tasks...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No tech tasks yet.</p>
            <Button
              onClick={() => setShowForm(true)}
              variant="outline"
              size="sm"
              className="mt-3 border-white/10 text-white hover:bg-white/10"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Create first task
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {STATUS_ORDER.filter((s) => grouped[s].length > 0 || filterStatus === s).map((status) => {
              const group = grouped[status];
              if (group.length === 0) return null;
              return (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[status]}`}>
                      {status}
                    </span>
                    <span className="text-xs text-slate-500">{group.length} task{group.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="space-y-2">
                    {group.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit dialog */}
      {showForm && (
        <TaskFormDialog
          open={showForm}
          onClose={handleClose}
          editTask={editTask}
          onSaved={() => {}}
        />
      )}
    </DashboardLayout>
  );
}

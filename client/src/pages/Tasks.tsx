import { trpc } from "@/lib/trpc";
import { CreateTaskInline } from "@/components/CreateTaskInline";
import { EditTaskModal, type TaskEditPayload } from "@/components/EditTaskModal";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VoiceInput from "@/components/VoiceInput";
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
import VoiceTextarea from "@/components/VoiceTextarea";
import { Label } from "@/components/ui/label";
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Trash2,
  Pencil,
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
  ListChecks,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import TaskResourcePanel from "@/components/tasks/TaskResourcePanel";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkTaskActionBar } from "@/components/tasks/BulkTaskActionBar";
import { ConfirmDeleteTasksDialog, TaskPreviewItem } from "@/components/tasks/ConfirmDeleteTasksDialog";
import { TaskDeleteRequestModal, type TaskToDeleteInfo } from "@/components/tasks/TaskDeleteRequestModal";
import { TaskDeletionReviewModal } from "@/components/tasks/TaskDeletionReviewModal";
import { PurgeTestTasksDialog } from "@/components/tasks/PurgeTestTasksDialog";
import { TaskAssignmentBadge } from "@/components/tasks/TaskAssignmentBadge";
import { TaskAssignmentArea, type AssignmentFilterValue } from "@/components/tasks/TaskAssignmentArea";

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
  status: "not_started" | "in_progress" | "paused" | "stuck" | "complete";
  assignmentSource?: string | null;
  assignedByName?: string | null;
  assignedByUserId?: number | null;
  projectId: number | null;
  projectName: string | null;
  assigneeId: number | null;
  assigneeName: string | null;
  dueDate: Date | null;
  startedAt: Date | null;
  pausedAt: Date | null;
  stuckAt: Date | null;
  completedAt: Date | null;
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
  paused: { label: "Paused", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
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
const ResourcePanel = TaskResourcePanel;

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
  isSelectMode,
  isSelected,
  onToggleSelect,
  isOwnerOrAdmin,
  isDeletionPending,
  onRequestDelete,
}: {
  task: Task;
  users: { id: number; name: string }[];
  projects: { id: number; name: string }[];
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: number) => void;
  isOwnerOrAdmin?: boolean;
  isDeletionPending?: boolean;
  onRequestDelete?: (task: TaskToDeleteInfo) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskDue, setNewSubtaskDue] = useState("");
  const [showResources, setShowResources] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [editPayload, setEditPayload] = useState<TaskEditPayload | null>(null);
  const isComplete = task.status === "complete";
  const prevComplete = useRef(isComplete);
  const utils = trpc.useUtils();
  const subtaskCount = task.subtasks.length;
  const done = task.subtasks.filter((s) => s.isComplete).length;
  const progress = subtaskCount > 0 ? Math.round((done / subtaskCount) * 100) : 0;
  const statusCfg = STATUS_CONFIG[task.status];

  useEffect(() => {
    if (isComplete && !prevComplete.current) {
      fireConfetti();
    }
    prevComplete.current = isComplete;
  }, [isComplete]);

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
    onError: (err) => {
      if (err.message?.includes("Request delete from them?")) {
        onRequestDelete?.({
          id: task.id,
          title: task.title,
          type: "general",
          description: task.description,
          projectName: task.projectName,
          studentName: task.linkedStudentName,
          dueDate: task.dueDate,
          subtaskCount: task.subtasks.length,
        });
      } else {
        toast.error(err.message || "Failed to delete task");
      }
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
    <div className={`border rounded-lg mb-3 overflow-hidden transition-all ${
      isSelected
        ? "border-primary/70 bg-primary/5 ring-2 ring-primary/40 shadow-sm"
        : isComplete
        ? "border-green-200 bg-green-50/30"
        : "border-border bg-card"
    }`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        {isSelectMode && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect?.(task.id)}
            className="h-4 w-4 shrink-0 transition-transform data-[state=checked]:scale-110"
            aria-label={`Select task ${task.title}`}
          />
        )}
        <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-normal text-lg ${isComplete ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {task.title}
            </span>
            {isDeletionPending && (
              <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/40 text-xs font-semibold flex items-center gap-1">
                <ShieldAlert className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                Deletion Pending Approval
              </Badge>
            )}
            {/* Assignment Origin Badge */}
            <TaskAssignmentBadge
              source={task.assignmentSource}
              assignedByName={task.assignedByName}
              compact
            />
            {task.projectName && (
              <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded px-1.5 py-0.5 flex items-center gap-1">
                <FolderOpen className="h-3 w-3" />{task.projectName}
              </span>
            )}
            {task.assigneeName ? (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3 text-primary/70" />
                <span className="font-medium text-foreground">{task.assigneeName}</span>
              </span>
            ) : (
              <span className="text-xs text-amber-600/80 italic flex items-center gap-1">
                <User className="h-3 w-3 text-amber-500" />
                Unassigned
              </span>
            )}
            {task.dueDate && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />{formatDateTime(task.dueDate)}
              </span>
            )}
            {task.startedAt && (
              <span className="text-sm text-amber-700 flex items-center gap-1 font-semibold tracking-tight">
                Started: {formatDateTime(task.startedAt)}
              </span>
            )}
            {task.pausedAt && (
              <span className="text-sm text-yellow-700 flex items-center gap-1 font-semibold tracking-tight">
                Paused: {formatDateTime(task.pausedAt)}
              </span>
            )}
            {task.stuckAt && (
              <span className="text-sm text-red-700 flex items-center gap-1 font-semibold tracking-tight">
                Stuck: {formatDateTime(task.stuckAt)}
              </span>
            )}
            {task.completedAt && (
              <span className="text-sm text-green-700 flex items-center gap-1 font-semibold tracking-tight">
                Completed: {formatDateTime(task.completedAt)}
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
          <button
            onClick={() => setEditPayload({ kind: "internal", id: task.id, title: task.title, description: task.description, status: task.status, assigneeId: task.assigneeId, assigneeContactId: (task as any).assigneeContactId, assignmentSource: (task as any).assignmentSource, assignedByName: (task as any).assignedByName, dueDate: task.dueDate })}
            className="text-muted-foreground hover:text-blue-500 transition-colors"
            title="Edit task"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              if (isDeletionPending) {
                toast.info("A deletion request for this task is already pending owner review.");
                return;
              }
              if (!isOwnerOrAdmin) {
                onRequestDelete?.({
                  id: task.id,
                  title: task.title,
                  type: "general",
                  description: task.description,
                  projectName: task.projectName,
                  studentName: task.linkedStudentName,
                  dueDate: task.dueDate,
                  subtaskCount: task.subtasks.length,
                });
                return;
              }
              deleteTask.mutate({ id: task.id });
            }}
            className="text-muted-foreground hover:text-red-500 transition-colors"
            title={isOwnerOrAdmin ? "Delete task" : "Request task deletion"}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <EditTaskModal task={editPayload} open={!!editPayload} onClose={() => setEditPayload(null)} />
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
                <VoiceInput
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
  assignmentSource?: string | null;
  assignedByName?: string | null;
  dueDate: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  assignedTo: number | null;
  assignedToUserId: number | null;
  assignedToUserName: string | null;
  clientName: string | null;
  projectName: string | null;
  seenByClient: boolean;
  studentContactId?: number;
  steps: { id: number; taskId: number; title: string; isComplete: boolean; sortOrder: number }[];
};

const STUDENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  Todo: { label: "Todo", color: "bg-gray-100 text-gray-600 border-gray-200" },
  "In Progress": { label: "In Progress", color: "bg-blue-100 text-blue-700 border-blue-200" },
  Done: { label: "Done", color: "bg-green-100 text-green-700 border-green-200" },
};

function StudentTaskRow({
  task,
  isSelectMode,
  isSelected,
  onToggleSelect,
  isOwnerOrAdmin,
  isDeletionPending,
  onRequestDelete,
}: {
  task: StudentTask;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: number) => void;
  isOwnerOrAdmin?: boolean;
  isDeletionPending?: boolean;
  onRequestDelete?: (task: TaskToDeleteInfo) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [addingStep, setAddingStep] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState("");
  const [editingStatus, setEditingStatus] = useState(false);
  const [editPayload, setEditPayload] = useState<TaskEditPayload | null>(null);
  const utils = trpc.useUtils();
  const stepCount = task.steps?.length ?? 0;
  const doneCount = (task.steps ?? []).filter((s) => s.isComplete).length;
  const progress = stepCount > 0 ? Math.round((doneCount / stepCount) * 100) : 0;
  const isDone = (task.status ?? "Todo") === "Done";
  const prevDone = useRef(isDone);
  const statusCfg = STUDENT_STATUS_CONFIG[task.status ?? "Todo"] ?? STUDENT_STATUS_CONFIG["Todo"];

  useEffect(() => {
    if (isDone && !prevDone.current) fireConfetti();
    prevDone.current = isDone;
  }, [isDone]);

  const updateTask = trpc.tasks.update.useMutation({ onSuccess: () => utils.tasks.getAll.invalidate() });
  const deleteTask = trpc.tasks.delete.useMutation({
    onSuccess: () => { utils.tasks.getAll.invalidate(); toast("Task deleted"); },
    onError: (err) => {
      if (err.message?.includes("Request delete from them?")) {
        onRequestDelete?.({
          id: task.id,
          title: task.title,
          type: "project",
          description: task.description,
          projectName: task.projectName,
          studentName: task.clientName,
          dueDate: task.dueDate,
          subtaskCount: task.steps?.length ?? 0,
        });
      } else {
        toast.error(err.message || "Failed to delete task");
      }
    },
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
  const deleteStep = trpc.tasks.deleteStep.useMutation({
    onSuccess: () => utils.tasks.getAll.invalidate(),
    onError: (err) => {
      toast.error(err.message || "Failed to delete task step");
    },
  });
  return (
    <div className={`border rounded-lg mb-3 overflow-hidden transition-all ${
      isSelected
        ? "border-primary/70 bg-primary/5 ring-2 ring-primary/40 shadow-sm"
        : isDone
        ? "border-green-200 bg-green-50/30"
        : "border-border bg-card"
    }`}>
      <div className="flex items-center gap-3 px-4 py-3">
        {isSelectMode && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect?.(task.id)}
            className="h-4 w-4 shrink-0 transition-transform data-[state=checked]:scale-110"
            aria-label={`Select task ${task.title}`}
          />
        )}
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
            <span className={`font-normal text-lg ${
              isDone ? "line-through text-muted-foreground" : "text-foreground"
            }`}>{task.title}</span>
            {isDeletionPending && (
              <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/40 text-xs font-semibold flex items-center gap-1">
                <ShieldAlert className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                Deletion Pending Approval
              </Badge>
            )}
            {task.priority && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                task.priority === "High" ? "bg-red-100 text-red-700" :
                task.priority === "Medium" ? "bg-amber-100 text-amber-700" :
                "bg-muted text-muted-foreground"
              }`}>{task.priority}</span>
            )}
          </div>
          {/* Metadata bar: origin | source | assignee | due */}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <TaskAssignmentBadge
              source={task.assignmentSource}
              assignedByName={task.assignedByName}
              compact
            />
            {task.projectName && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3 text-amber-500" />
                <span className="text-amber-700 font-medium">{task.projectName}</span>
              </span>
            )}
            {task.projectName && task.assignedToUserName && (
              <span className="text-muted-foreground/40 text-xs">|</span>
            )}
            {task.assignedToUserName && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                  {task.assignedToUserName.charAt(0).toUpperCase()}
                </div>
                {task.assignedToUserName}
              </span>
            )}
            {task.dueDate && (
              <>
                {(task.projectName || task.assignedToUserName) && <span className="text-muted-foreground/40 text-xs">|</span>}
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />{formatDateTime(task.dueDate)}
                </span>
              </>
            )}
            {task.startedAt && (
              <>
                {(task.projectName || task.assignedToUserName || task.dueDate) && <span className="text-muted-foreground/40 text-xs">|</span>}
                <span className="text-xs text-amber-600 flex items-center gap-1 font-medium">
                  Started: {formatDateTime(task.startedAt)}
                </span>
              </>
            )}
            {task.completedAt && (
              <>
                {(task.projectName || task.assignedToUserName || task.dueDate || task.startedAt) && <span className="text-muted-foreground/40 text-xs">|</span>}
                <span className="text-xs text-green-600 flex items-center gap-1 font-medium">
                  Completed: {formatDateTime(task.completedAt)}
                </span>
              </>
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
          <button
            onClick={() => setEditPayload({ kind: "project", id: task.id, title: task.title, status: task.status ?? "Todo", priority: task.priority, dueDate: task.dueDate, assignedToUserId: task.assignedToUserId, assignedTo: task.assignedTo, assignmentSource: (task as any).assignmentSource, assignedByName: (task as any).assignedByName, seenByClient: task.seenByClient, studentContactId: task.studentContactId, description: task.description })}
            className="text-muted-foreground hover:text-blue-500 transition-colors"
            title="Edit task"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              if (isDeletionPending) {
                toast.info("A deletion request for this task is already pending owner review.");
                return;
              }
              if (!isOwnerOrAdmin) {
                onRequestDelete?.({
                  id: task.id,
                  title: task.title,
                  type: "project",
                  description: task.description,
                  projectName: task.projectName,
                  studentName: task.clientName,
                  dueDate: task.dueDate,
                  subtaskCount: task.steps?.length ?? 0,
                });
                return;
              }
              deleteTask.mutate({ id: task.id });
            }}
            className="text-muted-foreground hover:text-red-500 transition-colors"
            title={isOwnerOrAdmin ? "Delete task" : "Request task deletion"}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <EditTaskModal task={editPayload} open={!!editPayload} onClose={() => setEditPayload(null)} />
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
                <VoiceInput
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
            <VoiceInput autoFocus placeholder="Task title..." value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <VoiceTextarea placeholder="Optional description..." value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 resize-none" rows={2} />
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
  const [statusFilter, setStatusFilter] = useState<"all" | Task["status"]>("all");
  const { user } = useAuth();
  const isOwnerOrAdmin = user?.role === "admin" || (user as any)?.id === 1 || (user as any)?.id === "1";

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
  const completedTasks = (tasks as unknown as Task[]).filter((t) => t.status === "complete").length;
  // Split into client-facing (visible to client) and case tasks (internal only)
  const clientFacingTasks = (studentTasks as StudentTask[]).filter((t) => t.seenByClient);
  const caseTasks = (studentTasks as StudentTask[]).filter((t) => !t.seenByClient);

  // Deletion requests queries & state
  const { data: deletionRequests = [] } = trpc.internalTasks.listDeletionRequests.useQuery(
    { status: "pending" },
    { refetchInterval: 15000 }
  );
  const pendingRequestsCount = deletionRequests.filter((r: any) => r.status === "pending").length;
  const pendingGeneralTaskIds = new Set(
    deletionRequests.filter((r: any) => r.status === "pending" && r.taskType === "general").map((r: any) => r.taskId)
  );
  const pendingCaseTaskIds = new Set(
    deletionRequests.filter((r: any) => r.status === "pending" && r.taskType === "project").map((r: any) => r.taskId)
  );

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [requestDeleteTask, setRequestDeleteTask] = useState<TaskToDeleteInfo | null>(null);

  // Automated test tasks detection query & purge state
  const { data: testTasksData } = trpc.internalTasks.getTestTasksCount.useQuery(
    undefined,
    { enabled: isOwnerOrAdmin }
  );
  const testTasksCount = testTasksData?.count ?? 0;
  const realTasksCount = testTasksData?.realTasksCount ?? 0;
  const testSampleTitles: string[] = (testTasksData?.sampleTitles as string[]) ?? [];
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);

  // Assignment Origin filter state
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilterValue>("all");

  const allGeneral = tasks as unknown as Task[];
  const allStudent = studentTasks as unknown as StudentTask[];
  const combinedTasks = [...allGeneral, ...allStudent];

  const assignmentCounts = {
    total: combinedTasks.length,
    manager: combinedTasks.filter((t) => (t.assignmentSource || "manager").toLowerCase() === "manager").length,
    automation: combinedTasks.filter((t) => (t.assignmentSource || "").toLowerCase() === "system_automation").length,
    team: combinedTasks.filter((t) => {
      const s = (t.assignmentSource || "").toLowerCase();
      return s === "employee" || s === "self";
    }).length,
    unassigned: combinedTasks.filter((t) => {
      const hasAssignee = (t as any).assigneeId || (t as any).assigneeContactId || (t as any).assignedToUserId || (t as any).assignedTo;
      return !hasAssignee;
    }).length,
  };

  const matchesAssignmentFilter = (t: { assignmentSource?: string | null; assigneeId?: number | null; assigneeContactId?: number | null; assignedToUserId?: number | null; assignedTo?: number | null }) => {
    if (assignmentFilter === "all") return true;
    if (assignmentFilter === "unassigned") {
      const hasAssignee = t.assigneeId || t.assigneeContactId || t.assignedToUserId || t.assignedTo;
      return !hasAssignee;
    }
    const source = (t.assignmentSource || "manager").toLowerCase();
    if (assignmentFilter === "manager") return source === "manager";
    if (assignmentFilter === "system_automation") return source === "system_automation";
    if (assignmentFilter === "employee") return source === "employee" || source === "self";
    return true;
  };

  // Multi-select state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedGeneralIds, setSelectedGeneralIds] = useState<Set<number>>(new Set());
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<number>>(new Set());
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const totalSelected = selectedGeneralIds.size + selectedProjectIds.size;

  const toggleGeneralTask = (id: number) => {
    setSelectedGeneralIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleProjectTask = (id: number) => {
    setSelectedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const visibleGeneralTasks = allGeneral.filter(matchesAssignmentFilter);
  const visibleStudentTasks = allStudent.filter(matchesAssignmentFilter);
  const allVisibleTasksCount = visibleGeneralTasks.length + visibleStudentTasks.length;

  const allSelected =
    allVisibleTasksCount > 0 &&
    visibleGeneralTasks.every((t) => selectedGeneralIds.has(t.id)) &&
    visibleStudentTasks.every((t) => selectedProjectIds.has(t.id));

  const selectAll = () => {
    setSelectedGeneralIds(new Set(visibleGeneralTasks.map((t) => t.id)));
    setSelectedProjectIds(new Set(visibleStudentTasks.map((t) => t.id)));
  };

  const deselectAll = () => {
    setSelectedGeneralIds(new Set());
    setSelectedProjectIds(new Set());
  };

  const exitSelectMode = () => {
    deselectAll();
    setIsSelectMode(false);
  };

  const selectedTaskPreviews: TaskPreviewItem[] = [
    ...visibleGeneralTasks
      .filter((t) => selectedGeneralIds.has(t.id))
      .map((t) => ({ id: t.id, title: t.title, kind: "general" as const })),
    ...visibleStudentTasks
      .filter((t) => selectedProjectIds.has(t.id))
      .map((t) => ({ id: t.id, title: t.title, kind: "case" as const })),
  ];

  const bulkDeleteInternal = trpc.internalTasks.bulkDelete.useMutation();
  const bulkDeleteTasks = trpc.tasks.bulkDelete.useMutation();

  const handleBatchDelete = async () => {
    if (totalSelected === 0) return;
    if (!isOwnerOrAdmin) {
      toast.error("You may not bulk delete supervisor-assigned tasks. Please request deletion individually so full context can be reviewed.");
      return;
    }
    setIsDeleting(true);
    try {
      const generalIds = Array.from(selectedGeneralIds);
      const projectIds = Array.from(selectedProjectIds);

      const promises: Promise<any>[] = [];
      if (generalIds.length > 0) {
        promises.push(bulkDeleteInternal.mutateAsync({ ids: generalIds }));
      }
      if (projectIds.length > 0) {
        promises.push(bulkDeleteTasks.mutateAsync({ ids: projectIds }));
      }

      await Promise.all(promises);
      await Promise.all([
        utils.internalTasks.list.invalidate(),
        utils.tasks.getAll.invalidate(),
      ]);

      toast.success(`${totalSelected} task${totalSelected === 1 ? "" : "s"} deleted successfully`);
      deselectAll();
      setIsConfirmDeleteOpen(false);
      setIsSelectMode(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete selected tasks");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{completedTasks}/{totalTasks} tasks complete</p>
        </div>
        <div className="flex items-center gap-2">
          {isOwnerOrAdmin && testTasksCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPurgeModalOpen(true)}
              className="gap-1.5 border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-all font-medium"
            >
              <Sparkles className="h-4 w-4 text-rose-500" />
              Clean Test Tasks ({testTasksCount})
            </Button>
          )}
          {isOwnerOrAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReviewModalOpen(true)}
              className="gap-1.5 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-all font-medium"
            >
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              Deletion Requests
              {pendingRequestsCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[11px] bg-rose-500 text-white font-mono">
                  {pendingRequestsCount}
                </Badge>
              )}
            </Button>
          )}
          <Button
            variant={isSelectMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (isSelectMode) {
                exitSelectMode();
              } else {
                setIsSelectMode(true);
              }
            }}
            className={`gap-1.5 transition-all shadow-xs ${
              isSelectMode
                ? "bg-primary text-primary-foreground font-semibold"
                : "border-border text-foreground hover:bg-muted"
            }`}
          >
            <ListChecks className="h-4 w-4" />
            {isSelectMode ? "Exit Select Mode" : "Select Multiple"}
          </Button>
        </div>
      </div>

      {/* Supervisor Deletion Requests Banner (Fail-Safe) */}
      {isOwnerOrAdmin && pendingRequestsCount > 0 && (
        <div className="mb-6 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-600/10 to-transparent p-4 text-amber-900 dark:text-amber-100 flex items-center justify-between gap-4 flex-wrap shadow-lg shadow-amber-500/5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 animate-pulse">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                Action Required: {pendingRequestsCount} Task Deletion Request{pendingRequestsCount === 1 ? "" : "s"} Pending
                <Badge variant="destructive" className="bg-rose-500 text-white font-mono text-[10px]">
                  Review Needed
                </Badge>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Employees have requested to delete supervisor-assigned tasks. Review the full task context and approve or decline.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsReviewModalOpen(true)}
            className="gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/20"
          >
            <ShieldAlert className="h-4 w-4" />
            Review Requests ({pendingRequestsCount})
          </Button>
        </div>
      )}

      {/* Bulk Action Sticky Bar */}
      {isSelectMode && (
        <BulkTaskActionBar
          totalSelected={totalSelected}
          totalVisible={allVisibleTasksCount}
          allSelected={allSelected}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
          onOpenDeleteDialog={() => setIsConfirmDeleteOpen(true)}
          onExitSelectMode={exitSelectMode}
          isDeleting={isDeleting}
        />
      )}

      {/* Unified task creation */}
      <div className="mb-6">
        <CreateTaskInline />
      </div>

      {/* ── Assignment Origin & Ownership Control Area ── */}
      <TaskAssignmentArea
        currentFilter={assignmentFilter}
        onFilterChange={setAssignmentFilter}
        counts={assignmentCounts}
      />

      {/* Status filter */}
      <div className="flex gap-1 mb-5 border-b border-border pb-3 flex-wrap">
        {(["all", "not_started", "in_progress", "paused", "stuck", "complete"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
          >
            {s === "all" ? "All" : STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      {/* ── Section 1: General Tasks ── */}
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">General Tasks</h2>
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
            {visibleGeneralTasks.filter((t) => t.status !== "complete").length} open
          </span>
        </div>
        {isOwnerOrAdmin && testTasksCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPurgeModalOpen(true)}
            className="h-7 text-xs gap-1.5 border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-all font-medium"
          >
            <Sparkles className="h-3.5 w-3.5 text-rose-500" />
            Delete All {testTasksCount} System Test Tasks
          </Button>
        )}
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted/40 rounded-lg animate-pulse" />)}
        </div>
      ) : visibleGeneralTasks.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {assignmentFilter !== "all"
              ? `No general tasks match the selected assignment origin filter.`
              : 'No general tasks yet — click "New Task" to create one.'}
          </p>
        </div>
      ) : (
        <div>
          {[...visibleGeneralTasks].sort((a, b) => {
            if (a.status === "complete" && b.status !== "complete") return 1;
            if (a.status !== "complete" && b.status === "complete") return -1;
            return 0;
          }).map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              users={users}
              projects={projects}
              isSelectMode={isSelectMode}
              isSelected={selectedGeneralIds.has(task.id)}
              onToggleSelect={toggleGeneralTask}
              isOwnerOrAdmin={isOwnerOrAdmin}
              isDeletionPending={pendingGeneralTaskIds.has(task.id)}
              onRequestDelete={(t) => setRequestDeleteTask(t)}
            />
          ))}
        </div>
      )}

      {/* ── Section 2: Client Facing Tasks ── */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-base font-semibold text-foreground">Client Facing Tasks</h2>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            {clientFacingTasks.filter(matchesAssignmentFilter).filter((t) => t.status !== "Done").length} open
          </span>
        </div>
        {studentTasksLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted/40 rounded-lg animate-pulse" />)}</div>
        ) : clientFacingTasks.filter(matchesAssignmentFilter).length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {assignmentFilter !== "all"
                ? `No client-facing tasks match the selected assignment origin filter.`
                : 'No client-facing tasks — assign a task to a client from their Contact Detail page.'}
            </p>
          </div>
        ) : (
          <div>
            {clientFacingTasks.filter(matchesAssignmentFilter).map((t) => (
              <StudentTaskRow
                key={t.id}
                task={t}
                isSelectMode={isSelectMode}
                isSelected={selectedProjectIds.has(t.id)}
                onToggleSelect={toggleProjectTask}
                isOwnerOrAdmin={isOwnerOrAdmin}
                isDeletionPending={pendingCaseTaskIds.has(t.id)}
                onRequestDelete={(tInfo) => setRequestDeleteTask(tInfo)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Section 3: Case Tasks ── */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-base font-semibold text-foreground">Case Tasks</h2>
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            {caseTasks.filter(matchesAssignmentFilter).filter((t) => t.status !== "Done").length} open
          </span>
        </div>
        {studentTasksLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted/40 rounded-lg animate-pulse" />)}</div>
        ) : caseTasks.filter(matchesAssignmentFilter).length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {assignmentFilter !== "all"
                ? `No case tasks match the selected assignment origin filter.`
                : "No case tasks yet — create one from a student's Contact Detail page."}
            </p>
          </div>
        ) : (
          <div>
            {caseTasks.filter(matchesAssignmentFilter).map((t) => (
              <StudentTaskRow
                key={t.id}
                task={t}
                isSelectMode={isSelectMode}
                isSelected={selectedProjectIds.has(t.id)}
                onToggleSelect={toggleProjectTask}
                isOwnerOrAdmin={isOwnerOrAdmin}
                isDeletionPending={pendingCaseTaskIds.has(t.id)}
                onRequestDelete={(tInfo) => setRequestDeleteTask(tInfo)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDeleteTasksDialog
        open={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleBatchDelete}
        isDeleting={isDeleting}
        totalSelected={totalSelected}
        taskPreviews={selectedTaskPreviews}
      />

      {/* Employee Delete Request Modal */}
      <TaskDeleteRequestModal
        open={!!requestDeleteTask}
        onClose={() => setRequestDeleteTask(null)}
        task={requestDeleteTask}
      />

      {/* Supervisor Deletion Review Console */}
      <TaskDeletionReviewModal
        open={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
      />

      {/* Purge System Test Tasks Dialog */}
      <PurgeTestTasksDialog
        open={isPurgeModalOpen}
        onClose={() => setIsPurgeModalOpen(false)}
        testTasksCount={testTasksCount}
        realTasksCount={realTasksCount}
        sampleTitles={testSampleTitles}
      />
    </div>
  );
}


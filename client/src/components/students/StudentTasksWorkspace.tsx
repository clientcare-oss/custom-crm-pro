import React, { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  CheckSquare, CheckCircle2, Circle, Clock, AlertTriangle,
  ChevronDown, ChevronRight, Calendar, Plus, X, Pencil, Trash2,
  Filter, Layers, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreateTaskInline } from "@/components/CreateTaskInline";
import { EditTaskModal, type TaskEditPayload } from "@/components/EditTaskModal";
import VoiceInput from "@/components/VoiceInput";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CD_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  Todo: { label: "To Do", color: "border-slate-500/40 text-slate-300 bg-slate-500/10" },
  "In Progress": { label: "In Progress", color: "border-blue-400/40 text-blue-300 bg-blue-500/15" },
  Done: { label: "Done", color: "border-emerald-400/40 text-emerald-300 bg-emerald-500/15" },
};

interface StudentTasksWorkspaceProps {
  studentId: number;
  fullName: string;
  caseId?: string;
  parentContactId?: number | null;
  projectId?: number;
  onReturnToOverview: () => void;
}

export function StudentTasksWorkspace({
  studentId,
  fullName,
  caseId,
  parentContactId,
  projectId,
  onReturnToOverview,
}: StudentTasksWorkspaceProps) {
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [editPayload, setEditPayload] = useState<TaskEditPayload | null>(null);

  const { data: tasks = [], isLoading } = trpc.tasks.getByStudent.useQuery(
    { studentContactId: studentId },
    { enabled: !!studentId }
  );

  const completedCount = tasks.filter((t: any) => t.status === "Done").length;
  const pendingCount = tasks.length - completedCount;
  const highPriorityCount = tasks.filter((t: any) => t.priority === "High" && t.status !== "Done").length;

  const filteredTasks = tasks.filter((t: any) => {
    if (filter === "pending") return t.status !== "Done";
    if (filter === "completed") return t.status === "Done";
    return true;
  });

  return (
    <div className="w-full min-h-[540px] xl:min-h-[580px] p-6 sm:p-8 md:p-10 pt-6 sm:pt-8 flex flex-col justify-between">
      <div>
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-white/15 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-md shrink-0">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 
                className="text-xl sm:text-2xl font-bold text-white tracking-wide drop-shadow-sm flex items-center gap-2"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                <span>Student Action Items & Task Queue</span>
              </h3>
              <p className="text-xs sm:text-sm text-white/65 mt-0.5">
                Case milestones, IEP meeting deadlines, records requests, and action items for Byron & advocacy team.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <Badge className="bg-[#0e274a]/90 text-amber-300 border border-amber-400/35 text-[11px] font-medium px-3 py-1 rounded-lg shadow-sm">
              Case #{caseId || studentId} · {fullName}
            </Badge>
          </div>
        </div>

        {/* Task Summary Stat Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-[#020b18]/60 border border-white/10 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-bold text-white leading-none">{tasks.length}</div>
              <div className="text-[11px] text-white/50 uppercase font-semibold tracking-wider mt-1">Total Tasks</div>
            </div>
          </div>

          <div className="bg-[#020b18]/60 border border-white/10 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-bold text-amber-300 leading-none">{pendingCount}</div>
              <div className="text-[11px] text-white/50 uppercase font-semibold tracking-wider mt-1">Pending</div>
            </div>
          </div>

          <div className="bg-[#020b18]/60 border border-white/10 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-bold text-emerald-300 leading-none">{completedCount}</div>
              <div className="text-[11px] text-white/50 uppercase font-semibold tracking-wider mt-1">Completed</div>
            </div>
          </div>

          <div className="bg-[#020b18]/60 border border-white/10 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-400/30 flex items-center justify-center text-rose-300 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-bold text-rose-300 leading-none">{highPriorityCount}</div>
              <div className="text-[11px] text-white/50 uppercase font-semibold tracking-wider mt-1">High Priority</div>
            </div>
          </div>
        </div>

        {/* Unified Task Creation Widget */}
        <div className="bg-[#020b18]/80 border border-white/15 rounded-xl p-4 sm:p-5 shadow-lg mb-6 backdrop-blur-xs">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300/90 mb-3 flex items-center gap-2">
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Case Action Item</span>
          </h4>
          <CreateTaskInline
            studentContactId={studentId}
            parentContactId={parentContactId}
            caseId={caseId}
            projectId={projectId}
            onCreated={() => utils.tasks.getByStudent.invalidate({ studentContactId: studentId })}
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-lg border border-white/10">
            <button
              onClick={() => setFilter("all")}
              className={cn(
                "px-3 py-1 rounded text-xs font-medium cursor-pointer transition-colors",
                filter === "all" ? "bg-amber-400 text-slate-950 font-bold" : "text-white/70 hover:text-white"
              )}
            >
              All ({tasks.length})
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={cn(
                "px-3 py-1 rounded text-xs font-medium cursor-pointer transition-colors",
                filter === "pending" ? "bg-amber-400 text-slate-950 font-bold" : "text-white/70 hover:text-white"
              )}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={cn(
                "px-3 py-1 rounded text-xs font-medium cursor-pointer transition-colors",
                filter === "completed" ? "bg-amber-400 text-slate-950 font-bold" : "text-white/70 hover:text-white"
              )}
            >
              Completed ({completedCount})
            </button>
          </div>

          <div className="text-xs text-white/50">
            Showing {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Task List */}
        {isLoading ? (
          <div className="p-12 text-center text-white/50 text-sm">
            Loading tasks…
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-10 rounded-xl bg-black/30 border border-white/10 text-center space-y-2">
            <CheckSquare className="w-8 h-8 text-white/30 mx-auto" />
            <p className="text-sm font-semibold text-white/80">No {filter !== "all" ? filter : ""} tasks found</p>
            <p className="text-xs text-white/50 max-w-sm mx-auto">
              Use the input box above to create milestones, deadlines, and follow-up items for this student.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task: any) => (
              <WorkspaceTaskRow
                key={task.id}
                task={task}
                studentId={studentId}
                onEdit={(payload) => setEditPayload(payload)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Task Modal */}
      <EditTaskModal 
        task={editPayload} 
        open={!!editPayload} 
        onClose={() => setEditPayload(null)} 
      />

      {/* Footer Return Button */}
      <div className="pt-4 flex items-center justify-between border-t border-white/10 mt-6 text-xs text-white/50">
        <span>Waypoint Advocates · Case #{caseId || studentId}</span>
        <Button
          onClick={onReturnToOverview}
          variant="outline"
          size="sm"
          className="bg-transparent hover:bg-white/10 border-white/20 text-white text-xs h-8 px-3 rounded-lg cursor-pointer"
        >
          Return to Overview Desk
        </Button>
      </div>
    </div>
  );
}

function WorkspaceTaskRow({
  task,
  studentId,
  onEdit,
}: {
  task: any;
  studentId: number;
  onEdit: (payload: TaskEditPayload) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [addingStep, setAddingStep] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState("");
  const [editingStatus, setEditingStatus] = useState(false);
  const utils = trpc.useUtils();
  const inv = () => utils.tasks.getByStudent.invalidate({ studentContactId: studentId });

  const stepCount = (task.steps ?? []).length;
  const doneCount = (task.steps ?? []).filter((s: any) => s.isComplete).length;
  const progress = stepCount > 0 ? Math.round((doneCount / stepCount) * 100) : 0;
  const isDone = (task.status ?? "Todo") === "Done";
  const prevDone = useRef(isDone);
  const statusCfg = CD_STATUS_CONFIG[task.status ?? "Todo"] ?? CD_STATUS_CONFIG["Todo"];

  useEffect(() => {
    if (isDone && !prevDone.current) {
      import("canvas-confetti").then(({ default: confetti }) => {
        confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
      }).catch(() => {});
    }
    prevDone.current = isDone;
  }, [isDone]);

  const updateTask = trpc.tasks.update.useMutation({ onSuccess: inv });
  const deleteTask = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      inv();
      toast.success("Task deleted");
    },
  });
  const addStep = trpc.tasks.addStep.useMutation({
    onSuccess: () => {
      inv();
      setNewStepTitle("");
      setAddingStep(false);
    },
  });
  const toggleStep = trpc.tasks.toggleStep.useMutation({
    onSuccess: (_data, vars) => {
      inv().then(() => {
        const updatedSteps = (task.steps ?? []).map((s: any) =>
          s.id === vars.stepId ? { ...s, isComplete: vars.isComplete } : s
        );
        const allDone = updatedSteps.length > 0 && updatedSteps.every((s: any) => s.isComplete);
        if (allDone && !isDone) {
          updateTask.mutate({ id: task.id, status: "Done" });
        }
      });
    },
  });
  const deleteStep = trpc.tasks.deleteStep.useMutation({ onSuccess: inv });

  return (
    <div
      className={cn(
        "rounded-xl border transition-all overflow-hidden",
        isDone 
          ? "border-emerald-500/30 bg-[#021815]/60" 
          : "border-white/15 bg-[#020b18]/70 hover:border-white/25"
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-white/50 hover:text-white cursor-pointer shrink-0"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <button
          onClick={() => updateTask.mutate({ id: task.id, status: isDone ? "In Progress" : "Done" })}
          className="shrink-0 text-white/50 hover:text-amber-300 cursor-pointer transition-colors"
        >
          {isDone ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "font-medium text-sm",
                isDone ? "line-through text-white/40" : "text-white"
              )}
            >
              {task.title}
            </span>

            {task.dueDate && (
              <span className="text-[11px] text-white/60 flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                <Calendar className="h-3 w-3 text-amber-300" />
                {new Date(task.dueDate).toLocaleDateString()}
              </span>
            )}

            {task.priority && (
              <span
                className={cn(
                  "text-[10px] uppercase font-bold px-2 py-0.5 rounded border",
                  task.priority === "High"
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                    : task.priority === "Medium"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    : "bg-slate-500/20 text-slate-300 border-slate-500/30"
                )}
              >
                {task.priority}
              </span>
            )}
          </div>

          {stepCount > 0 && (
            <div className="flex items-center gap-2 mt-1.5">
              <Progress
                value={progress}
                className="h-1.5 flex-1 max-w-[160px] bg-white/10"
              />
              <span className="text-[11px] text-white/50">
                {doneCount}/{stepCount} steps
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {editingStatus ? (
            <Select
              value={task.status ?? "Todo"}
              onValueChange={(val) => {
                updateTask.mutate({ id: task.id, status: val as any });
                setEditingStatus(false);
              }}
            >
              <SelectTrigger className="h-7 text-xs w-28 bg-[#09182d] border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#09182d] border-white/20 text-white">
                {Object.entries(CD_STATUS_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-xs">
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <button onClick={() => setEditingStatus(true)} className="cursor-pointer">
              <Badge variant="outline" className={cn("text-[10px] font-semibold", statusCfg.color)}>
                {statusCfg.label}
              </Badge>
            </button>
          )}

          <button
            onClick={() =>
              onEdit({
                kind: "project",
                id: task.id,
                title: task.title,
                status: task.status ?? "Todo",
                priority: task.priority,
                dueDate: task.dueDate,
                assignedToUserId: (task as any).assignedToUserId,
                assignedTo: (task as any).assignedTo,
                assignmentSource: (task as any).assignmentSource,
                assignedByName: (task as any).assignedByName,
                studentContactId: studentId,
                seenByClient: (task as any).seenByClient ?? false,
                description: (task as any).description,
              })
            }
            className="p-1 rounded text-white/50 hover:text-amber-300 hover:bg-white/10 transition-colors cursor-pointer"
            title="Edit task"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => deleteTask.mutate({ id: task.id })}
            className="p-1 rounded text-white/50 hover:text-rose-400 hover:bg-white/10 transition-colors cursor-pointer"
            title="Delete task"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/10 bg-black/20 p-4 space-y-3">
          {task.description && (
            <p className="text-xs text-white/70 leading-relaxed bg-white/5 p-3 rounded-lg border border-white/10">
              {task.description}
            </p>
          )}

          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">
              Sub-Tasks / Checklist
            </span>
            {(task.steps ?? []).map((step: any) => (
              <div
                key={step.id}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-white/5 group border border-transparent hover:border-white/10 transition-colors"
              >
                <button
                  onClick={() => toggleStep.mutate({ stepId: step.id, isComplete: !step.isComplete })}
                  className="shrink-0 text-white/40 hover:text-emerald-400 cursor-pointer"
                >
                  {step.isComplete ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </button>
                <span
                  className={cn(
                    "text-xs flex-1",
                    step.isComplete ? "line-through text-white/40" : "text-white/80"
                  )}
                >
                  {step.title}
                </span>
                <button
                  onClick={() => deleteStep.mutate({ stepId: step.id })}
                  className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-rose-400 cursor-pointer transition-opacity"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-2">
            {addingStep ? (
              <div className="flex items-center gap-2">
                <VoiceInput
                  placeholder="Step title..."
                  value={newStepTitle}
                  onChange={(e) => setNewStepTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newStepTitle.trim()) {
                      addStep.mutate({ taskId: task.id, title: newStepTitle.trim() });
                    }
                    if (e.key === "Escape") setAddingStep(false);
                  }}
                  className="h-8 text-xs flex-1 bg-black/40 border-white/20 text-white"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (newStepTitle.trim()) {
                      addStep.mutate({ taskId: task.id, title: newStepTitle.trim() });
                    }
                  }}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs h-8 px-3 cursor-pointer"
                >
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAddingStep(false)}
                  className="text-white/60 hover:text-white text-xs h-8 px-2 cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setAddingStep(true)}
                className="flex items-center gap-1.5 text-xs text-amber-300/80 hover:text-amber-300 cursor-pointer font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add step</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * EditTaskModal — shared edit dialog for all task types:
 *   - "project"  → calls tasks.update  (StudentTaskRow, ContactDetailTaskRow)
 *   - "internal" → calls internalTasks.update (TaskRow)
 */
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectTaskEdit {
  kind: "project";
  id: number;
  title: string;
  status: string;
  priority?: string | null;
  dueDate?: Date | string | null;
  assignedTo?: number | null;
  /** contact ID of the student this task belongs to — used to invalidate cache */
  studentContactId?: number;
}

interface InternalTaskEdit {
  kind: "internal";
  id: number;
  title: string;
  description?: string | null;
  status: string;
  assigneeId?: number | null;
  dueDate?: Date | string | null;
}

export type TaskEditPayload = ProjectTaskEdit | InternalTaskEdit;

interface Props {
  task: TaskEditPayload | null;
  open: boolean;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateString(val?: Date | string | null): string {
  if (!val) return "";
  const d = typeof val === "string" ? new Date(val) : val;
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EditTaskModal({ task, open, onClose }: Props) {
  const utils = trpc.useUtils();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState("");

  // Populate form when task changes
  useEffect(() => {
    if (!task) return;
    setTitle(task.title ?? "");
    setStatus(task.status ?? "");
    setDueDate(toDateString(task.dueDate));
    if (task.kind === "project") {
      setPriority(task.priority ?? "Medium");
      setAssigneeId(task.assignedTo ? String(task.assignedTo) : "");
      setDescription("");
    } else {
      setDescription(task.description ?? "");
      setAssigneeId(task.assigneeId ? String(task.assigneeId) : "");
      setPriority("Medium");
    }
  }, [task]);

  // Data for dropdowns
  const { data: teamUsers = [] } = trpc.internalTasks.getTeamUsers.useQuery();
  const { data: contacts = [] } = trpc.contacts.list.useQuery();

  // Mutations
  const updateProject = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.getAll.invalidate();
      if (task?.kind === "project" && task.studentContactId) {
        utils.tasks.getByStudent.invalidate({ studentContactId: task.studentContactId });
      }
      toast.success("Task updated");
      onClose();
    },
    onError: (e) => toast.error("Failed: " + e.message),
  });

  const updateInternal = trpc.internalTasks.update.useMutation({
    onSuccess: () => {
      utils.internalTasks.list.invalidate();
      toast.success("Task updated");
      onClose();
    },
    onError: (e) => toast.error("Failed: " + e.message),
  });

  function handleSave() {
    if (!task || !title.trim()) return;

    if (task.kind === "project") {
      updateProject.mutate({
        id: task.id,
        title: title.trim(),
        status: status as "Todo" | "In Progress" | "Done",
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedTo: assigneeId ? parseInt(assigneeId) : null,
      });
    } else {
      updateInternal.mutate({
        id: task.id,
        title: title.trim(),
        description: description || undefined,
        status: status as "not_started" | "in_progress" | "stuck" | "complete",
        dueDate: dueDate || null,
        assigneeId: assigneeId ? parseInt(assigneeId) : null,
      });
    }
  }

  const isPending = updateProject.isPending || updateInternal.isPending;
  const isProject = task?.kind === "project";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title..."
              className="text-sm"
            />
          </div>

          {/* Description (internal tasks only) */}
          {!isProject && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                className="text-sm min-h-[80px] resize-none"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isProject ? (
                    <>
                      <SelectItem value="Todo" className="text-xs">Todo</SelectItem>
                      <SelectItem value="In Progress" className="text-xs">In Progress</SelectItem>
                      <SelectItem value="Done" className="text-xs">Done</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="not_started" className="text-xs">Not Started</SelectItem>
                      <SelectItem value="in_progress" className="text-xs">In Progress</SelectItem>
                      <SelectItem value="stuck" className="text-xs">Stuck</SelectItem>
                      <SelectItem value="complete" className="text-xs">Complete</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Priority (project tasks only) */}
            {isProject && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High" className="text-xs">High</SelectItem>
                    <SelectItem value="Medium" className="text-xs">Medium</SelectItem>
                    <SelectItem value="Low" className="text-xs">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Due Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            {/* Assignee */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Assign to</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned" className="text-xs text-muted-foreground">
                    Unassigned
                  </SelectItem>
                  {isProject ? (
                    // Project tasks: assign to contacts
                    (contacts as any[]).map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                        <span className="flex items-center gap-1.5">
                          <div className="h-4 w-4 rounded-full bg-green-100 flex items-center justify-center text-[9px] font-bold text-green-700">
                            {(c.firstName ?? "?").charAt(0).toUpperCase()}
                          </div>
                          {c.firstName} {c.lastName}
                        </span>
                      </SelectItem>
                    ))
                  ) : (
                    // Internal tasks: assign to team members
                    (teamUsers as any[]).map((u: any) => (
                      <SelectItem key={u.id} value={String(u.id)} className="text-xs">
                        <span className="flex items-center gap-1.5">
                          <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                            {(u.name ?? "?").charAt(0).toUpperCase()}
                          </div>
                          {u.name}
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending} className="text-sm">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || isPending} className="text-sm">
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

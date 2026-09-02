import React, { useState } from "react";
import { CheckSquare, CheckCircle2, Clock, Calendar, Plus, Trash2, Edit2, AlertCircle, Link2, Loader2, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import confetti from "canvas-confetti";
import PageIdBadge from "@/components/PageIdBadge";

interface TaskItem {
  id: number;
  title: string;
  description?: string;
  status: "Todo" | "In Progress" | "Done";
  dueDate?: string | Date;
  priority?: "High" | "Medium" | "Low";
  smartFileAssignmentId?: number | null;
}

interface PortalTasksTabProps {
  tasks?: TaskItem[];
  studentContactId?: number;
  projectId?: number;
  isAdminView?: boolean;
  refetchTasks?: () => void;
}

export default function PortalTasksTab({
  tasks = [],
  studentContactId,
  projectId,
  isAdminView = false,
  refetchTasks,
}: PortalTasksTabProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [smartFileAssignmentId, setSmartFileAssignmentId] = useState<string>("none");
  const [status, setStatus] = useState<"Todo" | "In Progress" | "Done">("Todo");

  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebratedTaskTitle, setCelebratedTaskTitle] = useState("");

  // Queries & Mutations
  const { data: smartFiles = [] } = trpc.portal.getSmartFilesForStudent.useQuery(
    { studentContactId: studentContactId || 0 },
    { enabled: !!studentContactId }
  );

  const createTaskMutation = trpc.portal.createPortalTask.useMutation({
    onSuccess: () => {
      toast.success("Task created successfully");
      setIsCreateOpen(false);
      refetchTasks?.();
      resetForm();
    },
    onError: (err) => toast.error(err.message || "Failed to create task"),
  });

  const updateTaskMutation = trpc.portal.updatePortalTask.useMutation({
    onSuccess: () => {
      toast.success("Task updated successfully");
      setIsEditOpen(false);
      refetchTasks?.();
    },
    onError: (err) => toast.error(err.message || "Failed to update task"),
  });

  const deleteTaskMutation = trpc.portal.deletePortalTask.useMutation({
    onSuccess: () => {
      toast.success("Task deleted");
      setIsEditOpen(false);
      refetchTasks?.();
    },
    onError: (err) => toast.error(err.message || "Failed to delete task"),
  });

  const completeTaskMutation = trpc.portal.completePortalTask.useMutation({
    onSuccess: (_, variables) => {
      // Find completed task title
      const completed = tasks.find(t => t.id === variables.taskId);
      if (completed) {
        setCelebratedTaskTitle(completed.title);
      }
      setShowCelebration(true);
      triggerConfetti();
      refetchTasks?.();
    },
    onError: (err) => toast.error(err.message || "Failed to complete task"),
  });

  const triggerConfetti = () => {
    // Left side burst
    confetti({
      particleCount: 90,
      angle: 60,
      spread: 60,
      origin: { x: 0, y: 0.8 },
      colors: ["#fbbf24", "#f59e0b", "#3b82f6", "#10b981", "#ffffff"]
    });
    // Right side burst
    confetti({
      particleCount: 90,
      angle: 120,
      spread: 60,
      origin: { x: 1, y: 0.8 },
      colors: ["#fbbf24", "#f59e0b", "#3b82f6", "#10b981", "#ffffff"]
    });
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setPriority("Medium");
    setSmartFileAssignmentId("none");
    setStatus("Todo");
  };

  const handleCreate = () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!projectId) {
      toast.error("No project context available to link task");
      return;
    }
    createTaskMutation.mutate({
      projectId,
      title,
      description: description || undefined,
      dueDate: dueDate || undefined,
      assignedTo: studentContactId || 0,
      priority,
      smartFileAssignmentId: smartFileAssignmentId === "none" ? null : Number(smartFileAssignmentId),
    });
  };

  const handleEditClick = (task: TaskItem) => {
    setSelectedTask(task);
    setTitle(task.title);
    setDescription(task.description || "");
    setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "");
    setPriority(task.priority || "Medium");
    setSmartFileAssignmentId(task.smartFileAssignmentId ? String(task.smartFileAssignmentId) : "none");
    setStatus(task.status);
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedTask) return;
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    updateTaskMutation.mutate({
      id: selectedTask.id,
      title,
      description: description || undefined,
      dueDate: dueDate || undefined,
      priority,
      status,
      smartFileAssignmentId: smartFileAssignmentId === "none" ? null : Number(smartFileAssignmentId),
    });
  };

  const handleDelete = () => {
    if (!selectedTask) return;
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTaskMutation.mutate({ id: selectedTask.id });
    }
  };

  // Group tasks
  const todoTasks = tasks.filter((t) => t.status === "Todo");
  const inProgressTasks = tasks.filter((t) => t.status === "In Progress");
  const doneTasks = tasks.filter((t) => t.status === "Done");

  const getPriorityBadge = (p?: string) => {
    switch (p) {
      case "High":
        return <Badge className="bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-semibold">High</Badge>;
      case "Low":
        return <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-semibold">Low</Badge>;
      default:
        return <Badge className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-semibold">Medium</Badge>;
    }
  };

  if (isAdminView) {
    return (
      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-900/40 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.2)]">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  Project Tasks (Advocate View)
                </h2>
                <PageIdBadge id="PG-023-TSK" name="Portal Tasks" />
              </div>
              <p className="text-xs sm:text-sm text-white/60 mt-0.5">Manage and assign task checklists to the client portal</p>
            </div>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsCreateOpen(true);
            }}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold gap-1.5 rounded-xl text-xs px-4 py-2 shadow-[0_0_15px_rgba(245,181,68,0.25)]"
          >
            <Plus className="w-4 h-4" /> Add Task
          </Button>
        </div>

        {/* Kanban Board Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* TODO */}
          <div className="space-y-4 bg-[#06172F] border border-blue-900/40 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-blue-900/40 pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                Todo
              </h3>
              <Badge className="bg-[#030C22] border border-blue-900/40 text-white text-xs px-2 py-0.5">{todoTasks.length}</Badge>
            </div>
            <div className="space-y-3">
              {todoTasks.length === 0 ? (
                <p className="text-xs text-white/40 italic py-6 text-center">No tasks to do</p>
              ) : (
                todoTasks.map((t) => (
                  <Card key={t.id} onClick={() => handleEditClick(t)} className="border-blue-900/40 bg-[#030C22] text-white hover:border-amber-400/50 hover:bg-[#081B36] transition-all cursor-pointer shadow-md rounded-xl">
                    <CardContent className="p-3.5 space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-white line-clamp-2">{t.title}</h4>
                          {getPriorityBadge(t.priority)}
                        </div>
                        {t.description && <p className="text-[11px] text-white/60 line-clamp-2">{t.description}</p>}
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-blue-900/30">
                        {t.dueDate ? (
                          <span className="text-[9px] text-white/60 flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3 text-amber-400" /> {new Date(t.dueDate).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-[9px] text-white/40">No due date</span>
                        )}
                        {t.smartFileAssignmentId && (
                          <span className="text-[9px] text-amber-300 font-semibold flex items-center gap-1">
                            <Link2 className="w-3 h-3" /> Smart File
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* IN PROGRESS */}
          <div className="space-y-4 bg-[#06172F] border border-blue-900/40 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-blue-900/40 pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                In Progress
              </h3>
              <Badge className="bg-[#030C22] border border-blue-900/40 text-white text-xs px-2 py-0.5">{inProgressTasks.length}</Badge>
            </div>
            <div className="space-y-3">
              {inProgressTasks.length === 0 ? (
                <p className="text-xs text-white/40 italic py-6 text-center">No tasks in progress</p>
              ) : (
                inProgressTasks.map((t) => (
                  <Card key={t.id} onClick={() => handleEditClick(t)} className="border-blue-900/40 bg-[#030C22] text-white hover:border-amber-400/50 hover:bg-[#081B36] transition-all cursor-pointer shadow-md rounded-xl">
                    <CardContent className="p-3.5 space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-white line-clamp-2">{t.title}</h4>
                          {getPriorityBadge(t.priority)}
                        </div>
                        {t.description && <p className="text-[11px] text-white/60 line-clamp-2">{t.description}</p>}
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-blue-900/30">
                        {t.dueDate ? (
                          <span className="text-[9px] text-white/60 flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3 text-amber-400" /> {new Date(t.dueDate).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-[9px] text-white/40">No due date</span>
                        )}
                        {t.smartFileAssignmentId && (
                          <span className="text-[9px] text-amber-300 font-semibold flex items-center gap-1">
                            <Link2 className="w-3 h-3" /> Smart File
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* DONE */}
          <div className="space-y-4 bg-[#06172F] border border-blue-900/40 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-blue-900/40 pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                Done
              </h3>
              <Badge className="bg-[#030C22] border border-blue-900/40 text-white text-xs px-2 py-0.5">{doneTasks.length}</Badge>
            </div>
            <div className="space-y-3">
              {doneTasks.length === 0 ? (
                <p className="text-xs text-white/40 italic py-6 text-center">No completed tasks</p>
              ) : (
                doneTasks.map((t) => (
                  <Card key={t.id} onClick={() => handleEditClick(t)} className="border-blue-900/30 bg-[#030C22]/50 text-white/60 hover:border-blue-900/60 transition-all cursor-pointer rounded-xl">
                    <CardContent className="p-3.5 space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-semibold line-through text-white/50 line-clamp-2">{t.title}</h4>
                          <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">Done</span>
                        </div>
                        {t.description && <p className="text-[11px] text-white/40 line-clamp-1">{t.description}</p>}
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-blue-900/20">
                        <span className="text-[9px] text-emerald-400 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                        {t.smartFileAssignmentId && (
                          <span className="text-[9px] text-white/40 flex items-center gap-1">
                            <Link2 className="w-3 h-3" /> Smart File
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Create Task Modal */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="bg-[#06172F] border border-blue-900/40 text-white rounded-2xl max-w-md p-6 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-white">Create New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-xs font-semibold text-white/80">Task Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Upload your child's IEP report"
                  className="bg-[#030C22] border-blue-900/40 text-white placeholder:text-white/40 focus:border-amber-400/60 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc" className="text-xs font-semibold text-white/80">Description</Label>
                <Textarea
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter details or instructions for this task..."
                  rows={3}
                  className="bg-[#030C22] border-blue-900/40 text-white placeholder:text-white/40 focus:border-amber-400/60 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dueDate" className="text-xs font-semibold text-white/80">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="bg-[#030C22] border-blue-900/40 text-white focus:border-amber-400/60 rounded-xl font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-white/80">Priority</Label>
                  <Select value={priority} onValueChange={(val: any) => setPriority(val)}>
                    <SelectTrigger className="bg-[#030C22] border-blue-900/40 text-white rounded-xl">
                      <SelectValue placeholder="Select Priority" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#06172F] border-blue-900/40 text-white">
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-white/80">Attach Smart File (Optional)</Label>
                <Select value={smartFileAssignmentId} onValueChange={setSmartFileAssignmentId}>
                  <SelectTrigger className="bg-[#030C22] border-blue-900/40 text-white rounded-xl">
                    <SelectValue placeholder="Select Smart File" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#06172F] border-blue-900/40 text-white">
                    <SelectItem value="none">None - Manual Completion</SelectItem>
                    {smartFiles.map((sf: any) => (
                      <SelectItem key={sf.id} value={String(sf.id)}>
                        {sf.name || "Untitled Document"} ({sf.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-white/50 mt-1">If linked, the client must complete this document to complete the task.</p>
              </div>
            </div>
            <DialogFooter className="flex justify-between sm:justify-between items-center border-t border-blue-900/40 pt-4">
              <Button onClick={() => setIsCreateOpen(false)} variant="outline" className="border-blue-900/40 bg-blue-950/30 hover:bg-blue-900/40 text-white rounded-xl px-4 py-2 text-xs">
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createTaskMutation.isPending}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl px-4 py-2 text-xs gap-1.5 shadow-[0_0_12px_rgba(245,181,68,0.25)]"
              >
                {createTaskMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Create Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Task Modal */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="bg-[#06172F] border border-blue-900/40 text-white rounded-2xl max-w-md p-6 shadow-2xl">
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle className="text-lg font-bold text-white">Edit Task</DialogTitle>
              <Button
                variant="ghost"
                onClick={handleDelete}
                disabled={deleteTaskMutation.isPending}
                className="hover:bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-1 h-auto text-[11px] rounded-lg flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </Button>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title" className="text-xs font-semibold text-white/80">Task Title</Label>
                <Input
                  id="edit-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-[#030C22] border-blue-900/40 text-white focus:border-amber-400/60 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-desc" className="text-xs font-semibold text-white/80">Description</Label>
                <Textarea
                  id="edit-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="bg-[#030C22] border-blue-900/40 text-white focus:border-amber-400/60 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-dueDate" className="text-xs font-semibold text-white/80">Due Date</Label>
                  <Input
                    id="edit-dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="bg-[#030C22] border-blue-900/40 text-white focus:border-amber-400/60 rounded-xl font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-white/80">Priority</Label>
                  <Select value={priority} onValueChange={(val: any) => setPriority(val)}>
                    <SelectTrigger className="bg-[#030C22] border-blue-900/40 text-white rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#06172F] border-blue-900/40 text-white">
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-white/80">Status</Label>
                  <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                    <SelectTrigger className="bg-[#030C22] border-blue-900/40 text-white rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#06172F] border-blue-900/40 text-white">
                      <SelectItem value="Todo">Todo</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-white/80">Attach Smart File</Label>
                  <Select value={smartFileAssignmentId} onValueChange={setSmartFileAssignmentId}>
                    <SelectTrigger className="bg-[#030C22] border-blue-900/40 text-white rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#06172F] border-blue-900/40 text-white">
                      <SelectItem value="none">None - Manual</SelectItem>
                      {smartFiles.map((sf: any) => (
                        <SelectItem key={sf.id} value={String(sf.id)}>
                          {sf.name || "Untitled"} ({sf.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter className="flex justify-between sm:justify-between items-center border-t border-blue-900/40 pt-4">
              <Button onClick={() => setIsEditOpen(false)} variant="outline" className="border-blue-900/40 bg-blue-950/30 hover:bg-blue-900/40 text-white rounded-xl px-4 py-2 text-xs">
                Cancel
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={updateTaskMutation.isPending}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl px-4 py-2 text-xs gap-1.5 shadow-[0_0_12px_rgba(245,181,68,0.25)]"
              >
                {updateTaskMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Client view
  const clientPendingTasks = tasks.filter((t) => t.status !== "Done");
  const clientCompletedTasks = tasks.filter((t) => t.status === "Done");

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-900/40 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.2)]">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                Action Items & Tasks
              </h2>
              <PageIdBadge id="PG-023-TSK" name="Portal Tasks" />
            </div>
            <p className="text-xs sm:text-sm text-white/60 mt-0.5">Key preparation steps assigned by your advocate</p>
          </div>
        </div>
        <Badge className="bg-amber-400/15 text-amber-300 border border-amber-400/30 text-xs px-3 py-1 font-semibold rounded-full shadow-sm self-start sm:self-auto">
          {clientPendingTasks.length} Pending Actions
        </Badge>
      </div>

      {/* Pending Tasks */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">PENDING ACTION ITEMS</h3>
        {clientPendingTasks.length === 0 ? (
          <div className="p-8 bg-[#06172F] border border-blue-900/40 rounded-2xl text-center text-white/70 text-xs shadow-xl space-y-1">
            <p className="text-sm font-bold text-white">🎉 All action items are complete!</p>
            <p className="text-white/50">You are all caught up on your advocacy milestones.</p>
          </div>
        ) : (
          clientPendingTasks.map((task) => {
            const hasSmartFile = !!task.smartFileAssignmentId;
            // Fetch match for linked smart file details from smartFiles query
            const matchedSf = smartFiles.find((s: any) => s.id === task.smartFileAssignmentId);
            const isSfCompleted = matchedSf?.status === "completed";

            return (
              <Card key={task.id} className="border-blue-900/40 bg-[#06172F] text-white shadow-xl hover:border-amber-400/50 hover:bg-[#081B36] transition-all rounded-2xl">
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5 min-w-0">
                    {!hasSmartFile ? (
                      <button
                        onClick={() => completeTaskMutation.mutate({ taskId: task.id, studentContactId: studentContactId || 0 })}
                        disabled={completeTaskMutation.isPending}
                        className="w-6 h-6 rounded-lg border border-blue-900/60 bg-[#030C22] hover:border-amber-400 flex items-center justify-center shrink-0 mt-0.5 transition-colors cursor-pointer group"
                        title="Mark Task Completed"
                      >
                        <span className="w-2.5 h-2.5 bg-transparent group-hover:bg-amber-400 rounded-sm transition-colors" />
                      </button>
                    ) : (
                      <div className="w-6 h-6 rounded-lg bg-[#030C22] border border-blue-900/40 flex items-center justify-center shrink-0 mt-0.5">
                        <Link2 className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                    )}
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white">{task.title}</h4>
                        {getPriorityBadge(task.priority)}
                        {task.dueDate && (
                          <span className="text-[10px] font-semibold text-white/50 flex items-center gap-1 font-mono">
                            · Due {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-xs text-white/70 leading-relaxed">{task.description}</p>
                      )}
                      {hasSmartFile && matchedSf && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-amber-400/10 text-amber-300 border border-amber-400/30">
                            Attached File: {matchedSf.name}
                          </span>
                          <span className={`text-[9px] font-semibold rounded-md px-1.5 py-0.5 capitalize ${
                            isSfCompleted ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                          }`}>
                            Status: {matchedSf.status}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions column on the right */}
                  <div className="shrink-0 flex items-center gap-2 self-end md:self-center">
                    {hasSmartFile && !isSfCompleted && (
                      <a
                        href={`/smart-files/response/${task.smartFileAssignmentId}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-[0_0_12px_rgba(245,181,68,0.25)]"
                      >
                        Fill Attached Document
                      </a>
                    )}
                    {hasSmartFile && isSfCompleted && (
                      <Button
                        onClick={() => completeTaskMutation.mutate({ taskId: task.id, studentContactId: studentContactId || 0 })}
                        disabled={completeTaskMutation.isPending}
                        className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold px-4 py-2 rounded-xl text-xs"
                      >
                        Confirm Task Completion
                      </Button>
                    )}
                    {!hasSmartFile && (
                      <Button
                        onClick={() => completeTaskMutation.mutate({ taskId: task.id, studentContactId: studentContactId || 0 })}
                        disabled={completeTaskMutation.isPending}
                        className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-[0_0_12px_rgba(245,181,68,0.25)] transition-all"
                      >
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Completed Tasks */}
      {clientCompletedTasks.length > 0 && (
        <div className="space-y-3 pt-6 border-t border-blue-900/40">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 font-mono">COMPLETED ACTIONS</h3>
          {clientCompletedTasks.map((task) => (
            <Card key={task.id} className="border-blue-900/30 bg-[#030C22] text-white/60 rounded-xl shadow-md">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs line-through text-white/60 font-medium">{task.title}</span>
                </div>
                {task.smartFileAssignmentId && (
                  <span className="text-[9px] text-white/40 border border-blue-900/40 px-2 py-0.5 rounded-md font-mono">
                    Linked Smart File Complete
                  </span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Flashing Celebration Modal Overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 bg-[#000821]/80 backdrop-blur-md flex items-center justify-center p-4 transition-all animate-in fade-in">
          <div className="relative bg-gradient-to-br from-[#0B2553] via-[#071D40] to-[#04122C] border border-amber-400/60 rounded-3xl max-w-sm w-full p-8 text-center shadow-[0_4px_30px_rgba(11,37,83,0.35)] ring-1 ring-amber-400/30 animate-in zoom-in-95 duration-200 text-white">
            {/* Pulsing visual checks */}
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-4 relative">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-pulse" />
              <div className="absolute inset-0 rounded-full border border-emerald-400/30 animate-ping" />
            </div>

            <h3 className="text-xl font-bold text-white tracking-tight">Task Completed!</h3>
            <p className="text-amber-300 text-xs font-semibold mt-1 tracking-wider uppercase flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Great Job! <Sparkles className="w-3.5 h-3.5" />
            </p>

            <div className="my-4 p-3.5 bg-[#030C22] rounded-xl border border-blue-900/40">
              <p className="text-xs font-bold text-white">"{celebratedTaskTitle}"</p>
              <p className="text-[10px] text-white/50 mt-1">Your progress was automatically synced with your advocate.</p>
            </div>

            <div className="flex gap-3 justify-center pt-2">
              <Button
                onClick={() => triggerConfetti()}
                variant="outline"
                className="border-blue-900/40 bg-blue-950/30 hover:bg-blue-900/40 text-white text-xs font-bold rounded-xl px-4 py-2"
              >
                More Confetti! 🎉
              </Button>
              <Button
                onClick={() => {
                  setShowCelebration(false);
                  setCelebratedTaskTitle("");
                }}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-xl px-6 py-2 shadow-[0_0_12px_rgba(245,181,68,0.25)]"
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

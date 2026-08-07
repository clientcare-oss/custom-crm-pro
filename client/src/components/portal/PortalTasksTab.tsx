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
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">High</Badge>;
      case "Low":
        return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-[10px]">Low</Badge>;
      default:
        return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">Medium</Badge>;
    }
  };

  if (isAdminView) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-amber-400" />
              Project Tasks (Advocate View)
            </h2>
            <p className="text-xs text-slate-400 mt-1">Manage and assign task checklists to the client portal</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsCreateOpen(true);
            }}
            className="bg-amber-400 hover:bg-amber-500 text-[#07111E] font-bold gap-1 rounded-lg text-xs"
          >
            <Plus className="w-4 h-4" /> Add Task
          </Button>
        </div>

        {/* Kanban Board Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* TODO */}
          <div className="space-y-4 bg-[#07111E]/40 border border-slate-800/60 rounded-xl p-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                Todo
              </h3>
              <Badge className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5">{todoTasks.length}</Badge>
            </div>
            <div className="space-y-3">
              {todoTasks.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">No tasks to do</p>
              ) : (
                todoTasks.map((t) => (
                  <Card key={t.id} onClick={() => handleEditClick(t)} className="border-slate-800 bg-[#0A1628]/80 text-slate-100 hover:border-slate-700 transition-all cursor-pointer">
                    <CardContent className="p-3.5 space-y-3.5">
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-white line-clamp-2">{t.title}</h4>
                          {getPriorityBadge(t.priority)}
                        </div>
                        {t.description && <p className="text-[11px] text-slate-400 line-clamp-2">{t.description}</p>}
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-850">
                        {t.dueDate ? (
                          <span className="text-[9px] text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-amber-400/80" /> {new Date(t.dueDate).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-500">No due date</span>
                        )}
                        {t.smartFileAssignmentId && (
                          <span className="text-[9px] text-amber-400/90 font-medium flex items-center gap-1">
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
          <div className="space-y-4 bg-[#07111E]/40 border border-slate-800/60 rounded-xl p-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400/80" />
                In Progress
              </h3>
              <Badge className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5">{inProgressTasks.length}</Badge>
            </div>
            <div className="space-y-3">
              {inProgressTasks.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">No tasks in progress</p>
              ) : (
                inProgressTasks.map((t) => (
                  <Card key={t.id} onClick={() => handleEditClick(t)} className="border-slate-800 bg-[#0A1628]/80 text-slate-100 hover:border-slate-700 transition-all cursor-pointer">
                    <CardContent className="p-3.5 space-y-3.5">
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-white line-clamp-2">{t.title}</h4>
                          {getPriorityBadge(t.priority)}
                        </div>
                        {t.description && <p className="text-[11px] text-slate-400 line-clamp-2">{t.description}</p>}
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-850">
                        {t.dueDate ? (
                          <span className="text-[9px] text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-amber-400/80" /> {new Date(t.dueDate).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-500">No due date</span>
                        )}
                        {t.smartFileAssignmentId && (
                          <span className="text-[9px] text-amber-400/90 font-medium flex items-center gap-1">
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
          <div className="space-y-4 bg-[#07111E]/40 border border-slate-800/60 rounded-xl p-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                Done
              </h3>
              <Badge className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5">{doneTasks.length}</Badge>
            </div>
            <div className="space-y-3">
              {doneTasks.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">No completed tasks</p>
              ) : (
                doneTasks.map((t) => (
                  <Card key={t.id} onClick={() => handleEditClick(t)} className="border-slate-800 bg-[#0A1628]/40 text-slate-400 hover:border-slate-700 transition-all cursor-pointer">
                    <CardContent className="p-3.5 space-y-3.5">
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-semibold line-through text-slate-350 line-clamp-2">{t.title}</h4>
                          <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">Done</span>
                        </div>
                        {t.description && <p className="text-[11px] text-slate-500 line-clamp-1">{t.description}</p>}
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
                        <span className="text-[9px] text-slate-500 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Completed
                        </span>
                        {t.smartFileAssignmentId && (
                          <span className="text-[9px] text-slate-500 flex items-center gap-1">
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
          <DialogContent className="bg-[#0A1628] border border-slate-800 text-white rounded-xl max-w-md p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-white">Create New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-xs font-semibold text-slate-300">Task Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Upload your child's IEP report"
                  className="bg-[#07111E] border-slate-800 text-white focus:border-amber-400 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc" className="text-xs font-semibold text-slate-300">Description</Label>
                <Textarea
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter details or instructions for this task..."
                  rows={3}
                  className="bg-[#07111E] border-slate-800 text-white focus:border-amber-400 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dueDate" className="text-xs font-semibold text-slate-300">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="bg-[#07111E] border-slate-800 text-white focus:border-amber-400 rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-300">Priority</Label>
                  <Select value={priority} onValueChange={(val: any) => setPriority(val)}>
                    <SelectTrigger className="bg-[#07111E] border-slate-800 text-white rounded-lg">
                      <SelectValue placeholder="Select Priority" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A1628] border-slate-850 text-white">
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-300">Attach Smart File (Optional)</Label>
                <Select value={smartFileAssignmentId} onValueChange={setSmartFileAssignmentId}>
                  <SelectTrigger className="bg-[#07111E] border-slate-800 text-white rounded-lg">
                    <SelectValue placeholder="Select Smart File" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A1628] border-slate-850 text-white">
                    <SelectItem value="none">None - Manual Completion</SelectItem>
                    {smartFiles.map((sf: any) => (
                      <SelectItem key={sf.id} value={String(sf.id)}>
                        {sf.name || "Untitled Document"} ({sf.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-400 mt-1">If linked, the client must complete this document to complete the task.</p>
              </div>
            </div>
            <DialogFooter className="flex justify-between sm:justify-between items-center border-t border-slate-800/80 pt-4">
              <Button onClick={() => setIsCreateOpen(false)} className="bg-transparent hover:bg-slate-850 text-slate-400 rounded-lg px-4 py-1.5 text-xs">
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createTaskMutation.isPending}
                className="bg-amber-400 hover:bg-amber-500 text-[#07111E] font-bold rounded-lg px-4 py-1.5 text-xs gap-1.5"
              >
                {createTaskMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Create Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Task Modal */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="bg-[#0A1628] border border-slate-800 text-white rounded-xl max-w-md p-6">
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle className="text-lg font-bold text-white">Edit Task</DialogTitle>
              <Button
                variant="ghost"
                onClick={handleDelete}
                disabled={deleteTaskMutation.isPending}
                className="hover:bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 h-auto text-[10px] flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </Button>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title" className="text-xs font-semibold text-slate-300">Task Title</Label>
                <Input
                  id="edit-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-[#07111E] border-slate-800 text-white focus:border-amber-400 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-desc" className="text-xs font-semibold text-slate-300">Description</Label>
                <Textarea
                  id="edit-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="bg-[#07111E] border-slate-800 text-white focus:border-amber-400 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-dueDate" className="text-xs font-semibold text-slate-300">Due Date</Label>
                  <Input
                    id="edit-dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="bg-[#07111E] border-slate-800 text-white focus:border-amber-400 rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-300">Priority</Label>
                  <Select value={priority} onValueChange={(val: any) => setPriority(val)}>
                    <SelectTrigger className="bg-[#07111E] border-slate-800 text-white rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A1628] border-slate-850 text-white">
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-300">Status</Label>
                  <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                    <SelectTrigger className="bg-[#07111E] border-slate-800 text-white rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A1628] border-slate-850 text-white">
                      <SelectItem value="Todo">Todo</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-300">Attach Smart File</Label>
                  <Select value={smartFileAssignmentId} onValueChange={setSmartFileAssignmentId}>
                    <SelectTrigger className="bg-[#07111E] border-slate-800 text-white rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A1628] border-slate-850 text-white">
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
            <DialogFooter className="flex justify-between sm:justify-between items-center border-t border-slate-800/80 pt-4">
              <Button onClick={() => setIsEditOpen(false)} className="bg-transparent hover:bg-slate-850 text-slate-400 rounded-lg px-4 py-1.5 text-xs">
                Cancel
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={updateTaskMutation.isPending}
                className="bg-amber-400 hover:bg-amber-500 text-[#07111E] font-bold rounded-lg px-4 py-1.5 text-xs gap-1.5"
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
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-amber-400" />
            Action Items & Tasks
          </h2>
          <p className="text-xs text-slate-400 mt-1">Key preparation steps assigned by your advocate</p>
        </div>
        <Badge className="bg-amber-400/10 text-amber-300 border-amber-400/30 text-xs px-3 py-1">
          {clientPendingTasks.length} Pending Actions
        </Badge>
      </div>

      {/* Pending Tasks */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">PENDING ACTION ITEMS</h3>
        {clientPendingTasks.length === 0 ? (
          <div className="p-6 bg-[#0A1628]/60 border border-slate-800 rounded-xl text-center text-slate-400 text-xs">
            🎉 All action items are complete! You are all caught up.
          </div>
        ) : (
          clientPendingTasks.map((task) => {
            const hasSmartFile = !!task.smartFileAssignmentId;
            // Fetch match for linked smart file details from smartFiles query
            const matchedSf = smartFiles.find((s: any) => s.id === task.smartFileAssignmentId);
            const isSfCompleted = matchedSf?.status === "completed";

            return (
              <Card key={task.id} className="border-slate-800 bg-[#0A1628]/95 text-slate-100 shadow-md hover:border-slate-700 transition-all">
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    {!hasSmartFile ? (
                      <button
                        onClick={() => completeTaskMutation.mutate({ taskId: task.id, studentContactId: studentContactId || 0 })}
                        disabled={completeTaskMutation.isPending}
                        className="w-5.5 h-5.5 rounded border border-slate-650 bg-slate-900 hover:border-amber-400 flex items-center justify-center shrink-0 mt-0.5 transition-colors cursor-pointer group animate-pulse"
                        title="Mark Task Completed"
                      >
                        <span className="w-2.5 h-2.5 bg-transparent group-hover:bg-amber-400/45 rounded-sm transition-colors" />
                      </button>
                    ) : (
                      <div className="w-5.5 h-5.5 rounded bg-slate-900/50 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                        <Link2 className="w-3 h-3 text-amber-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white">{task.title}</h4>
                        {getPriorityBadge(task.priority)}
                        {task.dueDate && (
                          <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                            · Due {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-xs text-slate-350 mt-1 leading-relaxed">{task.description}</p>
                      )}
                      {hasSmartFile && matchedSf && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-amber-400/5 text-amber-400 border border-amber-400/20">
                            Attached File: {matchedSf.name}
                          </span>
                          <span className={`text-[9px] font-semibold rounded px-1.5 py-0.2 capitalize ${
                            isSfCompleted ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"
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
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-amber-400 hover:bg-amber-500 text-[#07111E] text-xs font-bold rounded-lg transition-colors shadow-lg shadow-amber-400/10"
                      >
                        Fill Attached Document
                      </a>
                    )}
                    {hasSmartFile && isSfCompleted && (
                      <Button
                        onClick={() => completeTaskMutation.mutate({ taskId: task.id, studentContactId: studentContactId || 0 })}
                        disabled={completeTaskMutation.isPending}
                        className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-350 border border-emerald-500/30 font-bold px-3 py-1.5 rounded-lg text-xs"
                      >
                        Confirm Task Completion
                      </Button>
                    )}
                    {!hasSmartFile && (
                      <Button
                        onClick={() => completeTaskMutation.mutate({ taskId: task.id, studentContactId: studentContactId || 0 })}
                        disabled={completeTaskMutation.isPending}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3.5 py-1.5 rounded-lg text-xs border border-slate-750"
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
        <div className="space-y-3 pt-6 border-t border-slate-800/80">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">COMPLETED ACTIONS</h3>
          {clientCompletedTasks.map((task) => (
            <Card key={task.id} className="border-slate-850/60 bg-[#0A1628]/30 text-slate-400">
              <CardContent className="p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                  <span className="text-xs line-through text-slate-450 font-medium">{task.title}</span>
                </div>
                {task.smartFileAssignmentId && (
                  <span className="text-[9px] text-slate-500 border border-slate-800 px-1.5 py-0.5 rounded">
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
        <div className="fixed inset-0 z-50 bg-[#07111E]/80 backdrop-blur-md flex items-center justify-center p-4 transition-all animate-in fade-in">
          <div className="relative bg-gradient-to-br from-[#0A1628] to-[#122543] border border-amber-400/40 rounded-2xl max-w-sm w-full p-8 text-center shadow-2xl ring-2 ring-amber-400/10 animate-in zoom-in-95 duration-200">
            {/* Pulsing visual checks */}
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4 relative">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-pulse" />
              <div className="absolute inset-0 rounded-full border border-emerald-400/20 animate-ping" />
            </div>

            <h3 className="text-xl font-bold text-white tracking-tight">Task Completed!</h3>
            <p className="text-amber-300 text-xs font-semibold mt-1 tracking-wider uppercase flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Great Job! <Sparkles className="w-3.5 h-3.5" />
            </p>

            <div className="my-4 p-3 bg-[#07111E]/80 rounded-xl border border-slate-800">
              <p className="text-xs font-bold text-slate-200">"{celebratedTaskTitle}"</p>
              <p className="text-[10px] text-slate-400 mt-1">Your progress was automatically synced with your advocate.</p>
            </div>

            <div className="flex gap-3 justify-center pt-2">
              <Button
                onClick={() => triggerConfetti()}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg px-3.5 py-1.5 border border-slate-750"
              >
                More Confetti! 🎉
              </Button>
              <Button
                onClick={() => {
                  setShowCelebration(false);
                  setCelebratedTaskTitle("");
                }}
                className="bg-amber-400 hover:bg-amber-500 text-[#07111E] text-xs font-bold rounded-lg px-6 py-1.5 shadow-lg shadow-amber-400/10"
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

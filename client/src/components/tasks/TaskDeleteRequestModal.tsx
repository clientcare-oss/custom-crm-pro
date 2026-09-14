import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Send, Calendar, FolderOpen, User, ListChecks } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export interface TaskToDeleteInfo {
  id: number;
  title: string;
  type: "general" | "project";
  description?: string | null;
  projectName?: string | null;
  studentName?: string | null;
  dueDate?: Date | string | null;
  subtaskCount?: number;
}

interface TaskDeleteRequestModalProps {
  open: boolean;
  onClose: () => void;
  task: TaskToDeleteInfo | null;
  onSuccess?: () => void;
}

export function TaskDeleteRequestModal({
  open,
  onClose,
  task,
  onSuccess,
}: TaskDeleteRequestModalProps) {
  const [reason, setReason] = useState("");
  const utils = trpc.useUtils();

  const requestDeletionMutation = trpc.internalTasks.requestDeletion.useMutation({
    onSuccess: () => {
      toast.success("Deletion request sent to owner for review");
      utils.internalTasks.list.invalidate();
      utils.internalTasks.listDeletionRequests.invalidate();
      utils.tasks.getAll.invalidate();
      setReason("");
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to submit deletion request");
    },
  });

  if (!task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    requestDeletionMutation.mutate({
      taskId: task.id,
      taskType: task.type,
      reason: reason.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-md max-h-[82vh] flex flex-col p-0 overflow-hidden rounded-xl border border-amber-500/30 bg-[#091528] text-slate-100 shadow-2xl">
        <DialogHeader className="shrink-0 px-5 pt-4 pb-3 border-b border-blue-900/40 space-y-2">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <ShieldAlert className="h-4.5 w-4.5" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold text-white">
                Delete Request Required
              </DialogTitle>
              <DialogDescription className="text-[11px] text-slate-400">
                Supervisor-assigned task protection
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-3.5 space-y-3.5 min-h-0 text-xs sm:text-sm">
          {/* Main Notice Quote */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200">
            <p className="text-xs sm:text-sm font-medium leading-snug">
              You may not delete this task. It was assigned by owner or supervisor.
            </p>
            <p className="text-xs text-amber-300/90 mt-1 font-semibold">
              Request delete from them?
            </p>
          </div>

          {/* Task Snapshot Preview */}
          <div className="rounded-xl border border-blue-900/60 bg-[#040D1A]/80 p-3 space-y-2 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-slate-400">Task To Delete</span>
              <Badge
                variant="outline"
                className="text-[10px] font-semibold uppercase tracking-wider bg-blue-950/80 text-sky-300 border-blue-800/60"
              >
                {task.type === "general" ? "General Task" : "Case Task"}
              </Badge>
            </div>

            <p className="text-xs sm:text-sm font-bold text-white leading-snug truncate min-w-0" title={task.title}>
              {task.title}
            </p>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1 border-t border-blue-900/40">
              {task.studentName && (
                <span className="flex items-center gap-1 text-slate-300 truncate max-w-[160px]" title={task.studentName}>
                  <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="truncate">{task.studentName}</span>
                </span>
              )}
              {task.projectName && !task.studentName && (
                <span className="flex items-center gap-1 text-slate-300 truncate max-w-[160px]" title={task.projectName}>
                  <FolderOpen className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="truncate">{task.projectName}</span>
                </span>
              )}
              {task.dueDate && (
                <span className="flex items-center gap-1 text-slate-400">
                  <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  {new Date(task.dueDate).toLocaleDateString()}
                </span>
              )}
              {typeof task.subtaskCount === "number" && task.subtaskCount > 0 && (
                <span className="flex items-center gap-1 text-slate-400">
                  <ListChecks className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  {task.subtaskCount} subtask{task.subtaskCount === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>

          {/* Reason Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Reason for deletion request <span className="text-slate-500 font-normal">(optional)</span>:
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Duplicate task, goals resolved in prior IEP meeting, or parent canceled..."
              className="resize-none min-h-[60px] bg-[#040D1A] border-blue-900/70 text-slate-100 placeholder:text-slate-500 focus-visible:ring-amber-400/50 text-xs"
            />
            <p className="text-[10px] text-slate-400 leading-tight">
              A message will be sent to the owner with the entire task details so they can review and approve or decline.
            </p>
          </div>
        </div>

        <DialogFooter className="shrink-0 px-5 py-3 border-t border-blue-900/40 bg-blue-950/20 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-blue-950/60 text-xs h-8"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={requestDeletionMutation.isPending}
            className="gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold shadow-xs text-xs h-8"
          >
            <Send className="h-3.5 w-3.5" />
            {requestDeletionMutation.isPending ? "Sending..." : "Request Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

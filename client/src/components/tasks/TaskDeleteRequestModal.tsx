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
      <DialogContent className="max-w-md border-amber-500/30 bg-[#091528] text-slate-100 shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-bold text-white">
                Delete Request Required
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Supervisor-assigned task protection
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Main Notice Quote */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-200">
            <p className="text-sm font-medium leading-snug">
              You may not delete this task. It was assigned by owner or supervisor.
            </p>
            <p className="text-xs text-amber-300/90 mt-1 font-semibold">
              Request delete from them?
            </p>
          </div>

          {/* Task Snapshot Preview */}
          <div className="rounded-xl border border-blue-900/60 bg-[#040D1A]/80 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-400">Task To Delete</span>
              <Badge
                variant="outline"
                className="text-[10px] font-semibold uppercase tracking-wider bg-blue-950/80 text-sky-300 border-blue-800/60"
              >
                {task.type === "general" ? "General Task" : "Case Task"}
              </Badge>
            </div>

            <p className="text-sm font-bold text-white leading-snug">
              {task.title}
            </p>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1 border-t border-blue-900/40">
              {task.studentName && (
                <span className="flex items-center gap-1 text-slate-300">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  {task.studentName}
                </span>
              )}
              {task.projectName && !task.studentName && (
                <span className="flex items-center gap-1 text-slate-300">
                  <FolderOpen className="w-3.5 h-3.5 text-purple-400" />
                  {task.projectName}
                </span>
              )}
              {task.dueDate && (
                <span className="flex items-center gap-1 text-slate-400">
                  <Calendar className="w-3.5 h-3.5 text-sky-400" />
                  {new Date(task.dueDate).toLocaleDateString()}
                </span>
              )}
              {typeof task.subtaskCount === "number" && task.subtaskCount > 0 && (
                <span className="flex items-center gap-1 text-slate-400">
                  <ListChecks className="w-3.5 h-3.5 text-emerald-400" />
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
              className="resize-none min-h-[70px] bg-[#040D1A] border-blue-900/70 text-slate-100 placeholder:text-slate-500 focus-visible:ring-amber-400/50"
            />
            <p className="text-[11px] text-slate-400 leading-tight">
              A message will be sent to the owner with the entire task details so they can review and approve or decline.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-blue-900/40">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-blue-950/60"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={requestDeletionMutation.isPending}
            className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold shadow-md shadow-amber-500/20"
          >
            <Send className="h-4 w-4" />
            {requestDeletionMutation.isPending ? "Sending Request..." : "Request Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

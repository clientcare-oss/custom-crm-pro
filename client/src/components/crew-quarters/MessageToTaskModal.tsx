import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckSquare, Calendar, User, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MessageToTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: {
    id: number;
    body: string;
    senderName?: string | null;
  } | null;
  linkedStudentId?: number;
  onSuccess?: () => void;
}

export default function MessageToTaskModal({
  open,
  onOpenChange,
  message,
  linkedStudentId,
  onSuccess,
}: MessageToTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState("");

  const utils = trpc.useUtils();

  useEffect(() => {
    if (message) {
      // Derive clean title from first sentence or 60 chars of body
      const cleanBody = message.body.replace(/^📋\s*\[Action Request:[^\]]+\]\s*/, "");
      const firstLine = cleanBody.split("\n")[0] || cleanBody;
      const derivedTitle = firstLine.length > 70 ? firstLine.slice(0, 67) + "..." : firstLine;
      setTitle(derivedTitle || "Task from message");
      setDescription(
        `Originated from internal message by ${message.senderName || "Advocate"}:\n\n"${cleanBody}"`
      );

      // Default due date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDueDate(tomorrow.toISOString().split("T")[0]);
    }
  }, [message]);

  const convertMutation = trpc.crewMessages.convertToTask.useMutation({
    onSuccess: () => {
      toast.success("Task created and linked to message!");
      utils.crewMessages.getMessages.invalidate();
      utils.crewMessages.getLinkedContext.invalidate();
      utils.internalTasks.list.invalidate();
      onOpenChange(false);
      if (onSuccess) onSuccess();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create task");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message || !title.trim()) {
      toast.error("Please provide a title for the task.");
      return;
    }

    convertMutation.mutate({
      messageId: message.id,
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      dueDate: dueDate || undefined,
      studentContactId: linkedStudentId,
    });
  };

  if (!message) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-b from-[#061833] via-[#041228] to-[#020a17] border-t border-t-sky-300/50 border border-sky-500/30 text-white rounded-2xl max-w-md w-[94vw] sm:w-full max-h-[85vh] flex flex-col p-4 sm:p-5 shadow-[0_25px_70px_rgba(0,4,16,0.95),inset_0_1px_1px_rgba(255,255,255,0.15)] overflow-hidden">
        <DialogHeader className="shrink-0 pb-2.5 border-b border-sky-500/20">
          <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-4.5 h-4.5 text-sky-400" />
            Create Task from Message
          </DialogTitle>
          <DialogDescription className="text-[11px] text-blue-200/70">
            Convert this discussion point into an actionable CRM queue task with an automatic link.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto space-y-2.5 py-2.5 pr-1 text-xs">
            {/* Title */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-sky-300">Task Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Review signed paperwork and upload to Student Workspace"
                className="h-8.5 bg-[#020b18] border-sky-500/30 text-white text-xs rounded-xl focus:border-sky-400 shadow-inner"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-sky-300">Description & Context</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="bg-[#020b18] border-sky-500/30 text-white text-xs rounded-xl focus:border-sky-400 font-mono text-[11px] leading-relaxed resize-none shadow-inner"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Priority */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-sky-300">Priority</Label>
                <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                  <SelectTrigger className="h-8.5 bg-[#020b18] border-sky-500/30 text-white text-xs rounded-xl focus:ring-sky-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#041228] border-sky-500/30 text-white">
                    <SelectItem value="low" className="text-xs">Low</SelectItem>
                    <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                    <SelectItem value="high" className="text-xs text-amber-400">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-sky-300">Target Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-8.5 bg-[#020b18] border-sky-500/30 text-white text-xs rounded-xl focus:border-sky-400"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 pt-2.5 border-t border-sky-500/20 flex justify-between sm:justify-between items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs text-slate-400 hover:text-white h-8.5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={convertMutation.isPending}
              className="bg-gradient-to-b from-[#0077FF] via-[#0062E3] to-[#004BB5] hover:from-[#0088FF] hover:to-[#0055CC] text-white font-bold rounded-xl px-4 h-8.5 text-xs shadow-[0_4px_14px_rgba(0,102,255,0.4),inset_0_1px_1px_rgba(255,255,255,0.35)] border-t border-t-sky-200/50 border border-sky-400/40 cursor-pointer"
            >
              {convertMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              Create Task & Link
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
      <DialogContent className="bg-[#001433] border border-sky-500/30 text-white rounded-2xl max-w-lg shadow-[0_20px_50px_rgba(0,10,30,0.8)] p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-sky-400" />
            Create Task from Message
          </DialogTitle>
          <DialogDescription className="text-xs text-blue-200/70">
            Convert this discussion point into an actionable CRM queue task with an automatic link.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-3">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-sky-300">Task Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Review signed paperwork and upload to Student Workspace"
              className="bg-[#000E26] border-sky-500/30 text-white text-xs rounded-xl focus:border-sky-400"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-sky-300">Description & Context</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="bg-[#000E26] border-sky-500/30 text-white text-xs rounded-xl focus:border-sky-400 font-mono text-[11px] leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Priority */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-sky-300">Priority</Label>
              <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                <SelectTrigger className="bg-[#000E26] border-sky-500/30 text-white text-xs rounded-xl focus:ring-sky-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#001433] border-sky-500/30 text-white">
                  <SelectItem value="low" className="text-xs">Low</SelectItem>
                  <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                  <SelectItem value="high" className="text-xs text-amber-400">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-sky-300">Target Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-[#000E26] border-sky-500/30 text-white text-xs rounded-xl focus:border-sky-400"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-sky-500/15 flex justify-between sm:justify-between items-center">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={convertMutation.isPending}
              className="bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold rounded-xl px-5 text-xs shadow-lg shadow-sky-900/40"
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

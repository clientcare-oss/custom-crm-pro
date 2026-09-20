import React, { useState } from "react";
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
import { ShieldCheck, Calendar, User, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ActionRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: number;
  partnerUserId?: number;
  linkedStudentId?: number;
  onSuccess?: () => void;
}

const REQUEST_TYPES = [
  "Review Document",
  "Approve Task Completion",
  "Approve Case Stage Change",
  "Confirm Meeting Preparation Complete",
  "Request General Approval",
];

export default function ActionRequestModal({
  open,
  onOpenChange,
  conversationId,
  partnerUserId,
  linkedStudentId,
  onSuccess,
}: ActionRequestModalProps) {
  const [requestType, setRequestType] = useState<string>(REQUEST_TYPES[0]);
  const [title, setTitle] = useState("");
  const [explanation, setExplanation] = useState("");
  const [assignedApproverId, setAssignedApproverId] = useState<string>(
    partnerUserId ? String(partnerUserId) : ""
  );
  const [dueAt, setDueAt] = useState("");

  const { data: employees = [] } = trpc.crewMessages.listEmployees.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.crewMessages.createActionRequest.useMutation({
    onSuccess: () => {
      toast.success("Action request submitted to conversation!");
      utils.crewMessages.getMessages.invalidate();
      utils.crewMessages.getOverviewStats.invalidate();
      onOpenChange(false);
      setTitle("");
      setExplanation("");
      setDueAt("");
      if (onSuccess) onSuccess();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create action request");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a title for the request.");
      return;
    }

    const approverIdNum = assignedApproverId
      ? Number(assignedApproverId)
      : employees.length > 0
      ? employees[0].id
      : 1;

    createMutation.mutate({
      conversationId,
      requestType,
      title: title.trim(),
      explanation: explanation.trim() || undefined,
      assignedApproverId: approverIdNum,
      dueAt: dueAt || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-b from-[#061833] via-[#041228] to-[#020a17] border-t border-t-sky-300/50 border border-sky-500/30 text-white rounded-2xl max-w-md w-[94vw] sm:w-full max-h-[85vh] flex flex-col p-4 sm:p-5 shadow-[0_25px_70px_rgba(0,4,16,0.95),inset_0_1px_1px_rgba(255,255,255,0.15)] overflow-hidden">
        <DialogHeader className="shrink-0 pb-2.5 border-b border-sky-500/20">
          <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4.5 h-4.5 text-sky-400" />
            Request Action / Internal Approval
          </DialogTitle>
          <DialogDescription className="text-[11px] text-blue-200/70">
            Submit a sign-off request to an assigned colleague in this thread.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto space-y-2.5 py-2.5 pr-1 text-xs">
            {/* Title */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-sky-300">Request Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Review Draft IEP Amendment & State PWN"
                className="h-8.5 bg-[#020b18] border-sky-500/30 text-white text-xs rounded-xl focus:border-sky-400 placeholder:text-blue-200/40 shadow-inner"
              />
            </div>

            {/* 2-Column Grid: Request Type + Assigned Approver */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Request Type */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-sky-300">Action Type</Label>
                <Select value={requestType} onValueChange={setRequestType}>
                  <SelectTrigger className="h-8.5 bg-[#020b18] border-sky-500/30 text-white text-xs rounded-xl focus:ring-sky-400">
                    <SelectValue placeholder="Action type" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#041228] border-sky-500/30 text-white">
                    {REQUEST_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs hover:bg-sky-500/20 focus:bg-sky-500/20">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assigned Approver */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-sky-300">Assigned Approver</Label>
                <Select
                  value={assignedApproverId || (employees[0] ? String(employees[0].id) : "")}
                  onValueChange={setAssignedApproverId}
                >
                  <SelectTrigger className="h-8.5 bg-[#020b18] border-sky-500/30 text-white text-xs rounded-xl focus:ring-sky-400">
                    <SelectValue placeholder="Approver" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#041228] border-sky-500/30 text-white">
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={String(emp.id)} className="text-xs hover:bg-sky-500/20 focus:bg-sky-500/20">
                        {emp.name} ({emp.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Explanation / Notes */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-sky-300">Details & Instructions</Label>
              <Textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Provide context, specific sections to review, or key points..."
                rows={2}
                className="bg-[#020b18] border-sky-500/30 text-white text-xs rounded-xl focus:border-sky-400 placeholder:text-blue-200/40 resize-none shadow-inner leading-relaxed"
              />
            </div>

            {/* Due Date */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-sky-300">Target Due Date (Optional)</Label>
              <Input
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="h-8.5 bg-[#020b18] border-sky-500/30 text-white text-xs rounded-xl focus:border-sky-400"
              />
            </div>
          </div>

          {/* Sticky Pinned Footer */}
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
              disabled={createMutation.isPending}
              className="bg-gradient-to-b from-[#0077FF] via-[#0062E3] to-[#004BB5] hover:from-[#0088FF] hover:to-[#0055CC] text-white font-bold rounded-xl px-4 h-8.5 text-xs shadow-[0_4px_14px_rgba(0,102,255,0.4),inset_0_1px_1px_rgba(255,255,255,0.35)] border-t border-t-sky-200/50 border border-sky-400/40 cursor-pointer"
            >
              {createMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              Send Action Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

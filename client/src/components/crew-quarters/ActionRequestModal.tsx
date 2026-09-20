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
      <DialogContent className="bg-[#001433] border border-sky-500/30 text-white rounded-2xl max-w-lg shadow-[0_20px_50px_rgba(0,10,30,0.8)] p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sky-400" />
            Request Action / Internal Approval
          </DialogTitle>
          <DialogDescription className="text-xs text-blue-200/70">
            Submit a lightweight sign-off request to an assigned colleague directly within this conversation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-3">
          {/* Request Type */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-sky-300">Action Type</Label>
            <Select value={requestType} onValueChange={setRequestType}>
              <SelectTrigger className="bg-[#000E26] border-sky-500/30 text-white text-xs rounded-xl focus:ring-sky-400">
                <SelectValue placeholder="Select action type" />
              </SelectTrigger>
              <SelectContent className="bg-[#001433] border-sky-500/30 text-white">
                {REQUEST_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="text-xs hover:bg-sky-500/20 focus:bg-sky-500/20">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-sky-300">Request Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Review Draft IEP Amendment & State PWN"
              className="bg-[#000E26] border-sky-500/30 text-white text-xs rounded-xl focus:border-sky-400 placeholder:text-blue-200/40"
            />
          </div>

          {/* Assigned Approver */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-sky-300">Assigned Approver</Label>
            <Select
              value={assignedApproverId || (employees[0] ? String(employees[0].id) : "")}
              onValueChange={setAssignedApproverId}
            >
              <SelectTrigger className="bg-[#000E26] border-sky-500/30 text-white text-xs rounded-xl focus:ring-sky-400">
                <SelectValue placeholder="Select approver" />
              </SelectTrigger>
              <SelectContent className="bg-[#001433] border-sky-500/30 text-white">
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={String(emp.id)} className="text-xs hover:bg-sky-500/20 focus:bg-sky-500/20">
                    {emp.name} ({emp.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Explanation / Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-sky-300">Explanation & Specific Details</Label>
            <Textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Provide background, deadlines, or key points for the approver..."
              rows={3}
              className="bg-[#000E26] border-sky-500/30 text-white text-xs rounded-xl focus:border-sky-400 placeholder:text-blue-200/40"
            />
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-sky-300">Target Completion Date (Optional)</Label>
            <Input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="bg-[#000E26] border-sky-500/30 text-white text-xs rounded-xl focus:border-sky-400"
            />
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
              disabled={createMutation.isPending}
              className="bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold rounded-xl px-5 text-xs shadow-lg shadow-sky-900/40"
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

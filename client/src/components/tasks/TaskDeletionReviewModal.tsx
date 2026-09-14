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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ShieldAlert,
  Trash2,
  XCircle,
  CheckCircle2,
  User,
  Calendar,
  FolderOpen,
  ListChecks,
  Clock,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface TaskDeletionReviewModalProps {
  open: boolean;
  onClose: () => void;
}

export function TaskDeletionReviewModal({
  open,
  onClose,
}: TaskDeletionReviewModalProps) {
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [isDecliningId, setIsDecliningId] = useState<number | null>(null);

  const { data: requests = [], isLoading } = trpc.internalTasks.listDeletionRequests.useQuery(
    activeTab === "pending" ? { status: "pending" } : { status: "all" },
    { enabled: open }
  );

  const reviewMutation = trpc.internalTasks.reviewDeletionRequest.useMutation({
    onSuccess: (data) => {
      if (data.action === "approved") {
        toast.success("Task deletion approved and permanently removed");
      } else {
        toast.info("Task deletion declined and task was kept active");
      }
      utils.internalTasks.listDeletionRequests.invalidate();
      utils.internalTasks.list.invalidate();
      utils.tasks.getAll.invalidate();
      setIsDecliningId(null);
      setDeclineReason("");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to process review");
    },
  });

  const handleApprove = (requestId: number) => {
    reviewMutation.mutate({
      requestId,
      action: "approve",
    });
  };

  const handleDecline = (requestId: number) => {
    reviewMutation.mutate({
      requestId,
      action: "decline",
      declineReason: declineReason.trim() || undefined,
    });
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl border-blue-900/60 bg-[#061830] text-slate-100 shadow-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="space-y-2 border-b border-blue-900/40 pb-3 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <ShieldAlert className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                  Task Deletion Requests
                  {pendingCount > 0 && (
                    <Badge variant="destructive" className="bg-rose-500 text-white font-mono text-xs">
                      {pendingCount} Pending
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Supervisor approval console — inspect full task context before approving or declining
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-[#040D1A] p-1 rounded-lg border border-blue-900/40 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("pending")}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  activeTab === "pending"
                    ? "bg-amber-500 text-slate-950 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  activeTab === "all"
                    ? "bg-blue-600 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                All History
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Requests List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
          {isLoading ? (
            <div className="space-y-3 py-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-blue-950/40 animate-pulse border border-blue-900/30" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-blue-900/40 rounded-2xl p-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-400/60 mx-auto mb-2" />
              <p className="text-sm font-semibold text-white">No pending deletion requests</p>
              <p className="text-xs text-slate-400 mt-1">
                All supervisor-assigned tasks are safe and secure.
              </p>
            </div>
          ) : (
            requests.map((req) => {
              const details = req.details || {};
              const isExpanded = selectedRequestId === req.id;
              const isPending = req.status === "pending";

              return (
                <div
                  key={req.id}
                  className={`rounded-xl border transition-all overflow-hidden ${
                    isPending
                      ? "border-amber-500/40 bg-[#091830] shadow-md shadow-amber-500/5"
                      : req.status === "approved"
                      ? "border-emerald-500/30 bg-emerald-950/10 opacity-75"
                      : "border-slate-800 bg-[#040D1A]/60 opacity-65"
                  }`}
                >
                  {/* Header Row */}
                  <div className="p-4 flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1.5 flex-1 min-w-[260px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-sky-400" />
                          <strong className="text-white">{req.requestedByUserName}</strong> requested delete
                        </span>
                        <span className="text-xs text-slate-500">•</span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(req.createdAt).toLocaleDateString()} at{" "}
                          {new Date(req.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase font-bold tracking-wider ${
                            isPending
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                              : req.status === "approved"
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                          }`}
                        >
                          {req.status}
                        </Badge>
                      </div>

                      <h3 className="text-base font-bold text-white leading-snug">
                        {req.taskTitle}
                      </h3>

                      {req.reason && (
                        <div className="flex items-start gap-1.5 text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 mt-1">
                          <MessageSquare className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>
                            <strong>Employee Reason:</strong> &ldquo;{req.reason}&rdquo;
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Toggle details */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedRequestId(isExpanded ? null : req.id)}
                      className="text-xs text-sky-300 hover:text-amber-300 hover:bg-blue-900/40 gap-1"
                    >
                      {isExpanded ? "Hide Details" : "View Entire Task"}
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </Button>
                  </div>

                  {/* Expanded Task Full Details */}
                  {isExpanded && (
                    <div className="p-4 pt-0 border-t border-blue-900/40 bg-[#040D1A]/80 space-y-3 mt-1 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                        <div>
                          <span className="text-slate-400 block font-medium">Related Student / Case:</span>
                          <span className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                            <User className="w-3.5 h-3.5 text-indigo-400" />
                            {details.linkedStudentName || "None linked (Internal general task)"}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block font-medium">Related Project:</span>
                          <span className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                            <FolderOpen className="w-3.5 h-3.5 text-purple-400" />
                            {details.projectName || "General Operations"}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block font-medium">Due Date:</span>
                          <span className="font-mono text-slate-200 flex items-center gap-1.5 mt-0.5">
                            <Calendar className="w-3.5 h-3.5 text-sky-400" />
                            {details.dueDate ? new Date(details.dueDate).toLocaleDateString() : "No due date set"}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block font-medium">Current Status:</span>
                          <Badge variant="outline" className="text-slate-200 mt-0.5">
                            {details.status || "not_started"}
                          </Badge>
                        </div>
                      </div>

                      {req.taskDescription && (
                        <div className="pt-2 border-t border-blue-900/30">
                          <span className="text-slate-400 block font-medium mb-1">Task Description:</span>
                          <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-900/40 text-slate-200 whitespace-pre-wrap leading-relaxed">
                            {req.taskDescription}
                          </div>
                        </div>
                      )}

                      {/* Subtasks / Checklist */}
                      {Array.isArray(details.subtasks) && details.subtasks.length > 0 && (
                        <div className="pt-2 border-t border-blue-900/30">
                          <span className="text-slate-400 block font-medium mb-1.5 flex items-center gap-1">
                            <ListChecks className="w-3.5 h-3.5 text-emerald-400" />
                            Checklist / Subtasks ({details.subtasks.length}):
                          </span>
                          <div className="space-y-1 pl-1">
                            {details.subtasks.map((st: any, sIdx: number) => (
                              <div key={sIdx} className="flex items-center gap-2 text-slate-300">
                                <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] ${
                                  st.isComplete ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "border-slate-600"
                                }`}>
                                  {st.isComplete ? "✓" : ""}
                                </span>
                                <span className={st.isComplete ? "line-through text-slate-500" : "text-slate-200"}>
                                  {st.title}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions Bar for Pending Requests */}
                  {isPending && (
                    <div className="p-3 bg-[#030914] border-t border-blue-900/40 flex items-center justify-between gap-2 flex-wrap">
                      {isDecliningId === req.id ? (
                        <div className="flex items-center gap-2 w-full flex-wrap sm:flex-nowrap">
                          <Input
                            value={declineReason}
                            onChange={(e) => setDeclineReason(e.target.value)}
                            placeholder="Optional decline reason to send employee..."
                            className="text-xs bg-[#061830] border-blue-900/60 text-white h-8"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDecline(req.id)}
                            disabled={reviewMutation.isPending}
                            className="h-8 text-xs font-bold shrink-0"
                          >
                            Confirm Decline
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setIsDecliningId(null);
                              setDeclineReason("");
                            }}
                            className="h-8 text-xs text-slate-400 shrink-0"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="text-[11px] text-slate-400">
                            Action required: choose whether to delete or keep.
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setIsDecliningId(req.id)}
                              disabled={reviewMutation.isPending}
                              className="h-8 text-xs border-blue-800 text-slate-300 hover:text-white hover:bg-blue-900/40"
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1 text-rose-400" />
                              Decline Request
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(req.id)}
                              disabled={reviewMutation.isPending}
                              className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-900/30"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" />
                              Approve &amp; Delete
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="pt-2 border-t border-blue-900/40 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-blue-900 text-slate-300 hover:text-white"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

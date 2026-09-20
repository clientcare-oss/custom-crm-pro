import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  User,
  Check,
  X,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface ActionRequestCardProps {
  actionRequest: {
    id: number;
    requestType: string;
    title: string;
    explanation?: string | null;
    status: string; // "pending" | "approved" | "declined" | "changes_requested" | "cancelled"
    assignedApproverId: number;
    requestedBy: number;
    relatedRecordType?: string | null;
    relatedRecordId?: string | null;
    dueAt?: string | null;
    decidedBy?: number | null;
    decidedAt?: string | null;
    decisionNote?: string | null;
    createdAt?: string;
  };
  currentUserId: number;
  isAdmin: boolean;
  onRefresh?: () => void;
}

export default function ActionRequestCard({
  actionRequest,
  currentUserId,
  isAdmin,
  onRefresh,
}: ActionRequestCardProps) {
  const [isDeciding, setIsDeciding] = useState(false);
  const [decisionNote, setDecisionNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<"approved" | "declined" | "changes_requested" | null>(null);

  const utils = trpc.useUtils();

  const decideMutation = trpc.crewMessages.decideActionRequest.useMutation({
    onSuccess: (data) => {
      toast.success(`Action request marked as ${data.status.toUpperCase()}`);
      utils.crewMessages.getMessages.invalidate();
      utils.crewMessages.getOverviewStats.invalidate();
      setShowNoteInput(false);
      setIsDeciding(false);
      if (onRefresh) onRefresh();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to submit decision");
      setIsDeciding(false);
    },
  });

  const canDecide =
    actionRequest.status === "pending" &&
    (actionRequest.assignedApproverId === currentUserId || isAdmin);

  const handleDecision = (decision: "approved" | "declined" | "changes_requested") => {
    if (decision === "changes_requested" || decision === "declined") {
      setPendingDecision(decision);
      setShowNoteInput(true);
      return;
    }

    setIsDeciding(true);
    decideMutation.mutate({
      actionRequestId: actionRequest.id,
      decision,
    });
  };

  const confirmDecisionWithNote = () => {
    if (!pendingDecision) return;
    setIsDeciding(true);
    decideMutation.mutate({
      actionRequestId: actionRequest.id,
      decision: pendingDecision,
      note: decisionNote.trim() || undefined,
    });
  };

  // Status badge coloring & icon
  const getStatusBadge = () => {
    switch (actionRequest.status) {
      case "approved":
        return (
          <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 gap-1 text-xs py-0.5 px-2 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Approved
          </Badge>
        );
      case "declined":
        return (
          <Badge className="bg-rose-500/20 text-rose-300 border border-rose-500/40 gap-1 text-xs py-0.5 px-2 font-semibold">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            Declined
          </Badge>
        );
      case "changes_requested":
        return (
          <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/40 gap-1 text-xs py-0.5 px-2 font-semibold">
            <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
            Changes Requested
          </Badge>
        );
      default:
        return (
          <Badge className="bg-sky-500/20 text-sky-300 border border-sky-400/40 gap-1 text-xs py-0.5 px-2 font-semibold">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            Pending Review
          </Badge>
        );
    }
  };

  return (
    <div className="w-full max-w-md bg-[#001433]/90 border border-sky-500/30 rounded-2xl p-4 text-slate-100 shadow-[0_8px_25px_rgba(0,10,30,0.6)] backdrop-blur-md space-y-3 transition-all hover:border-sky-400/50">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-sky-500/15 pb-2.5">
        <div className="flex items-center gap-1.5 text-sky-300 text-xs font-semibold tracking-wide">
          <ShieldCheck className="w-4 h-4 text-sky-400" />
          <span>{actionRequest.requestType}</span>
        </div>
        <div>{getStatusBadge()}</div>
      </div>

      {/* Title & Explanation */}
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-white tracking-wide">
          {actionRequest.title}
        </h4>
        {actionRequest.explanation && (
          <p className="text-xs text-blue-200/80 leading-relaxed">
            {actionRequest.explanation}
          </p>
        )}
      </div>

      {/* Metadata Pills */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-blue-200/70 pt-1">
        {actionRequest.dueAt && (
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>Due: {new Date(actionRequest.dueAt).toLocaleDateString()}</span>
          </div>
        )}
        {actionRequest.relatedRecordType && (
          <div className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span className="capitalize">{actionRequest.relatedRecordType}: {actionRequest.relatedRecordId}</span>
          </div>
        )}
      </div>

      {/* Decision Note Feedback if recorded */}
      {actionRequest.decisionNote && (
        <div className="bg-[#000E26] border border-sky-500/20 rounded-xl p-2.5 text-xs text-blue-200/90 italic">
          "{actionRequest.decisionNote}"
        </div>
      )}

      {/* Optional Note Form when declining or requesting changes */}
      {showNoteInput && (
        <div className="space-y-2 pt-2 border-t border-sky-500/15 animate-fade-in">
          <label className="text-[11px] font-semibold text-sky-300">
            Note / Feedback for Requesting Advocate:
          </label>
          <textarea
            value={decisionNote}
            onChange={(e) => setDecisionNote(e.target.value)}
            placeholder="Explain what changes are needed or reason for decline..."
            rows={2}
            className="w-full bg-[#000E26] border border-sky-500/30 text-white rounded-xl p-2 text-xs focus:outline-none focus:border-sky-400"
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowNoteInput(false);
                setPendingDecision(null);
              }}
              className="text-xs h-7 text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={confirmDecisionWithNote}
              disabled={isDeciding}
              className="text-xs h-7 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg"
            >
              {isDeciding && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
              Submit Decision
            </Button>
          </div>
        </div>
      )}

      {/* Action Buttons for Authorized Approvers */}
      {canDecide && !showNoteInput && (
        <div className="pt-2 border-t border-sky-500/15 flex items-center justify-end gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => handleDecision("approved")}
            disabled={isDeciding}
            className="h-8 px-3 text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-md shadow-emerald-950/40 border border-emerald-400/30 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 mr-1" />
            Approve
          </Button>
          <Button
            size="sm"
            onClick={() => handleDecision("changes_requested")}
            disabled={isDeciding}
            className="h-8 px-3 text-xs font-semibold bg-[#0A2244] hover:bg-[#12305C] text-purple-300 rounded-xl border border-purple-400/30 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Request Changes
          </Button>
          <Button
            size="sm"
            onClick={() => handleDecision("declined")}
            disabled={isDeciding}
            className="h-8 px-2.5 text-xs font-semibold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 rounded-xl border border-rose-500/30 cursor-pointer"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Decline
          </Button>
        </div>
      )}

      {/* Non-approver pending status notice */}
      {!canDecide && actionRequest.status === "pending" && (
        <div className="pt-2 border-t border-sky-500/10 text-[11px] text-blue-200/60 flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-sky-400" />
          <span>Awaiting decision from assigned approver</span>
        </div>
      )}
    </div>
  );
}

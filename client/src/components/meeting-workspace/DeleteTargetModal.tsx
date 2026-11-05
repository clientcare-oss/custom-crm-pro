import React from "react";
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
import {
  Trash2,
  AlertTriangle,
  Archive,
  CornerUpLeft,
} from "lucide-react";
import type { MeetingTarget } from "./types";
import { hasRecordedMeetingOutcome } from "./intel-unit/connectedFindingWorkflow";

interface DeleteTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: MeetingTarget | null;
  onConfirmDelete: (targetId: string) => void;
  onWithdrawPreserveHistory?: (targetId: string) => void;
  onDeleteConnectedFindingEverywhere?: (target: MeetingTarget) => void;
}

export function DeleteTargetModal({
  isOpen,
  onClose,
  target,
  onConfirmDelete,
  onWithdrawPreserveHistory,
  onDeleteConnectedFindingEverywhere,
}: DeleteTargetModalProps) {
  if (!target) return null;

  const hasOutcomeHistory = hasRecordedMeetingOutcome(target);
  const isLinkedToSavedFinding = Boolean(
    target.sourceFindingId || target.id.startsWith("target-from-")
  );

  const handleRemoveFromStageOnly = () => {
    onConfirmDelete(target.id);
    onClose();
  };

  const handleWithdraw = () => {
    if (onWithdrawPreserveHistory) {
      onWithdrawPreserveHistory(target.id);
    } else {
      onConfirmDelete(target.id);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-[#071930] border border-[#16477A] text-slate-100 shadow-2xl p-6 rounded-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2.5 text-rose-400">
            <div className="w-9 h-9 rounded-xl bg-rose-950/70 border border-rose-500/50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white">
                {hasOutcomeHistory
                  ? "Withdraw or Archive Discussed Item"
                  : isLinkedToSavedFinding
                  ? "Remove from Blueprint / Agenda"
                  : "Delete Meeting Target"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-300">
                {hasOutcomeHistory
                  ? "This item has recorded meeting outcomes in Meeting Space."
                  : isLinkedToSavedFinding
                  ? "Removing from Blueprint keeps the original saved finding in 1. Assemble · Records Review."
                  : "This target will be removed from this meeting workspace."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Target Details Card */}
        <div className="my-3 p-3.5 rounded-xl bg-[#041224] border border-[#0F355E] space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Badge
              variant="outline"
              className="border-[#F5B544]/40 text-[#F5B544] bg-[#0A254D] text-[10.5px]"
            >
              {target.iepSection || "General"}
            </Badge>
            {hasOutcomeHistory && (
              <Badge className="bg-amber-950/80 text-amber-300 border border-amber-500/40 text-[10px]">
                Outcome: {target.meetingStatus}
              </Badge>
            )}
          </div>

          <div className="font-bold text-sm text-white">
            {target.targetName}
          </div>

          {target.quickAdvocateSayThis && (
            <p className="text-[11px] text-blue-200/80 italic leading-relaxed bg-[#071C3C]/60 p-2 rounded-lg border border-[#0D3866]">
              &ldquo;{target.quickAdvocateSayThis}&rdquo;
            </p>
          )}
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {hasOutcomeHistory
            ? "To protect your meeting audit trail, withdraw or archive this item rather than erasing its recorded outcome history."
            : isLinkedToSavedFinding
            ? "Choose whether to remove this item from Blueprint/Agenda only (retaining the saved finding in Records Review) or delete the finding everywhere."
            : "Are you sure you want to remove this target from the meeting agenda?"}
        </p>

        <DialogFooter className="flex flex-wrap items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs cursor-pointer"
          >
            Cancel
          </Button>

          {hasOutcomeHistory ? (
            <Button
              type="button"
              size="sm"
              data-testid="confirm-withdraw-target-btn"
              onClick={handleWithdraw}
              className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs gap-1.5 shadow-lg cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Withdraw &amp; Keep History</span>
            </Button>
          ) : (
            <>
              <Button
                type="button"
                size="sm"
                data-testid="confirm-remove-from-blueprint-btn"
                onClick={handleRemoveFromStageOnly}
                className="bg-[#0B2248] border border-[#C5A059] text-[#FFE394] hover:bg-[#102E60] font-semibold text-xs gap-1.5 cursor-pointer"
              >
                <CornerUpLeft className="w-3.5 h-3.5" />
                <span>
                  {isLinkedToSavedFinding
                    ? "Remove from Blueprint Only"
                    : "Remove Target"}
                </span>
              </Button>

              {isLinkedToSavedFinding && onDeleteConnectedFindingEverywhere && (
                <Button
                  type="button"
                  size="sm"
                  data-testid="confirm-delete-finding-everywhere-btn"
                  onClick={() => {
                    onDeleteConnectedFindingEverywhere(target);
                    onClose();
                  }}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs gap-1.5 shadow-lg cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Finding Everywhere</span>
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

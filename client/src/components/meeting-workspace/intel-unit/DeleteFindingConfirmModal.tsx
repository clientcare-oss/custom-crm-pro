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
  CheckCircle2,
  Map as MapIcon,
  PlayCircle,
  Bookmark,
} from "lucide-react";
import type { IepIntelFinding, MeetingTarget } from "../types";
import {
  hasRecordedMeetingOutcome,
  resolveConnectedTargetForFinding,
} from "./connectedFindingWorkflow";

interface DeleteFindingConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  finding: IepIntelFinding | null;
  targets: MeetingTarget[];
  onRemoveFromBlueprintOnly: (finding: IepIntelFinding) => void;
  onArchiveWithdrawnPreserveHistory: (finding: IepIntelFinding) => void;
  onConfirmPermanentDelete: (finding: IepIntelFinding) => void;
}

export function DeleteFindingConfirmModal({
  isOpen,
  onClose,
  finding,
  targets,
  onRemoveFromBlueprintOnly,
  onArchiveWithdrawnPreserveHistory,
  onConfirmPermanentDelete,
}: DeleteFindingConfirmModalProps) {
  if (!finding) return null;

  const connectedTarget = resolveConnectedTargetForFinding(finding, targets);
  const isAdvancedToBlueprint = Boolean(
    connectedTarget && !connectedTarget.archivedOrWithdrawn
  );
  const hasDiscussedOutcome =
    hasRecordedMeetingOutcome(connectedTarget) ||
    Boolean(finding.archivedMeetingOutcome);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="delete-finding-confirm-modal"
        className="max-w-lg bg-[#041028] border border-[#284372] text-[#FFF4D4] shadow-2xl p-6 rounded-2xl"
      >
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-950/70 border border-rose-500/50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-serif font-bold text-[#FFF4D4]">
                {hasDiscussedOutcome
                  ? "Recorded Meeting History Detected"
                  : "Remove or Delete Connected Finding"}
              </DialogTitle>
              <DialogDescription className="text-xs text-[#9BB2D6]">
                Review which connected workspace locations will be affected
                before completing this action.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Finding Summary */}
        <div className="my-2 p-3.5 rounded-xl bg-[#01081A] border border-[#1E3256] space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Badge className="bg-[#081E46] text-[#FFE394] border border-[#C5A059]/40 text-[10.5px]">
              {finding.section || finding.category || "IEP Finding"}
            </Badge>
            {finding.sourceRef?.pdfPageNumber && (
              <span className="font-mono text-[10.5px] text-[#9BB2D6]">
                {finding.sourceRef.fileName} · PDF p.{" "}
                {finding.sourceRef.pdfPageNumber}
              </span>
            )}
          </div>
          <p className="text-xs text-[#FFF4D4] font-medium leading-relaxed">
            {finding.text}
          </p>
        </div>

        {/* Affected Connected Locations Breakdown */}
        <div
          data-testid="delete-finding-affected-locations"
          className="rounded-xl bg-[#020B20] border border-[#1E3256] p-3.5 space-y-2.5 text-xs"
        >
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[#FFE394]">
            Connected Workspace Locations Affected:
          </p>

          <div className="space-y-2">
            {/* Location 1: Records Review */}
            <div className="flex items-start gap-2.5 text-[#D8C7A5]">
              <Bookmark className="h-3.5 w-3.5 text-[#DFBE77] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#FFF4D4]">
                  1. Assemble · Records Review
                </span>
                <p className="text-[11px] text-[#8EA6C9]">
                  Saved finding, source citations, and prepared meeting
                  question.
                </p>
              </div>
            </div>

            {/* Location 2: Blueprint */}
            <div className="flex items-start gap-2.5 text-[#D8C7A5]">
              <MapIcon
                className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${
                  isAdvancedToBlueprint ? "text-[#4ADE80]" : "text-[#587099]"
                }`}
              />
              <div>
                <span className="font-semibold text-[#FFF4D4]">
                  2. Blueprint:{" "}
                  {isAdvancedToBlueprint
                    ? `Connected Target ("${connectedTarget?.targetName}")`
                    : "Not currently in Blueprint"}
                </span>
                {isAdvancedToBlueprint && (
                  <p className="text-[11px] text-[#8EA6C9]">
                    Removing from Blueprint alone keeps your saved finding in
                    Records Review.
                  </p>
                )}
              </div>
            </div>

            {/* Location 3: Meeting Space */}
            <div className="flex items-start gap-2.5 text-[#D8C7A5]">
              <PlayCircle
                className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${
                  hasDiscussedOutcome ? "text-amber-400" : "text-[#587099]"
                }`}
              />
              <div>
                <span className="font-semibold text-[#FFF4D4]">
                  3. Meeting Space:{" "}
                  {hasDiscussedOutcome
                    ? `Recorded Outcome (${
                        connectedTarget?.meetingStatus ||
                        finding.archivedMeetingOutcome?.meetingStatus ||
                        "Discussed"
                      })`
                    : isAdvancedToBlueprint
                    ? "On active agenda (Not yet discussed)"
                    : "Not on live agenda"}
                </span>
                {hasDiscussedOutcome && (
                  <p className="text-[11px] text-amber-300">
                    This item has recorded meeting history/outcomes. Withdraw or
                    archive it instead of erasing its history.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-[#263E68] bg-[#030F28] text-[#D8C7A5] hover:bg-[#081C3E] text-xs cursor-pointer"
          >
            Cancel
          </Button>

          {/* Option A: Remove from Blueprint only while keeping the saved finding */}
          {isAdvancedToBlueprint && !hasDiscussedOutcome && (
            <Button
              type="button"
              size="sm"
              data-testid="modal-remove-from-blueprint-only-btn"
              onClick={() => {
                onRemoveFromBlueprintOnly(finding);
                onClose();
              }}
              className="bg-[#0B2248] border border-[#C5A059] text-[#FFE394] hover:bg-[#102E60] text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <CornerUpLeft className="w-3.5 h-3.5" />
              <span>Remove from Blueprint Only</span>
            </Button>
          )}

          {/* Option B: Archive / Withdraw when item has already been discussed */}
          {hasDiscussedOutcome ? (
            <Button
              type="button"
              size="sm"
              data-testid="modal-archive-preserve-history-btn"
              onClick={() => {
                onArchiveWithdrawnPreserveHistory(finding);
                onClose();
              }}
              className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs gap-1.5 cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Withdraw &amp; Preserve History</span>
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              data-testid="modal-confirm-delete-finding-btn"
              onClick={() => {
                onConfirmPermanentDelete(finding);
                onClose();
              }}
              className="bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs gap-1.5 shadow-lg cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>
                {isAdvancedToBlueprint
                  ? "Delete Finding & Blueprint Target"
                  : "Delete Finding"}
              </span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


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
import { Trash2, AlertTriangle, X } from "lucide-react";
import type { MeetingTarget } from "./types";

interface DeleteTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: MeetingTarget | null;
  onConfirmDelete: (targetId: string) => void;
}

export function DeleteTargetModal({
  isOpen,
  onClose,
  target,
  onConfirmDelete,
}: DeleteTargetModalProps) {
  if (!target) return null;

  const handleConfirm = () => {
    onConfirmDelete(target.id);
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
                Delete Meeting Target
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-300">
                This target will be permanently removed from this meeting workspace.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Target Details Card */}
        <div className="my-3 p-3.5 rounded-xl bg-[#041224] border border-[#0F355E] space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Badge variant="outline" className="border-[#F5B544]/40 text-[#F5B544] bg-[#0A254D] text-[10.5px]">
              {target.iepSection || "General"}
            </Badge>
            {target.externalTargetId && (
              <span className="font-mono text-[10px] text-blue-300 bg-[#0A2244] border border-[#144678] px-1.5 py-0.5 rounded">
                {target.externalTargetId}
              </span>
            )}
          </div>

          <div className="font-bold text-sm text-white">
            {target.targetName}
          </div>

          {target.quickAdvocateSayThis && (
            <p className="text-[11px] text-blue-200/80 italic leading-relaxed bg-[#071C3C]/60 p-2 rounded-lg border border-[#0D3866]">
              "{target.quickAdvocateSayThis}"
            </p>
          )}
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Are you sure you want to delete this target? This will remove all associated notes, phrasing, and status tracking for this item.
        </p>

        <DialogFooter className="flex items-center justify-end gap-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            className="bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs gap-1.5 shadow-lg cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Target
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

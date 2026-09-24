import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Wrench, AlertTriangle, Check, Trash2 } from "lucide-react";
import type { MeetingTarget, TargetRepairDetails } from "../types";
import { cn } from "@/lib/utils";

interface TargetRepairModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: MeetingTarget;
  onSaveRepair: (targetId: string, repairDetails: TargetRepairDetails | undefined, removeTag?: boolean) => void;
}

export const REPAIR_QUICK_OPTIONS = [
  "Bad Ask",
  "Wrong Concern",
  "AI Misunderstood",
  "Duplicate",
  "Bad Evidence",
  "Missing Evidence",
  "Wrong IEP Location",
  "Other",
] as const;

export function TargetRepairModal({
  isOpen,
  onClose,
  target,
  onSaveRepair,
}: TargetRepairModalProps) {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [note, setNote] = useState<string>("");

  useEffect(() => {
    if (isOpen && target) {
      setSelectedReasons(target.repairDetails?.reasons || []);
      setNote(target.repairDetails?.note || "");
    }
  }, [isOpen, target]);

  const toggleReason = (reason: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    );
  };

  const handleSave = () => {
    const details: TargetRepairDetails = {
      reasons: selectedReasons,
      note: note.trim(),
      updatedAt: new Date().toISOString(),
    };
    onSaveRepair(target.id, details, false);
    onClose();
  };

  const handleRemoveRepairTag = () => {
    onSaveRepair(target.id, undefined, true);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-[#07182E] border border-rose-500/40 text-slate-100 shadow-2xl p-4 sm:p-5 flex flex-col gap-3.5">
        <DialogHeader className="space-y-1 pb-2 border-b border-[#183E6C] shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
                <Wrench className="w-4 h-4 text-rose-400" />
              </span>
              <DialogTitle className="text-base font-bold text-white tracking-wide flex items-center gap-1.5">
                <span>🚩 Advocate Repair Feedback</span>
              </DialogTitle>
            </div>
            <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-[10.5px]">
              {target.externalTargetId || "TARGET"}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-slate-400">
            Record what needs fixing on <strong className="text-rose-200">{target.targetName}</strong> before using it in the meeting.
          </DialogDescription>
        </DialogHeader>

        {/* Quick Reasons Selection */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
            Select Issues (Click to toggle)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {REPAIR_QUICK_OPTIONS.map((option) => {
              const isSelected = selectedReasons.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleReason(option)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1",
                    isSelected
                      ? "bg-rose-950/80 border-rose-500 text-rose-200 shadow-sm"
                      : "bg-[#051324] border-[#183D68] text-slate-300 hover:border-rose-500/50 hover:text-white"
                  )}
                >
                  {isSelected && <Check className="w-3 h-3 text-rose-400" />}
                  <span>{option}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Free-text Repair Note */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
            Advocate Repair Note:
          </label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Explain what phrasing, evidence citation, or concern needs to be corrected..."
            className="min-h-[85px] max-h-[140px] text-xs bg-[#051324] border-[#183D68] text-slate-100 placeholder:text-slate-500 rounded-xl p-3 focus:ring-1 focus:ring-rose-400 resize-y"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2.5 border-t border-[#183E6C] mt-1 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemoveRepairTag}
            className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 gap-1.5 cursor-pointer h-8 px-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove Repair Tag</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 cursor-pointer h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="text-xs bg-rose-600 hover:bg-rose-500 text-white font-bold gap-1 shadow-md cursor-pointer h-8"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Repair Info</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Layers, CheckSquare, Square, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IepIntelFinding, MeetingTarget } from "../types";

interface CombineBlueprintItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  primaryTarget: MeetingTarget | null;
  availableTargets: MeetingTarget[];
  availableFindings: IepIntelFinding[];
  onConfirmCombine: (params: {
    primaryTarget: MeetingTarget;
    selectedTargets: MeetingTarget[];
    selectedFindings: IepIntelFinding[];
  }) => void;
}

export function CombineBlueprintItemsModal({
  isOpen,
  onClose,
  primaryTarget,
  availableTargets,
  availableFindings,
  onConfirmCombine,
}: CombineBlueprintItemsModalProps) {
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [selectedFindingIds, setSelectedFindingIds] = useState<string[]>([]);

  if (!primaryTarget) return null;

  const otherTargets = availableTargets.filter(
    (t) =>
      t.id !== primaryTarget.id &&
      !t.archivedOrWithdrawn &&
      !t.removedFromPlan
  );

  const alreadyLinkedFindingIds = new Set<string>([
    ...(primaryTarget.sourceFindingId ? [primaryTarget.sourceFindingId] : []),
    ...(primaryTarget.combinedSourceFindingIds || []),
  ]);

  const unmergedFindings = availableFindings.filter(
    (f) =>
      !alreadyLinkedFindingIds.has(f.id) &&
      f.status !== "dismiss" &&
      f.reviewDecision !== "dismissed"
  );

  const toggleTarget = (id: string) => {
    setSelectedTargetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleFinding = (id: string) => {
    setSelectedFindingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    const chosenTargets = otherTargets.filter((t) =>
      selectedTargetIds.includes(t.id)
    );
    const chosenFindings = unmergedFindings.filter((f) =>
      selectedFindingIds.includes(f.id)
    );
    onConfirmCombine({
      primaryTarget,
      selectedTargets: chosenTargets,
      selectedFindings: chosenFindings,
    });
    setSelectedTargetIds([]);
    setSelectedFindingIds([]);
    onClose();
  };

  const totalSelected = selectedTargetIds.length + selectedFindingIds.length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-[#041028] border border-[#2C4880] text-[#FFF4D4] shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-5 border-b border-[#1E3460] bg-[#020A1A]">
          <DialogTitle className="text-base sm:text-lg font-serif font-bold text-[#FFF4D4] flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#DFBE77]" />
            <span>Combine Related Findings into One Request</span>
          </DialogTitle>
          <p className="text-xs text-[#9BB7E0] mt-1">
            Combine related Blueprint items or Records Review findings into{" "}
            <strong className="text-white">{primaryTarget.targetName}</strong>.
            Every document reference, page number, and source citation will be
            retained on the combined item.
          </p>
        </DialogHeader>

        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4 text-xs">
          {/* Other Blueprint Plan Items */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#FFE394]">
              Other Plan Items in Blueprint ({otherTargets.length})
            </div>
            {otherTargets.length === 0 ? (
              <p className="text-[#8CA6CC] italic">
                No other active Blueprint items to combine.
              </p>
            ) : (
              <div className="space-y-1.5">
                {otherTargets.map((t) => {
                  const checked = selectedTargetIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      data-testid={`combine-select-target-${t.id}`}
                      onClick={() => toggleTarget(t.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer",
                        checked
                          ? "bg-[#112852] border-[#DFBE77] text-white"
                          : "bg-[#071530] border-[#1F3560] text-[#C8DAF4] hover:border-[#3A5A96]"
                      )}
                    >
                      {checked ? (
                        <CheckSquare className="h-4 w-4 text-[#FFE394] shrink-0 mt-0.5" />
                      ) : (
                        <Square className="h-4 w-4 text-[#6E8AB8] shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white">
                            {t.targetName}
                          </span>
                          <Badge className="bg-[#0B2046] text-[#FFE394] border border-[#2E4B82] text-[10px]">
                            {t.iepSection}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-[#9BB7E0] line-clamp-2">
                          {t.parentWhatWeWant || t.quickAdvocateSayThis}
                        </p>
                        {t.sources && t.sources.length > 0 && (
                          <p className="text-[10px] text-[#7D98C4] flex items-center gap-1">
                            <FileText className="h-3 w-3 text-[#DFBE77]" />
                            <span>Sources: {t.sources.join(", ")}</span>
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Unmerged Findings from Step 1: Assemble / Records Review */}
          {unmergedFindings.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[#1C3058]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#FFE394]">
                Additional Findings from Records Review ({unmergedFindings.length})
              </div>
              <div className="space-y-1.5">
                {unmergedFindings.map((f) => {
                  const checked = selectedFindingIds.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      data-testid={`combine-select-finding-${f.id}`}
                      onClick={() => toggleFinding(f.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer",
                        checked
                          ? "bg-[#112852] border-[#DFBE77] text-white"
                          : "bg-[#071530] border-[#1F3560] text-[#C8DAF4] hover:border-[#3A5A96]"
                      )}
                    >
                      {checked ? (
                        <CheckSquare className="h-4 w-4 text-[#FFE394] shrink-0 mt-0.5" />
                      ) : (
                        <Square className="h-4 w-4 text-[#6E8AB8] shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white">
                            {f.section || f.category}
                          </span>
                          {f.sourceRef?.fileName && (
                            <span className="text-[10px] text-[#FFE394] font-mono">
                              {f.sourceRef.fileName}
                              {f.sourceRef.pdfPageNumber
                                ? ` · p. ${f.sourceRef.pdfPageNumber}`
                                : ""}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#9BB7E0] line-clamp-2">
                          {f.text}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-[#1E3460] bg-[#020A1A] flex items-center justify-between gap-2">
          <span className="text-[11px] text-[#9BB7E0]">
            {totalSelected} item{totalSelected === 1 ? "" : "s"} selected to
            merge (all source citations preserved)
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-xs text-[#9BB7E0] hover:text-white cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              data-testid="confirm-combine-items-btn"
              disabled={totalSelected === 0}
              onClick={handleConfirm}
              className="text-xs bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border border-[#FFE394]/50 cursor-pointer"
            >
              Combine into One Request
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


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
import { Anchor, FileText, CheckCircle2, AlertCircle, HelpCircle, Upload, Shield } from "lucide-react";
import { toast } from "sonner";

interface UniversalIepIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  recentMeetingDate?: string;
  onTriggerPortmaster: () => void;
}

export function UniversalIepIntakeModal({
  isOpen,
  onClose,
  studentName,
  recentMeetingDate = "September 18, 2026",
  onTriggerPortmaster,
}: UniversalIepIntakeModalProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<"yes" | "no" | "unsure" | null>(null);

  const handleConfirm = () => {
    if (!selectedAnswer) {
      toast.error("Please select an answer to classify the document.");
      return;
    }

    if (selectedAnswer === "yes") {
      toast.success("Document associated with recent IEP meeting! Portmaster 3-way analysis initialized.");
      onTriggerPortmaster();
      onClose();
    } else if (selectedAnswer === "no") {
      toast.success("Saved to Document Vault as historical reference record.");
      onClose();
    } else {
      toast.info("Document saved and marked 'Needs Classification' in Document Vault.");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg bg-[#07182E] border border-[#17487E] text-slate-100 shadow-2xl p-5 flex flex-col gap-3 rounded-2xl">
        <DialogHeader className="space-y-1 pb-2 border-b border-[#123E6E]">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-500/20 text-teal-300">
              <Anchor className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold text-white tracking-wide">
                Universal IEP Intake · Classification
              </DialogTitle>
              <p className="text-[11px] text-blue-200/70 font-mono">
                Portmaster Document Intake Gate
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-1 text-xs">
          <div className="rounded-xl bg-[#041120] border border-[#0F355E] p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
              <HelpCircle className="h-3.5 w-3.5 text-[#F5B544]" />
              <span>We detected a newly uploaded IEP document for {studentName}.</span>
            </div>
            <p className="text-blue-100/90 leading-relaxed text-[11.5px]">
              Is this the newly finalized or amended IEP resulting from the <strong>{recentMeetingDate}</strong> meeting?
            </p>
          </div>

          {/* 3 Radio-like Selection Cards */}
          <div className="space-y-2">
            <div
              onClick={() => setSelectedAnswer("yes")}
              className={`rounded-xl p-3 border transition-all cursor-pointer flex items-start gap-2.5 ${
                selectedAnswer === "yes"
                  ? "bg-[#0A2D52] border-teal-400 ring-1 ring-teal-400/40 text-white"
                  : "bg-[#05172A] border-[#0E355E] text-blue-200 hover:border-[#1A4E82]"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                  selectedAnswer === "yes" ? "border-teal-400 bg-teal-500 text-slate-950 font-bold text-[10px]" : "border-slate-500"
                }`}
              >
                {selectedAnswer === "yes" && "✓"}
              </div>
              <div className="space-y-0.5">
                <span className="font-bold text-white text-xs block">
                  Yes, this is the new / updated IEP
                </span>
                <p className="text-[11px] text-blue-200/70">
                  Associates document with the recent meeting and immediately runs Portmaster 3-way verification.
                </p>
              </div>
            </div>

            <div
              onClick={() => setSelectedAnswer("no")}
              className={`rounded-xl p-3 border transition-all cursor-pointer flex items-start gap-2.5 ${
                selectedAnswer === "no"
                  ? "bg-[#0A2D52] border-teal-400 ring-1 ring-teal-400/40 text-white"
                  : "bg-[#05172A] border-[#0E355E] text-blue-200 hover:border-[#1A4E82]"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                  selectedAnswer === "no" ? "border-teal-400 bg-teal-500 text-slate-950 font-bold text-[10px]" : "border-slate-500"
                }`}
              >
                {selectedAnswer === "no" && "✓"}
              </div>
              <div className="space-y-0.5">
                <span className="font-bold text-white text-xs block">
                  No, this is an older IEP or another copy
                </span>
                <p className="text-[11px] text-blue-200/70">
                  Saves normally into the student's Document Vault without triggering meeting verification.
                </p>
              </div>
            </div>

            <div
              onClick={() => setSelectedAnswer("unsure")}
              className={`rounded-xl p-3 border transition-all cursor-pointer flex items-start gap-2.5 ${
                selectedAnswer === "unsure"
                  ? "bg-[#0A2D52] border-teal-400 ring-1 ring-teal-400/40 text-white"
                  : "bg-[#05172A] border-[#0E355E] text-blue-200 hover:border-[#1A4E82]"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                  selectedAnswer === "unsure" ? "border-teal-400 bg-teal-500 text-slate-950 font-bold text-[10px]" : "border-slate-500"
                }`}
              >
                {selectedAnswer === "unsure" && "✓"}
              </div>
              <div className="space-y-0.5">
                <span className="font-bold text-white text-xs block">
                  I'm not sure
                </span>
                <p className="text-[11px] text-blue-200/70">
                  Flags as "Needs Classification" for advocate inspection before running any automated comparisons.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-[#123E6E] flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs text-blue-300 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            className="h-8 text-xs font-bold bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 px-3.5 cursor-pointer"
          >
            Confirm Classification
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

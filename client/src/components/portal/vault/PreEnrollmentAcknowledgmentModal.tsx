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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileText, Sparkles, ShieldAlert, ArrowRight, CheckCircle2, Lock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface PreEnrollmentAcknowledgmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId?: number;
  studentName?: string;
  onAcknowledged: () => void;
  isLight?: boolean;
}

const HELPFUL_DOCUMENTS = [
  "Current IEP",
  "504 Plan",
  "School evaluations",
  "Private/outside evaluations",
  "Psychoeducational assessments",
  "Psychological or psychiatric evaluations",
  "Relevant diagnoses or medical documentation",
  "Functional Behavior Assessment (FBA)",
  "Behavior Intervention Plan (BIP)",
  "Progress reports",
  "Report cards",
  "Prior Written Notices (PWN)",
  "Eligibility documents",
  "Discipline records",
  "Important school correspondence",
  "Other documents you believe may be helpful",
];

const EXACT_ACKNOWLEDGMENT_TEXT =
  "I understand that I am choosing to upload documents before entering into a service agreement with Waypoint Advocates. Uploading documents does not establish an advocacy relationship or mean these documents have been reviewed.";

export function PreEnrollmentAcknowledgmentModal({
  open,
  onOpenChange,
  studentId,
  studentName = "your child",
  onAcknowledged,
  isLight = false,
}: PreEnrollmentAcknowledgmentModalProps) {
  const [isChecked, setIsChecked] = useState(false);

  const recordAckMutation = trpc.clientFiles.recordPreEnrollmentAcknowledgment.useMutation({
    onSuccess: () => {
      toast.success("Acknowledgment recorded. Entering Document Vault...");
      onAcknowledged();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(`Could not record acknowledgment: ${err.message}`);
    },
  });

  const handleAgreeAndContinue = () => {
    if (!isChecked) return;
    recordAckMutation.mutate({
      studentId,
      version: "v1.0",
      exactText: EXACT_ACKNOWLEDGMENT_TEXT,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#06172F] border-blue-900/50 text-white rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,8,33,0.95)] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-amber-400/15 text-amber-300 border-amber-400/30 text-[10px] font-bold uppercase tracking-wider">
              Pre-Enrollment Upload
            </Badge>
            <span className="text-xs text-blue-200/60 font-medium">Document Vault</span>
          </div>

          <DialogTitle className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <span className="text-2xl">📄</span> Have documents ready? Let&apos;s get them uploaded.
          </DialogTitle>

          <DialogDescription className="text-xs sm:text-sm text-blue-100/80 leading-relaxed">
            If you have any of these available, they can help us better understand {studentName}&apos;s needs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 my-2">
          {/* Prominent "Start Here" Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-400/20 via-amber-500/10 to-transparent border-2 border-amber-400/50 text-amber-200 text-xs sm:text-sm flex items-start gap-3 shadow-lg shadow-amber-400/10">
            <div className="w-8 h-8 rounded-xl bg-amber-400/25 border border-amber-400/40 flex items-center justify-center shrink-0 text-amber-300 font-bold text-base">
              ⭐
            </div>
            <div>
              <p className="font-extrabold text-amber-300 text-sm tracking-tight">
                Start here: Current IEP or 504 Plan
              </p>
              <p className="text-amber-100/90 text-xs mt-0.5 leading-relaxed">
                If your child currently has an IEP or 504 Plan, please upload the most recent copy first.
              </p>
            </div>
          </div>

          {/* Helpful Documents Scannable Checklist */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-300/80 mb-2.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-400" /> Helpful Documents You Can Upload
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {HELPFUL_DOCUMENTS.map((doc, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 rounded-xl bg-blue-950/40 border border-blue-900/40 text-blue-100/90"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">{doc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Auditable Acknowledgment Box */}
          <div className="rounded-2xl border border-amber-400/40 bg-amber-950/20 p-4 sm:p-5 space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="pre-enrollment-ack"
                checked={isChecked}
                onCheckedChange={(checked) => setIsChecked(!!checked)}
                className="mt-1 h-5 w-5 rounded-md border-amber-400/60 data-[state=checked]:bg-amber-400 data-[state=checked]:text-slate-950 focus-visible:ring-amber-400"
              />
              <Label
                htmlFor="pre-enrollment-ack"
                className="text-xs sm:text-sm text-white font-medium leading-relaxed cursor-pointer select-none"
              >
                {EXACT_ACKNOWLEDGMENT_TEXT}
              </Label>
            </div>

            <div className="text-[11px] text-amber-300/80 pl-8 leading-snug">
              This acknowledgment creates an auditable record and is only required on your first upload before enrollment.
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t border-white/10">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-blue-200/70 hover:text-white hover:bg-white/10 text-xs rounded-xl"
          >
            Cancel
          </Button>

          <Button
            type="button"
            disabled={!isChecked || recordAckMutation.isPending}
            onClick={handleAgreeAndContinue}
            className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl px-5 h-11 shadow-lg shadow-amber-400/25 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer gap-2"
          >
            {recordAckMutation.isPending ? (
              <span>Saving Acknowledgment...</span>
            ) : (
              <>
                <span>Agree &amp; Continue to Upload</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Pause, Play, ShieldCheck, Calendar, Clock, FileText, Loader2, CheckCircle2 } from "lucide-react";

interface ReviewPauseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: number;
  contact: any;
  onSuccess?: () => void;
}

export function ReviewPauseModal({
  open,
  onOpenChange,
  contactId,
  contact,
  onSuccess,
}: ReviewPauseModalProps) {
  const [isResuming, setIsResuming] = useState(false);
  const utils = trpc.useUtils();
  const updateJourney = trpc.contacts.updateJourneyState.useMutation();

  const pauseReason = contact?.pauseReason || "Residential placement";
  const pauseStartDate = contact?.pauseStartDate || "September 19, 2026";
  const pauseReviewDate = contact?.pauseReviewDate || "January 15, 2027";
  const contractTreatment = contact?.contractTreatment || "Paid-in-full time preserved";
  const pauseApprovedBy = contact?.pauseApprovedBy || "Byron Honea (Manager)";
  const pauseType = contact?.pauseType === "services_and_billing" ? "Services and Billing Paused" : "Services Only Paused";

  const handleResumeServices = async () => {
    setIsResuming(true);
    try {
      await updateJourney.mutateAsync({
        id: contactId,
        lifecycleStage: "Active",
        operationalState: "Normal",
        serviceStatus: "Active",
        currentPrimaryAction: "Review Case Workspace",
        currentActionDestination: "workspace",
        currentActionHelperText: "Return to service completed. Verify active goals.",
        activityEvent: {
          title: "Services Resumed",
          description: `Services resumed after temporary pause (${pauseReason}). Restored to Active state with approved billing terms.`,
          eventType: "pause_resumed",
          categoryColor: "green",
          whyReason: "Pause term concluded / family returned to active school attendance",
        },
      });

      toast.success("Services successfully resumed! Returned to Active state.");
      await utils.contacts.detail.invalidate({ id: contactId });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error("Failed to resume services: " + (err.message || err));
    } finally {
      setIsResuming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-[#07162B] border-[#0E356A] text-slate-100 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-serif text-white flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
              <Pause className="h-4 w-4 text-purple-300" />
            </div>
            Review Service Pause
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-300">
            View terms, timeline, and return-to-service arrangement for this paused case.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Top Status Banner */}
          <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="font-bold text-sm text-purple-200">Services Temporarily Paused</h4>
              <p className="text-slate-300">
                This client remains active in the CRM. Documents are not archived, and portal access remains fully intact.
              </p>
            </div>
          </div>

          {/* Key Pause Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[#081B38] border border-[#0E356A] space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold uppercase">
                <FileText className="h-3.5 w-3.5 text-[#38BDF8]" /> Reason
              </div>
              <p className="font-bold text-sm text-white">{pauseReason}</p>
            </div>

            <div className="p-3 rounded-xl bg-[#081B38] border border-[#0E356A] space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold uppercase">
                <Clock className="h-3.5 w-3.5 text-purple-400" /> Contract Treatment
              </div>
              <p className="font-bold text-sm text-purple-300">{contractTreatment}</p>
            </div>

            <div className="p-3 rounded-xl bg-[#081B38] border border-[#0E356A] space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold uppercase">
                <Calendar className="h-3.5 w-3.5 text-purple-400" /> Pause Began
              </div>
              <p className="font-semibold text-white">{pauseStartDate}</p>
            </div>

            <div className="p-3 rounded-xl bg-[#081B38] border border-[#0E356A] space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold uppercase">
                <Calendar className="h-3.5 w-3.5 text-[#38BDF8]" /> Expected Return / Review
              </div>
              <p className="font-semibold text-white">{pauseReviewDate}</p>
            </div>
          </div>

          {/* Metadata Row */}
          <div className="p-3 rounded-xl bg-[#0A1D38]/50 border border-[#0E356A]/60 flex items-center justify-between text-slate-300">
            <div>
              <span className="text-slate-400">Approved By: </span>
              <span className="font-semibold text-white">{pauseApprovedBy}</span>
            </div>
            <div>
              <span className="text-slate-400">Treatment: </span>
              <span className="font-semibold text-purple-300">{pauseType}</span>
            </div>
          </div>

          {/* Reassurance Footer */}
          <p className="text-[11px] text-center text-slate-400 pt-1">
            Client remains active • Case not closed • Documents not archived • Portal access active
          </p>
        </div>

        <DialogFooter className="pt-3 border-t border-[#0E356A]/60 flex justify-between items-center">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white text-xs">
            Close
          </Button>
          <Button
            onClick={handleResumeServices}
            disabled={isResuming}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer gap-1.5"
          >
            {isResuming ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Resuming...
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" /> Resume Services Now
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

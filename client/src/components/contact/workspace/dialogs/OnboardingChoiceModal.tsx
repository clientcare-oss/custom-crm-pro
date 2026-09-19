import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CheckSquare, Award, RefreshCw, ShieldCheck, ArrowRight, Loader2, CheckCircle2, Clock } from "lucide-react";

interface OnboardingChoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: number;
  contact: any;
  onSuccess?: () => void;
}

export function OnboardingChoiceModal({
  open,
  onOpenChange,
  contactId,
  contact,
  onSuccess,
}: OnboardingChoiceModalProps) {
  const [selectedPath, setSelectedPath] = useState<"standard" | "scholarship" | "transfer">("standard");
  const [scholarshipNotes, setScholarshipNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const utils = trpc.useUtils();
  const updateJourney = trpc.contacts.updateJourneyState.useMutation();

  const isPendingScholarship = contact?.operationalState === "Scholarship Pending";

  const handleStartOnboarding = async () => {
    setIsSubmitting(true);
    try {
      if (selectedPath === "standard") {
        await updateJourney.mutateAsync({
          id: contactId,
          lifecycleStage: "Onboarding",
          operationalState: "Normal",
          serviceStatus: "Active",
          journeyProgress: 1,
          journeyTotalSteps: 6,
          currentPrimaryAction: "Continue Onboarding",
          currentActionDestination: "onboarding",
          currentActionHelperText: "Send service agreement to parent",
          activityEvent: {
            title: "Standard Onboarding Initiated",
            description: "Employee initiated standard paid onboarding workflow.",
            eventType: "onboarding_start",
            categoryColor: "blue",
          },
        });
        toast.success("Standard onboarding started");
      } else if (selectedPath === "scholarship") {
        await updateJourney.mutateAsync({
          id: contactId,
          lifecycleStage: "Onboarding",
          operationalState: "Scholarship Pending",
          managerApprovalStatus: "pending",
          scholarshipNotes: scholarshipNotes || "Scholarship onboarding requested by employee.",
          journeyProgress: 1,
          journeyTotalSteps: 6,
          currentPrimaryAction: "Continue Onboarding",
          currentActionDestination: "onboarding",
          currentActionHelperText: "Scholarship approval pending manager review",
          activityEvent: {
            title: "Scholarship Approval Requested",
            description: `Scholarship onboarding requested. Notes: ${scholarshipNotes || "None"}. Awaiting manager decision.`,
            eventType: "scholarship_request",
            categoryColor: "yellow",
            whyReason: scholarshipNotes || "Family requesting financial assistance",
          },
        });
        toast.success("Scholarship approval request submitted to manager");
      } else {
        await updateJourney.mutateAsync({
          id: contactId,
          lifecycleStage: "Onboarding",
          operationalState: "Normal",
          serviceStatus: "Active",
          planTier: contact.planTier || "$55",
          journeyProgress: 3,
          journeyTotalSteps: 6,
          currentPrimaryAction: "Continue Onboarding",
          currentActionDestination: "onboarding",
          currentActionHelperText: "Verify updated records and reactivate agreement",
          activityEvent: {
            title: "Returning Client Reactivation",
            description: "Transfer / returning client reactivation path initiated.",
            eventType: "reactivation",
            categoryColor: "green",
          },
        });
        toast.success("Returning client reactivation path initiated");
      }

      await utils.contacts.detail.invalidate({ id: contactId });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error("Failed to update onboarding path: " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManagerDecision = async (decision: "approved" | "denied") => {
    setIsSubmitting(true);
    try {
      if (decision === "approved") {
        await updateJourney.mutateAsync({
          id: contactId,
          operationalState: "Normal",
          managerApprovalStatus: "approved",
          planTier: "Scholarship",
          billingStatus: "Scholarship",
          approvingManager: "Byron Honea (Master IEP Coach®)",
          currentPrimaryAction: "Continue Onboarding",
          currentActionDestination: "onboarding",
          currentActionHelperText: "Scholarship awarded. Proceed with parent onboarding.",
          activityEvent: {
            title: "Scholarship Approved",
            description: "Manager approved 100% full scholarship advocacy plan.",
            eventType: "scholarship_approved",
            categoryColor: "green",
          },
        });
        toast.success("Scholarship approved! Services unlocked.");
      } else {
        await updateJourney.mutateAsync({
          id: contactId,
          operationalState: "Normal",
          managerApprovalStatus: "denied",
          planTier: "$55",
          currentPrimaryAction: "Continue Onboarding",
          currentActionDestination: "onboarding",
          currentActionHelperText: "Offer standard $55 or $105 plan to family",
          activityEvent: {
            title: "Scholarship Denied",
            description: "Manager denied scholarship. Offering standard plan to family.",
            eventType: "scholarship_denied",
            categoryColor: "red",
          },
        });
        toast.info("Scholarship request denied. Standard plan offered.");
      }
      await utils.contacts.detail.invalidate({ id: contactId });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error("Decision failed: " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-[#07162B] border-[#0E356A] text-slate-100 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-serif text-white flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-[#F5B544]" />
            {isPendingScholarship ? "Scholarship Approval Review" : "Select Onboarding Path"}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-300">
            {isPendingScholarship
              ? "Review and act on the pending scholarship request for this family."
              : "Choose how this family is joining Waypoint Advocates. The guided checklist will adapt automatically."}
          </DialogDescription>
        </DialogHeader>

        {isPendingScholarship ? (
          <div className="space-y-4 py-3">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-200">Scholarship Approval Pending</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Non-financial onboarding tasks can proceed, but agreement activation and billing remain protected until a manager approves.
                </p>
                {contact?.scholarshipNotes && (
                  <div className="mt-2 text-xs bg-[#07162B] p-2.5 rounded-lg border border-amber-500/20 text-slate-200">
                    <span className="font-semibold text-amber-300">Employee Notes:</span> {contact.scholarshipNotes}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <p className="text-xs font-semibold text-slate-300">Manager Decision:</p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleManagerDecision("approved")}
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" /> Approve Scholarship
                </Button>
                <Button
                  onClick={() => handleManagerDecision("denied")}
                  disabled={isSubmitting}
                  variant="outline"
                  className="border-rose-500/50 text-rose-300 hover:bg-rose-500/20 cursor-pointer"
                >
                  Deny & Offer $55 Plan
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-3">
              {/* Path 1: Standard Paid */}
              <div
                onClick={() => setSelectedPath("standard")}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedPath === "standard"
                    ? "bg-[#0A2248] border-[#38BDF8] ring-1 ring-[#38BDF8]"
                    : "bg-[#081B38]/60 border-[#0E356A] hover:bg-[#0A2248]/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
                    <CheckSquare className="h-4 w-4 text-[#38BDF8]" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white">1. Standard Paid Onboarding</h4>
                      {selectedPath === "standard" && <span className="text-[11px] font-bold text-[#38BDF8]">Selected</span>}
                    </div>
                    <p className="text-xs text-slate-300">
                      Standard monthly enrollment ($55 or $105). Confirm plan, send agreement, authorize card, and collect educational records.
                    </p>
                  </div>
                </div>
              </div>

              {/* Path 2: Scholarship */}
              <div
                onClick={() => setSelectedPath("scholarship")}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedPath === "scholarship"
                    ? "bg-[#0A2248] border-[#F5B544] ring-1 ring-[#F5B544]"
                    : "bg-[#081B38]/60 border-[#0E356A] hover:bg-[#0A2248]/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <Award className="h-4 w-4 text-[#F5B544]" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white">2. Scholarship Onboarding</h4>
                      {selectedPath === "scholarship" && <span className="text-[11px] font-bold text-[#F5B544]">Selected</span>}
                    </div>
                    <p className="text-xs text-slate-300">
                      Creates a manager approval request. Allows nonfinancial work to start while protecting agreements until manager sign-off.
                    </p>
                  </div>
                </div>
              </div>

              {/* Path 3: Returning Client */}
              <div
                onClick={() => setSelectedPath("transfer")}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedPath === "transfer"
                    ? "bg-[#0A2248] border-emerald-400 ring-1 ring-emerald-400"
                    : "bg-[#081B38]/60 border-[#0E356A] hover:bg-[#0A2248]/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <RefreshCw className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white">3. Transfer or Returning Client</h4>
                      {selectedPath === "transfer" && <span className="text-[11px] font-bold text-emerald-400">Selected</span>}
                    </div>
                    <p className="text-xs text-slate-300">
                      Reactivates historical student records and parent credentials with fast-tracked verification.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {selectedPath === "scholarship" && (
              <div className="space-y-1.5 pt-2">
                <Label className="text-xs font-semibold text-slate-300">Scholarship Rationale / Manager Notes</Label>
                <Textarea
                  value={scholarshipNotes}
                  onChange={(e) => setScholarshipNotes(e.target.value)}
                  placeholder="State the family situation, financial hardship context, or partner sponsor reference..."
                  className="bg-[#0A1D38] border-[#0E356A] text-white text-xs min-h-[70px]"
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter className="pt-3 border-t border-[#0E356A]/60 flex justify-between items-center">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white text-xs">
            Cancel
          </Button>
          {!isPendingScholarship && (
            <Button
              onClick={handleStartOnboarding}
              disabled={isSubmitting}
              className="bg-[#F5B544] hover:bg-[#F5B544]/90 text-[#07162B] font-bold text-xs cursor-pointer gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Starting...
                </>
              ) : (
                <>
                  Start Onboarding Path <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

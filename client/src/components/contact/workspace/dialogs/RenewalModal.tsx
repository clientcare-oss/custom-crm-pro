import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Calendar, CheckCircle2, ArrowRight, FileText, DollarSign, ShieldCheck, Loader2 } from "lucide-react";

interface RenewalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: number;
  contact: any;
  onSuccess?: () => void;
}

export function RenewalModal({
  open,
  onOpenChange,
  contactId,
  contact,
  onSuccess,
}: RenewalModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const utils = trpc.useUtils();
  const updateJourney = trpc.contacts.updateJourneyState.useMutation();

  const planTier = contact?.planTier || "$55";
  const renewalDeadline = contact?.renewalDate || "March 15, 2027";
  const daysRemaining = contact?.renewalDaysRemaining || 14;

  const handleCompleteRenewal = async () => {
    setIsSubmitting(true);
    try {
      const nextTermDate = new Date();
      nextTermDate.setFullYear(nextTermDate.getFullYear() + 1);
      const newRenewalString = nextTermDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

      await updateJourney.mutateAsync({
        id: contactId,
        lifecycleStage: "Active",
        operationalState: "Normal",
        serviceStatus: "Active",
        billingStatus: "Current",
        renewalDate: newRenewalString,
        renewalDaysRemaining: 365,
        currentPrimaryAction: "Review New IEP Draft",
        currentActionDestination: "workspace",
        currentActionHelperText: `Annual renewal completed. Services extended through ${newRenewalString}.`,
        activityEvent: {
          title: "Annual Term Renewed",
          description: `Annual advocate service agreement renewed for ${planTier}. New service term active through ${newRenewalString}.`,
          eventType: "renewal_completed",
          categoryColor: "green",
        },
      });

      toast.success("Client renewed! Returned to Active state with new 1-year service commitment.");
      await utils.contacts.detail.invalidate({ id: contactId });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error("Renewal failed: " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-[#07162B] border-[#0E356A] text-slate-100 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-serif text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#F5B544]" />
            Annual Client Renewal Workflow
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-300">
            Guide the family through annual renewal: review services, confirm plan, and secure commitment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* 4-Step Visual Tracker */}
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { num: 1, label: "Review Services" },
              { num: 2, label: "Confirm Plan" },
              { num: 3, label: "Send Agreement" },
              { num: 4, label: "Reactivate" },
            ].map((step) => {
              const isPast = step.num < currentStep;
              const isCurr = step.num === currentStep;
              return (
                <div
                  key={step.num}
                  onClick={() => setCurrentStep(step.num)}
                  className={`p-2 rounded-lg border transition-all cursor-pointer ${
                    isCurr
                      ? "bg-[#0A2248] border-[#38BDF8] text-white font-bold ring-1 ring-[#38BDF8]"
                      : isPast
                      ? "bg-[#071E3D]/50 border-emerald-500/40 text-emerald-300"
                      : "bg-[#081B38]/40 border-[#0E356A] text-slate-400"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    {isPast ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <span className="text-[11px] font-mono">{step.num}.</span>}
                    <span className="text-[11px] truncate">{step.label}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Current Term Overview Card */}
          <div className="p-3.5 rounded-xl bg-[#081B38] border border-[#0E356A] flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Current Service Term</span>
              <p className="font-bold text-sm text-white">{planTier} Monthly Arrangement</p>
              <p className="text-[11px] text-slate-300">Term expires {renewalDeadline} ({daysRemaining} days remaining)</p>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Services Active
            </div>
          </div>

          {/* Step Content */}
          <div className="p-4 rounded-xl bg-[#0A1D38]/60 border border-[#0E356A] space-y-3">
            {currentStep === 1 && (
              <div className="space-y-2">
                <h4 className="font-bold text-sm text-white">Step 1: Review Current Services & Student Goals</h4>
                <p className="text-slate-300">
                  Review student’s annual IEP progress, meeting attendance records, and past case actions to confirm continued advocacy alignment.
                </p>
                <div className="p-2.5 rounded-lg bg-[#07162B] border border-[#0E356A] text-slate-300">
                  ✓ Verified all IEP documents and evaluations on file. No disruption to parent portal access.
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-2">
                <h4 className="font-bold text-sm text-white">Step 2: Confirm Renewal Tier / Scholarship Status</h4>
                <p className="text-slate-300">
                  Select renewal arrangement with family: maintain existing tier ({planTier}), upgrade service scope, or review scholarship renewal.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 rounded-lg bg-[#07162B] border border-[#38BDF8] text-white">
                    <strong className="block text-xs text-[#38BDF8]">Maintain Plan ({planTier})</strong>
                    <span className="text-[11px] text-slate-300">Continue standard advocacy rate</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#07162B] border border-[#0E356A] text-slate-300">
                    <strong className="block text-xs">Custom / Scholarship</strong>
                    <span className="text-[11px]">Requires manager approval</span>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-2">
                <h4 className="font-bold text-sm text-white">Step 3: Send Renewal Agreement</h4>
                <p className="text-slate-300">
                  Dispatch the digital service agreement to parent for electronic signature with auto-billing authorization.
                </p>
                <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-200">
                  Agreement ready to dispatch via Smart Files / HelloSign integration.
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-2">
                <h4 className="font-bold text-sm text-white">Step 4: Confirm Payment & Extend Active Term</h4>
                <p className="text-slate-300">
                  Completing this step extends the client’s service commitment by 1 full year, updates the renewal date, and returns the case to normal Active state.
                </p>
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">
                  ✓ Ready to reactivate. All historical case records and notes will be preserved.
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-[#0E356A]/60 flex justify-between items-center">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white text-xs">
            Cancel
          </Button>

          {currentStep < 4 ? (
            <Button
              onClick={() => setCurrentStep((prev) => prev + 1)}
              className="bg-[#38BDF8] hover:bg-[#38BDF8]/90 text-[#07162B] font-bold text-xs cursor-pointer gap-1.5"
            >
              Next Step <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              onClick={handleCompleteRenewal}
              disabled={isSubmitting}
              className="bg-[#F5B544] hover:bg-[#F5B544]/90 text-[#07162B] font-bold text-xs cursor-pointer gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Renewing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Finalize Renewal & Reactivate
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

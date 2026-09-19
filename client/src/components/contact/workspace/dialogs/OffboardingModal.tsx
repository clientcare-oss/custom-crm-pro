import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Lock, ShieldCheck, AlertTriangle, ArrowRight, FileText, CheckCircle2, Loader2, RotateCcw } from "lucide-react";

interface OffboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: number;
  contact: any;
  onSuccess?: () => void;
}

const CLOSEOUT_REASONS = [
  "Services completed",
  "Family chose not to renew",
  "Payment unresolved",
  "Family requested cancellation",
  "Attorney referral needed",
  "Moved or changed schools",
  "Student no longer needs services",
  "Unable to contact family",
  "Duplicate or administrative closure",
  "Other",
];

export function OffboardingModal({
  open,
  onOpenChange,
  contactId,
  contact,
  onSuccess,
}: OffboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [closeoutReason, setCloseoutReason] = useState(contact?.offboardingReason || "Services completed");
  const [closingNotes, setClosingNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const utils = trpc.useUtils();
  const updateJourney = trpc.contacts.updateJourneyState.useMutation();

  const isClosed = contact?.lifecycleStage === "Closed";

  const handleStartOffboarding = async () => {
    setIsSubmitting(true);
    try {
      await updateJourney.mutateAsync({
        id: contactId,
        lifecycleStage: "Offboarding",
        operationalState: "Pending Closeout",
        offboardingReason: closeoutReason,
        offboardingRequestedAt: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        currentPrimaryAction: "Continue Offboarding",
        currentActionDestination: "offboarding",
        currentActionHelperText: "Review reason and begin guided closeout",
        activityEvent: {
          title: "Offboarding Initiated",
          description: `Guided offboarding initiated with reason: ${closeoutReason}. Services and portal remain active until final confirmation.`,
          eventType: "offboarding_start",
          categoryColor: "purple",
          whyReason: closeoutReason,
        },
      });

      toast.info("Offboarding requested. Services remain active pending final confirmation.");
      await utils.contacts.detail.invalidate({ id: contactId });
      setCurrentStep(2);
    } catch (err: any) {
      toast.error("Failed to initiate offboarding: " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalizeCloseout = async () => {
    setIsSubmitting(true);
    try {
      const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      await updateJourney.mutateAsync({
        id: contactId,
        lifecycleStage: "Closed",
        operationalState: "Normal",
        serviceStatus: "Closed",
        billingStatus: "Closed",
        portalLifecycleStatus: "Limited",
        offboardingEffectiveDate: today,
        closeoutCompletedBy: "Byron Honea (Manager)",
        currentPrimaryAction: "Review Closed Case",
        currentActionDestination: "workspace",
        currentActionHelperText: `Case closed on ${today} (${closeoutReason}). Records permanently preserved.`,
        activityEvent: {
          title: "Case Formally Closed",
          description: `Case closed with reason: ${closeoutReason}. Notes: ${closingNotes || "None"}. Historical records preserved.`,
          eventType: "case_closed",
          categoryColor: "purple",
          whyReason: closeoutReason,
        },
      });

      toast.success("Case formally closed. Historical records preserved permanently.");
      await utils.contacts.detail.invalidate({ id: contactId });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error("Closeout failed: " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivate = async () => {
    setIsSubmitting(true);
    try {
      await updateJourney.mutateAsync({
        id: contactId,
        lifecycleStage: "Active",
        operationalState: "Normal",
        serviceStatus: "Active",
        billingStatus: "Current",
        portalLifecycleStatus: "Active",
        currentPrimaryAction: "Review Case Workspace",
        currentActionDestination: "workspace",
        currentActionHelperText: "Client reactivated from closed status. Verify active records.",
        activityEvent: {
          title: "Client Reactivated",
          description: "Closed case reactivated to normal Active state by authorized manager.",
          eventType: "case_reactivated",
          categoryColor: "green",
        },
      });

      toast.success("Client reactivated! Restored to Active status.");
      await utils.contacts.detail.invalidate({ id: contactId });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error("Reactivation failed: " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-[#07162B] border-[#0E356A] text-slate-100 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-serif text-white flex items-center gap-2">
            <Lock className="h-5 w-5 text-indigo-400" />
            {isClosed ? "Review Closed Case" : "Client Offboarding Roadmap"}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-300">
            {isClosed
              ? "This case is closed. Historical records and timeline entries are permanently preserved."
              : "Guided closeout process. Starting offboarding does not cancel services or delete records."}
          </DialogDescription>
        </DialogHeader>

        {isClosed ? (
          <div className="space-y-4 py-3 text-xs">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">Status: Closed</span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono">
                  {contact?.offboardingEffectiveDate || "Effective September 19, 2026"}
                </span>
              </div>
              <p className="text-slate-300">
                <strong className="text-slate-200">Closeout Reason:</strong> {contact?.offboardingReason || "Services completed"}
              </p>
              <p className="text-slate-400 text-[11px]">
                Closed by {contact?.closeoutCompletedBy || "Byron Honea"}. All documents, IEPs, notes, and activity history remain accessible for review.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#081B38] border border-[#0E356A] flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-white">Reactivate This Client</h4>
                <p className="text-slate-400 text-[11px]">Restore to Active standing with portal and service access.</p>
              </div>
              <Button
                onClick={handleReactivate}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer gap-1.5"
              >
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                Reactivate Client
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2 text-xs">
            {/* 4-Step Tracker */}
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { num: 1, label: "Select Reason" },
                { num: 2, label: "Final Compass" },
                { num: 3, label: "Closing Message" },
                { num: 4, label: "Confirm Close" },
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

            {/* Reassurance Banner */}
            <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h4 className="font-bold text-sm text-purple-200">Not Closed Yet • Services Remain Active</h4>
                <p className="text-slate-300">
                  Starting offboarding does not cancel billing, lock the portal, or delete files. Full protection is maintained until step 4 is confirmed.
                </p>
              </div>
            </div>

            {/* Step 1: Reason */}
            {currentStep === 1 && (
              <div className="space-y-3 p-3.5 rounded-xl bg-[#081B38] border border-[#0E356A]">
                <Label className="text-xs font-semibold text-slate-200">Select Closeout Reason (Required)</Label>
                <Select value={closeoutReason} onValueChange={setCloseoutReason}>
                  <SelectTrigger className="bg-[#0A1D38] border-[#0E356A] text-white text-xs">
                    <SelectValue placeholder="Choose reason..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#07162B] border-[#0E356A] text-white">
                    {CLOSEOUT_REASONS.map((r) => (
                      <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-400">
                  This classification is logged in the permanent record and audit timeline.
                </p>
              </div>
            )}

            {/* Step 2: Final Compass */}
            {currentStep === 2 && (
              <div className="space-y-2 p-3.5 rounded-xl bg-[#081B38] border border-[#0E356A]">
                <h4 className="font-bold text-sm text-white">Step 2: Final Case Compass Assessment</h4>
                <p className="text-slate-300">
                  Record current student status and confirm that all IEP accommodations, pending evaluations, or disputes are properly documented.
                </p>
                <div className="p-2.5 rounded-lg bg-[#07162B] border border-[#0E356A] text-slate-300">
                  ✓ Current IEP accommodations documented. Student progress notes archived for historical reference.
                </div>
              </div>
            )}

            {/* Step 3: Closing Message */}
            {currentStep === 3 && (
              <div className="space-y-2.5 p-3.5 rounded-xl bg-[#081B38] border border-[#0E356A]">
                <Label className="text-xs font-semibold text-slate-200">Step 3: Closing Communication / Family Summary</Label>
                <Textarea
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="Draft closing warm letter, summary of achievements, and instructions on how to reactivate services in the future..."
                  className="bg-[#0A1D38] border-[#0E356A] text-white text-xs min-h-[80px]"
                />
              </div>
            )}

            {/* Step 4: Final Confirmation */}
            {currentStep === 4 && (
              <div className="space-y-3 p-3.5 rounded-xl bg-[#081B38] border border-[#0E356A]">
                <h4 className="font-bold text-sm text-rose-200 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-rose-400" /> Confirm Final Case Closeout
                </h4>
                <p className="text-slate-300">
                  Confirming closeout will finalize the service term, adjust portal access to read-only historical review, and cancel recurring billing.
                </p>
                <div className="p-3 rounded-lg bg-[#07162B] border border-[#0E356A] space-y-1 text-slate-300">
                  <div><strong>Reason:</strong> {closeoutReason}</div>
                  <div><strong>Records:</strong> 100% permanently preserved (no deletion)</div>
                  <div><strong>Reactivation:</strong> Authorized managers may reactivate anytime</div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="pt-3 border-t border-[#0E356A]/60 flex justify-between items-center">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white text-xs">
            Cancel
          </Button>

          {!isClosed && (
            <>
              {currentStep === 1 && contact?.lifecycleStage !== "Offboarding" ? (
                <Button
                  onClick={handleStartOffboarding}
                  disabled={isSubmitting}
                  className="bg-[#F5B544] hover:bg-[#F5B544]/90 text-[#07162B] font-bold text-xs cursor-pointer gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                  Begin Offboarding
                </Button>
              ) : currentStep < 4 ? (
                <Button
                  onClick={() => setCurrentStep((prev) => prev + 1)}
                  className="bg-[#38BDF8] hover:bg-[#38BDF8]/90 text-[#07162B] font-bold text-xs cursor-pointer gap-1.5"
                >
                  Next Step <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  onClick={handleFinalizeCloseout}
                  disabled={isSubmitting}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Closing...
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" /> Finalize Closeout
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

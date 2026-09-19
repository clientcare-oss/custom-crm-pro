import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AlertTriangle, CreditCard, RefreshCw, Send, ShieldCheck, Calendar, Clock, Loader2, Pause } from "lucide-react";

interface ResolvePaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: number;
  contact: any;
  onSuccess?: () => void;
}

export function ResolvePaymentModal({
  open,
  onOpenChange,
  contactId,
  contact,
  onSuccess,
}: ResolvePaymentModalProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSendingLink, setIsSendingLink] = useState(false);
  const utils = trpc.useUtils();
  const updateJourney = trpc.contacts.updateJourneyState.useMutation();

  const amountDue = contact?.amountDue || "$55.00";
  const failedAttempts = contact?.failedAttemptCount || 1;
  const failureDate = contact?.paymentFailureDate || "September 19, 2026";
  const nextRetryDate = contact?.nextRetryDate || "September 22, 2026";
  const paymentMethod = contact?.paymentMethodSummary || "Visa ending in 4242";

  const handleRetryPayment = async () => {
    setIsRetrying(true);
    try {
      // Simulate successful retry
      await updateJourney.mutateAsync({
        id: contactId,
        operationalState: "Normal",
        billingStatus: "Current",
        failedAttemptCount: 0,
        currentPrimaryAction: "Review New IEP Draft",
        currentActionDestination: "workspace",
        currentActionHelperText: "Payment resolved. Case restored to normal active standing.",
        activityEvent: {
          title: "Payment Successfully Processed",
          description: `Automatic payment retry succeeded for ${amountDue} via ${paymentMethod}. Account returned to normal Active status.`,
          eventType: "payment_success",
          categoryColor: "green",
        },
      });

      toast.success("Payment succeeded! Account returned to normal Active status.");
      await utils.contacts.detail.invalidate({ id: contactId });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error("Retry failed: " + (err.message || err));
    } finally {
      setIsRetrying(false);
    }
  };

  const handleSendPaymentLink = async () => {
    setIsSendingLink(true);
    try {
      await updateJourney.mutateAsync({
        id: contactId,
        activityEvent: {
          title: "Payment Link Sent to Parent",
          description: `Advocate sent secure billing portal update link to parent. Grace period active through ${nextRetryDate}.`,
          eventType: "payment_link_sent",
          categoryColor: "blue",
        },
      });
      toast.success("Secure payment link sent to family via email and text message.");
      await utils.contacts.detail.invalidate({ id: contactId });
      setIsSendingLink(false);
    } catch (err: any) {
      toast.error("Failed to send link: " + (err.message || err));
      setIsSendingLink(false);
    }
  };

  const handleTransitionToPause = async () => {
    try {
      await updateJourney.mutateAsync({
        id: contactId,
        operationalState: "Services Paused",
        serviceStatus: "Paused",
        pauseReason: "Financial hardship / payment review",
        pauseStartDate: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        pauseReviewDate: "In 30 days",
        contractTreatment: "Time preserved during payment pause",
        currentPrimaryAction: "Review Pause",
        currentActionDestination: "pause",
        currentActionHelperText: "Services paused pending payment resolution",
        activityEvent: {
          title: "Services Paused for Payment Review",
          description: "Case transitioned to temporary Services Paused state pending payment resolution.",
          eventType: "services_paused",
          categoryColor: "purple",
        },
      });
      toast.info("Case moved to Services Paused state.");
      await utils.contacts.detail.invalidate({ id: contactId });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error("Failed to pause: " + (err.message || err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-[#07162B] border-[#0E356A] text-slate-100 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-serif text-white flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
            </div>
            Resolve Payment Attention
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-300">
            Review billing status, retry payment method, or coordinate with the family during the grace period.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Status Alert Banner */}
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="font-bold text-sm text-rose-200">Grace Period Active • Services & Portal Remain Open</h4>
              <p className="text-slate-300">
                Waypoint never automatically offboards a family after an unsuccessful payment. Services and portal access remain active during the grace period.
              </p>
            </div>
          </div>

          {/* Payment Detail Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[#081B38] border border-[#0E356A] space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold uppercase">
                Amount Due
              </div>
              <p className="font-bold text-base text-white">{amountDue}</p>
            </div>

            <div className="p-3 rounded-xl bg-[#081B38] border border-[#0E356A] space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold uppercase">
                <CreditCard className="h-3.5 w-3.5 text-[#38BDF8]" /> Payment Method
              </div>
              <p className="font-bold text-sm text-slate-200">{paymentMethod}</p>
            </div>

            <div className="p-3 rounded-xl bg-[#081B38] border border-[#0E356A] space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold uppercase">
                Failed Attempts
              </div>
              <p className="font-semibold text-rose-300">{failedAttempts} attempt ({failureDate})</p>
            </div>

            <div className="p-3 rounded-xl bg-[#081B38] border border-[#0E356A] space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold uppercase">
                <Calendar className="h-3.5 w-3.5 text-[#38BDF8]" /> Next Automatic Retry
              </div>
              <p className="font-semibold text-white">{nextRetryDate}</p>
            </div>
          </div>

          {/* Reassurance text */}
          <p className="text-[11px] text-center text-slate-400 pt-1">
            No automatic offboarding • Family follow-up task active • Services remain active during grace period
          </p>
        </div>

        <DialogFooter className="pt-3 border-t border-[#0E356A]/60 flex flex-wrap gap-2 justify-between items-center">
          <Button
            variant="outline"
            onClick={handleTransitionToPause}
            className="border-purple-500/40 text-purple-300 hover:bg-purple-500/15 text-xs cursor-pointer gap-1.5"
          >
            <Pause className="h-3 w-3" /> Pause Services
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleSendPaymentLink}
              disabled={isSendingLink}
              className="border-slate-700 text-slate-200 hover:text-white text-xs cursor-pointer gap-1.5"
            >
              <Send className="h-3 w-3" /> Send Payment Link
            </Button>
            <Button
              onClick={handleRetryPayment}
              disabled={isRetrying}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer gap-1.5"
            >
              {isRetrying ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" /> Retry Payment Now
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

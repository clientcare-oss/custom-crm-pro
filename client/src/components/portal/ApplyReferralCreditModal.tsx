import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Gift,
  CreditCard,
  Calendar,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface ApplyReferralCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  upcomingPayment: any;
  availableCreditCents: number;
  availableCreditFormatted: string;
  onConfirm: (amountCents: number, invoiceId?: number) => Promise<void>;
  isApplying: boolean;
}

export function ApplyReferralCreditModal({
  isOpen,
  onClose,
  upcomingPayment,
  availableCreditCents,
  availableCreditFormatted,
  onConfirm,
  isApplying,
}: ApplyReferralCreditModalProps) {
  // Scheduled charge in cents
  const scheduledAmountCents = useMemo(() => {
    if (!upcomingPayment) return 0;
    return upcomingPayment.regularPlanAmountCents || upcomingPayment.scheduledChargeCents || 0;
  }, [upcomingPayment]);

  // Maximum applicable credit is min(availableCredit, scheduledAmount)
  const maxApplicableCents = useMemo(() => {
    return Math.min(availableCreditCents, scheduledAmountCents);
  }, [availableCreditCents, scheduledAmountCents]);

  const [inputDollars, setInputDollars] = useState("");

  // Auto-populate when dialog opens with either $25 or max applicable
  useEffect(() => {
    if (isOpen) {
      if (maxApplicableCents > 0) {
        // Default to either $25 or maxApplicable
        const defaultCents = Math.min(2500, maxApplicableCents);
        setInputDollars((defaultCents / 100).toFixed(2));
      } else {
        setInputDollars("0.00");
      }
    }
  }, [isOpen, maxApplicableCents]);

  const selectedCents = useMemo(() => {
    const val = parseFloat(inputDollars);
    if (isNaN(val) || val <= 0) return 0;
    return Math.round(val * 100);
  }, [inputDollars]);

  const isValidAmount = selectedCents > 0 && selectedCents <= maxApplicableCents;
  const newPaymentCents = Math.max(0, scheduledAmountCents - selectedCents);
  const remainingCreditCents = Math.max(0, availableCreditCents - selectedCents);

  const handleQuickSelect = (cents: number) => {
    const clamped = Math.min(cents, maxApplicableCents);
    setInputDollars((clamped / 100).toFixed(2));
  };

  const handleSubmit = async () => {
    if (!isValidAmount) {
      toast.error(`Please enter an amount between $0.01 and $${(maxApplicableCents / 100).toFixed(2)}`);
      return;
    }
    await onConfirm(selectedCents, upcomingPayment?.invoice?.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#071C3C] border border-[#0D4B84] text-white rounded-2xl max-w-lg p-6 shadow-2xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-amber-400">🎁</span>
            <span>Apply Referral Credit to Next Payment</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-blue-200/80">
            Select how much of your available referral credit you want to apply toward your next scheduled payment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Key Facts Summary Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#030C22] p-3 rounded-xl border border-[#0D4B84]">
              <span className="text-[10px] uppercase font-bold text-blue-300/70 tracking-wider block mb-1">
                Available Credit
              </span>
              <p className="text-2xl font-mono font-bold text-[#F5B544]">
                {availableCreditFormatted}
              </p>
            </div>
            <div className="bg-[#030C22] p-3 rounded-xl border border-[#0D4B84]">
              <span className="text-[10px] uppercase font-bold text-blue-300/70 tracking-wider block mb-1">
                Next Scheduled Payment
              </span>
              <p className="text-sm font-semibold text-white">
                {upcomingPayment?.dueDateFormatted || "Upcoming Billing Cycle"}
              </p>
              <p className="text-xs font-mono text-blue-200 mt-0.5">
                Current: ${((scheduledAmountCents) / 100).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Amount Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-blue-100">
                Apply Referral Credit ($)
              </Label>
              <span className="text-[11px] text-blue-300/80">
                Max applicable: <strong className="text-white">${(maxApplicableCents / 100).toFixed(2)}</strong>
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-blue-300 font-bold">$</span>
              <Input
                type="number"
                step="1"
                min="1"
                max={(maxApplicableCents / 100).toFixed(2)}
                value={inputDollars}
                onChange={(e) => setInputDollars(e.target.value)}
                placeholder="25.00"
                className="bg-[#030C22] border-[#0D4B84] text-white pl-8 rounded-xl h-11 text-base font-mono focus:border-[#F5B544]"
              />
            </div>

            {/* Quick Chips */}
            <div className="flex items-center gap-2 pt-1">
              {maxApplicableCents >= 2500 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSelect(2500)}
                  className="h-7 px-2.5 text-xs bg-[#0A254D] border-[#0D4B84] text-blue-200 hover:text-white hover:bg-[#0B3767] rounded-lg"
                >
                  $25.00
                </Button>
              )}
              {maxApplicableCents >= 5000 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSelect(5000)}
                  className="h-7 px-2.5 text-xs bg-[#0A254D] border-[#0D4B84] text-blue-200 hover:text-white hover:bg-[#0B3767] rounded-lg"
                >
                  $50.00
                </Button>
              )}
              {maxApplicableCents >= 7500 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSelect(7500)}
                  className="h-7 px-2.5 text-xs bg-[#0A254D] border-[#0D4B84] text-blue-200 hover:text-white hover:bg-[#0B3767] rounded-lg"
                >
                  $75.00
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect(maxApplicableCents)}
                className="h-7 px-2.5 text-xs bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60 rounded-lg ml-auto font-medium"
              >
                Max (${(maxApplicableCents / 100).toFixed(2)})
              </Button>
            </div>
          </div>

          {/* Section 3: Live Result Preview Before Confirmation */}
          <div className="rounded-xl bg-[#030C22]/90 border border-emerald-500/40 p-4 space-y-2.5">
            <p className="text-xs uppercase font-bold text-emerald-300 tracking-wider flex items-center gap-1.5">
              <span>💳</span>
              <span>Upcoming Payment Preview</span>
            </p>

            <div className="space-y-1.5 text-xs text-blue-200 divide-y divide-[#0D4B84]/50">
              <div className="flex justify-between py-1">
                <span>Original Scheduled Amount:</span>
                <span className="font-mono text-white">
                  ${(scheduledAmountCents / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between py-1 text-emerald-300 font-semibold">
                <span>Referral Credit Applied:</span>
                <span className="font-mono">
                  - ${(selectedCents / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between pt-2 text-sm font-bold">
                <span className="text-white">New Payment Amount:</span>
                <span className="font-mono text-lg text-emerald-300">
                  {newPaymentCents === 0 ? "$0.00 (Satisfied by Credit)" : `$${(newPaymentCents / 100).toFixed(2)}`}
                </span>
              </div>
            </div>

            <div className="pt-1 text-[11px] text-blue-300/70 flex justify-between">
              <span>Remaining Referral Credit:</span>
              <span className="font-mono text-amber-300 font-semibold">
                ${(remainingCreditCents / 100).toFixed(2)}
              </span>
            </div>
          </div>

          <p className="text-xs text-blue-200/80 italic text-center">
            &ldquo;Your referral credit will be applied to your next eligible Waypoint payment.&rdquo;
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-[#0D4B84]/60">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-[#0D4B84] text-blue-200 hover:bg-white/[0.05] rounded-xl text-xs h-10"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!isValidAmount || isApplying}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs px-5 h-10 shadow-lg shadow-emerald-950/50 cursor-pointer"
          >
            {isApplying ? "Applying..." : `Confirm & Apply $${(selectedCents / 100).toFixed(2)} Credit`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

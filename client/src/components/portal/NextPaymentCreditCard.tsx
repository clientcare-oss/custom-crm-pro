import React from "react";
import { Button } from "@/components/ui/button";
import {
  Gift,
  Lock,
  CreditCard,
  CheckCircle2,
  Calendar,
  AlertCircle,
  ShieldCheck,
  Undo2,
  Clock,
  Sparkles,
} from "lucide-react";

interface NextPaymentCreditCardProps {
  upcomingPayment: any;
  availableCreditCents: number;
  availableCreditFormatted: string;
  onOpenApplyModal: () => void;
  onCancelCredit: (invoiceId: number) => void;
  isCancelling?: boolean;
}

export function NextPaymentCreditCard({
  upcomingPayment,
  availableCreditCents,
  availableCreditFormatted,
  onOpenApplyModal,
  onCancelCredit,
  isCancelling = false,
}: NextPaymentCreditCardProps) {
  // If no upcoming payment is recorded at all
  if (!upcomingPayment || !upcomingPayment.hasUpcomingPayment) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-[#0A254D] via-[#071C3C] to-[#030C22] border border-[#0D4B84] p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎁</span>
              <h3 className="text-lg font-bold text-white tracking-tight">Your Referral Credit</h3>
              <span className="text-xs font-mono font-bold text-[#F5B544] bg-[#F5B544]/15 border border-[#F5B544]/40 px-2.5 py-0.5 rounded-full">
                {availableCreditFormatted} Available
              </span>
            </div>
            <p className="text-xs sm:text-sm text-blue-200/80 max-w-xl">
              Referral credits accumulate automatically in your account. You decide when to apply them toward an upcoming billing cycle.
            </p>
          </div>
          <div className="bg-[#030C22] border border-[#0D4B84] rounded-xl px-4 py-2.5 text-right shrink-0">
            <span className="text-[10px] uppercase font-bold text-blue-300/70 tracking-wider block">Status</span>
            <span className="text-xs text-blue-200 font-semibold flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Ready for Next Invoice</span>
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-[#0D4B84]/60 flex items-start gap-2 text-[11px] text-blue-200/70 leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p>
            <strong className="text-amber-300 font-semibold">Important Notice:</strong> Referral credits have no cash value and may only be applied toward eligible Waypoint Advocates charges.
          </p>
        </div>
      </div>
    );
  }

  const isCreditApplied =
    (upcomingPayment.referralCreditAppliedCents && upcomingPayment.referralCreditAppliedCents > 0) ||
    upcomingPayment.creditStatus === "pending_application";

  // CASE 1: AFTER CREDIT HAS BEEN APPLIED (Section 12)
  if (isCreditApplied) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-[#062c26] via-[#071C3C] to-[#030C22] border-2 border-emerald-500/50 p-5 sm:p-6 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h3 className="text-xl font-extrabold text-white tracking-tight">
                Referral Credit Scheduled
              </h3>
              <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/50 px-2.5 py-0.5 rounded-full">
                Pending Billing
              </span>
            </div>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-xl">
              Your referral credit has been successfully applied to your next scheduled payment.
            </p>
          </div>

          {upcomingPayment.invoice?.id && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onCancelCredit(upcomingPayment.invoice.id)}
              disabled={isCancelling}
              className="bg-[#071C3C] hover:bg-[#0B3767] border-[#0D4B84] text-blue-200 hover:text-white rounded-xl h-9 px-3.5 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-center transition-all cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>{isCancelling ? "Cancelling..." : "Cancel Credit Application"}</span>
            </Button>
          )}
        </div>

        {/* Section 12 Specification Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#030C22]/80 border border-emerald-500/30 rounded-xl p-4">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-blue-300/70 tracking-wider">
              Regular Payment
            </span>
            <p className="text-sm sm:text-base font-mono font-bold text-white">
              {upcomingPayment.regularPlanAmountFormatted || "$0.00"}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
              Referral Credit
            </span>
            <p className="text-sm sm:text-base font-mono font-bold text-emerald-300">
              - {upcomingPayment.referralCreditAppliedFormatted || "$0.00"}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">
              Scheduled Charge
            </span>
            <p className="text-sm sm:text-base font-mono font-extrabold text-amber-300">
              {upcomingPayment.scheduledChargeCents === 0
                ? "$0.00 (Satisfied)"
                : upcomingPayment.scheduledChargeFormatted}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-blue-300/70 tracking-wider">
              Payment Date
            </span>
            <p className="text-sm sm:text-base font-semibold text-white">
              {upcomingPayment.dueDateFormatted || "Upcoming"}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs text-blue-200/80">
          <p>
            Referral Credit Remaining in Account:{" "}
            <strong className="text-[#F5B544] font-mono font-bold">
              {availableCreditFormatted}
            </strong>
          </p>
          <span className="text-[11px] text-emerald-300/80 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Normal recurring plan amount continues normally next cycle.
          </span>
        </div>
      </div>
    );
  }

  // CASE 2: CREDIT NOT YET APPLIED (Section 4 & 11)
  const isPastCutoff = upcomingPayment.isPastCutoff;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#0A254D] via-[#071C3C] to-[#030C22] border border-[#0D4B84] p-5 sm:p-6 shadow-xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎁</span>
            <h3 className="text-xl font-bold text-white tracking-tight">Your Referral Credit</h3>
            <span className="text-xs font-mono font-bold text-[#F5B544] bg-[#F5B544]/15 border border-[#F5B544]/40 px-3 py-1 rounded-full">
              {availableCreditFormatted} Available
            </span>
          </div>
          <p className="text-xs sm:text-sm text-blue-200/80 max-w-xl">
            You decide when to apply your earned referral credit. Credits do not automatically reduce your bill unless you choose to apply them.
          </p>
        </div>

        {/* Section 2 & 4: Application Button */}
        {isPastCutoff ? (
          <Button
            type="button"
            disabled
            className="bg-slate-800 border border-slate-700 text-slate-400 rounded-xl h-11 px-5 text-xs font-bold flex items-center gap-2 opacity-80 cursor-not-allowed self-start sm:self-center"
          >
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Apply Credit to My Next Payment</span>
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onOpenApplyModal}
            disabled={availableCreditCents <= 0}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl h-11 px-5 text-xs font-bold shadow-lg shadow-emerald-950/60 flex items-center gap-2 cursor-pointer transition-all self-start sm:self-center"
          >
            <CreditCard className="w-4 h-4" />
            <span>Apply Credit to My Next Payment</span>
          </Button>
        )}
      </div>

      {/* Payment & Cutoff Schedule Grid (Section 11) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#030C22]/80 border border-[#0D4B84] rounded-xl p-4">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-blue-300/70 tracking-wider block">
            Next Payment
          </span>
          <p className="text-sm sm:text-base font-semibold text-white flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span>{upcomingPayment.dueDateFormatted}</span>
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-blue-300/70 tracking-wider block">
            Regular Payment
          </span>
          <p className="text-sm sm:text-base font-mono font-bold text-white">
            {upcomingPayment.regularPlanAmountFormatted}
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-amber-300/80 tracking-wider block">
            Apply Referral Credit By
          </span>
          <p className="text-sm sm:text-base font-semibold text-amber-300 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>{upcomingPayment.cutoffDateFormatted}</span>
          </p>
        </div>
      </div>

      {/* Section 4: Five-Day Cutoff Warning Banner */}
      {isPastCutoff ? (
        <div className="rounded-xl bg-amber-950/40 border border-amber-500/50 p-4 space-y-1 text-xs text-amber-200">
          <div className="flex items-center gap-2 text-amber-300 font-bold">
            <Lock className="w-4 h-4" />
            <span>Next payment is already processing</span>
          </div>
          <p className="text-blue-100/90 leading-relaxed">
            Referral credits can no longer be applied to this upcoming payment. Your available credit will remain in your account and can be applied to a future payment.
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between text-xs text-blue-200/80">
          <span className="text-[11px] text-blue-300/70">
            Cutoff window: 5 calendar days before scheduled payment date ({upcomingPayment.cutoffDateFormatted}).
          </span>
        </div>
      )}

      {/* Section 11 Underneath Disclaimer */}
      <div className="pt-3 border-t border-[#0D4B84]/60 flex items-start gap-2 text-[11px] text-blue-200/70 leading-relaxed">
        <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p>
          Referral credits have no cash value and may only be applied toward eligible Waypoint Advocates charges.
        </p>
      </div>
    </div>
  );
}

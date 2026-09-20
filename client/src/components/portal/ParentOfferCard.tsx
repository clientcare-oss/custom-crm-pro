import React, { useState, useId, useMemo } from "react";
import {
  Sparkles,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Zap,
  CreditCard,
  Lock,
  ArrowRight,
  ShieldCheck,
  Check,
  RotateCcw,
  Receipt,
  FileText,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ParentOfferCardProps {
  studentId: number;
  studentName?: string;
  isLight?: boolean;
}

export function ParentOfferCard({
  studentId,
  studentName = "Liam",
  isLight = false,
}: ParentOfferCardProps) {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"saved" | "new">("saved");
  const [cardNumber, setCardNumber] = useState("•••• •••• •••• 4242");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvc, setCardCvc] = useState("•••");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Generate unique idempotency key
  const [idempotencyKey, setIdempotencyKey] = useState(
    () => `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  );

  const utils = trpc.useUtils();
  const { data: activeOffer, isLoading } =
    trpc.supportOffers.portalGetActive.useQuery(
      { studentId },
      { enabled: !!studentId, refetchInterval: 30_000 }
    );

  const acceptFreeMutation = trpc.supportOffers.portalAcceptFreeOffer.useMutation({
    onSuccess: () => {
      setPaymentSuccess(true);
      utils.supportOffers.portalGetActive.invalidate({ studentId });
      toast.success("Support offer accepted! Service initialized.");
    },
    onError: (err) => {
      toast.error(`Could not accept offer: ${err.message}`);
    },
  });

  const payMutation = trpc.supportOffers.portalProcessPayment.useMutation({
    onSuccess: (res) => {
      setIsProcessing(false);
      if (res.success) {
        setPaymentSuccess(true);
        setPaymentError(null);
        utils.supportOffers.portalGetActive.invalidate({ studentId });
        toast.success("Payment completed! Your support has been added.");
      } else {
        setPaymentError(
          res.error || "Payment was not completed. Please check card details."
        );
        // generate a fresh idempotency key for retry
        setIdempotencyKey(`idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
      }
    },
    onError: (err) => {
      setIsProcessing(false);
      setPaymentError(err.message || "Payment processing error occurred.");
      setIdempotencyKey(`idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
    },
  });

  if (isLoading || !activeOffer) return null;

  // If already paid and dialog closed, show small confirmation badge or return null
  if (
    activeOffer.status !== "sent" &&
    activeOffer.status !== "viewed" &&
    activeOffer.status !== "payment_pending" &&
    activeOffer.status !== "payment_failed" &&
    !paymentSuccess
  ) {
    return null;
  }

  const includedList: string[] = activeOffer.includedItems
    ? (() => {
        try {
          return JSON.parse(activeOffer.includedItems);
        } catch {
          return [];
        }
      })()
    : [];

  const basePriceCents = activeOffer.price;
  const priorityPriceCents = activeOffer.priorityPrice || 0;
  const totalCents =
    basePriceCents + (selectedPriority && activeOffer.priorityEnabled ? priorityPriceCents : 0);
  const isFree = basePriceCents === 0 || !activeOffer.requirePayment;

  // Handle immediate payment or acceptance
  const handleProceed = async () => {
    if (isProcessing) return;

    if (isFree) {
      setIsProcessing(true);
      await acceptFreeMutation.mutateAsync({
        offerId: activeOffer.id,
        selectedPriority,
      });
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    await payMutation.mutateAsync({
      offerId: activeOffer.id,
      selectedPriority,
      paymentMethodToken: paymentMethod === "saved" ? "pm_saved_card_default" : "pm_card_new",
      idempotencyKey,
    });
  };

  return (
    <>
      {/* ── RECOMMENDED SUPPORT BANNER (Portal Dashboard Top) ── */}
      <div
        className={`rounded-2xl p-5 border shadow-xl relative overflow-hidden transition-all ${
          isLight
            ? "bg-gradient-to-r from-amber-500/10 via-blue-500/5 to-white border-amber-300 shadow-amber-500/5"
            : "bg-gradient-to-r from-[#0d223f] via-[#091b33] to-[#06172F] border-amber-400/40 shadow-2xl"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-500/20 border border-amber-400/40 text-amber-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                New Support Recommended by Waypoint
              </span>
              {activeOffer.status === "payment_failed" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  <AlertTriangle className="w-3 h-3" /> Payment Needs Attention
                </span>
              )}
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
              {activeOffer.title}
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              Waypoint has recommended additional support for {studentName}. Open to review the details and decide whether you would like to continue.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsOpenModal(true);
                setPaymentSuccess(false);
                setPaymentError(null);
              }}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#071422] text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all"
            >
              <span>Review Recommended Support</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── ACCEPTANCE & PAYMENT MODAL ── */}
      <Dialog open={isOpenModal} onOpenChange={setIsOpenModal}>
        <DialogContent className="bg-[#0B1D35] border border-[#1b3558] text-slate-100 max-w-xl max-h-[90vh] overflow-y-auto">
          {paymentSuccess ? (
            /* ── CONFIRMATION STATE ── */
            <div className="py-6 px-2 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-400 animate-in zoom-in-50">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-white">
                  Your support has been added.
                </h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                  Waypoint has received your payment and will begin the next steps for this service.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#07162B] border border-[#18314f] text-left text-xs space-y-2 max-w-md mx-auto font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Service:</span>
                  <span className="font-semibold text-white">{activeOffer.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount Paid:</span>
                  <span className="font-bold text-amber-300">
                    ${(totalCents / 100).toFixed(2)} USD
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Estimated Turnaround:</span>
                  <span className="text-slate-200">
                    {selectedPriority && activeOffer.priorityDeliveryTime
                      ? activeOffer.priorityDeliveryTime
                      : activeOffer.deliveryTime}
                  </span>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          ) : (
            /* ── REVIEW & PAYMENT FORM ── */
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 border border-amber-400/30 text-amber-300">
                    <Sparkles className="w-3 h-3" /> Recommended by Waypoint
                  </span>
                  <span className="text-xs text-slate-400">• For {studentName}</span>
                </div>
                <DialogTitle className="text-lg font-bold text-white">
                  {activeOffer.title}
                </DialogTitle>
                <DialogDescription className="text-slate-300 text-xs leading-relaxed">
                  {activeOffer.description}
                </DialogDescription>
              </DialogHeader>

              {/* Personal Note if provided */}
              {activeOffer.personalNote && (
                <div className="p-3 rounded-lg bg-[#07162B] border border-blue-500/30 text-xs text-slate-200">
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-0.5">
                    Advocate Note:
                  </p>
                  <p className="italic">"{activeOffer.personalNote}"</p>
                </div>
              )}

              {/* What's Included */}
              {includedList.length > 0 && (
                <div className="space-y-1.5 text-xs">
                  <p className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                    What’s Included:
                  </p>
                  <div className="space-y-1">
                    {includedList.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-slate-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Priority Option Choice */}
              {activeOffer.priorityEnabled && (
                <div className="p-3.5 rounded-xl bg-[#07162B] border border-[#1e3a5f] space-y-2.5">
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Turnaround Option:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label
                      onClick={() => setSelectedPriority(false)}
                      className={`p-2.5 rounded-lg border cursor-pointer flex flex-col justify-between ${
                        !selectedPriority
                          ? "bg-blue-600/20 border-blue-400 text-white"
                          : "border-slate-700 text-slate-400 hover:border-slate-500"
                      }`}
                    >
                      <span className="font-semibold">Standard Delivery</span>
                      <span className="text-[11px] text-slate-400 mt-1">
                        {activeOffer.deliveryTime}
                      </span>
                    </label>

                    <label
                      onClick={() => setSelectedPriority(true)}
                      className={`p-2.5 rounded-lg border cursor-pointer flex flex-col justify-between ${
                        selectedPriority
                          ? "bg-amber-500/20 border-amber-400 text-white"
                          : "border-slate-700 text-slate-400 hover:border-slate-500"
                      }`}
                    >
                      <span className="font-semibold text-amber-300 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Priority Rush
                      </span>
                      <span className="text-[11px] text-amber-200/70 mt-1">
                        {activeOffer.priorityDeliveryTime} (+${((activeOffer.priorityPrice || 0) / 100).toFixed(2)})
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Payment Section for Paid Offers */}
              {!isFree && (
                <div className="space-y-3 pt-3 border-t border-[#18314f]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                      Payment Method
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-emerald-400" /> 256-Bit SSL Encrypted
                    </span>
                  </div>

                  {/* Payment method selector */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("saved")}
                      className={`p-2.5 rounded-lg border text-left transition-colors ${
                        paymentMethod === "saved"
                          ? "bg-blue-600/20 border-blue-400 text-white"
                          : "border-slate-700 text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      <p className="font-semibold">Saved Card</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Visa ending 4242</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("new")}
                      className={`p-2.5 rounded-lg border text-left transition-colors ${
                        paymentMethod === "new"
                          ? "bg-blue-600/20 border-blue-400 text-white"
                          : "border-slate-700 text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      <p className="font-semibold">New Payment Method</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Enter credit / debit card</p>
                    </button>
                  </div>

                  {paymentMethod === "new" && (
                    <div className="p-3 rounded-lg bg-[#07162B] border border-[#1e3a5f] space-y-2 text-xs">
                      <div>
                        <label className="text-[11px] text-slate-400">Card Number</label>
                        <input
                          type="text"
                          placeholder="4242 •••• •••• 4242"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 bg-[#0B1D35] border border-slate-700 rounded text-white text-xs font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] text-slate-400">Expires</label>
                          <input
                            type="text"
                            placeholder="MM/YY"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            className="w-full mt-1 px-3 py-1.5 bg-[#0B1D35] border border-slate-700 rounded text-white text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400">CVC</label>
                          <input
                            type="password"
                            placeholder="•••"
                            maxLength={4}
                            value={cardCvc}
                            onChange={(e) => setCardCvc(e.target.value)}
                            className="w-full mt-1 px-3 py-1.5 bg-[#0B1D35] border border-slate-700 rounded text-white text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payment Error banner */}
                  {paymentError && (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{paymentError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleProceed}
                        className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] flex items-center gap-1 shrink-0"
                      >
                        <RotateCcw className="w-3 h-3" /> Retry
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Total & Acceptance Footer */}
              <DialogFooter className="pt-4 border-t border-[#18314f] flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-left w-full sm:w-auto">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">
                    Total Due:
                  </span>
                  <div className="text-xl font-black text-white font-mono">
                    {isFree ? (
                      <span className="text-emerald-400">Complimentary ($0.00)</span>
                    ) : (
                      `$${(totalCents / 100).toFixed(2)} USD`
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsOpenModal(false)}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-[#102744]"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleProceed}
                    disabled={isProcessing}
                    className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-xs font-bold shadow-lg flex items-center justify-center gap-1.5 ${
                      isFree
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white"
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {isProcessing
                        ? "Processing..."
                        : isFree
                        ? "Accept Support"
                        : "Accept and Continue to Payment"}
                    </span>
                  </button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

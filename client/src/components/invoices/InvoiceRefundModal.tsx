import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RotateCcw, AlertTriangle, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface InvoiceRefundModalProps {
  invoice: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function InvoiceRefundModal({
  invoice,
  open,
  onOpenChange,
  onSuccess,
}: InvoiceRefundModalProps) {
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  React.useEffect(() => {
    if (invoice) {
      const alreadyRefunded = Number(invoice.refundedAmount || 0);
      const invoiceTotal = Number(invoice.total || invoice.amount || 0);
      const remaining = Math.max(0, invoiceTotal - alreadyRefunded);
      setAmount(remaining > 0 ? remaining.toFixed(2) : "0.00");
      setReason("");
    }
  }, [invoice]);

  const refundMutation = trpc.invoices.refund.useMutation({
    onSuccess: (res) => {
      toast.success(
        res.success
          ? `Stripe refund of $${res.amountRefunded.toFixed(2)} processed successfully!`
          : "Stripe refund processed"
      );
      onSuccess();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to process refund");
    },
  });

  if (!open || !invoice) return null;

  const invoiceTotal = Number(invoice.total || invoice.amount || 0);
  const alreadyRefunded = Number(invoice.refundedAmount || 0);
  const maxRefundable = Math.max(0, invoiceTotal - alreadyRefunded);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const refundVal = parseFloat(amount);
    if (isNaN(refundVal) || refundVal <= 0) {
      toast.error("Please enter a valid refund amount");
      return;
    }
    if (refundVal > maxRefundable) {
      toast.error(`Refund amount cannot exceed remaining refundable balance ($${maxRefundable.toFixed(2)})`);
      return;
    }

    refundMutation.mutate({
      id: invoice.id,
      amount: refundVal,
      reason: reason.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-gradient-to-b from-[#0B1E38] via-[#07162B] to-[#040D1A] border border-[#FFE394]/50 shadow-[0_25px_60px_rgba(0,0,0,0.95)] text-white rounded-2xl p-6">
        
        {/* Specular Top Hairline */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FFE394] to-transparent shadow-[0_0_15px_rgba(255,227,148,0.8)]" />

        <DialogHeader className="border-b border-[#DFBE77]/30 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl p-[1.5px] bg-gradient-to-b from-red-400 via-amber-500 to-[#9E7D3B] shadow-md shrink-0">
              <div className="w-full h-full rounded-[10px] bg-[#142642] flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-amber-300" />
              </div>
            </div>
            <div>
              <DialogTitle className="text-lg font-serif font-bold text-[#FFF4D4]">
                Issue Stripe Refund
              </DialogTitle>
              <DialogDescription className="text-xs text-[#C6B697] mt-0.5">
                Invoice #{invoice.invoiceNumber}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          
          {/* Balance info card */}
          <div className="p-3 bg-[#020A17]/85 border border-[#DFBE77]/30 rounded-xl space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-[#C6B697]">
              <span>Total Paid:</span>
              <span className="text-[#FFF4D4]">${invoiceTotal.toFixed(2)}</span>
            </div>
            {alreadyRefunded > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>Previously Refunded:</span>
                <span>-${alreadyRefunded.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-[#FFE394] border-t border-[#DFBE77]/20 pt-1">
              <span>Max Refundable:</span>
              <span>${maxRefundable.toFixed(2)}</span>
            </div>
          </div>

          {/* Refund Amount Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-[#C5A059] font-bold block">
              Refund Amount ($) *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-[#A69371]" />
              <Input
                type="number"
                min="0.01"
                max={maxRefundable}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="bg-[#020A17] border border-[#DFBE77]/40 rounded-xl pl-9 text-sm text-[#FFF4D4] font-mono focus:border-[#FFE394]"
              />
            </div>
          </div>

          {/* Reason Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-[#A69371] font-semibold block">
              Reason for Refund
            </label>
            <Input
              placeholder="e.g. Session cancelled by client, overpayment..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-[#020A17] border border-[#DFBE77]/30 rounded-xl text-xs text-[#FFF4D4] focus:border-[#FFE394]"
            />
          </div>

          <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 flex items-start gap-2 text-[11px] text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>
              This triggers an immediate return of funds through Stripe to the client&apos;s original payment method.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#DFBE77]/30">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-white/70 hover:text-white text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={refundMutation.isPending || maxRefundable <= 0}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-md flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{refundMutation.isPending ? "Processing..." : "Process Refund"}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

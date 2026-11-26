import React from "react";
import {
  X,
  Heart,
  Receipt,
  Send,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { formatCents } from "@shared/paymentStation";

export interface RecentPaymentRecord {
  transactionId: number | null;
  receiptNumber: string | null;
  status: "awaiting_payment" | "pending" | "paid" | "failed" | "requires_action";
  mode: "invoice" | "service" | "donation";
  clientOrDonorName: string;
  clientOrDonorEmail: string | null;
  description: string;
  subtitle: string | null;
  invoiceId: number | null;
  invoiceNumber: string | null;
  amountCents: number;
  paymentMethodSummary: string | null;
  transactionRef: string | null;
  paidAt: string | null;
  collectedByName: string | null;
  emailSentAt: string | null;
}

interface RecentPaymentsDrawerProps {
  open: boolean;
  onClose: () => void;
  items: RecentPaymentRecord[];
  isLoading: boolean;
  canRefund: boolean;
  onRefresh: () => void;
  onResendReceipt: (transactionId: number, email?: string | null) => void;
  onNavigateToInvoices: () => void;
}

export function RecentPaymentsDrawer({
  open,
  onClose,
  items,
  isLoading,
  canRefund,
  onRefresh,
  onResendReceipt,
  onNavigateToInvoices,
}: RecentPaymentsDrawerProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Recent payments"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-[440px] h-full bg-[#05122B] border-l border-[#C8A157]/45 shadow-2xl flex flex-col text-[#EFF4FF]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#253C68] flex items-center justify-between">
          <div>
            <h2
              className="text-[20px] text-[#FFF4D6]"
              style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
            >
              Recent payments
            </h2>
            <p className="text-xs text-[#94A8CE] mt-0.5">
              Verified Payment Station charges, pending links, and donations
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onRefresh}
              aria-label="Refresh recent payments"
              className="h-8 w-8 rounded-lg border border-white/10 bg-[#0A1C3F] hover:bg-[#132B5A] text-[#C6D5F0] flex items-center justify-center cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close recent payments drawer"
              className="h-8 w-8 rounded-lg border border-white/10 bg-[#0A1C3F] hover:bg-[#132B5A] text-[#C6D5F0] flex items-center justify-center cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Receipt className="h-8 w-8 text-[#637AA8] mx-auto" />
              <p className="text-sm font-medium text-[#D8E3F8]">No recent transactions yet</p>
              <p className="text-xs text-[#8CA0C7] max-w-[260px] mx-auto">
                Confirmed Stripe payments, hosted payment links, and donations collected here will
                appear with full staff attribution.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const isPaid = item.status === "paid";
              const isPending = item.status === "pending";
              return (
                <div
                  key={`${item.transactionId ?? item.receiptNumber ?? item.transactionRef}`}
                  className="rounded-xl bg-[#071838] border border-[#324D82]/55 p-3.5 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {item.mode === "donation" && (
                          <Heart className="h-3.5 w-3.5 text-[#DFBE77] shrink-0" />
                        )}
                        <span className="text-sm font-semibold text-white truncate">
                          {item.clientOrDonorName}
                        </span>
                      </div>
                      <p className="text-xs text-[#9BB0D4] truncate mt-0.5">
                        {item.subtitle || item.description}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-[#FFE8A8] tabular-nums">
                        {formatCents(item.amountCents)}
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 text-[10.5px] font-semibold mt-0.5 ${
                          isPaid
                            ? "text-emerald-300"
                            : isPending
                              ? "text-amber-300"
                              : "text-rose-300"
                        }`}
                      >
                        {isPaid ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : isPending ? (
                          <Clock className="h-3 w-3" />
                        ) : (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                        <span>{isPaid ? "Paid" : isPending ? "Pending" : "Failed"}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#8399C4]">
                    {item.receiptNumber && <span className="font-mono">{item.receiptNumber}</span>}
                    {item.paymentMethodSummary && <span>{item.paymentMethodSummary}</span>}
                    {item.collectedByName && <span>By {item.collectedByName}</span>}
                    {item.paidAt && (
                      <span>{new Date(item.paidAt).toLocaleDateString("en-US")}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-white/5 gap-2">
                    {isPaid && item.transactionId ? (
                      <button
                        type="button"
                        onClick={() =>
                          onResendReceipt(item.transactionId!, item.clientOrDonorEmail)
                        }
                        className="inline-flex items-center gap-1.5 text-xs text-cyan-300 hover:text-cyan-200 cursor-pointer"
                      >
                        <Send className="h-3 w-3" />
                        <span>{item.emailSentAt ? "Resend receipt" : "Send receipt"}</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#7D92BA]">
                        {isPending ? "Awaiting Stripe confirmation" : "Not settled"}
                      </span>
                    )}

                    {canRefund && isPaid && item.mode !== "donation" && (
                      <button
                        type="button"
                        onClick={onNavigateToInvoices}
                        className="inline-flex items-center gap-1 text-[11px] text-[#C8B287] hover:text-[#FFE39A] cursor-pointer"
                      >
                        <span>Manage / Refund in Billing</span>
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

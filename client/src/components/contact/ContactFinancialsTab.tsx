import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DollarSign, FileText, Plus, Copy, Check, Eye, Send, ScrollText, CheckCircle2, Clock, AlertTriangle, XCircle, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateInvoiceModal } from "@/components/invoices/CreateInvoiceModal";
import { InvoicePreviewModal } from "@/components/invoices/InvoicePreviewModal";
import { InvoiceRefundModal } from "@/components/invoices/InvoiceRefundModal";
import { toast } from "sonner";

interface InvoiceItem {
  id: number;
  number?: string;
  invoiceNumber?: string;
  totalAmount?: number | string;
  amount?: number | string;
  total?: number | string;
  discountAmount?: number | string | null;
  discountNote?: string | null;
  regularPlanAmount?: number | string | null;
  referralCreditApplied?: number | string | null;
  creditApplicationStatus?: string | null;
  paymentStatusNote?: string | null;
  status: string;
  stripePaymentUrl?: string | null;
  dueDate?: string | Date | null;
  createdAt: string | Date;
}

interface ContractItem {
  id: number;
  title: string;
  status: string;
  createdAt: string | Date;
}

interface ContactFinancialsTabProps {
  contactId?: number;
  invoices?: InvoiceItem[];
  contracts?: ContractItem[];
  onCreateInvoice?: () => void;
  onCreateContract?: () => void;
}

export default function ContactFinancialsTab({
  contactId,
  invoices: initialInvoices = [],
  contracts = [],
  onCreateInvoice,
  onCreateContract,
}: ContactFinancialsTabProps) {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [refundInvoice, setRefundInvoice] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // If contactId is provided, query the real-time client list
  const { data: clientInvoices = [], refetch } = trpc.invoices.clientList.useQuery(
    { contactId: contactId! },
    { enabled: !!contactId }
  );

  const displayInvoices: InvoiceItem[] =
    contactId && clientInvoices.length > 0 ? (clientInvoices as any[]) : initialInvoices;

  const handleCopyLink = (inv: InvoiceItem) => {
    if (inv.stripePaymentUrl) {
      navigator.clipboard.writeText(inv.stripePaymentUrl);
      setCopiedId(inv.id);
      toast.success("Stripe payment link copied!");
      setTimeout(() => setCopiedId(null), 2500);
    } else {
      toast.error("No active Stripe payment link for this draft invoice");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Paid
          </span>
        );
      case "Sent":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
            <Clock className="w-3 h-3 text-blue-400" />
            Sent
          </span>
        );
      case "Overdue":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/40">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            Overdue
          </span>
        );
      case "Voided":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-500/20 text-slate-300 border border-slate-500/40">
            <XCircle className="w-3 h-3 text-slate-400" />
            Voided
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ── Invoices Section ── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg p-[1px] bg-gradient-to-b from-[#FFE394] via-[#C5A059] to-[#9E7D3B]">
              <div className="w-full h-full rounded-[6px] bg-[#142642] flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-[#FAD77B]" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-serif font-bold text-[#FFF4D4] uppercase tracking-wider">
                Family Invoices & Billing
              </h3>
              <p className="text-[11px] text-[#A69371]">
                One-time advocacy invoices, packages, and payment history
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={() => {
              if (onCreateInvoice) {
                onCreateInvoice();
              } else {
                setCreateModalOpen(true);
              }
            }}
            className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-extrabold text-xs h-8 px-3.5 rounded-xl border border-[#FFE394]/70 shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-[#07162B]" />
            <span>Create Invoice</span>
          </Button>
        </div>

        {displayInvoices.length === 0 ? (
          <div className="text-center p-8 bg-[#020A17]/80 rounded-2xl border border-[#DFBE77]/30 text-[#A69371] text-xs space-y-2">
            <FileText className="w-7 h-7 mx-auto text-[#DFBE77]/40" />
            <p className="font-serif font-bold text-[#FFF4D4]">No invoices issued for this family yet</p>
            <p className="text-[11px]">Click &quot;Create Invoice&quot; to generate an itemized advocacy statement.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayInvoices.map((inv) => {
              const num = inv.invoiceNumber || inv.number || `INV-${inv.id}`;
              const total = Number(inv.total || inv.totalAmount || inv.amount || 0);

              return (
                <div
                  key={inv.id}
                  className="rounded-xl p-[1px] bg-gradient-to-b from-[#FFE394]/40 via-[#C5A059]/25 to-[#9E7D3B]/15 shadow-sm transition-all hover:border-[#FFE394]/60"
                >
                  <div className="bg-[#07162B]/95 rounded-[11px] p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#020A17] border border-[#DFBE77]/30 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-[#DFBE77]" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewId(inv.id)}
                            className="font-mono font-bold text-xs text-[#FFE394] hover:underline cursor-pointer"
                          >
                            #{num}
                          </button>
                          {getStatusBadge(inv.status)}
                        </div>
                        <p className="text-[10px] text-[#A69371] font-mono">
                          Issued {new Date(inv.createdAt).toLocaleDateString()}
                          {inv.dueDate ? ` · Due ${new Date(inv.dueDate).toLocaleDateString()}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <span className="font-mono font-bold text-sm text-[#FFF4D4]">
                        ${total.toFixed(2)}
                      </span>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          onClick={() => setPreviewId(inv.id)}
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[#DFBE77] hover:text-[#FFE394] hover:bg-[#FFE394]/10 text-xs"
                          title="View / Print"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View
                        </Button>

                        {inv.stripePaymentUrl && (
                          <Button
                            type="button"
                            onClick={() => handleCopyLink(inv)}
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[#DFBE77] hover:text-[#FFE394] hover:bg-[#FFE394]/10 text-xs"
                            title="Copy Pay Link"
                          >
                            {copiedId === inv.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400 mr-1" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 mr-1" />
                            )}
                            Pay Link
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Contracts Section ── */}
      <div className="space-y-3 pt-4 border-t border-[#DFBE77]/25">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-[#DFBE77]" />
            <h3 className="text-xs font-serif font-bold text-[#FFF4D4] uppercase tracking-wider">
              Contracts & Engagement Agreements
            </h3>
          </div>
          {onCreateContract && (
            <Button
              onClick={onCreateContract}
              size="sm"
              variant="outline"
              className="border-[#DFBE77]/40 text-[#DFBE77] hover:bg-[#FFE394]/10 text-xs gap-1.5 h-7"
            >
              <Plus className="w-3.5 h-3.5" /> New Contract
            </Button>
          )}
        </div>

        {contracts.length === 0 ? (
          <div className="text-center p-6 bg-[#020A17]/60 rounded-xl border border-[#DFBE77]/20 text-[#A69371] text-xs">
            No contracts or signed agreements for this contact yet.
          </div>
        ) : (
          <div className="space-y-2">
            {contracts.map((contract) => (
              <div
                key={contract.id}
                className="border border-[#DFBE77]/25 bg-[#07162B]/80 rounded-xl p-3 flex items-center justify-between text-white"
              >
                <div className="flex items-center gap-3">
                  <ScrollText className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="text-xs font-bold text-[#FFF4D4]">{contract.title}</p>
                    <p className="text-[10px] text-[#A69371] font-mono">
                      {new Date(contract.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {getStatusBadge(contract.status)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Connected Modals ── */}
      <CreateInvoiceModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        preselectedClientId={contactId}
        onSuccess={() => refetch()}
      />

      <InvoicePreviewModal
        invoiceId={previewId}
        open={previewId !== null}
        onOpenChange={(open) => !open && setPreviewId(null)}
        onRefresh={() => refetch()}
      />

      <InvoiceRefundModal
        invoice={refundInvoice}
        open={refundInvoice !== null}
        onOpenChange={(open) => !open && setRefundInvoice(null)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}

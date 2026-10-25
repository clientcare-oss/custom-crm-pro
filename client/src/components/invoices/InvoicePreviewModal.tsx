import React, { useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Copy, Check, Send, Download, Compass, ShieldCheck, CheckCircle2, Clock, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface InvoicePreviewModalProps {
  invoiceId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh?: () => void;
}

export function InvoicePreviewModal({
  invoiceId,
  open,
  onOpenChange,
  onRefresh,
}: InvoicePreviewModalProps) {
  const [copiedLink, setCopiedLink] = React.useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: details, isLoading, refetch } = trpc.invoices.get.useQuery(
    { id: invoiceId! },
    { enabled: !!invoiceId && open }
  );

  const sendMutation = trpc.invoices.send.useMutation({
    onSuccess: () => {
      toast.success("Invoice sent to client by email!");
      refetch();
      onRefresh?.();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send invoice");
    },
  });

  if (!open || !invoiceId) return null;

  const invoice = details?.invoice;
  const client = details?.client;
  const lineItems = details?.lineItems || [];
  const payments = details?.payments || [];

  const handleCopyLink = () => {
    if (invoice?.stripePaymentUrl) {
      navigator.clipboard.writeText(invoice.stripePaymentUrl);
      setCopiedLink(true);
      toast.success("Stripe payment link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2500);
    } else {
      toast.error("No active Stripe payment link for this draft invoice");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = () => {
    if (!invoice) return null;
    switch (invoice.status) {
      case "Paid":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3.5 h-3.5" />
            PAID
          </span>
        );
      case "Sent":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
            <Clock className="w-3.5 h-3.5" />
            PAYMENT PENDING
          </span>
        );
      case "Overdue":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/40">
            <AlertTriangle className="w-3.5 h-3.5" />
            OVERDUE
          </span>
        );
      case "Voided":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-500/20 text-slate-300 border border-slate-500/40">
            <XCircle className="w-3.5 h-3.5" />
            VOIDED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            DRAFT
          </span>
        );
    }
  };

  const subtotal = lineItems.reduce(
    (sum: number, it: any) => sum + (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
    0
  );
  const discount = Number(invoice?.discountAmount) || 0;
  const total = Number(invoice?.total) || Number(invoice?.amount) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-gradient-to-b from-[#0B1E38] via-[#07162B] to-[#040D1A] border border-[#FFE394]/50 shadow-[0_25px_60px_rgba(0,0,0,0.95)] text-white rounded-2xl p-6 sm:p-8">
        
        {/* Specular Top Hairline */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FFE394] to-transparent shadow-[0_0_15px_rgba(255,227,148,0.8)]" />

        {/* Action Header Bar (Hidden during print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DFBE77]/30 pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg p-[1px] bg-gradient-to-b from-[#FFE394] via-[#C5A059] to-[#9E7D3B]">
              <div className="w-full h-full rounded-[7px] bg-[#142642] flex items-center justify-center">
                <Compass className="w-4 h-4 text-[#FAD77B]" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-[#FFF4D4]">
                Invoice Preview — {invoice?.invoiceNumber || "Loading..."}
              </h3>
              <p className="text-[11px] text-[#C6B697]">
                Official client-facing statement & payment receipt
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {invoice?.stripePaymentUrl && (
              <Button
                type="button"
                onClick={handleCopyLink}
                size="sm"
                variant="outline"
                className="border border-[#DFBE77]/40 text-[#DFBE77] hover:bg-[#FFE394]/10 bg-transparent text-xs h-8"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copiedLink ? "Copied" : "Copy Pay Link"}
              </Button>
            )}

            {invoice?.status !== "Paid" && invoice?.status !== "Voided" && (
              <Button
                type="button"
                disabled={sendMutation.isPending}
                onClick={() => sendMutation.mutate({ id: invoice!.id })}
                size="sm"
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs h-8"
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                {sendMutation.isPending ? "Sending..." : invoice?.sentAt ? "Resend Email" : "Send Email"}
              </Button>
            )}

            <Button
              type="button"
              onClick={handlePrint}
              size="sm"
              className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-extrabold text-xs h-8 px-3.5 border border-[#FFE394]/70 shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 mr-1" />
              Print / PDF
            </Button>
          </div>
        </div>

        {/* ── Printable Invoice Canvas ── */}
        <div 
          ref={printRef}
          className="bg-gradient-to-br from-[#061426] to-[#020A17] border border-[#DFBE77]/40 rounded-xl p-6 sm:p-8 space-y-6 text-[#FFF4D4] print:bg-white print:text-black print:border-none print:p-0"
        >
          {/* Top Brand Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-[#DFBE77]/30 print:border-black/20 pb-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Compass className="w-6 h-6 text-[#DFBE77] print:text-blue-900" />
                <h1 className="text-2xl font-serif font-black tracking-tight text-[#FFF4D4] print:text-black">
                  WAYPOINT ADVOCATES
                </h1>
              </div>
              <p className="text-xs font-serif italic text-[#C6B697] print:text-slate-600">
                Lead Special Education Advocacy & Navigation
              </p>
              <div className="text-[11px] text-[#A69371] font-mono print:text-slate-500 leading-relaxed pt-1">
                Byron Honea, Lead Special Education Advocate<br />
                Atlanta, Georgia & National Coverage<br />
                support@waypointadvocates.com
              </div>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <div className="text-xl font-serif font-bold text-[#FFE394] print:text-black">
                INVOICE
              </div>
              <p className="text-xs font-mono text-[#D8C7A5] print:text-slate-700">
                #{invoice?.invoiceNumber}
              </p>
              <div className="pt-1.5">{getStatusBadge()}</div>
            </div>
          </div>

          {/* Meta & Addresses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs border-b border-[#DFBE77]/20 print:border-black/10 pb-6">
            
            {/* Bill To */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#C5A059] font-bold block print:text-slate-600">
                Bill To:
              </span>
              <p className="text-sm font-serif font-bold text-[#FFF4D4] print:text-black">
                {client?.name || "Client Account"}
              </p>
              {client?.email && (
                <p className="text-[#C6B697] print:text-slate-600 font-mono">
                  {client.email}
                </p>
              )}
              {client?.phone && (
                <p className="text-[#A69371] print:text-slate-500 font-mono">
                  {client.phone}
                </p>
              )}
              {client?.streetAddress && (
                <p className="text-[#A69371] print:text-slate-500">
                  {client.streetAddress}{client.city ? `, ${client.city}` : ""}{client.state ? ` ${client.state}` : ""}
                </p>
              )}
            </div>

            {/* Invoice Details */}
            <div className="space-y-1.5 text-left sm:text-right font-mono text-[11px]">
              <div className="flex justify-between sm:justify-end gap-3">
                <span className="text-[#A69371] print:text-slate-500">Date Issued:</span>
                <span className="text-[#FFF4D4] print:text-black">
                  {invoice?.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : "—"}
                </span>
              </div>
              <div className="flex justify-between sm:justify-end gap-3">
                <span className="text-[#A69371] print:text-slate-500">Payment Due:</span>
                <span className="text-[#FFE394] font-bold print:text-black">
                  {invoice?.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "Upon Receipt"}
                </span>
              </div>
              {invoice?.paidAt && (
                <div className="flex justify-between sm:justify-end gap-3 text-emerald-400 print:text-emerald-700">
                  <span>Paid On:</span>
                  <span className="font-bold">{new Date(invoice.paidAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#DFBE77]/40 text-[#C5A059] font-mono text-[10px] uppercase tracking-wider print:border-black/30 print:text-black">
                    <th className="py-2.5 px-3">Item & Description</th>
                    <th className="py-2.5 px-3 text-center w-16">Qty</th>
                    <th className="py-2.5 px-3 text-right w-28">Unit Price</th>
                    <th className="py-2.5 px-3 text-right w-28">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DFBE77]/15 print:divide-black/10">
                  {lineItems.map((item: any) => (
                    <tr key={item.id} className="text-[#FFF4D4] print:text-black">
                      <td className="py-3 px-3">
                        <p className="font-semibold">{item.description}</p>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-[#C6B697] print:text-slate-600">
                        {item.quantity || 1}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#C6B697] print:text-slate-600">
                        ${Number(item.unitPrice || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#FFF4D4] print:text-black">
                        ${Number(item.amount || (item.quantity || 1) * (item.unitPrice || 0)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations Box */}
            <div className="flex justify-end pt-3">
              <div className="w-64 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-[#C6B697] print:text-slate-600">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-400 print:text-emerald-700">
                    <span>Discount {invoice?.discountNote ? `(${invoice.discountNote})` : ""}:</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-[#DFBE77]/40 print:border-black/30 pt-2 text-sm font-bold text-[#FFE394] print:text-black">
                  <span className="font-serif">Total Due:</span>
                  <span className="text-base">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Status / Stripe Details */}
          {invoice?.status === "Paid" ? (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between print:bg-emerald-50 print:border-emerald-200">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 print:text-emerald-700" />
                <div>
                  <p className="text-xs font-bold text-emerald-300 print:text-emerald-900">
                    Paid in Full via Stripe Checkout
                  </p>
                  <p className="text-[10px] text-emerald-400/80 font-mono print:text-emerald-700">
                    Transaction ID: {payments[0]?.stripePaymentIntentId || "Verified"}
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-300 print:text-emerald-900">
                ${total.toFixed(2)} USD
              </span>
            </div>
          ) : invoice?.stripePaymentUrl ? (
            <div className="p-4 rounded-xl bg-[#020A17]/80 border border-[#DFBE77]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:hidden">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-[#FFE394]">
                  Online Card & Bank Payment Available
                </p>
                <p className="text-[11px] text-[#A69371]">
                  Clients can click the secure link to pay via Credit Card, Debit, or ACH.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleCopyLink}
                size="sm"
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-8"
              >
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Copy Pay Link
              </Button>
            </div>
          ) : null}

          {/* Footer Terms */}
          <div className="pt-4 border-t border-[#DFBE77]/20 print:border-black/10 text-[10px] text-[#A69371] print:text-slate-500 space-y-1">
            <p>
              <strong>Payment Terms:</strong> Invoices are payable upon receipt unless otherwise noted. Payments are processed securely via Stripe.
            </p>
            <p>
              Thank you for partnering with Waypoint Advocates for your child&apos;s educational advocacy.
            </p>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}

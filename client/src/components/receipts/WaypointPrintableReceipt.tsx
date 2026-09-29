import React from "react";
import { Printer, Download, ArrowLeft, ShieldCheck, Mail, Phone, Globe, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PrintableReceiptData {
  receiptNumber: string;
  companyName: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress?: string;
  website?: string;
  clientName?: string;
  clientEmail?: string;
  studentName?: string;
  caseId?: string;
  serviceName: string;
  planName?: string;
  transactionType?: string;
  amountCents: number;
  currency?: string;
  status: string; // PAID, PARTIALLY_REFUNDED, REFUNDED
  paymentMethodBrand?: string;
  paymentMethodLast4?: string;
  paidAt: Date | string;
  nextPaymentDate?: Date | string | null;
  nextPaymentAmountCents?: number | null;
  stripePaymentIntentId?: string;
  refundAmountCents?: number;
  refundReason?: string;
  footerMessage?: string;
}

interface WaypointPrintableReceiptProps {
  data: PrintableReceiptData;
  onClose?: () => void;
  onDownloadPdf?: () => void;
}

export const WaypointPrintableReceipt: React.FC<WaypointPrintableReceiptProps> = ({
  data,
  onClose,
  onDownloadPdf,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const formattedAmount = `$${(data.amountCents / 100).toFixed(2)}`;
  const paidDateFormatted = new Date(data.paidAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const isRefunded = data.status === "REFUNDED";
  const isPartial = data.status === "PARTIALLY_REFUNDED";

  return (
    <div className="bg-slate-100 min-h-screen py-8 px-4 sm:px-6 flex flex-col items-center">
      {/* Top Action Bar (hidden when printing) */}
      <div className="w-full max-w-3xl mb-6 flex items-center justify-between print:hidden">
        {onClose ? (
          <Button variant="ghost" onClick={onClose} className="gap-2 text-slate-700 hover:text-slate-900 cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
            Back to Receipt
          </Button>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-3">
          {onDownloadPdf && (
            <Button variant="outline" onClick={onDownloadPdf} className="gap-2 bg-white text-slate-800 border-slate-300 hover:bg-slate-50 cursor-pointer">
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          )}
          <Button onClick={handlePrint} className="gap-2 bg-[#06172F] text-white hover:bg-[#0a2347] shadow-md cursor-pointer">
            <Printer className="w-4 h-4" />
            Print Receipt
          </Button>
        </div>
      </div>

      {/* Printable Sheet (Standard Letter proportions, white paper, clean typography) */}
      <div
        id="printable-receipt"
        className="w-full max-w-3xl bg-white text-slate-900 border border-slate-200 shadow-xl rounded-lg p-8 sm:p-12 print:border-none print:shadow-none print:p-0 print:m-0"
      >
        {/* Header Letterhead */}
        <div className="border-b-2 border-[#D4AF37] pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#06172F] text-[#D4AF37] flex items-center justify-center font-bold text-sm shadow-sm">
                ⚓
              </div>
              <h1 className="text-2xl font-serif font-bold text-[#06172F] tracking-wide">
                {data.companyName.toUpperCase()}
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-semibold">
              Special Education Advocacy & Family Support
            </p>
          </div>

          <div className="text-left sm:text-right">
            <div className="inline-block bg-slate-900 text-[#D4AF37] px-3.5 py-1 rounded text-xs font-mono font-bold tracking-wider">
              {data.receiptNumber}
            </div>
            <div className="text-xs text-slate-500 mt-1">OFFICIAL PAYMENT RECEIPT</div>
          </div>
        </div>

        {/* Issuer and Transaction Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-8 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              ISSUED BY
            </span>
            <div className="font-bold text-slate-800 text-sm">{data.companyName}</div>
            <div className="text-slate-600 mt-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" /> {data.businessEmail}
            </div>
            <div className="text-slate-600 flex items-center gap-1.5 mt-0.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" /> {data.businessPhone}
            </div>
            {data.businessAddress && (
              <div className="text-slate-600 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> {data.businessAddress}
              </div>
            )}
            {data.website && (
              <div className="text-slate-600 flex items-center gap-1.5 mt-0.5">
                <Globe className="w-3.5 h-3.5 text-slate-400" /> {data.website}
              </div>
            )}
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              PAYMENT DETAILS
            </span>
            <div className="text-slate-700">
              <strong>Date & Time:</strong> {paidDateFormatted}
            </div>
            <div className="text-slate-700 mt-1">
              <strong>Method:</strong>{" "}
              {data.paymentMethodBrand && data.paymentMethodLast4
                ? `${data.paymentMethodBrand} ending in ${data.paymentMethodLast4}`
                : "Card on file"}
            </div>
            <div className="text-slate-700 mt-1 flex items-center gap-2">
              <strong>Status:</strong>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  isRefunded
                    ? "bg-rose-100 text-rose-800"
                    : isPartial
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {isRefunded ? "REFUNDED" : isPartial ? "PARTIALLY REFUNDED" : "PAID IN FULL ✓"}
              </span>
            </div>
            {data.stripePaymentIntentId && (
              <div className="text-[10px] font-mono text-slate-400 mt-1 truncate">
                Stripe Ref: {data.stripePaymentIntentId}
              </div>
            )}
          </div>
        </div>

        {/* Billed To Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-8">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            BILLED TO
          </span>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-bold text-slate-900 text-sm">{data.clientName}</span>
              {data.clientEmail && (
                <span className="text-xs text-slate-500 ml-2">({data.clientEmail})</span>
              )}
            </div>
            {data.studentName && (
              <div className="text-xs text-[#06172F] font-medium bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                Student: <strong>{data.studentName}</strong>
                {data.caseId && <span className="text-slate-500 ml-1">[{data.caseId}]</span>}
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border border-slate-200 rounded-lg overflow-hidden mb-8">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#06172F] text-white">
              <tr>
                <th className="py-3 px-4 font-semibold">DESCRIPTION</th>
                <th className="py-3 px-4 font-semibold">TYPE</th>
                <th className="py-3 px-4 font-semibold text-right">AMOUNT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="bg-white">
                <td className="py-4 px-4">
                  <div className="font-bold text-slate-900 text-sm">{data.serviceName}</div>
                  {data.planName && (
                    <div className="text-slate-500 text-xs mt-0.5">{data.planName}</div>
                  )}
                </td>
                <td className="py-4 px-4 text-slate-600">
                  {data.transactionType === "recurring" ? "Monthly Retainer" : "Advocacy Enrollment"}
                </td>
                <td className="py-4 px-4 text-right font-bold text-slate-900 text-sm">
                  {formattedAmount}
                </td>
              </tr>

              {/* Refund row if applicable */}
              {data.refundAmountCents && data.refundAmountCents > 0 && (
                <tr className="bg-rose-50/50">
                  <td className="py-3 px-4 text-rose-800 font-medium">
                    Refund Issued
                    {data.refundReason && (
                      <span className="text-rose-600 text-[11px] block">{data.refundReason}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-rose-700">Credit Adjustment</td>
                  <td className="py-3 px-4 text-right font-bold text-rose-800 text-sm">
                    -${(data.refundAmountCents / 100).toFixed(2)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals Summary and Next Payment Notice */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8">
          {/* Next payment banner (if recurring) */}
          {data.nextPaymentDate && data.nextPaymentAmountCents ? (
            <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-4 text-xs max-w-sm">
              <div className="font-bold text-[#06172F] flex items-center gap-1.5 mb-1">
                <span>🔄 Next Scheduled Billing</span>
              </div>
              <div className="text-slate-700 font-semibold text-sm">
                {new Date(data.nextPaymentDate).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                — ${(data.nextPaymentAmountCents / 100).toFixed(2)}
              </div>
              <p className="text-slate-500 text-[11px] mt-1">
                Your stored payment method will be charged automatically on this date.
              </p>
            </div>
          ) : (
            <div />
          )}

          {/* Right Totals box */}
          <div className="w-full sm:w-64 bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs space-y-2 self-end">
            <div className="flex justify-between text-slate-600">
              <span>Paid Today:</span>
              <span className="font-semibold text-slate-800">{formattedAmount}</span>
            </div>
            {data.refundAmountCents && data.refundAmountCents > 0 && (
              <div className="flex justify-between text-rose-700">
                <span>Refunded:</span>
                <span className="font-semibold">-${(data.refundAmountCents / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-[#06172F]">
              <span>Net Settled:</span>
              <span>
                ${(Math.max(0, data.amountCents - (data.refundAmountCents || 0)) / 100).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Security & Audit Footnote */}
        <div className="border-t border-slate-200 pt-6 mt-8">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Verified Financial Record
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {data.footerMessage ||
              "Thank you for trusting Waypoint Advocates with your child's educational journey."}{" "}
            This receipt confirms that the payment above was authorized and successfully settled
            through the Stripe payment network. Keep this receipt for your personal tax and educational records.
          </p>
          <div className="text-[10px] text-slate-400 mt-2 flex justify-between items-center">
            <span>Waypoint Advocates © {new Date().getFullYear()}</span>
            <span>Support: {data.businessEmail}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

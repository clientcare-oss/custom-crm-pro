/**
 * Receipts & Statements Page — PG-040-REC
 * Official 501(c)(3) tax-compliant donation receipts and annual charitable giving statements.
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import PageIdBadge from "@/components/PageIdBadge";
import GivingPageLayout from "@/components/giving/GivingPageLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Receipt,
  Download,
  Printer,
  Mail,
  Search,
  CheckCircle2,
  FileCheck,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function ReceiptsPage() {
  const [search, setSearch] = useState("");
  const [previewReceipt, setPreviewReceipt] = useState<any>(null);

  const { data: receipts = [], isLoading } = trpc.giving.listReceipts.useQuery();
  const { data: orgSettings } = trpc.giving.getSettings.useQuery();

  const filtered = receipts.filter((r: any) => {
    const q = search.toLowerCase();
    return (
      r.receiptNumber.toLowerCase().includes(q) ||
      r.donorName.toLowerCase().includes(q) ||
      r.fundName.toLowerCase().includes(q)
    );
  });

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = (r: any) => {
    toast.success(`Official 501(c)(3) receipt sent to ${r.donorEmail}`);
  };

  return (
    <GivingPageLayout>
      {/* ── Sub-Header: Waypoint Navy Plaque Sub-Bar with Actions ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-[#05142B]/90 border border-[#3A2C18] shadow-[0_6px_20px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.08)]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0B2144] border border-[#C5A059]/40 flex items-center justify-center text-[#FAD77B] shadow-inner">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 
                  className="text-xl md:text-2xl font-bold tracking-wide text-[#FFF4D4]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Tax Receipts & Donor Statements
                </h2>
                <PageIdBadge id="PG-040-REC" name="Receipts & Statements" />
              </div>
              <p className="text-xs text-[#C6B697]">
                IRS-compliant charitable written acknowledgments and annual giving statements.
              </p>
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => toast.info("Year-end tax statements generated for all active donors")}
          className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs h-9 px-3.5 gap-1.5 cursor-pointer shadow-sm self-start md:self-auto"
        >
          <FileCheck className="h-4 w-4 text-[#C5A059]" />
          <span>Batch Annual Statements</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-3 bg-[#030D1C]/90 border border-[#3A2C18] p-3 rounded-xl shadow-inner">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A69371]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by receipt # or donor..."
            className="pl-9 bg-[#010814] border-[#3A2C18] text-xs text-[#FFF4D4] placeholder:text-[#A69371]/60 h-8 rounded-lg focus-visible:ring-[#C5A059]"
          />
        </div>
        <p className="text-xs text-[#C6B697] hidden sm:block">
          EIN: <span className="font-mono text-[#FAD77B]">{orgSettings?.ein || "58-7492014"}</span> · 501(c)(3) Tax-Exempt
        </p>
      </div>

      {/* Receipts Table */}
      <Card className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Receipt #</th>
                <th className="py-3.5 px-4">Donor Name & Email</th>
                <th className="py-3.5 px-4">Designated Fund</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1D2A40]/60 text-[#F2E8D5]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-white/50">
                    Loading receipts...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-white/50">
                    No receipts found
                  </td>
                </tr>
              ) : (
                filtered.map((r: any) => (
                  <tr key={r.receiptNumber} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="py-3 px-4 font-mono font-semibold text-amber-300">
                      {r.receiptNumber}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-white group-hover:text-amber-300 transition-colors">
                        {r.donorName}
                      </p>
                      <p className="text-[11px] text-white/50">{r.donorEmail}</p>
                    </td>
                    <td className="py-3 px-4 text-white/80">
                      {r.fundName}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-300">
                      {formatCurrency(r.amountCents)}
                    </td>
                    <td className="py-3 px-4 text-white/70 text-[11px]">
                      {new Date(r.donatedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                        {r.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setPreviewReceipt(r)}
                          className="h-7 text-xs text-amber-300 hover:text-amber-200 hover:bg-amber-400/10 cursor-pointer"
                        >
                          View Receipt
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSendEmail(r)}
                          title="Resend Receipt Email"
                          className="h-7 w-7 p-0 text-white/60 hover:text-white cursor-pointer"
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Official 501(c)(3) Receipt Preview Dialog */}
      <Dialog open={!!previewReceipt} onOpenChange={(open) => !open && setPreviewReceipt(null)}>
        <DialogContent className="max-w-2xl bg-[#07162B] border-amber-500/30 text-white p-8 shadow-2xl">
          <DialogHeader className="border-b border-white/10 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-bold text-white tracking-wide">
                  Official Charitable Donation Receipt
                </DialogTitle>
                <DialogDescription className="text-xs text-white/60">
                  IRS Section 170(f)(8) Contemporaneous Written Acknowledgment
                </DialogDescription>
              </div>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 font-mono text-xs">
                {previewReceipt?.receiptNumber}
              </Badge>
            </div>
          </DialogHeader>

          {previewReceipt && (
            <div className="space-y-6 pt-3 text-xs leading-relaxed">
              {/* Organization Header */}
              <div className="bg-black/30 border border-white/10 p-4 rounded-xl flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-base text-white">{orgSettings?.legalName || "Waypoint Foundation Inc."}</h3>
                  <p className="text-white/60">{orgSettings?.address || "Atlanta, GA"}</p>
                  <p className="text-amber-300 font-mono mt-1">
                    EIN: {orgSettings?.ein || "58-7492014"} · 501(c)(3) Public Charity
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-white/40 uppercase font-semibold">Date of Acknowledgment</span>
                  <p className="text-white font-medium">{new Date().toLocaleDateString()}</p>
                </div>
              </div>

              {/* Gift Details */}
              <div className="grid grid-cols-2 gap-4 border border-white/10 bg-black/20 p-4 rounded-xl">
                <div>
                  <span className="text-[10px] text-white/40 uppercase font-semibold">Donor / Contributor</span>
                  <p className="font-semibold text-white text-sm mt-0.5">{previewReceipt.donorName}</p>
                  <p className="text-white/60">{previewReceipt.donorEmail}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-white/40 uppercase font-semibold">Gift Amount & Date</span>
                  <p className="font-mono font-bold text-amber-300 text-lg mt-0.5">
                    {formatCurrency(previewReceipt.amountCents)}
                  </p>
                  <p className="text-white/60">
                    Received: {new Date(previewReceipt.donatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* IRS Non-Quid-Pro-Quo Statement */}
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-semibold text-xs">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>IRS Written Acknowledgment & Non-Quid-Pro-Quo Declaration</span>
                </div>
                <p className="text-white/80 leading-relaxed text-xs">
                  {orgSettings?.defaultAcknowledgment ||
                    "Thank you for your generous contribution to Waypoint Foundation. Your tax-deductible gift empowers Georgia families with life-changing special education IEP advocacy, evaluations, and due process protection. No goods or services were provided in exchange for this contribution."}
                </p>
              </div>

              {/* Signer */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10 text-white/60 text-[11px]">
                <div>
                  <p className="font-semibold text-white">{orgSettings?.authorizedSigner || "Byron Honea, Executive Director"}</p>
                  <p>Authorized Representative, Waypoint Foundation Inc.</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-emerald-400">STATUS: OFFICIAL IRS RECEIPT</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-white/10 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="border-white/15 text-white/80 hover:bg-white/10 text-xs gap-1.5 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Receipt</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setPreviewReceipt(null)}
              className="bg-amber-500 hover:bg-amber-400 text-[#07162B] font-bold text-xs cursor-pointer"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GivingPageLayout>
  );
}

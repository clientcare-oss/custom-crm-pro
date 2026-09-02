import React, { useState } from "react";
import { 
  CreditCard, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Download, 
  Plus, 
  ArrowRight, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Lock, 
  Edit3, 
  HelpCircle, 
  ExternalLink,
  Sparkles,
  Calendar,
  Layers,
  ChevronRight,
  Receipt,
  User,
  ShieldAlert
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { toast } from "sonner";
import PageIdBadge from "@/components/PageIdBadge";

interface PortalMembershipTabProps {
  displayName?: string;
  effectiveStudent?: any;
  onNavigateTab?: (tabId: string) => void;
}

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  date: string;
  description: string;
  amount: number;
  status: "Paid" | "Pending" | "Draft";
  receiptUrl?: string;
}

export function PortalMembershipTab({
  displayName = "Parent Client",
  effectiveStudent,
  onNavigateTab
}: PortalMembershipTabProps) {
  const studentName = effectiveStudent ? `${effectiveStudent.firstName} ${effectiveStudent.lastName || ""}`.trim() : "Liam Jenkins";

  // Fake Credit Card State (client can manage and update)
  const [cardData, setCardData] = useState({
    brand: "Visa",
    last4: "4242",
    expMonth: "08",
    expYear: "2028",
    cardholder: displayName || "Byron Honea",
    zipCode: "30303"
  });

  const [editCardOpen, setEditCardOpen] = useState(false);
  const [cardForm, setCardForm] = useState({
    cardNumber: "4242 •••• •••• 4242",
    cardholder: cardData.cardholder,
    exp: "08/28",
    cvc: "•••",
    zipCode: "30303"
  });

  // Invoice Ledger State (Featuring the $75 State Complaint item as requested)
  const [invoices] = useState<InvoiceItem[]>([
    {
      id: "inv-sc-75",
      invoiceNumber: "INV-2026-SC75",
      date: "May 20, 2026",
      description: "State Complaint Drafting & Formal Filing Support",
      amount: 75.00,
      status: "Paid"
    },
    {
      id: "inv-mb-55-1",
      invoiceNumber: "INV-2026-MB55",
      date: "May 1, 2026",
      description: `Monthly Advocacy Advisory Retainer (${studentName})`,
      amount: 55.00,
      status: "Paid"
    },
    {
      id: "inv-mb-55-0",
      invoiceNumber: "INV-2026-MB54",
      date: "April 1, 2026",
      description: `Monthly Advocacy Advisory Retainer (${studentName})`,
      amount: 55.00,
      status: "Paid"
    }
  ]);

  const handleUpdateCard = (e: React.FormEvent) => {
    e.preventDefault();
    const rawNumber = cardForm.cardNumber.replace(/\D/g, "");
    const lastFour = rawNumber.length >= 4 ? rawNumber.slice(-4) : "4242";
    const [month, year] = cardForm.exp.split("/");

    setCardData({
      brand: "Visa",
      last4: lastFour,
      expMonth: month || "08",
      expYear: year ? `20${year.slice(-2)}` : "2028",
      cardholder: cardForm.cardholder,
      zipCode: cardForm.zipCode
    });

    setEditCardOpen(false);
    toast.success("Payment method updated successfully!", {
      description: `Card ending in •••• ${lastFour} is now your default payment method.`
    });
  };

  const handleDownloadReceipt = (inv: InvoiceItem) => {
    toast.success(`Receipt ${inv.invoiceNumber} downloaded`, {
      description: `${inv.description} — $${inv.amount.toFixed(2)}`
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-white animate-in fade-in duration-300">
      
      {/* ── Top Header Banner with PageIdBadge ── */}
      <div className="bg-gradient-to-br from-[#0B2553] via-[#071D40] to-[#04122C] p-6 sm:p-7 rounded-3xl border border-blue-900/40 shadow-2xl relative overflow-hidden">
        {/* Top subtle golden accent glow */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F5B544]/70 to-transparent" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-[#F5B544] text-[#07152B] font-bold text-[10px] tracking-wider uppercase px-2.5 py-0.5 shadow-sm font-mono">
                Advocacy Membership
              </Badge>
              <Badge variant="outline" className="text-xs font-mono border-emerald-400/50 text-emerald-300 bg-emerald-400/10">
                <CheckCircle2 className="h-3 w-3 mr-1 inline text-emerald-400" />
                Active Monthly Subscription
              </Badge>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-serif font-normal text-white tracking-tight flex items-center gap-2.5">
                <CreditCard className="h-7 w-7 text-[#F5B544]" />
                Membership & Billing Management
              </h1>
              <PageIdBadge id="PG-023-MBR" name="Portal Membership" />
            </div>

            <p className="text-xs sm:text-sm text-blue-200/75 leading-relaxed">
              Manage your active monthly advocacy plan for <strong className="text-white font-semibold">{studentName}</strong>, update your saved payment method, and access itemized invoice receipts.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="bg-[#030C22] border border-blue-900/40 p-4 rounded-2xl text-center sm:text-right shadow-xl">
              <span className="text-[11px] text-white/50 font-medium block">Monthly Recurring Investment</span>
              <span className="text-2xl font-black text-amber-300 font-mono block">$55.00 <span className="text-xs text-white/60 font-normal">/ mo per student</span></span>
              <span className="text-[11px] text-emerald-400 font-medium block mt-0.5">
                ✓ Auto-renew active on the 1st
              </span>
            </div>

            <Button
              onClick={() => onNavigateTab?.("renewal")}
              className="bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] font-bold text-xs h-11 px-4 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="h-4 w-4" />
              <span>Change or Upgrade Plan</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Pre-Activation / Discovery Call Context Notice ── */}
      <div className="p-4 rounded-2xl bg-[#06172F] border border-blue-900/40 flex items-start gap-3 shadow-lg">
        <div className="p-2 rounded-xl bg-[#030C22] text-[#F5B544] border border-blue-900/40 shrink-0 mt-0.5">
          <Clock className="h-4 w-4" />
        </div>
        <div className="space-y-0.5 text-xs">
          <h3 className="font-bold text-white">
            Membership Plan Configured ($55.00 / month per student)
          </h3>
          <p className="text-blue-200/70 leading-relaxed">
            Your monthly advocacy membership is staged and active. Auto-billing commences upon conclusion of your scheduled Discovery Call with Master IEP Coach® Byron Honea.
          </p>
        </div>
      </div>

      {/* ── 2-Column Grid: Active Plan Details on Left, Payment Method Card on Right ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Active $55/mo Plan Card (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border border-blue-900/40 bg-[#06172F] shadow-xl rounded-3xl overflow-hidden text-white">
            <CardHeader className="bg-[#030C22] border-b border-blue-900/40 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase mb-1">
                    Current Enrolled Plan
                  </Badge>
                  <CardTitle className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    Essential Continuity & IEP Advisory
                  </CardTitle>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-amber-300 font-mono block">$55.00</span>
                  <span className="text-[10px] text-white/50 block font-medium">per month per student</span>
                </div>
              </div>
              <CardDescription className="text-xs text-blue-200/70 mt-1">
                Student: <strong className="text-white font-semibold">{studentName}</strong> • Special Education Advisory
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-4 text-xs">
              <p className="text-white/80 leading-relaxed">
                Provides continuous IEP coaching, draft document audits, and direct strategy access with Byron Honea throughout your child's academic year.
              </p>

              {/* What's Included list */}
              <div className="space-y-2.5 pt-2 border-t border-white/10">
                <span className="text-[11px] font-bold text-[#F5B544] uppercase tracking-wider block font-mono">
                  Enrolled Membership Benefits:
                </span>
                <ul className="space-y-2 text-white/90">
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Unlimited IEP & 504 document audits, draft review checks, and amendments</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Quarterly IEP goal progress audit & school compliance monitoring</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Pre-meeting parent strategy agendas & talking point roadmaps delivered 48h prior</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Direct priority portal messaging & strategic advisory with Master IEP Coach® Byron Honea</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Full access to Document Vault, IEP Comparator, and Case Compass™</span>
                  </li>
                </ul>
              </div>

              {/* Membership management pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                <div className="p-3 rounded-xl bg-[#030C22] border border-blue-900/40 text-center">
                  <span className="text-[10px] text-white/50 block font-medium">Billing Term</span>
                  <span className="font-bold text-white text-xs block mt-0.5">Monthly Recurring</span>
                </div>
                <div className="p-3 rounded-xl bg-[#030C22] border border-blue-900/40 text-center">
                  <span className="text-[10px] text-white/50 block font-medium">Next Invoice</span>
                  <span className="font-bold text-amber-300 text-xs block mt-0.5 font-mono">June 1, 2026</span>
                </div>
                <div className="p-3 rounded-xl bg-[#030C22] border border-blue-900/40 text-center col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-white/50 block font-medium">Status</span>
                  <span className="font-bold text-emerald-400 text-xs block mt-0.5">Active Auto-Pay</span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="p-5 sm:p-6 bg-[#030C22]/60 border-t border-blue-900/40 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-blue-200/60 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Cancel or pause anytime with 30-day notice
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateTab?.("renewal")}
                className="border-blue-900/40 bg-[#030C22] hover:bg-blue-900/40 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                <span>Upgrade to $105/mo Live Representation</span>
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Right Column: Fake Credit Card & Payment Method Manager (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border border-blue-900/40 bg-[#06172F] shadow-xl rounded-3xl overflow-hidden text-white">
            <CardHeader className="bg-[#030C22] border-b border-blue-900/40 p-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-[#F5B544]" />
                  Saved Payment Method
                </CardTitle>
                <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono">
                  Default Auto-Pay
                </Badge>
              </div>
              <CardDescription className="text-xs text-blue-200/60">
                Primary card used for monthly $55 membership billing.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              {/* ── Realistic Sleek Dark Nautical Credit Card Graphic ── */}
              <div className="relative rounded-2xl bg-gradient-to-br from-[#0B2553] via-[#071D40] to-[#04122C] border border-amber-400/40 p-5 text-white shadow-2xl overflow-hidden space-y-5 group">
                {/* Gold accent sheen */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#F5B544]/10 rounded-full blur-2xl pointer-events-none" />

                {/* Card Top Row: Chip & Brand */}
                <div className="flex items-center justify-between relative z-10">
                  {/* EMV Chip Graphic */}
                  <div className="w-10 h-7 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 border border-amber-300/50 shadow-inner flex items-center justify-center">
                    <div className="w-8 h-5 border border-amber-800/40 rounded-sm grid grid-cols-2 gap-0.5 opacity-60" />
                  </div>

                  <span className="text-base font-black italic tracking-wider text-white font-mono">
                    {cardData.brand.toUpperCase()}
                  </span>
                </div>

                {/* Card Number */}
                <div className="space-y-1 relative z-10">
                  <span className="text-[10px] text-white/50 uppercase font-mono tracking-widest block">
                    Card Number
                  </span>
                  <div className="text-lg sm:text-xl font-mono tracking-widest text-white font-bold">
                    •••• •••• •••• {cardData.last4}
                  </div>
                </div>

                {/* Card Bottom Row: Cardholder & Expiry */}
                <div className="flex items-center justify-between text-xs relative z-10 pt-1 border-t border-white/10">
                  <div>
                    <span className="text-[9px] text-white/50 uppercase font-mono tracking-wider block">
                      Cardholder
                    </span>
                    <span className="font-semibold text-white truncate max-w-[140px] block">
                      {cardData.cardholder}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] text-white/50 uppercase font-mono tracking-wider block">
                      Expires
                    </span>
                    <span className="font-semibold text-amber-300 font-mono block">
                      {cardData.expMonth}/{cardData.expYear.slice(-2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Meta details */}
              <div className="p-3.5 rounded-xl bg-[#030C22] border border-blue-900/40 text-xs space-y-1.5">
                <div className="flex justify-between text-white/70">
                  <span>Billing Postal Code:</span>
                  <span className="font-mono font-bold text-white">{cardData.zipCode}</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>Security Protocol:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Lock className="h-3 w-3" /> PCI-DSS Level 1
                  </span>
                </div>
              </div>

              {/* Update Card Action Button */}
              <Button
                onClick={() => {
                  setCardForm({
                    cardNumber: `•••• •••• •••• ${cardData.last4}`,
                    cardholder: cardData.cardholder,
                    exp: `${cardData.expMonth}/${cardData.expYear.slice(-2)}`,
                    cvc: "•••",
                    zipCode: cardData.zipCode
                  });
                  setEditCardOpen(true);
                }}
                className="w-full bg-[#030C22] hover:bg-blue-900/40 text-white border border-blue-900/40 text-xs font-semibold h-10 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5 text-[#F5B544]" />
                <span>Update Payment Method</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Invoices & Billing History Section (Featuring $75 State Complaint Row) ── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Receipt className="h-5 w-5 text-[#F5B544]" />
              Invoices & Transaction History
            </h2>
            <p className="text-xs text-blue-200/60">
              Itemized charges and downloadable receipts for advocacy filings and monthly advisory.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono border-blue-900/40 text-white/70">
            {invoices.length} Records
          </Badge>
        </div>

        <div className="rounded-3xl border border-blue-900/40 bg-[#06172F] shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#030C22] border-b border-blue-900/40 text-white/50 uppercase text-[10px] font-mono tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Date</th>
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Item & Description</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-900/30">
                {invoices.map((inv) => {
                  const isStateComplaint = inv.amount === 75;

                  return (
                    <tr 
                      key={inv.id} 
                      className={`hover:bg-blue-950/20 transition-colors ${
                        isStateComplaint ? "bg-amber-400/[0.03]" : ""
                      }`}
                    >
                      {/* Date */}
                      <td className="py-4 px-4 sm:px-6 font-medium text-white/80 whitespace-nowrap">
                        {inv.date}
                      </td>

                      {/* Invoice ID */}
                      <td className="py-4 px-4 font-mono font-bold text-[#F5B544] whitespace-nowrap">
                        {inv.invoiceNumber}
                      </td>

                      {/* Description */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {isStateComplaint ? (
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 font-bold text-[9px] uppercase border border-amber-400/30 shrink-0 font-mono">
                              Filing
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-bold text-[9px] uppercase border border-blue-500/30 shrink-0 font-mono">
                              Retainer
                            </span>
                          )}
                          <span className="font-semibold text-white">
                            {inv.description}
                          </span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-4 text-right font-mono font-black text-sm text-white whitespace-nowrap">
                        ${inv.amount.toFixed(2)}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3" /> Paid
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownloadReceipt(inv)}
                          className="h-8 text-xs text-blue-300 hover:text-white hover:bg-blue-900/40 rounded-lg gap-1.5 cursor-pointer font-medium"
                        >
                          <Download className="h-3.5 w-3.5 text-[#F5B544]" />
                          <span>Receipt</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Dialog: Update Saved Payment Method ── */}
      <Dialog open={editCardOpen} onOpenChange={setEditCardOpen}>
        <DialogContent className="bg-[#06172F] border-blue-900/40 text-white max-w-md shadow-2xl rounded-2xl">
          <DialogHeader className="border-b border-blue-900/40 pb-3">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-white">
              <CreditCard className="h-5 w-5 text-[#F5B544]" />
              Update Payment Card
            </DialogTitle>
            <DialogDescription className="text-xs text-blue-200/70">
              Enter your credit or debit card for recurring monthly advocacy billing.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateCard} className="space-y-4 pt-2 text-xs">
            <div className="space-y-1">
              <label className="text-white/80 font-semibold block">Cardholder Name</label>
              <input
                type="text"
                required
                value={cardForm.cardholder}
                onChange={(e) => setCardForm({ ...cardForm, cardholder: e.target.value })}
                placeholder="Jane Doe"
                className="w-full bg-[#030C22] border border-blue-900/40 focus:border-[#F5B544] rounded-xl p-2.5 text-sm text-white outline-none transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-white/80 font-semibold block">Card Number</label>
              <input
                type="text"
                required
                value={cardForm.cardNumber}
                onChange={(e) => setCardForm({ ...cardForm, cardNumber: e.target.value })}
                placeholder="4242 4242 4242 4242"
                className="w-full bg-[#030C22] border border-blue-900/40 focus:border-[#F5B544] rounded-xl p-2.5 text-sm text-white font-mono outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-white/80 font-semibold block">Exp (MM/YY)</label>
                <input
                  type="text"
                  required
                  value={cardForm.exp}
                  onChange={(e) => setCardForm({ ...cardForm, exp: e.target.value })}
                  placeholder="08/28"
                  className="w-full bg-[#030C22] border border-blue-900/40 focus:border-[#F5B544] rounded-xl p-2.5 text-sm text-white font-mono outline-none text-center"
                />
              </div>

              <div className="space-y-1">
                <label className="text-white/80 font-semibold block">CVC</label>
                <input
                  type="text"
                  required
                  value={cardForm.cvc}
                  onChange={(e) => setCardForm({ ...cardForm, cvc: e.target.value })}
                  placeholder="123"
                  className="w-full bg-[#030C22] border border-blue-900/40 focus:border-[#F5B544] rounded-xl p-2.5 text-sm text-white font-mono outline-none text-center"
                />
              </div>

              <div className="space-y-1">
                <label className="text-white/80 font-semibold block">ZIP / Postal</label>
                <input
                  type="text"
                  required
                  value={cardForm.zipCode}
                  onChange={(e) => setCardForm({ ...cardForm, zipCode: e.target.value })}
                  placeholder="30303"
                  className="w-full bg-[#030C22] border border-blue-900/40 focus:border-[#F5B544] rounded-xl p-2.5 text-sm text-white font-mono outline-none text-center"
                />
              </div>
            </div>

            <p className="text-[11px] text-white/50 leading-relaxed flex items-center gap-1.5 pt-1">
              <Lock className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              Your card information is securely encrypted and processed via Stripe/PCI standards.
            </p>

            <DialogFooter className="border-t border-blue-900/40 pt-3 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditCardOpen(false)}
                className="text-white/70 hover:text-white text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Save Payment Method
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PortalMembershipTab;

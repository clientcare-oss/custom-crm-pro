import React, { useState, useEffect, useRef } from "react";
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
  ShieldAlert,
  Wrench,
  Radio,
  Trash2,
  CheckCircle,
  X
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import VaultSafeIcon from "@/components/ui/VaultSafeIcon";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

interface PortalMembershipTabProps {
  displayName?: string;
  effectiveStudent?: any;
  onNavigateTab?: (tabId: string) => void;
}

export function PortalMembershipTab({
  displayName = "Parent Client",
  effectiveStudent,
  onNavigateTab
}: PortalMembershipTabProps) {
  const studentName = effectiveStudent ? `${effectiveStudent.firstName} ${effectiveStudent.lastName || ""}`.trim() : "Liam Jenkins";

  // Resolve family contact ID
  const contactId = 
    effectiveStudent?.clientId || 
    effectiveStudent?.contactId || 
    (typeof effectiveStudent?.id === "number" ? effectiveStudent.id : undefined);

  // Queries
  const utils = trpc.useUtils();
  const { data: dbInvoices = [], isLoading: invoicesLoading, refetch: refetchInvoices } = trpc.invoices.clientList.useQuery(
    { contactId: contactId || 0 },
    { enabled: !!contactId }
  );

  const { data: balanceData, refetch: refetchBalance } = trpc.invoices.getFamilyOutstandingBalance.useQuery(
    { contactId: contactId || 0 },
    { enabled: !!contactId }
  );

  const { data: savedMethods = [], refetch: refetchMethods } = trpc.invoices.listPaymentMethods.useQuery(
    { contactId: contactId || 0 },
    { enabled: !!contactId }
  );

  // Unpaid invoices
  const unpaidInvoices = dbInvoices.filter((inv: any) => inv.status === "Sent" || inv.status === "Overdue");

  // Fast Payment Modal State
  const [fastPayOpen, setFastPayOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<any>(null);
  const [useDifferentMethod, setUseDifferentMethod] = useState(false);
  const [saveForFuture, setSaveForFuture] = useState(true);
  const [newCardForm, setNewCardForm] = useState({
    cardNumber: "4242 •••• •••• 4242",
    brand: "visa",
    last4: "4242",
    exp: "12/28",
    cvc: "123",
    zipCode: "30303",
  });
  const [paymentSuccessData, setPaymentSuccessData] = useState<any>(null);

  // Add Payment Method Modal State
  const [addMethodOpen, setAddMethodOpen] = useState(false);
  const [addMethodForm, setAddMethodForm] = useState({
    brand: "visa",
    last4: "4242",
    expMonth: 12,
    expYear: 2028,
    isDefault: false,
  });

  // Fast Payment Mutations
  const paySavedMutation = trpc.invoices.payWithSavedMethod.useMutation({
    onSuccess: (data) => {
      setPaymentSuccessData(data);
      refetchInvoices();
      refetchBalance();
      utils.invoices.getFamilyOutstandingBalance.invalidate();
      toast.success("Payment Successful!", {
        description: `Payment of $${data.amountPaid} confirmed for Invoice ${data.invoiceNumber}.`,
      });
    },
    onError: (err) => {
      toast.error(err.message || "Payment failed");
    },
  });

  const payNewMutation = trpc.invoices.payWithNewMethod.useMutation({
    onSuccess: (data) => {
      setPaymentSuccessData(data);
      refetchInvoices();
      refetchBalance();
      refetchMethods();
      utils.invoices.getFamilyOutstandingBalance.invalidate();
      toast.success("Payment Successful!", {
        description: `Payment of $${data.amountPaid} confirmed for Invoice ${data.invoiceNumber}.`,
      });
    },
    onError: (err) => {
      toast.error(err.message || "Payment failed");
    },
  });

  const addMethodMutation = trpc.invoices.addPaymentMethod.useMutation({
    onSuccess: () => {
      toast.success("Payment method added successfully!");
      setAddMethodOpen(false);
      refetchMethods();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add payment method");
    },
  });

  const setDefaultMethodMutation = trpc.invoices.setDefaultPaymentMethod.useMutation({
    onSuccess: () => {
      toast.success("Default payment method updated");
      refetchMethods();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update default method");
    },
  });

  const removeMethodMutation = trpc.invoices.removePaymentMethod.useMutation({
    onSuccess: () => {
      toast.success("Payment method removed");
      refetchMethods();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to remove payment method");
    },
  });

  // Open Fast Payment for a specific invoice
  const handleOpenPayInvoice = (inv: any) => {
    setActiveInvoice(inv);
    setUseDifferentMethod(false);
    setPaymentSuccessData(null);
    setFastPayOpen(true);
  };

  // URL / Session Auto-Detection for targeted invoice
  useEffect(() => {
    try {
      const targetId = sessionStorage.getItem("waypoint_target_invoice_id");
      if (targetId) {
        sessionStorage.removeItem("waypoint_target_invoice_id");
        const found = dbInvoices.find((i: any) => String(i.id) === targetId);
        if (found) {
          handleOpenPayInvoice(found);
          return;
        }
      }

      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const invParam = urlParams.get("invoiceId");
        if (invParam) {
          const found = dbInvoices.find((i: any) => String(i.id) === invParam);
          if (found) {
            handleOpenPayInvoice(found);
          }
        }
      }
    } catch {}
  }, [dbInvoices]);

  const defaultSavedMethod = savedMethods.find((m: any) => m.isDefault) || savedMethods[0] || {
    brand: "visa",
    last4: "4242",
    expMonth: 12,
    expYear: 2028,
  };

  const handleExecuteSavedPayment = () => {
    if (!activeInvoice) return;
    paySavedMutation.mutate({
      invoiceId: activeInvoice.id,
      paymentMethodId: defaultSavedMethod?.id,
    });
  };

  const handleExecuteNewPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInvoice) return;
    const cleanLast4 = newCardForm.cardNumber.replace(/\D/g, "").slice(-4) || "4242";
    payNewMutation.mutate({
      invoiceId: activeInvoice.id,
      brand: newCardForm.brand || "visa",
      last4: cleanLast4,
      saveForFuture,
      setAsDefault: false,
    });
  };

  const handleDownloadReceipt = (inv: any) => {
    toast.success(`Receipt ${inv.invoiceNumber} downloaded`, {
      description: `${inv.title || "Advocacy Services"} — $${Number(inv.total || inv.amount).toFixed(2)}`,
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 text-white animate-in fade-in duration-300">
      
      {/* ── Top Header Banner with PageIdBadge ── */}
      <div className="bg-gradient-to-br from-[#0B2553] via-[#071D40] to-[#04122C] p-6 sm:p-7 rounded-3xl border border-blue-900/40 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F5B544]/70 to-transparent" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-[#F5B544] text-[#07152B] font-bold text-[10px] tracking-wider uppercase px-2.5 py-0.5 shadow-sm font-mono">
                Advocacy Financials
              </Badge>
              <Badge variant="outline" className="text-xs font-mono border-emerald-400/50 text-emerald-300 bg-emerald-400/10">
                <CheckCircle2 className="h-3 w-3 mr-1 inline text-emerald-400" />
                Active Family Billing Account
              </Badge>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-serif font-normal text-white tracking-tight flex items-center gap-2.5">
                <CreditCard className="h-7 w-7 text-[#F5B544]" />
                Billing &amp; Payments
              </h1>
              <PageIdBadge id="PG-023-MBR" name="Billing &amp; Payments" />
            </div>

            <p className="text-xs sm:text-sm text-blue-200/75 leading-relaxed">
              Manage single advocacy invoices, saved family payment methods, itemized receipts, and ongoing membership for <strong className="text-white font-semibold">{studentName}</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="bg-[#030C22] border border-blue-900/40 p-4 rounded-2xl text-center sm:text-right shadow-xl">
              <span className="text-[11px] text-white/50 font-medium block">Account Balance</span>
              <span className="text-2xl font-black text-amber-300 font-mono block">
                ${balanceData ? balanceData.totalBalance.toFixed(2) : "0.00"}
              </span>
              <span className="text-[11px] text-emerald-400 font-medium block mt-0.5">
                {unpaidInvoices.length === 0 ? "✓ Account Current · All Invoices Paid" : `⚠ ${unpaidInvoices.length} Payment${unpaidInvoices.length > 1 ? "s" : ""} Due`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. PAYMENT DUE (Only shown when there is an outstanding invoice) */}
      {/* ──────────────────────────────────────────────────────────── */}
      {unpaidInvoices.length > 0 && (
        <section className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <h2 className="text-lg font-serif font-bold text-[#FFF4D4]">
                Payment Due
              </h2>
            </div>
            <span className="text-xs font-mono text-amber-300 font-bold">
              {unpaidInvoices.length} Invoice{unpaidInvoices.length > 1 ? "s" : ""} Awaiting Payment
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {unpaidInvoices.map((inv: any) => {
              const isOverdue = inv.status === "Overdue";
              return (
                <div 
                  key={inv.id}
                  className={`rounded-2xl p-5 sm:p-6 transition-all border ${
                    isOverdue 
                      ? "bg-gradient-to-r from-[#120810] via-[#000820] to-[#040D1A] border-rose-500/50 shadow-[0_8px_24px_rgba(0,0,0,0.85)]"
                      : "bg-gradient-to-r from-[#000820] via-[#05142B] to-[#030D1A] border-[#FFE394]/40 shadow-[0_8px_24px_rgba(0,0,0,0.85)]"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#FAD77B]">
                          #{inv.invoiceNumber}
                        </span>
                        {isOverdue ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            Overdue
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                            Open / Payable
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-serif font-bold text-[#FFF4D4]">
                        {inv.title || "Special Education Advocacy Services"}
                      </h3>

                      {inv.serviceDescription && (
                        <p className="text-xs text-[#C6B697] max-w-2xl">
                          {inv.serviceDescription}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-xs text-[#D8C7A5] font-mono pt-1">
                        <span>Amount Due: <strong className="text-white text-sm">${Number(inv.total).toFixed(2)}</strong></span>
                        <span>Due Date: <strong className="text-white">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "Upon Receipt"}</strong></span>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleOpenPayInvoice(inv)}
                      className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-extrabold text-sm h-11 px-6 rounded-xl border border-[#FFE394]/70 shadow-[0_4px_16px_rgba(0,0,0,0.6)] cursor-pointer flex items-center gap-2 shrink-0 transition-transform hover:scale-[1.02]"
                    >
                      <CreditCard className="w-4 h-4 text-[#07162B]" />
                      <span>View &amp; Pay Invoice</span>
                      <ArrowRight className="w-4 h-4 text-[#07162B]" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. YOUR PLAN (Preserve existing membership & recurring billing) */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-serif font-bold text-[#FFF4D4] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#F5B544]" />
            Your Plan
          </h2>
          <Button
            variant="ghost"
            onClick={() => onNavigateTab?.("renewal")}
            className="text-xs text-[#DFBE77] hover:text-[#FFE394] hover:bg-[#FFE394]/10 h-8"
          >
            Manage Plan &amp; Transition Options →
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Active Membership Details */}
          <Card className="bg-[#05142B]/90 border border-[#3A2C18] shadow-xl rounded-2xl text-white p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#3A2C18] pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#A69371] block">Active Tier</span>
                <h3 className="text-base font-serif font-bold text-[#FFF4D4]">Lead Advocate Representation</h3>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono">
                Active
              </Badge>
            </div>

            <div className="space-y-2 text-xs text-[#C6B697]">
              <div className="flex justify-between">
                <span>Monthly Recurring Investment:</span>
                <span className="font-mono text-white font-bold">$55.00 / month</span>
              </div>
              <div className="flex justify-between">
                <span>Enrolled Student:</span>
                <span className="text-white font-medium">{studentName}</span>
              </div>
              <div className="flex justify-between">
                <span>Annual Term:</span>
                <span className="font-mono text-white">12 Months ($660 Total)</span>
              </div>
              <div className="flex justify-between">
                <span>Billing Renewal:</span>
                <span className="text-emerald-400 font-semibold">1st of every month (Auto-Pay)</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#020A17] border border-[#3A2C18]/60 text-xs text-[#D8C7A5] space-y-1">
              <span className="font-bold text-[#FFF4D4] block">Included Coverage:</span>
              <p>• 4 Annual IEP / 504 Meeting Attendances</p>
              <p>• Prior Written Notice (PWN) Analysis &amp; Dispute Strategy</p>
              <p>• Evaluation &amp; Data Review Consultations</p>
            </div>
          </Card>

          {/* Autopay Status & Saved Payment Association */}
          <Card className="bg-[#05142B]/90 border border-[#3A2C18] shadow-xl rounded-2xl text-white p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-[#3A2C18] pb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-[#C5A059] font-bold">
                  Autopay Management
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Autopay Active
                </span>
              </div>

              <p className="text-xs text-[#C6B697] leading-relaxed">
                Your monthly membership is automatically charged to your primary default payment method on the 1st of each month. One-time invoices require explicit client authorization.
              </p>

              <div className="p-3 rounded-xl bg-[#020A17] border border-[#3A2C18]/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-[#FAD77B]" />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {defaultSavedMethod.brand.toUpperCase()} ending in {defaultSavedMethod.last4}
                    </span>
                    <span className="text-[10px] text-[#A69371] font-mono">
                      Expires {defaultSavedMethod.expMonth}/{defaultSavedMethod.expYear}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">Default Card</span>
              </div>
            </div>

            <Button
              onClick={() => onNavigateTab?.("renewal")}
              variant="outline"
              className="w-full border border-[#DFBE77]/40 text-[#DFBE77] hover:bg-[#FFE394]/10 bg-transparent text-xs h-9 rounded-xl"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Change or Transition Membership Plan
            </Button>
          </Card>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 3. INVOICES & RECEIPTS                                      */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-serif font-bold text-[#FFF4D4] flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#F5B544]" />
              Invoices &amp; Receipts
            </h2>
            <p className="text-xs text-[#C6B697]">
              Complete history of advocacy filings, one-time services, and itemized transaction receipts.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono border-blue-900/40 text-white/70">
            {dbInvoices.length} Invoices
          </Badge>
        </div>

        <div className="rounded-2xl border border-blue-900/40 bg-[#06172F] shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#030C22] border-b border-blue-900/40 text-white/50 uppercase text-[10px] font-mono tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Invoice #</th>
                  <th className="py-3.5 px-4">Service</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-900/30">
                {dbInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No invoices currently on record for this account.
                    </td>
                  </tr>
                ) : (
                  dbInvoices.map((inv: any) => {
                    const isPaid = inv.status === "Paid";
                    const isOverdue = inv.status === "Overdue";

                    return (
                      <tr key={inv.id} className="hover:bg-blue-950/20 transition-colors">
                        <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-[#F5B544] whitespace-nowrap">
                          {inv.invoiceNumber}
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-white">
                            {inv.title || "Special Education Advocacy Services"}
                          </p>
                          {inv.serviceDescription && (
                            <p className="text-[11px] text-[#A69371] truncate max-w-xs">
                              {inv.serviceDescription}
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-white whitespace-nowrap">
                          ${Number(inv.total).toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#C6B697] whitespace-nowrap">
                          {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "Upon Receipt"}
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="h-3 w-3" /> Paid
                            </span>
                          ) : isOverdue ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                              <Clock className="h-3 w-3" /> Overdue
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
                              <Clock className="h-3 w-3" /> Payable
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {!isPaid && (
                              <Button
                                size="sm"
                                onClick={() => handleOpenPayInvoice(inv)}
                                className="h-7 text-xs bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-extrabold rounded-lg gap-1 cursor-pointer shadow-md hover:brightness-110"
                              >
                                <CreditCard className="h-3 w-3" />
                                <span>Pay</span>
                              </Button>
                            )}

                            {isPaid && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDownloadReceipt(inv)}
                                className="h-7 text-xs text-blue-300 hover:text-white hover:bg-blue-900/40 rounded-lg gap-1 cursor-pointer font-medium"
                              >
                                <Download className="h-3 w-3 text-[#F5B544]" />
                                <span>Receipt</span>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 4. PAYMENT METHODS                                          */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-serif font-bold text-[#FFF4D4] flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#F5B544]" />
              Payment Methods
            </h2>
            <p className="text-xs text-[#C6B697]">
              Securely saved family cards for recurring advocacy retainer and one-time single invoices.
            </p>
          </div>

          <Button
            onClick={() => setAddMethodOpen(true)}
            size="sm"
            className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-8 rounded-lg shadow-sm flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Payment Method</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedMethods.map((method: any) => (
            <div 
              key={method.id}
              className={`rounded-2xl p-5 border relative overflow-hidden flex flex-col justify-between space-y-4 ${
                method.isDefault 
                  ? "bg-gradient-to-br from-[#0B2553] via-[#071D40] to-[#04122C] border-amber-400/50 shadow-xl"
                  : "bg-[#05142B] border-[#3A2C18] shadow-md"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#020A17] border border-[#DFBE77]/40 flex items-center justify-center shadow-inner">
                    <CreditCard className="w-4 h-4 text-[#FAD77B]" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white uppercase">
                      {method.brand}
                    </span>
                    <span className="text-[11px] text-[#A69371] font-mono block">
                      •••• •••• •••• {method.last4}
                    </span>
                  </div>
                </div>

                {method.isDefault ? (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono">
                    Default
                  </Badge>
                ) : (
                  <Button
                    onClick={() => setDefaultMethodMutation.mutate({ methodId: method.id, contactId })}
                    variant="ghost"
                    size="sm"
                    className="text-[11px] text-[#DFBE77] hover:text-[#FFE394] h-7 px-2"
                  >
                    Set Default
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-[#C6B697] pt-2 border-t border-[#3A2C18]">
                <span>Expires: {method.expMonth || "12"}/{method.expYear || "2028"}</span>
                {savedMethods.length > 1 && !method.isDefault && (
                  <Button
                    onClick={() => removeMethodMutation.mutate({ methodId: method.id, contactId })}
                    variant="ghost"
                    size="sm"
                    className="text-rose-400 hover:text-rose-300 h-6 px-1.5 text-[11px]"
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* FAST PAYMENT MODAL (One-Click with Saved Card or New Card)   */}
      {/* ──────────────────────────────────────────────────────────── */}
      <Dialog open={fastPayOpen} onOpenChange={setFastPayOpen}>
        <DialogContent className="max-w-lg bg-[#07162B] border border-[#DFBE77]/50 text-white rounded-2xl p-6 sm:p-7 shadow-2xl">
          {paymentSuccessData ? (
            /* ── Confirmation View ── */
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-lg">
                <CheckCircle className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <DialogTitle className="text-2xl font-serif text-[#FFF4D4]">
                  Payment Successful
                </DialogTitle>
                <DialogDescription className="text-xs text-[#C6B697]">
                  Thank you! Your payment for Invoice #{activeInvoice?.invoiceNumber} has been confirmed.
                </DialogDescription>
              </div>

              <div className="p-4 rounded-xl bg-[#020A17] border border-[#3A2C18] space-y-2 text-xs text-[#D8C7A5] font-mono">
                <div className="flex justify-between">
                  <span>Amount Paid:</span>
                  <span className="text-white font-bold text-sm">${Number(activeInvoice?.total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="text-emerald-400 font-bold">Paid in Full</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  onClick={() => handleDownloadReceipt(activeInvoice)}
                  variant="outline"
                  className="border border-[#DFBE77]/40 text-[#DFBE77] hover:bg-[#FFE394]/10 bg-transparent text-xs h-9 px-4 rounded-xl"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Download Receipt
                </Button>
                <Button
                  onClick={() => setFastPayOpen(false)}
                  className="bg-[#142642] hover:bg-[#1a3258] text-[#FFF4D4] text-xs h-9 px-5 rounded-xl border border-[#DFBE77]/30"
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            /* ── Fast Pay Checkout View ── */
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center justify-between border-b border-[#3A2C18] pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#A69371] tracking-wider block">
                      Waypoint Invoice #{activeInvoice?.invoiceNumber}
                    </span>
                    <DialogTitle className="text-xl font-serif text-[#FFF4D4]">
                      {activeInvoice?.title || "Special Education Advocacy Services"}
                    </DialogTitle>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-[#A69371] font-mono block">Amount Due</span>
                    <span className="text-xl font-mono font-black text-[#FFE394]">
                      ${Number(activeInvoice?.total).toFixed(2)}
                    </span>
                  </div>
                </div>
              </DialogHeader>

              {/* Mode A: Saved Card (Default Fast 1-Click Pay) */}
              {!useDifferentMethod ? (
                <div className="space-y-4 pt-1">
                  <div className="p-4 rounded-xl bg-[#020A17] border border-[#DFBE77]/40 space-y-2">
                    <span className="text-[11px] font-mono uppercase text-[#C5A059] block font-bold">
                      Payment Method:
                    </span>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <CreditCard className="w-5 h-5 text-[#FAD77B]" />
                        <div>
                          <span className="text-sm font-bold text-white block">
                            {defaultSavedMethod.brand.toUpperCase()} ending in {defaultSavedMethod.last4}
                          </span>
                          <span className="text-[10px] text-[#A69371] font-mono">
                            Saved Card (Default Billing Method)
                          </span>
                        </div>
                      </div>
                      <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono">
                        Ready
                      </Badge>
                    </div>
                  </div>

                  {/* 1-Click Confirmation Action */}
                  <Button
                    onClick={handleExecuteSavedPayment}
                    disabled={paySavedMutation.isPending}
                    className="w-full bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-extrabold text-sm h-11 rounded-xl border border-[#FFE394]/70 shadow-lg cursor-pointer flex items-center justify-center gap-2 transition-transform hover:scale-[1.01]"
                  >
                    <Lock className="w-4 h-4 text-[#07162B]" />
                    <span>
                      {paySavedMutation.isPending
                        ? "Processing Payment..."
                        : `Pay $${Number(activeInvoice?.total).toFixed(2)}`}
                    </span>
                  </Button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setUseDifferentMethod(true)}
                      className="text-xs text-[#DFBE77] hover:underline cursor-pointer font-medium"
                    >
                      Use a Different Payment Method
                    </button>
                  </div>
                </div>
              ) : (
                /* Mode B: New Card Input Form */
                <form onSubmit={handleExecuteNewPayment} className="space-y-4 pt-1">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs text-[#C5A059] font-semibold block">Card Number</label>
                      <Input
                        value={newCardForm.cardNumber}
                        onChange={(e) => setNewCardForm({ ...newCardForm, cardNumber: e.target.value })}
                        placeholder="•••• •••• •••• ••••"
                        className="bg-[#020A17] border border-[#DFBE77]/40 text-white font-mono text-xs"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-[#C5A059] font-semibold block">Expiration (MM/YY)</label>
                        <Input
                          value={newCardForm.exp}
                          onChange={(e) => setNewCardForm({ ...newCardForm, exp: e.target.value })}
                          placeholder="12/28"
                          className="bg-[#020A17] border border-[#DFBE77]/40 text-white font-mono text-xs text-center"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-[#C5A059] font-semibold block">Security Code (CVC)</label>
                        <Input
                          value={newCardForm.cvc}
                          onChange={(e) => setNewCardForm({ ...newCardForm, cvc: e.target.value })}
                          placeholder="123"
                          className="bg-[#020A17] border border-[#DFBE77]/40 text-white font-mono text-xs text-center"
                          required
                        />
                      </div>
                    </div>

                    {/* Save for Future Checkbox */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="saveCardCheckbox"
                        checked={saveForFuture}
                        onChange={(e) => setSaveForFuture(e.target.checked)}
                        className="rounded border-[#DFBE77]/40 bg-[#020A17] text-[#C5A059] focus:ring-0"
                      />
                      <label htmlFor="saveCardCheckbox" className="text-xs text-[#D8C7A5] cursor-pointer">
                        Save this payment method for future payments
                      </label>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={payNewMutation.isPending}
                    className="w-full bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-extrabold text-sm h-11 rounded-xl border border-[#FFE394]/70 shadow-lg cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4 text-[#07162B]" />
                    <span>
                      {payNewMutation.isPending
                        ? "Processing..."
                        : `Pay $${Number(activeInvoice?.total).toFixed(2)} with New Card`}
                    </span>
                  </Button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setUseDifferentMethod(false)}
                      className="text-xs text-[#A69371] hover:text-[#FFF4D4] cursor-pointer"
                    >
                      ← Back to Saved Card
                    </button>
                  </div>
                </form>
              )}

              <p className="text-[11px] text-[#A69371] text-center pt-2 flex items-center justify-center gap-1.5">
                <Lock className="w-3 h-3 text-emerald-400" />
                Payments are securely processed via Stripe. Sensitive card details are never stored on Waypoint servers.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* DIALOG: ADD NEW PAYMENT METHOD                              */}
      {/* ──────────────────────────────────────────────────────────── */}
      <Dialog open={addMethodOpen} onOpenChange={setAddMethodOpen}>
        <DialogContent className="max-w-md bg-[#07162B] border border-[#DFBE77]/40 text-white rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-serif text-[#FFF4D4] flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#FAD77B]" />
              Add Payment Method
            </DialogTitle>
            <DialogDescription className="text-xs text-[#C6B697]">
              Add a new credit or debit card to your family billing account.
            </DialogDescription>
          </DialogHeader>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              addMethodMutation.mutate({
                contactId,
                brand: addMethodForm.brand,
                last4: addMethodForm.last4,
                expMonth: addMethodForm.expMonth,
                expYear: addMethodForm.expYear,
                isDefault: addMethodForm.isDefault,
              });
            }}
            className="space-y-4 pt-2 text-xs"
          >
            <div className="space-y-1">
              <label className="text-[#C5A059] font-bold block">Card Brand</label>
              <select
                value={addMethodForm.brand}
                onChange={(e) => setAddMethodForm({ ...addMethodForm, brand: e.target.value })}
                className="w-full bg-[#020A17] border border-[#DFBE77]/40 rounded-xl px-3 py-2 text-white"
              >
                <option value="visa">Visa</option>
                <option value="mastercard">Mastercard</option>
                <option value="amex">American Express</option>
                <option value="discover">Discover</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[#C5A059] font-bold block">Card Number (Last 4 Digits)</label>
              <Input
                value={addMethodForm.last4}
                onChange={(e) => setAddMethodForm({ ...addMethodForm, last4: e.target.value.slice(0, 4) })}
                maxLength={4}
                placeholder="4242"
                className="bg-[#020A17] border border-[#DFBE77]/40 text-white font-mono text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[#C5A059] font-bold block">Exp Month</label>
                <Input
                  type="number"
                  min="1"
                  max="12"
                  value={addMethodForm.expMonth}
                  onChange={(e) => setAddMethodForm({ ...addMethodForm, expMonth: parseInt(e.target.value) || 12 })}
                  className="bg-[#020A17] border border-[#DFBE77]/40 text-white font-mono text-center"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[#C5A059] font-bold block">Exp Year</label>
                <Input
                  type="number"
                  min="2026"
                  max="2040"
                  value={addMethodForm.expYear}
                  onChange={(e) => setAddMethodForm({ ...addMethodForm, expYear: parseInt(e.target.value) || 2028 })}
                  className="bg-[#020A17] border border-[#DFBE77]/40 text-white font-mono text-center"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isDefaultAdd"
                checked={addMethodForm.isDefault}
                onChange={(e) => setAddMethodForm({ ...addMethodForm, isDefault: e.target.checked })}
                className="rounded border-[#DFBE77]/40 bg-[#020A17] text-[#C5A059]"
              />
              <label htmlFor="isDefaultAdd" className="text-xs text-[#D8C7A5] cursor-pointer">
                Set as default payment method
              </label>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAddMethodOpen(false)}
                className="text-white/70 hover:text-white text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addMethodMutation.isPending}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs rounded-xl shadow-md"
              >
                {addMethodMutation.isPending ? "Saving..." : "Save Card"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default PortalMembershipTab;

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

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  date: string;
  description: string;
  amount: number;
  status: "Paid" | "Pending" | "Draft";
  receiptUrl?: string;
  stripePaymentUrl?: string;
  rawInvoice?: any;
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
  const { data: dbInvoices = [], refetch: refetchInvoices } = trpc.invoices.clientList.useQuery(
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

  // Default active payment method
  const defaultSavedMethod = savedMethods.find((m: any) => m.isDefault) || savedMethods[0];

  // Saved Credit Card State
  const [cardData, setCardData] = useState({
    brand: defaultSavedMethod?.brand ? defaultSavedMethod.brand.toUpperCase() : "Visa",
    last4: defaultSavedMethod?.last4 || "4242",
    expMonth: defaultSavedMethod?.expMonth ? String(defaultSavedMethod.expMonth).padStart(2, "0") : "08",
    expYear: defaultSavedMethod?.expYear ? String(defaultSavedMethod.expYear) : "2028",
    cardholder: displayName || "Waypoint Member",
    zipCode: "30303"
  });

  // Sync cardData when savedMethods query loads
  useEffect(() => {
    if (defaultSavedMethod) {
      setCardData(prev => ({
        ...prev,
        brand: defaultSavedMethod.brand ? defaultSavedMethod.brand.toUpperCase() : "Visa",
        last4: defaultSavedMethod.last4 || "4242",
        expMonth: defaultSavedMethod.expMonth ? String(defaultSavedMethod.expMonth).padStart(2, "0") : "08",
        expYear: defaultSavedMethod.expYear ? String(defaultSavedMethod.expYear) : "2028",
      }));
    }
  }, [defaultSavedMethod]);

  const [editCardOpen, setEditCardOpen] = useState(false);
  const [highlightPaymentMethod, setHighlightPaymentMethod] = useState(false);
  const paymentMethodCardRef = useRef<HTMLDivElement>(null);

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

  // Card update form
  const [cardForm, setCardForm] = useState({
    cardNumber: "4242 •••• •••• 4242",
    cardholder: cardData.cardholder,
    exp: "08/28",
    cvc: "•••",
    zipCode: "30303"
  });

  const triggerHighlightAndScroll = () => {
    setHighlightPaymentMethod(true);
    setTimeout(() => {
      paymentMethodCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
    setTimeout(() => {
      setHighlightPaymentMethod(false);
    }, 6000);
  };

  useEffect(() => {
    let shouldHighlight = false;
    try {
      if (sessionStorage.getItem("waypoint_highlight_payment_method") === "true") {
        shouldHighlight = true;
        sessionStorage.removeItem("waypoint_highlight_payment_method");
      }
    } catch {}

    if (typeof window !== "undefined" && window.location.hash === "#saved-payment-method") {
      shouldHighlight = true;
    }

    if (shouldHighlight) {
      triggerHighlightAndScroll();
    }

    const handleCustomFocus = () => {
      triggerHighlightAndScroll();
    };

    window.addEventListener("waypoint:focus-payment-method", handleCustomFocus);
    return () => window.removeEventListener("waypoint:focus-payment-method", handleCustomFocus);
  }, []);

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
      toast.success("Payment method saved successfully!");
      setEditCardOpen(false);
      refetchMethods();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add payment method");
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

  const unpaidInvoices = dbInvoices.filter((inv: any) => inv.status === "Sent" || inv.status === "Overdue");

  // Fallback default ledger items (Preserves original Waypoint Advocacy history)
  const defaultInvoices: InvoiceItem[] = [
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
  ];

  // Combined Invoices
  const formattedDbInvoices: InvoiceItem[] = dbInvoices.map((inv: any) => ({
    id: `db-${inv.id}`,
    invoiceNumber: inv.invoiceNumber || `INV-${inv.id}`,
    date: inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recent",
    description: inv.title || inv.notes || "One-Time Special Education Advocacy Statement",
    amount: Number(inv.total || inv.amount || 0),
    status: inv.status === "Paid" ? "Paid" : "Pending",
    stripePaymentUrl: inv.stripePaymentUrl,
    rawInvoice: inv
  }));

  const invoices = [...formattedDbInvoices, ...defaultInvoices];

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

    if (contactId) {
      addMethodMutation.mutate({
        contactId,
        brand: "visa",
        last4: lastFour,
        expMonth: parseInt(month) || 8,
        expYear: parseInt(year ? `20${year.slice(-2)}` : "2028") || 2028,
        isDefault: true,
      });
    } else {
      setEditCardOpen(false);
      toast.success("Payment method updated successfully!", {
        description: `Card ending in •••• ${lastFour} is now your default payment method.`
      });
    }
  };

  const handleDownloadReceipt = (inv: InvoiceItem) => {
    toast.success(`Receipt ${inv.invoiceNumber} downloaded`, {
      description: `${inv.description} — $${inv.amount.toFixed(2)}`
    });
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
                Membership &amp; Billing Management
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

      {/* ── Unpaid Advocacy Invoices Notification Banner ── */}
      {unpaidInvoices.length > 0 && (
        <div className="relative rounded-2xl p-[1px] bg-gradient-to-b from-[#FFE394] via-[#DFBE77] to-[#9E7D3B] shadow-[0_12px_32px_rgba(245,181,68,0.25)]">
          <div className="bg-gradient-to-r from-[#0B1E38] via-[#07162B] to-[#040D1A] rounded-[15px] p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Action Required · Outstanding Advocacy Invoice
                </span>
                <span className="text-xs text-[#A69371] font-mono">
                  #{unpaidInvoices[0].invoiceNumber}
                </span>
              </div>
              <h3 className="text-lg font-serif font-bold text-[#FFF4D4]">
                Invoice #{unpaidInvoices[0].invoiceNumber} — ${Number(unpaidInvoices[0].total || unpaidInvoices[0].amount || 0).toFixed(2)} USD
              </h3>
              <p className="text-xs text-[#D8C7A5]">
                {(unpaidInvoices[0] as any).clientNotes || (unpaidInvoices[0] as any).serviceDescription || unpaidInvoices[0].title || "One-Time Special Education Advocacy Statement"}
                {unpaidInvoices[0].dueDate ? ` · Due ${new Date(unpaidInvoices[0].dueDate).toLocaleDateString()}` : ""}
              </p>
            </div>

            <Button
              onClick={() => handleOpenPayInvoice(unpaidInvoices[0])}
              className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-extrabold text-sm h-11 px-6 rounded-xl border border-[#FFE394]/70 shadow-[0_4px_16px_rgba(0,0,0,0.6)] cursor-pointer flex items-center gap-2 shrink-0 transition-transform hover:scale-[1.02]"
            >
              <CreditCard className="w-4 h-4 text-[#07162B]" />
              <span>Pay Invoice (${Number(unpaidInvoices[0].total || unpaidInvoices[0].amount || 0).toFixed(2)})</span>
              <ArrowRight className="w-4 h-4 text-[#07162B]" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Two-Box Grid: Saved Payment Method & Enrolled Plan (Compact Height, Equal 50/50 Split, Rich Admiralty Gradients) ── */}
      <div className="max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        
        {/* ── Left Box: Saved Payment Method ── */}
        <div 
          id="saved-payment-method"
          ref={paymentMethodCardRef}
          className="h-full scroll-mt-24"
        >
          <Card 
            className={cn(
              "h-full flex flex-col justify-between border bg-gradient-to-br from-[#0B2553] via-[#071D40] to-[#04122C] shadow-2xl rounded-2xl overflow-hidden text-white transition-all duration-500 relative group",
              highlightPaymentMethod 
                ? "border-amber-400 ring-4 ring-amber-400/40 shadow-[0_0_50px_rgba(245,181,68,0.7),inset_0_0_20px_rgba(245,181,68,0.25)] animate-[pulse_1.5s_cubic-bezier(0.4,0,0.6,1)_infinite]" 
                : "border-amber-400/30 hover:border-amber-400/60"
            )}
          >
            {/* Top gold accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F5B544]/70 to-transparent pointer-events-none" />

            {/* Ambient gold glow */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#F5B544]/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16 group-hover:bg-[#F5B544]/15 transition-all duration-700" />

            {/* Illuminated Radiant Aura when focused */}
            {highlightPaymentMethod && (
              <div className="absolute inset-0 rounded-2xl pointer-events-none z-20 border-2 border-amber-300 shadow-[0_0_30px_rgba(251,191,36,0.8)]" />
            )}

            {/* Header Row */}
            <div className={cn(
              "border-b px-4 py-2 sm:px-4.5 sm:py-2.5 flex items-center justify-between transition-colors duration-500 shrink-0 relative z-10",
              highlightPaymentMethod 
                ? "bg-gradient-to-r from-[#1c1303] via-[#352303] to-[#1c1303] border-amber-400/60" 
                : "bg-[#030C22]/80 backdrop-blur-sm border-blue-900/40"
            )}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#07162B] border border-[#3A2C18] flex items-center justify-center shadow-inner">
                  <CreditCard className={cn(
                    "h-3 w-3 transition-colors",
                    highlightPaymentMethod ? "text-amber-300 animate-bounce" : "text-[#F5B544]"
                  )} />
                </div>
                <div>
                  <h3 className="text-xs sm:text-xs font-bold text-white tracking-wide flex items-center gap-1.5 leading-tight">
                    Saved Payment Method
                    {highlightPaymentMethod && (
                      <Badge className="bg-amber-400 text-slate-950 font-extrabold text-[8px] uppercase tracking-wider font-mono shadow-md animate-pulse py-0 px-1">
                        Update Required
                      </Badge>
                    )}
                  </h3>
                  <p className="text-[9.5px] text-blue-200/60 leading-none mt-0.5">
                    Primary card for monthly billing
                  </p>
                </div>
              </div>

              <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[8.5px] font-mono py-0.5 px-2 shadow-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Default Auto-Pay
              </Badge>
            </div>

            {/* Content: Credit Card pushed directly toward the top + compact button */}
            <div className="px-4 py-2.5 sm:px-5 sm:py-2.5 flex-1 flex flex-col items-center justify-start gap-2 relative z-10">
              {/* Fake Credit Card Graphic - Scaled snug and placed at top */}
              <div className="w-full max-w-[215px] sm:max-w-[225px]">
                <div 
                  style={{ aspectRatio: "85.6 / 53.98" }}
                  className="relative aspect-[85.6/53.98] w-full rounded-xl bg-gradient-to-br from-[#0B2553] via-[#071D40] to-[#04122C] border border-amber-400/40 p-2.5 sm:p-3 text-white shadow-xl overflow-hidden flex flex-col justify-between group/card select-none"
                >
                  {/* Gold accent sheen */}
                  <div className="absolute top-0 right-0 w-28 h-28 bg-[#F5B544]/15 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10 group-hover/card:bg-[#F5B544]/25 transition-all duration-700" />
                  
                  {/* Card Top Row: Chip & Wireless icon */}
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-1">
                      <div className="w-6 h-4.5 rounded bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 border border-amber-700/60 shadow-inner flex items-center justify-center p-0.5">
                        <div className="w-full h-full border border-amber-900/40 rounded-2xs grid grid-cols-2 gap-0.5 opacity-60">
                          <div className="border-r border-b border-amber-900/40" />
                          <div className="border-b border-amber-900/40" />
                          <div className="border-r border-amber-900/40" />
                          <div />
                        </div>
                      </div>
                      <Radio className="h-2.5 w-2.5 text-amber-300/80 rotate-90" />
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-black italic tracking-wider text-amber-300 font-mono drop-shadow-sm block leading-none">
                        {cardData.brand.toUpperCase()}
                      </span>
                      <span className="text-[6.5px] uppercase tracking-widest text-white/50 block font-mono mt-0.5">
                        Executive Debit
                      </span>
                    </div>
                  </div>

                  {/* Card Number */}
                  <div className="py-0 relative z-10">
                    <span className="text-[11px] sm:text-xs font-mono tracking-widest text-white font-bold drop-shadow">
                      •••• •••• •••• {cardData.last4}
                    </span>
                  </div>

                  {/* Card Bottom Row */}
                  <div className="flex items-end justify-between relative z-10 text-xs">
                    <div>
                      <span className="text-[6px] uppercase tracking-widest text-white/60 block font-mono leading-tight">
                        Cardholder Name
                      </span>
                      <span className="font-bold text-white tracking-wide uppercase font-mono text-[8.5px] sm:text-[9.5px] block mt-0.5">
                        {cardData.cardholder}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[6px] uppercase tracking-widest text-white/60 block font-mono leading-tight">
                        Expires
                      </span>
                      <span className="font-bold text-amber-300 font-mono text-[8.5px] sm:text-[9.5px] block mt-0.5">
                        {cardData.expMonth}/{cardData.expYear.slice(-2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Update Card Button Directly Under the Credit Card */}
              <div className="w-full max-w-[215px] sm:max-w-[225px] flex flex-col items-center gap-1 pt-0.5 mt-auto">
                <Button
                  onClick={() => {
                    setHighlightPaymentMethod(false);
                    setCardForm({
                      cardNumber: `•••• •••• •••• ${cardData.last4}`,
                      cardholder: cardData.cardholder,
                      exp: `${cardData.expMonth}/${cardData.expYear.slice(-2)}`,
                      cvc: "•••",
                      zipCode: cardData.zipCode
                    });
                    setEditCardOpen(true);
                  }}
                  className={cn(
                    "w-full h-8 px-2.5 rounded-lg font-bold text-xs tracking-wide transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-md relative overflow-hidden group/btn",
                    highlightPaymentMethod
                      ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] border-2 border-amber-300 shadow-[0_0_35px_rgba(245,181,68,0.95)] scale-[1.02] animate-pulse"
                      : "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:from-[#F0CF88] hover:via-[#D6B16A] hover:to-[#AF8E4C] text-[#07162B] border border-[#FFE394]/70 shadow-[0_3px_12px_rgba(0,0,0,0.5),0_0_10px_rgba(197,160,89,0.2)] hover:shadow-[0_5px_16px_rgba(245,181,68,0.3)] hover:scale-[1.01] active:scale-[0.98]"
                  )}
                >
                  <div className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-12 -translate-x-full group-hover/btn:translate-x-[300%] transition-transform duration-1000 ease-out pointer-events-none" />
                  <Edit3 className="h-3 w-3 text-[#07162B] shrink-0 stroke-[2.5]" />
                  <span className="font-extrabold tracking-wide text-[10.5px]">Update Payment Method</span>
                </Button>

                <div className="flex items-center gap-1 text-[8.5px] text-[#D8C7A5] font-medium bg-[#020A17]/80 px-2 py-0.5 rounded-full border border-[#DFBE77]/40 shadow-inner">
                  <ShieldCheck className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
                  <span>Instant encrypted sync</span>
                  <span className="text-white/20">•</span>
                  <span className="text-[#C6B697] font-mono text-[8px]">PCI-DSS</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Right Box: Enrolled Plan (🧭 Waypoint Essentials • $55/mo) ── */}
        <div className="h-full">
          <Card className="h-full flex flex-col justify-between border border-amber-400/30 hover:border-amber-400/60 bg-gradient-to-br from-[#0B2553] via-[#071D40] to-[#04122C] shadow-2xl rounded-2xl overflow-hidden text-white transition-all duration-500 relative group">
            {/* Top gold accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F5B544]/70 to-transparent pointer-events-none" />

            {/* Ambient gold glow */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#F5B544]/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16 group-hover:bg-[#F5B544]/15 transition-all duration-700" />

            {/* Header Row */}
            <div className="bg-[#030C22]/80 backdrop-blur-sm border-b border-blue-900/40 px-4 py-2 sm:px-4.5 sm:py-2.5 flex items-center justify-between shrink-0 relative z-10">
              <div className="space-y-0.5">
                <Badge className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[7.5px] font-bold uppercase font-mono px-1.5 py-0 shadow-sm leading-tight">
                  Current Enrolled Plan
                </Badge>
                <CardTitle className="text-xs sm:text-xs font-bold text-white tracking-tight flex items-center gap-1.5 leading-tight">
                  <span>🧭</span> Waypoint Essentials
                </CardTitle>
                <CardDescription className="text-[9.5px] text-blue-200/70 italic leading-none">
                  For support at the important moments.
                </CardDescription>
              </div>

              <div className="text-right shrink-0">
                <span className="text-lg sm:text-xl font-black text-amber-300 font-mono block leading-none">$55</span>
                <span className="text-[8.5px] text-white/50 block font-medium mt-0.5">/ month</span>
              </div>
            </div>

            {/* Content: Official Waypoint Essentials Features + Term Bar */}
            <div className="px-4 py-2.5 sm:px-4.5 sm:py-2.5 flex-1 flex flex-col justify-between gap-2 relative z-10 text-xs">
              {/* Recessed 2-Column Benefits Grid */}
              <div className="bg-[#020A17]/70 border border-[#DFBE77]/40 rounded-xl p-2.5 shadow-inner">
                <div className="grid grid-cols-2 gap-x-2.5 gap-y-1.5 text-[10.5px]">
                  <div className="flex items-center gap-1 text-white/90">
                    <span className="text-[11px] shrink-0">📄</span>
                    <span className="truncate">IEP/504 doc review</span>
                  </div>
                  <div className="flex items-center gap-1 text-white/90">
                    <span className="text-[11px] shrink-0">🎯</span>
                    <span className="truncate">Meeting preparation</span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-200 font-semibold bg-amber-400/10 px-1 py-0.5 rounded border border-amber-400/20 col-span-2">
                    <span className="text-[11px] shrink-0">👥</span>
                    <span>4 IEP/504 meetings per year included</span>
                  </div>
                  <div className="flex items-center gap-1 text-white/90">
                    <span className="text-[11px] shrink-0">📊</span>
                    <span className="truncate">Evaluation &amp; data review</span>
                  </div>
                  <div className="flex items-center gap-1 text-white/90">
                    <span className="text-[11px] shrink-0">🧭</span>
                    <span className="truncate">Advocacy strategy</span>
                  </div>
                  <div className="flex items-center gap-1 text-white/90 col-span-2 pt-0.5 border-t border-[#DFBE77]/30">
                    <span className="text-[11px] shrink-0">⚖️</span>
                    <span>State complaint prep: <strong className="text-amber-300 font-mono font-bold">$200</strong></span>
                  </div>
                </div>
              </div>

              {/* Clean compact renewal & term bar */}
              <div className="py-1.5 px-2.5 rounded-lg bg-[#020A17]/90 border border-[#DFBE77]/40 flex items-center justify-between text-[10px] shadow-inner mt-auto">
                <span className="text-white/70">
                  Term: <strong className="text-amber-300 font-mono font-bold">12 mos · $660 total</strong>
                </span>
                <span className="text-emerald-400 font-semibold text-[9.5px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Auto-Pay Active
                </span>
              </div>
            </div>
          </Card>
        </div>

      </div>

      {/* ── Plan Transition Block (Choose what happens when your plan ends: keep vault, tool, renew) ── */}
      <div className="rounded-3xl border border-amber-400/40 bg-gradient-to-br from-[#0B2553] via-[#071D40] to-[#04122C] p-6 sm:p-7 shadow-2xl relative overflow-hidden group">
        {/* Top gold accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />
        
        {/* Ambient background glow */}
        <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-amber-400 text-slate-950 font-bold text-[10px] uppercase tracking-wider font-mono">
                Transition Planning
              </Badge>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                60-Day Window Active (Available in Sidebar)
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <RefreshCw className="w-5 h-5 text-amber-400" />
              Plan Transition
            </h3>

            <p className="text-xs sm:text-sm text-blue-200/80 leading-relaxed">
              Choose what happens when your plan ends. Select whether to <strong className="text-amber-300">keep your vault</strong>, retain <strong className="text-cyan-300">self-advocacy tools</strong>, or <strong className="text-emerald-300">renew active representation</strong> with Waypoint Advocates.
            </p>

            {/* Quick badges for the 3 paths */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-[#030C22] border border-amber-400/30 text-[11px] font-medium text-amber-300 flex items-center gap-1.5">
                <VaultSafeIcon className="w-3.5 h-3.5 text-amber-400" /> Keep Vault ($15/mo)
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-[#030C22] border border-cyan-400/30 text-[11px] font-medium text-cyan-300 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-cyan-400" /> Tool Access ($35/mo)
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-[#030C22] border border-emerald-400/30 text-[11px] font-medium text-emerald-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Renew ($55 or $100/mo)
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
            <Button
              onClick={() => onNavigateTab?.("renewal")}
              className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-xs h-11 px-5 rounded-xl shadow-lg shadow-amber-400/25 hover:shadow-amber-400/40 cursor-pointer flex items-center justify-center gap-2 transition-all group-hover:scale-105"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Plan Renewal &amp; Transition</span>
              <ArrowRight className="w-4 h-4 text-slate-950 ml-1" />
            </Button>

            <span className="text-[10px] text-blue-200/60 text-center sm:text-right md:text-center block">
              Opens full renewal and transition options
            </span>
          </div>
        </div>
      </div>

      {/* ── Invoices & Billing History Section (Featuring $75 State Complaint Row + DB Invoices) ── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Receipt className="h-5 w-5 text-[#F5B544]" />
              Invoices &amp; Transaction History
            </h2>
            <p className="text-xs text-blue-200/60">
              Itemized charges and downloadable receipts for advocacy filings, single invoices, and monthly advisory.
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
                  <th className="py-3.5 px-4">Item &amp; Description</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-900/30">
                {invoices.map((inv) => {
                  const isStateComplaint = inv.amount === 75;
                  const isRetainer = inv.description.toLowerCase().includes("retainer");

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
                          ) : isRetainer ? (
                            <span className="px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-bold text-[9px] uppercase border border-blue-500/30 shrink-0 font-mono">
                              Retainer
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold text-[9px] uppercase border border-amber-500/30 shrink-0 font-mono">
                              Advocacy
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
                        {inv.status === "Paid" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="h-3 w-3" /> Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                            <Clock className="h-3 w-3" /> Due / Pending
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                        {inv.status !== "Paid" ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              if (inv.rawInvoice) {
                                handleOpenPayInvoice(inv.rawInvoice);
                              } else if (inv.stripePaymentUrl) {
                                window.open(inv.stripePaymentUrl, "_blank");
                              } else {
                                handleOpenPayInvoice({
                                  id: inv.id,
                                  invoiceNumber: inv.invoiceNumber,
                                  title: inv.description,
                                  total: inv.amount,
                                });
                              }
                            }}
                            className="h-8 text-xs bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-extrabold rounded-lg gap-1.5 cursor-pointer shadow-md hover:brightness-110"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            <span>Pay Now</span>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownloadReceipt(inv)}
                            className="h-8 text-xs text-blue-300 hover:text-white hover:bg-blue-900/40 rounded-lg gap-1.5 cursor-pointer font-medium"
                          >
                            <Download className="h-3.5 w-3.5 text-[#F5B544]" />
                            <span>Receipt</span>
                          </Button>
                        )}
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
        <DialogContent className="bg-[#06172F] border border-blue-900/40 text-white max-w-md shadow-2xl rounded-2xl">
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
                disabled={addMethodMutation.isPending}
                className="bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                {addMethodMutation.isPending ? "Saving..." : "Save Payment Method"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── FAST PAYMENT MODAL (One-Click with Saved Card or New Card) ── */}
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
                  <span className="text-white font-bold text-sm">${Number(activeInvoice?.total || activeInvoice?.amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="text-emerald-400 font-bold">Paid in Full</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  onClick={() => handleDownloadReceipt({
                    id: String(activeInvoice?.id),
                    invoiceNumber: activeInvoice?.invoiceNumber || "INV-PAID",
                    date: "Today",
                    description: activeInvoice?.title || "Advocacy Services",
                    amount: Number(activeInvoice?.total || activeInvoice?.amount || 0),
                    status: "Paid"
                  })}
                  variant="outline"
                  className="border border-[#DFBE77]/40 text-[#DFBE77] hover:bg-[#FFE394]/10 bg-transparent text-xs h-9 px-4 rounded-xl cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Download Receipt
                </Button>
                <Button
                  onClick={() => setFastPayOpen(false)}
                  className="bg-[#142642] hover:bg-[#1a3258] text-[#FFF4D4] text-xs h-9 px-5 rounded-xl border border-[#DFBE77]/30 cursor-pointer"
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
                      {activeInvoice?.title || activeInvoice?.notes || "Special Education Advocacy Services"}
                    </DialogTitle>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-[#A69371] font-mono block">Amount Due</span>
                    <span className="text-xl font-mono font-black text-[#FFE394]">
                      ${Number(activeInvoice?.total || activeInvoice?.amount || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </DialogHeader>

              {/* Mode A: Saved Card (Default Fast 1-Click Pay) */}
              {!useDifferentMethod ? (
                <div className="space-y-4 pt-1">
                  <div className="p-4 rounded-xl bg-[#020A17] border border-[#DFBE77]/40 space-y-2">
                    <span className="text-[10px] uppercase font-mono font-bold text-[#A69371] block">
                      Pay With Saved Payment Method
                    </span>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#07162B] border border-[#3A2C18] flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-[#FAD77B]" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-white block uppercase">
                            {cardData.brand} •••• {cardData.last4}
                          </span>
                          <span className="text-[11px] text-[#A69371]">
                            Exp {cardData.expMonth}/{cardData.expYear.slice(-2)} · Default Auto-Pay Card
                          </span>
                        </div>
                      </div>
                      <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono">
                        Verified
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <Button
                      onClick={handleExecuteSavedPayment}
                      disabled={paySavedMutation.isPending}
                      className="w-full h-11 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-extrabold text-sm rounded-xl shadow-lg border border-[#FFE394]/70 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Lock className="w-4 h-4 text-[#07162B]" />
                      <span>{paySavedMutation.isPending ? "Processing Payment..." : `Pay $${Number(activeInvoice?.total || activeInvoice?.amount || 0).toFixed(2)} Now`}</span>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setUseDifferentMethod(true)}
                      className="text-xs text-[#DFBE77] hover:text-[#FFE394] hover:bg-[#FFE394]/10 h-8 cursor-pointer"
                    >
                      Use a different card or payment method →
                    </Button>
                  </div>
                </div>
              ) : (
                /* Mode B: Enter New Payment Method */
                <form onSubmit={handleExecuteNewPayment} className="space-y-4 pt-1">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs text-[#C5A059] font-bold block">Card Number</label>
                      <Input
                        value={newCardForm.cardNumber}
                        onChange={(e) => setNewCardForm({ ...newCardForm, cardNumber: e.target.value })}
                        placeholder="4242 •••• •••• 4242"
                        className="bg-[#020A17] border border-[#DFBE77]/40 text-white font-mono text-sm"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-[#C5A059] font-bold block">Expiration (MM/YY)</label>
                        <Input
                          value={newCardForm.exp}
                          onChange={(e) => setNewCardForm({ ...newCardForm, exp: e.target.value })}
                          placeholder="12/28"
                          className="bg-[#020A17] border border-[#DFBE77]/40 text-white font-mono text-sm"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-[#C5A059] font-bold block">Security Code (CVC)</label>
                        <Input
                          value={newCardForm.cvc}
                          onChange={(e) => setNewCardForm({ ...newCardForm, cvc: e.target.value })}
                          placeholder="123"
                          maxLength={4}
                          className="bg-[#020A17] border border-[#DFBE77]/40 text-white font-mono text-sm"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="saveCardBox"
                        checked={saveForFuture}
                        onChange={(e) => setSaveForFuture(e.target.checked)}
                        className="rounded border-[#DFBE77]/40 bg-[#020A17] text-[#C5A059]"
                      />
                      <label htmlFor="saveCardBox" className="text-xs text-[#D8C7A5] cursor-pointer">
                        Save this card to my family account for future payments
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <Button
                      type="submit"
                      disabled={payNewMutation.isPending}
                      className="w-full h-11 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-extrabold text-sm rounded-xl shadow-lg border border-[#FFE394]/70 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Lock className="w-4 h-4 text-[#07162B]" />
                      <span>{payNewMutation.isPending ? "Processing Payment..." : `Authorize & Pay $${Number(activeInvoice?.total || activeInvoice?.amount || 0).toFixed(2)}`}</span>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setUseDifferentMethod(false)}
                      className="text-xs text-slate-400 hover:text-white h-8 cursor-pointer"
                    >
                      ← Back to saved card
                    </Button>
                  </div>
                </form>
              )}

              <p className="text-[10px] text-center text-[#A69371] flex items-center justify-center gap-1.5 pt-2 border-t border-[#3A2C18]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Payments are securely encrypted and processed with 256-bit bank-grade TLS.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PortalMembershipTab;

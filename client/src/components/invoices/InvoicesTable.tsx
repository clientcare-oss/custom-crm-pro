import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Eye,
  Send,
  Copy,
  Check,
  Ban,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
  DollarSign,
  User,
  Calendar,
  MoreVertical,
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface InvoicesTableProps {
  invoices: any[];
  isLoading: boolean;
  onPreview: (invoiceId: number) => void;
  onRefund: (invoice: any) => void;
  onRefresh: () => void;
}

type StatusFilter = "ALL" | "Draft" | "Sent" | "Paid" | "Overdue" | "Voided";

export function InvoicesTable({
  invoices,
  isLoading,
  onPreview,
  onRefund,
  onRefresh,
}: InvoicesTableProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // External Payment Dialog State
  const [externalPaymentOpen, setExternalPaymentOpen] = useState(false);
  const [targetInvoiceForPayment, setTargetInvoiceForPayment] = useState<any>(null);
  const [extMethod, setExtMethod] = useState("Check");
  const [extReference, setExtReference] = useState("");
  const [extNotes, setExtNotes] = useState("");
  const [extAmount, setExtAmount] = useState("");

  // Payment History Modal State
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyInvoiceId, setHistoryInvoiceId] = useState<number | null>(null);

  const { data: historyEvents = [], isLoading: historyLoading } = trpc.invoices.getPaymentHistory.useQuery(
    { invoiceId: historyInvoiceId || 0 },
    { enabled: !!historyInvoiceId }
  );

  const recordExternalMutation = trpc.invoices.recordExternalPayment.useMutation({
    onSuccess: (data) => {
      toast.success(`External payment recorded for invoice #${data.invoiceNumber}`);
      setExternalPaymentOpen(false);
      setTargetInvoiceForPayment(null);
      setExtReference("");
      setExtNotes("");
      setExtAmount("");
      onRefresh();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to record payment");
    },
  });

  const sendMutation = trpc.invoices.send.useMutation({
    onSuccess: () => {
      toast.success("Invoice sent to client by email!");
      onRefresh();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send invoice");
    },
  });

  const voidMutation = trpc.invoices.void.useMutation({
    onSuccess: () => {
      toast.success("Invoice voided successfully");
      onRefresh();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to void invoice");
    },
  });

  const handleOpenExternalPayment = (inv: any) => {
    setTargetInvoiceForPayment(inv);
    setExtAmount(String(inv.total || ""));
    setExtReference("");
    setExtNotes("");
    setExtMethod("Check");
    setExternalPaymentOpen(true);
  };

  const handleOpenHistory = (inv: any) => {
    setHistoryInvoiceId(inv.id);
    setHistoryOpen(true);
  };

  const handleRecordExternalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetInvoiceForPayment) return;
    recordExternalMutation.mutate({
      invoiceId: targetInvoiceForPayment.id,
      paymentMethod: extMethod,
      reference: extReference.trim() || undefined,
      notes: extNotes.trim() || undefined,
      amountPaid: extAmount.trim() || undefined,
    });
  };

  const handleCopyPayLink = (inv: any) => {
    if (inv.stripePaymentUrl) {
      navigator.clipboard.writeText(inv.stripePaymentUrl);
      setCopiedId(inv.id);
      toast.success(`Stripe pay link for ${inv.invoiceNumber} copied!`);
      setTimeout(() => setCopiedId(null), 2500);
    } else {
      toast.error("No active Stripe payment link for this draft invoice");
    }
  };

  const handleVoid = (inv: any) => {
    if (window.confirm(`Are you sure you want to void invoice #${inv.invoiceNumber}? This action cannot be undone.`)) {
      voidMutation.mutate({ id: inv.id });
    }
  };

  // Filtering
  const filteredInvoices = invoices.filter((item) => {
    const inv = item.invoice || item;
    const client = item.client;

    // Status filter
    if (statusFilter !== "ALL" && inv.status !== statusFilter) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = inv.invoiceNumber?.toLowerCase().includes(q);
      const matchClient = client?.name?.toLowerCase().includes(q) || client?.email?.toLowerCase().includes(q);
      const matchNote = inv.notes?.toLowerCase().includes(q) || inv.discountNote?.toLowerCase().includes(q);
      return matchNum || matchClient || matchNote;
    }

    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Paid
          </span>
        );
      case "Sent":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
            <Clock className="w-3 h-3 text-blue-400" />
            Sent
          </span>
        );
      case "Overdue":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/40">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            Overdue
          </span>
        );
      case "Voided":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-slate-500/20 text-slate-300 border border-slate-500/40">
            <XCircle className="w-3 h-3 text-slate-400" />
            Voided
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            Draft
          </span>
        );
    }
  };

  const statusFilters: { id: StatusFilter; label: string }[] = [
    { id: "ALL", label: "All Invoices" },
    { id: "Draft", label: "Drafts" },
    { id: "Sent", label: "Sent" },
    { id: "Paid", label: "Paid" },
    { id: "Overdue", label: "Overdue" },
    { id: "Voided", label: "Voided" },
  ];

  return (
    <div className="space-y-4">
      {/* ── Filter Bar & Search ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#020A17]/80 p-3 rounded-2xl border border-[#DFBE77]/40 shadow-inner">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {statusFilters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === f.id
                  ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-md border border-[#FFE394]/70"
                  : "text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#07162B]/80 border border-transparent"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#A69371]" />
          <Input
            placeholder="Search invoice #, family, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#07162B] border border-[#DFBE77]/40 rounded-xl pl-9 text-xs text-[#FFF4D4] placeholder:text-[#A69371] h-9 focus:border-[#FFE394]"
          />
        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="relative rounded-2xl p-[1px] bg-gradient-to-b from-[#FFE394]/50 via-[#C5A059]/30 to-[#9E7D3B]/20 shadow-[0_16px_36px_rgba(0,0,0,0.9)] overflow-hidden">
        <div className="bg-gradient-to-b from-[#0B1E38] via-[#07162B] to-[#040D1A] rounded-[15px] overflow-hidden">
          
          {/* Top Hairline */}
          <div className="h-[1.5px] bg-gradient-to-r from-transparent via-[#FFE394]/50 to-transparent" />

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#DFBE77]/30 bg-[#020A17]/80 text-[#C5A059] font-mono text-[10.5px] uppercase tracking-wider">
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Family / Client</th>
                  <th className="py-3.5 px-4">Line Items Preview</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DFBE77]/15">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#C6B697] font-mono">
                      Loading invoices from Waypoint database...
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#A69371] space-y-2">
                      <FileText className="w-8 h-8 mx-auto text-[#DFBE77]/40 mb-2" />
                      <p className="text-sm font-serif font-bold text-[#FFF4D4]">No invoices found</p>
                      <p className="text-xs text-[#A69371]">
                        {searchQuery ? "Try refining your search query or filter" : "Create your first one-time invoice to get started"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((item) => {
                    const inv = item.invoice || item;
                    const client = item.client;
                    const lineItems = item.lineItems || [];
                    const total = Number(inv.total) || Number(inv.amount) || 0;
                    const discount = Number(inv.discountAmount) || 0;

                    return (
                      <tr
                        key={inv.id}
                        className="hover:bg-[#102442]/60 transition-colors text-[#FFF4D4] group"
                      >
                        {/* Invoice # */}
                        <td className="py-3.5 px-4 font-mono font-bold text-[#FFE394]">
                          <button
                            type="button"
                            onClick={() => onPreview(inv.id)}
                            className="hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>{inv.invoiceNumber}</span>
                          </button>
                          {inv.sentAt && (
                            <span className="block text-[10px] text-[#A69371] font-normal">
                              Sent {new Date(inv.sentAt).toLocaleDateString()}
                            </span>
                          )}
                        </td>

                        {/* Family / Client */}
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-white">
                            {client?.name || inv.clientName || "Client Account"}
                          </p>
                          {(client?.email || inv.sentToEmail) && (
                            <p className="text-[11px] text-[#A69371] font-mono">
                              {client?.email || inv.sentToEmail}
                            </p>
                          )}
                        </td>

                        {/* Line Items Preview */}
                        <td className="py-3.5 px-4 max-w-xs truncate text-[#D8C7A5]">
                          {lineItems.length > 0 ? (
                            <div className="space-y-0.5">
                              <p className="truncate font-medium">
                                {lineItems[0].description}
                              </p>
                              {lineItems.length > 1 && (
                                <span className="text-[10px] text-[#A69371] font-mono">
                                  +{lineItems.length - 1} more item{lineItems.length > 2 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#A69371] italic">Standard Advocacy Services</span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 text-right font-mono">
                          <span className="font-black text-sm text-[#FFF4D4]">
                            ${total.toFixed(2)}
                          </span>
                          {discount > 0 && (
                            <span className="block text-[10px] text-emerald-400">
                              -${discount.toFixed(2)} {inv.discountNote ? `(${inv.discountNote})` : "credit"}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {getStatusBadge(inv.status)}
                          {inv.refundedAmount && Number(inv.refundedAmount) > 0 && (
                            <span className="block text-[10px] text-amber-300 font-mono mt-0.5">
                              Refunded ${Number(inv.refundedAmount).toFixed(2)}
                            </span>
                          )}
                        </td>

                        {/* Due Date */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#C6B697]">
                          {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "Upon Receipt"}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Preview Button */}
                            <Button
                              type="button"
                              onClick={() => onPreview(inv.id)}
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-[#DFBE77] hover:text-[#FFE394] hover:bg-[#FFE394]/10 rounded-lg cursor-pointer"
                              title="Preview / Print"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>

                            {/* Copy Link Button */}
                            {inv.stripePaymentUrl && (
                              <Button
                                type="button"
                                onClick={() => handleCopyPayLink(inv)}
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-[#DFBE77] hover:text-[#FFE394] hover:bg-[#FFE394]/10 rounded-lg cursor-pointer"
                                title="Copy Stripe Payment Link"
                              >
                                {copiedId === inv.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </Button>
                            )}

                            {/* Dropdown Menu for More Actions */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-[#C6B697] hover:text-white hover:bg-white/10 rounded-lg"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="bg-[#0B1E38] border border-[#DFBE77]/40 text-white rounded-xl shadow-xl min-w-[170px] p-1 text-xs"
                              >
                                <DropdownMenuItem
                                  onClick={() => onPreview(inv.id)}
                                  className="hover:bg-[#142642] cursor-pointer flex items-center gap-2"
                                >
                                  <Eye className="w-3.5 h-3.5 text-[#DFBE77]" />
                                  <span>View & Print</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => handleOpenHistory(inv)}
                                  className="hover:bg-[#142642] cursor-pointer flex items-center gap-2 text-cyan-300"
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Payment History</span>
                                </DropdownMenuItem>

                                {inv.stripePaymentUrl && (
                                  <DropdownMenuItem
                                    onClick={() => handleCopyPayLink(inv)}
                                    className="hover:bg-[#142642] cursor-pointer flex items-center gap-2"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-[#DFBE77]" />
                                    <span>Copy Pay Link</span>
                                  </DropdownMenuItem>
                                )}

                                {inv.status !== "Paid" && inv.status !== "Voided" && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => handleOpenExternalPayment(inv)}
                                      className="hover:bg-[#142642] cursor-pointer flex items-center gap-2 text-emerald-300"
                                    >
                                      <DollarSign className="w-3.5 h-3.5" />
                                      <span>Record External Payment</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={() => sendMutation.mutate({ id: inv.id })}
                                      className="hover:bg-[#142642] cursor-pointer flex items-center gap-2 text-blue-300"
                                    >
                                      <Send className="w-3.5 h-3.5" />
                                      <span>{inv.sentAt ? "Resend Notification" : "Send Notification"}</span>
                                    </DropdownMenuItem>
                                  </>
                                )}

                                {inv.status === "Paid" && (
                                  <DropdownMenuItem
                                    onClick={() => onRefund(inv)}
                                    className="hover:bg-[#142642] cursor-pointer flex items-center gap-2 text-amber-300"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Issue Refund</span>
                                  </DropdownMenuItem>
                                )}

                                {inv.status !== "Paid" && inv.status !== "Voided" && (
                                  <>
                                    <DropdownMenuSeparator className="bg-[#DFBE77]/20" />
                                    <DropdownMenuItem
                                      onClick={() => handleVoid(inv)}
                                      className="hover:bg-red-950/40 cursor-pointer flex items-center gap-2 text-red-400"
                                    >
                                      <Ban className="w-3.5 h-3.5" />
                                      <span>Void Invoice</span>
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
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
      </div>

      {/* ── Record External Payment Dialog ── */}
      <Dialog open={externalPaymentOpen} onOpenChange={setExternalPaymentOpen}>
        <DialogContent className="max-w-md bg-[#07162B] border border-[#DFBE77]/40 text-white rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-serif text-[#FFF4D4] flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Record External Payment
            </DialogTitle>
            <DialogDescription className="text-xs text-[#C6B697]">
              Record an offline payment (check, wire transfer, cash) for invoice #{targetInvoiceForPayment?.invoiceNumber}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordExternalSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#C5A059] uppercase block font-bold">
                Payment Method *
              </label>
              <select
                value={extMethod}
                onChange={(e) => setExtMethod(e.target.value)}
                className="w-full bg-[#020A17] border border-[#DFBE77]/40 rounded-xl px-3 py-2 text-sm text-[#FFF4D4] focus:border-[#FFE394]"
              >
                <option value="Check">Check</option>
                <option value="Wire Transfer">Wire Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Offline Card">Offline Card Processing</option>
                <option value="Money Order">Money Order</option>
                <option value="Grant / Sponsor">Grant / Sponsor Payment</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#C5A059] uppercase block font-bold">
                Amount Paid ($) *
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={extAmount}
                onChange={(e) => setExtAmount(e.target.value)}
                className="bg-[#020A17] border border-[#DFBE77]/40 text-[#FFF4D4] font-mono text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#A69371] uppercase block">
                Reference / Check # (Optional)
              </label>
              <Input
                placeholder="e.g. Check #4029 or Wire Conf #8821"
                value={extReference}
                onChange={(e) => setExtReference(e.target.value)}
                className="bg-[#020A17] border border-[#DFBE77]/40 text-[#FFF4D4] text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#A69371] uppercase block">
                Staff Notes (Optional)
              </label>
              <Input
                placeholder="e.g. Received in-office by advocate"
                value={extNotes}
                onChange={(e) => setExtNotes(e.target.value)}
                className="bg-[#020A17] border border-[#DFBE77]/40 text-[#FFF4D4] text-xs"
              />
            </div>

            <DialogFooter className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setExternalPaymentOpen(false)}
                className="text-white/70 hover:text-white text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={recordExternalMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-4 rounded-xl cursor-pointer"
              >
                {recordExternalMutation.isPending ? "Recording..." : "Confirm Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Payment History Modal ── */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-md bg-[#07162B] border border-[#DFBE77]/40 text-white rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-serif text-[#FFF4D4] flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              Invoice Payment &amp; Audit History
            </DialogTitle>
            <DialogDescription className="text-xs text-[#C6B697]">
              Complete chronological timeline of events for this invoice.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-3 max-h-[350px] overflow-y-auto">
            {historyLoading ? (
              <p className="text-xs text-slate-400 text-center py-6">Loading audit timeline...</p>
            ) : historyEvents.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No lifecycle events recorded yet.</p>
            ) : (
              historyEvents.map((evt: any) => (
                <div key={evt.id} className="p-3 rounded-xl bg-[#020A17]/80 border border-[#DFBE77]/25 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#FFF4D4]">{evt.title}</span>
                    <span className="text-[10px] font-mono text-[#A69371]">
                      {new Date(evt.date).toLocaleDateString()} {new Date(evt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-[#C6B697]">{evt.description}</p>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              onClick={() => setHistoryOpen(false)}
              className="w-full bg-[#142642] hover:bg-[#1a3258] text-[#FFF4D4] text-xs h-9 rounded-xl border border-[#DFBE77]/30"
            >
              Close History
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

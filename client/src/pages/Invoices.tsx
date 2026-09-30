import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VoiceInput from "@/components/VoiceInput";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Edit2, DollarSign, Calendar, CheckCircle, Clock, Banknote, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import PageIdBadge from "@/components/PageIdBadge";
import BillGuardian from "./BillGuardian";
import { cn } from "@/lib/utils";

const INVOICE_STATUSES = ["Draft", "Sent", "Paid", "Overdue", "Cancelled"] as const;
type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export default function Invoices() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    invoiceNumber: "",
    amount: "",
    total: "",
    status: "Draft" as InvoiceStatus,
    dueDate: "",
  });

  const { data: invoices, isLoading, refetch } = trpc.invoices.list.useQuery(
    undefined,
    {
      enabled: user?.role === "admin",
    }
  );

  const createMutation = trpc.invoices.create.useMutation({
    onSuccess: () => {
      toast.success("Invoice created successfully");
      refetch();
      setOpen(false);
      setFormData({
        invoiceNumber: "",
        amount: "",
        total: "",
        status: "Draft" as InvoiceStatus,
        dueDate: "",
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create invoice");
    },
  });

  const updateMutation = trpc.invoices.update.useMutation({
    onSuccess: () => {
      toast.success("Invoice updated successfully");
      refetch();
      setOpen(false);
      setEditingId(null);
      setFormData({
        invoiceNumber: "",
        amount: "",
        total: "",
        status: "Draft" as InvoiceStatus,
        dueDate: "",
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update invoice");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.invoiceNumber || !formData.amount) {
      toast.error("Invoice number and amount are required");
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        status: formData.status,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
      });
    } else {
      createMutation.mutate({
        invoiceNumber: formData.invoiceNumber,
        amount: String(parseFloat(formData.amount)),
        total: String(parseFloat(formData.total)),
        status: formData.status,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
      });
    }
  };

  const handleEdit = (invoice: any) => {
    setEditingId(invoice.id);
    setFormData({
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount?.toString() || "",
      total: invoice.total?.toString() || "",
      status: invoice.status,
      dueDate: invoice.dueDate
        ? new Date(invoice.dueDate).toISOString().split("T")[0]
        : "",
    });
    setOpen(true);
  };

  const getStatusIcon = (status: InvoiceStatus) => {
    switch (status) {
      case "Paid":
        return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case "Overdue":
        return <Clock className="h-4 w-4 text-red-600" />;
      default:
        return <DollarSign className="h-4 w-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status: InvoiceStatus) => {
    const colors: Record<InvoiceStatus, string> = {
      Draft: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
      Sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      Paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      Overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      Cancelled: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
    };
    return colors[status];
  };

  const totalRevenue = invoices
    ?.filter((inv) => inv.status === "Paid")
    .reduce((sum, inv) => sum + Number(inv.amount || 0), 0) || 0;

  const totalPending = invoices
    ?.filter((inv) => inv.status === "Sent" || inv.status === "Overdue")
    .reduce((sum, inv) => sum + Number(inv.amount || 0), 0) || 0;

  // Support ?tab=bill-guardian query param
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const [activeTab, setActiveTab] = useState<"invoices" | "bill-guardian">(
    searchParams.get("tab") === "bill-guardian" || searchParams.get("tab") === "guardian" ? "bill-guardian" : "invoices"
  );

  const handleTabChange = (tab: "invoices" | "bill-guardian") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (tab === "bill-guardian") {
        url.searchParams.set("tab", "bill-guardian");
      } else {
        url.searchParams.delete("tab");
      }
      window.history.replaceState(null, "", url.toString());
    }
  };

  return (
    <div className="space-y-6 p-6 md:p-8">
      {/* ── Top Consolidated Billing Navigation Switcher ── */}
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border/50 shadow-inner">
          <button
            type="button"
            onClick={() => handleTabChange("invoices")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all cursor-pointer",
              activeTab === "invoices"
                ? "bg-card text-foreground shadow-sm border border-border/60 font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-card/40"
            )}
          >
            <FileText className="w-4 h-4 text-primary" />
            Invoices & Payments
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("bill-guardian")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all cursor-pointer",
              activeTab === "bill-guardian"
                ? "bg-card text-foreground shadow-sm border border-border/60 font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-card/40"
            )}
          >
            <Banknote className="w-4 h-4 text-emerald-500" />
            Bill Guardian — Fee Tracker & Audit
          </button>
        </div>

        <PageIdBadge
          id={activeTab === "bill-guardian" ? "PG-022" : "PG-005"}
          name={activeTab === "bill-guardian" ? "Bill Guardian" : "Invoices & Billing"}
        />
      </div>

      {activeTab === "bill-guardian" ? (
        <div className="-mx-6 md:-mx-8 -mb-6 md:-mb-8">
          <BillGuardian />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
              <p className="text-muted-foreground">
                Create and manage invoices, track payments
              </p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingId(null);
                setFormData({
                  invoiceNumber: "",
                  amount: "",
                  total: "",
                  status: "Draft" as InvoiceStatus,
                  dueDate: "",
                });
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-semibold text-accent-foreground shadow-sm transition-all hover:shadow-md"
            >
              <Plus className="h-4 w-4" />
              New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Invoice" : "Create New Invoice"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold">
                  Invoice Number *
                </label>
                <VoiceInput
                  value={formData.invoiceNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, invoiceNumber: e.target.value })
                  }
                  placeholder="e.g., INV-001"
                  required
                  disabled={editingId !== null}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold">
                  Total ($) *
                </label>
                <VoiceInput
                  type="number"
                  value={formData.total}
                  onChange={(e) =>
                    setFormData({ ...formData, total: e.target.value })
                  }
                  placeholder="5000.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold">
                  Amount ($) *
                </label>
                <VoiceInput
                  type="number"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  placeholder="5000.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold">Status</label>
                <Select
                  value={String(formData.status) || "Draft"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      status: value as InvoiceStatus,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVOICE_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold">Due Date</label>
                <VoiceInput
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                  className="flex-1 rounded-lg bg-accent px-4 py-2 font-semibold text-accent-foreground shadow-sm transition-all hover:shadow-md disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingId ? (
                    "Update Invoice"
                  ) : (
                    "Create Invoice"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">Total Revenue</p>
            <p className="text-3xl font-bold text-foreground">
              ${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground">From paid invoices</p>
          </div>
        </Card>
        <Card className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">Pending Payment</p>
            <p className="text-3xl font-bold text-foreground">
              ${totalPending.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </div>
        </Card>
      </div>

      {/* Invoices Table */}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-lg border border-border bg-muted/50 p-12">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : invoices && invoices.length > 0 ? (
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-foreground">
                      <div>
                        <p>{invoice.invoiceNumber}</p>
                        {invoice.referralCreditApplied && Number(invoice.referralCreditApplied) > 0 && (
                          <div className="mt-1 flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-md w-fit">
                              🎁 ${Number(invoice.referralCreditApplied).toFixed(2)} Referral Credit Applied
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Regular: ${Number(invoice.regularPlanAmount || invoice.amount).toFixed(2)} | Credit: -${Number(invoice.referralCreditApplied).toFixed(2)} | Charge: ${Number(invoice.total).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-foreground">
                      <div>
                        <span>${Number(invoice.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                        {invoice.referralCreditApplied && Number(invoice.referralCreditApplied) > 0 && (
                          <span className="block text-[10px] text-emerald-400 font-normal">
                            Reduced from ${Number(invoice.regularPlanAmount || invoice.amount).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-foreground">
                      ${Number(invoice.regularPlanAmount || invoice.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      {invoice.paymentStatusNote === "Satisfied by Referral Credit" || (Number(invoice.total) === 0 && Number(invoice.referralCreditApplied) > 0) ? (
                        <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle className="h-3 w-3" />
                          Satisfied by Referral Credit
                        </div>
                      ) : (
                        <div
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(
                            invoice.status as InvoiceStatus
                          )}`}
                        >
                          {getStatusIcon(invoice.status as InvoiceStatus)}
                          {invoice.status}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {invoice.dueDate
                        ? new Date(invoice.dueDate).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        onClick={() => handleEdit(invoice)}
                        variant="outline"
                        size="sm"
                        className="rounded-md border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground shadow-sm transition-all hover:bg-muted"
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
          <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-sm font-semibold text-foreground mb-2">No invoices yet</p>
          <p className="text-xs text-muted-foreground">
            Create your first invoice to get started
          </p>
        </div>
      )}
      </>
      )}
    </div>
  );
}

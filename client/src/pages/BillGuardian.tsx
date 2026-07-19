import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import VoiceInput from "@/components/VoiceInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import VoiceTextarea from "@/components/VoiceTextarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ShieldCheck, Plus, Trash2, Edit2, RefreshCw, CheckCircle2,
  AlertTriangle, XCircle, Copy, TrendingUp, Eye, Upload,
  Building2, CreditCard, Zap, ChevronDown, ChevronUp, Info, ExternalLink
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type MatchStatus = "unmatched" | "matched" | "duplicate" | "increased" | "needs_review" | "ignored";
type BillPriority = "critical" | "high" | "medium" | "low";
type BillFrequency = "monthly" | "quarterly" | "annual" | "weekly";
type PaymentStatus = "unpaid" | "paid" | "autopay_on" | "disputed" | "skipped";

// Click-through payment status pill
const paymentStatusCycle: PaymentStatus[] = ["unpaid", "paid", "autopay_on", "disputed", "skipped"];
const paymentStatusConfig: Record<PaymentStatus, { label: string; emoji: string; className: string }> = {
  unpaid:     { label: "Unpaid",     emoji: "○", className: "bg-muted text-muted-foreground hover:bg-muted/80 border border-border" },
  paid:       { label: "Paid ✓",     emoji: "✓", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-200 border border-emerald-300" },
  autopay_on: { label: "Autopay On", emoji: "⟳", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 hover:bg-blue-200 border border-blue-300" },
  disputed:   { label: "Disputed",   emoji: "!", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 hover:bg-orange-200 border border-orange-300" },
  skipped:    { label: "Skipped",    emoji: "–", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 border border-gray-300" },
};

function PaymentStatusPill({ billId, currentStatus, onUpdate }: { billId: number; currentStatus: PaymentStatus; onUpdate: (id: number, status: PaymentStatus) => void }) {
  const cfg = paymentStatusConfig[currentStatus as PaymentStatus] || paymentStatusConfig.unpaid;
  const nextStatus = (): PaymentStatus => {
    const idx = paymentStatusCycle.indexOf(currentStatus as PaymentStatus);
    return paymentStatusCycle[(idx + 1) % paymentStatusCycle.length];
  };
  return (
    <button
      onClick={() => onUpdate(billId, nextStatus())}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all select-none ${cfg.className}`}
      title={`Click to cycle status — currently: ${cfg.label}`}
    >
      <span>{cfg.emoji}</span>
      <span>{cfg.label}</span>
    </button>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  paid:       { label: "Paid",           color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  due_soon:   { label: "Due Soon",       color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",         icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  missing:    { label: "Missing",        color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",                 icon: <XCircle className="h-3.5 w-3.5" /> },
  duplicate:  { label: "Duplicate",      color: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",     icon: <Copy className="h-3.5 w-3.5" /> },
  increased:  { label: "Increased",      color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",     icon: <TrendingUp className="h-3.5 w-3.5" /> },
  upcoming:   { label: "Upcoming",       color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",             icon: <Info className="h-3.5 w-3.5" /> },
  needs_review: { label: "Needs Review", color: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300",            icon: <Eye className="h-3.5 w-3.5" /> },
  unmatched:  { label: "Unmatched",      color: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400",            icon: <Eye className="h-3.5 w-3.5" /> },
  matched:    { label: "Matched",        color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  ignored:    { label: "Ignored",        color: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500",            icon: <Info className="h-3.5 w-3.5" /> },
};

const priorityColor: Record<BillPriority, string> = {
  critical: "border-l-red-500",
  high:     "border-l-orange-400",
  medium:   "border-l-blue-400",
  low:      "border-l-slate-300",
};

const priorityBadge: Record<BillPriority, string> = {
  critical: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  high:     "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  medium:   "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  low:      "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400",
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || statusConfig.unmatched;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

// ─── Add Bill Dialog ──────────────────────────────────────────────────────────
function AddBillDialog({ open, onClose, editBill }: { open: boolean; onClose: () => void; editBill?: any }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    vendorName: editBill?.vendorName || "",
    expectedAmount: editBill?.expectedAmount || "",
    dueDay: editBill?.dueDay?.toString() || "1",
    frequency: (editBill?.frequency || "monthly") as BillFrequency,
    category: editBill?.category || "General",
    autopay: editBill?.autopay || false,
    priority: (editBill?.priority || "medium") as BillPriority,
    notes: editBill?.notes || "",
    aliases: editBill?.vendorAliases ? JSON.parse(editBill.vendorAliases).join(", ") : "",
    paymentLink: editBill?.paymentLink || "",
    paymentLinkNote: editBill?.paymentLinkNote || "",
  });

  const createBill = trpc.billGuardian.createBill.useMutation({
    onSuccess: () => { utils.billGuardian.listBills.invalidate(); utils.billGuardian.getDashboard.invalidate(); toast.success("Bill added"); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const updateBill = trpc.billGuardian.updateBill.useMutation({
    onSuccess: () => { utils.billGuardian.listBills.invalidate(); utils.billGuardian.getDashboard.invalidate(); toast.success("Bill updated"); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    const aliases = form.aliases.split(",").map((s: string) => s.trim()).filter(Boolean);
    const { paymentLink, paymentLinkNote, ...formRest } = form;
    const payload = { ...formRest, dueDay: parseInt(formRest.dueDay), vendorAliases: aliases, paymentLink: paymentLink || undefined, paymentLinkNote: paymentLinkNote || undefined };
    if (editBill) updateBill.mutate({ id: editBill.id, ...payload });
    else createBill.mutate(payload);
  };

  const categories = ["General", "Software & SaaS", "Utilities", "Insurance", "Rent & Facilities", "Payroll", "Marketing", "Banking & Fees", "Professional Services", "Equipment"];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editBill ? "Edit Bill" : "Add Recurring Bill"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Vendor Name *</Label>
              <VoiceInput placeholder="e.g. Google Workspace" value={form.vendorName} onChange={e => setForm(f => ({ ...f, vendorName: e.target.value }))} />
            </div>
            <div>
              <Label>Expected Amount *</Label>
              <VoiceInput placeholder="0.00" type="number" step="0.01" value={form.expectedAmount} onChange={e => setForm(f => ({ ...f, expectedAmount: e.target.value }))} />
            </div>
            <div>
              <Label>Due Day of Month *</Label>
              <VoiceInput placeholder="1-31" type="number" min={1} max={31} value={form.dueDay} onChange={e => setForm(f => ({ ...f, dueDay: e.target.value }))} />
            </div>
            <div>
              <Label>Frequency</Label>
              <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v as BillFrequency }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as BillPriority }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">🔴 Critical</SelectItem>
                  <SelectItem value="high">🟠 High</SelectItem>
                  <SelectItem value="medium">🔵 Medium</SelectItem>
                  <SelectItem value="low">⚪ Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 pt-5">
              <Switch checked={form.autopay} onCheckedChange={v => setForm(f => ({ ...f, autopay: v }))} />
              <Label>Autopay enabled</Label>
            </div>
          </div>
          <div>
            <Label>Known Vendor Aliases (comma-separated)</Label>
            <VoiceInput placeholder="GOOGLE *WORKSPACE, Google LLC" value={form.aliases} onChange={e => setForm(f => ({ ...f, aliases: e.target.value }))} />
            <p className="text-xs text-muted-foreground mt-1">Helps AI match bank transaction descriptions to this bill</p>
          </div>
          <div>
            <Label>Notes</Label>
            <VoiceTextarea placeholder="Any notes about this bill..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
          <div className="border-t pt-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payment Method Info</p>
            <div>
              <Label>Payment Link / Portal URL</Label>
              <VoiceInput placeholder="https://pay.vendor.com/login" value={form.paymentLink} onChange={e => setForm(f => ({ ...f, paymentLink: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-1">Where to go to pay or update payment method</p>
            </div>
            <div>
              <Label>Payment Notes</Label>
              <VoiceTextarea placeholder="e.g. Log in with billing@company.com, update card under Settings..." value={form.paymentLinkNote} onChange={e => setForm(f => ({ ...f, paymentLinkNote: e.target.value }))} rows={2} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.vendorName || !form.expectedAmount}>
            {editBill ? "Save Changes" : "Add Bill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Import Transactions Dialog ───────────────────────────────────────────────
function ImportTransactionsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [raw, setRaw] = useState("");
  const importTx = trpc.billGuardian.importTransactions.useMutation({
    onSuccess: (data) => {
      utils.billGuardian.listTransactions.invalidate();
      utils.billGuardian.getDashboard.invalidate();
      toast.success(`Imported ${data.count} transactions`);
      onClose();
      setRaw("");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleImport = () => {
    const lines = raw.trim().split("\n").filter(Boolean);
    const transactions: any[] = [];
    for (const line of lines) {
      const parts = line.split(",").map((s: string) => s.trim().replace(/^"|"$/g, ""));
      if (parts.length >= 3) {
        transactions.push({ description: parts[0], amount: parts[1], transactionDate: parts[2], category: parts[3] || undefined });
      }
    }
    if (transactions.length === 0) { toast.error("No valid rows found"); return; }
    importTx.mutate({ transactions });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Bank Transactions</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">CSV Format (one per line):</p>
            <code className="text-xs">Description, Amount, Date (YYYY-MM-DD), Category (optional)</code>
            <p className="mt-2 text-xs">Example:<br />
              <code>GOOGLE *WORKSPACE, 14.99, 2026-05-01, Software</code><br />
              <code>AMAZON WEB SERVICES, 47.23, 2026-05-03</code>
            </p>
          </div>
          <VoiceTextarea
            placeholder={"GOOGLE *WORKSPACE, 14.99, 2026-05-01\nAMAZON WEB SERVICES, 47.23, 2026-05-03"}
            value={raw}
            onChange={e => setRaw(e.target.value)}
            rows={10}
            className="font-mono text-xs"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleImport} disabled={!raw.trim() || importTx.isPending}>
            {importTx.isPending ? "Importing..." : "Import Transactions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────
function DashboardTab({ onAddBill }: { onAddBill: () => void }) {
  const { data, isLoading } = trpc.billGuardian.getDashboard.useQuery();
  const utils = trpc.useUtils();
  const runMatching = trpc.billGuardian.runMatching.useMutation({
    onSuccess: (r) => {
      utils.billGuardian.getDashboard.invalidate();
      utils.billGuardian.listTransactions.invalidate();
      toast.success(`AI Matching complete — ${r.matched} bills matched out of ${r.total} transactions`);
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <div className="flex items-center justify-center h-40 text-muted-foreground">Loading dashboard...</div>;
  if (!data) return null;

  const { summary, bills } = data;
  const alertBills = bills.filter(b => b.status === "missing" || b.status === "due_soon" || b.status === "duplicate" || b.status === "increased");

  const summaryCards = [
    { label: "Paid", value: summary.paid, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20", icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" /> },
    { label: "Due Soon", value: summary.dueSoon, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20", icon: <AlertTriangle className="h-5 w-5 text-amber-500" /> },
    { label: "Missing", value: summary.missing, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20", icon: <XCircle className="h-5 w-5 text-red-500" /> },
    { label: "Duplicate", value: summary.duplicate, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20", icon: <Copy className="h-5 w-5 text-orange-500" /> },
    { label: "Increased", value: summary.increased, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20", icon: <TrendingUp className="h-5 w-5 text-purple-500" /> },
    { label: "Needs Review", value: summary.needsReview, color: "text-slate-600", bg: "bg-slate-50 dark:bg-slate-800", icon: <Eye className="h-5 w-5 text-slate-500" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {alertBills.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-red-800 dark:text-red-300">Action Required</p>
              <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">
                {alertBills.length} bill{alertBills.length > 1 ? "s" : ""} need your attention:{" "}
                {alertBills.map(b => b.bill.vendorName).join(", ")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {summaryCards.map(card => (
          <div key={card.label} className={`rounded-xl p-4 ${card.bg}`}>
            <div className="flex items-center justify-between mb-2">
              {card.icon}
              <span className={`text-2xl font-bold ${card.color}`}>{card.value}</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
          </div>
        ))}
      </div>

      {/* AI Match Button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {summary.totalBills} bills tracked · {summary.totalTransactions} transactions · {summary.unmatched} unmatched
          </p>
        </div>
        <Button
          onClick={() => runMatching.mutate()}
          disabled={runMatching.isPending || summary.totalBills === 0 || summary.totalTransactions === 0}
          className="gap-2"
        >
          <Zap className="h-4 w-4" />
          {runMatching.isPending ? "Running AI Match..." : "Run AI Matching"}
        </Button>
      </div>

      {/* Bill Status List */}
      {bills.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-muted p-12 text-center">
          <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold text-lg">No bills tracked yet</p>
          <p className="text-muted-foreground text-sm mt-1 mb-4">Add your recurring business bills to start monitoring payments</p>
          <Button onClick={onAddBill}><Plus className="h-4 w-4 mr-2" />Add First Bill</Button>
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Bill Status This Month</h3>
          {bills.map(({ bill, status }) => (
            <div key={bill.id} className={`flex items-center gap-4 rounded-xl border bg-card px-4 py-3 border-l-4 ${priorityColor[bill.priority as BillPriority]}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{bill.vendorName}</span>
                  {bill.autopay && <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-1.5 py-0.5 rounded-full">Autopay</span>}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${priorityBadge[bill.priority as BillPriority]}`}>{bill.priority}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{bill.category} · Due day {bill.dueDay} · {bill.frequency}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold">${Number(bill.expectedAmount).toFixed(2)}</p>
                <StatusBadge status={status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Bills Tab ────────────────────────────────────────────────────────────────
function BillsTab({ onAdd }: { onAdd: () => void }) {
  const { data: bills, isLoading } = trpc.billGuardian.listBills.useQuery();
  const utils = trpc.useUtils();
  const [editBill, setEditBill] = useState<any>(null);
  const deleteBill = trpc.billGuardian.deleteBill.useMutation({
    onSuccess: () => { utils.billGuardian.listBills.invalidate(); utils.billGuardian.getDashboard.invalidate(); toast.success("Bill removed"); },
  });
  const updateStatus = trpc.billGuardian.updateBill.useMutation({
    onSuccess: (_, vars) => {
      utils.billGuardian.listBills.invalidate();
      utils.billGuardian.getDashboard.invalidate();
      const labels: Record<string, string> = { paid: "Marked as Paid ✓", autopay_on: "Set to Autopay On", disputed: "Marked as Disputed", skipped: "Marked as Skipped", unpaid: "Reset to Unpaid" };
      toast.success(labels[vars.paymentStatus || "unpaid"] || "Status updated");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <div className="flex items-center justify-center h-40 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{bills?.length || 0} recurring bills</p>
        <Button size="sm" onClick={onAdd}><Plus className="h-4 w-4 mr-1" />Add Bill</Button>
      </div>
      {!bills?.length ? (
        <div className="rounded-xl border-2 border-dashed border-muted p-10 text-center">
          <CreditCard className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">No bills added yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add your recurring business expenses to start tracking</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bills.map(bill => (
            <div key={bill.id} className={`flex items-start gap-4 rounded-xl border bg-card px-4 py-3 border-l-4 ${priorityColor[bill.priority as BillPriority]}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{bill.vendorName}</span>
                  {bill.autopay && <Badge variant="secondary" className="text-xs">Autopay</Badge>}
                  <Badge variant="outline" className="text-xs">{bill.frequency}</Badge>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${priorityBadge[bill.priority as BillPriority]}`}>{bill.priority}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{bill.category} · Due day {bill.dueDay} of each month</p>
                {bill.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{bill.notes}</p>}
                {bill.vendorAliases && (
                  <p className="text-xs text-muted-foreground mt-0.5">Aliases: {JSON.parse(bill.vendorAliases).join(", ")}</p>
                )}
              </div>
              <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                <span className="font-semibold">${Number(bill.expectedAmount).toFixed(2)}</span>
                <div className="flex items-center gap-1">
                  <PaymentStatusPill
                    billId={bill.id}
                    currentStatus={(bill.paymentStatus as PaymentStatus) || "unpaid"}
                    onUpdate={(id, status) => updateStatus.mutate({ id, paymentStatus: status })}
                  />
                  {bill.paymentLink && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Open payment portal" onClick={() => window.open(bill.paymentLink!, "_blank")}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditBill(bill)}><Edit2 className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteBill.mutate({ id: bill.id })}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
                {bill.paymentLinkNote && (
                  <p className="text-xs text-muted-foreground max-w-[220px] text-right line-clamp-2">{bill.paymentLinkNote}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {editBill && <AddBillDialog open={!!editBill} onClose={() => setEditBill(null)} editBill={editBill} />}
    </div>
  );
}

// ─── Transactions Tab ─────────────────────────────────────────────────────────
function TransactionsTab({ onImport }: { onImport: () => void }) {
  const { data: transactions, isLoading } = trpc.billGuardian.listTransactions.useQuery();
  const { data: bills } = trpc.billGuardian.listBills.useQuery();
  const utils = trpc.useUtils();
  const [overrideId, setOverrideId] = useState<number | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<MatchStatus>("matched");
  const [overrideBillId, setOverrideBillId] = useState<string>("");
  const [overrideNotes, setOverrideNotes] = useState("");

  const deleteTx = trpc.billGuardian.deleteTransaction.useMutation({
    onSuccess: () => { utils.billGuardian.listTransactions.invalidate(); utils.billGuardian.getDashboard.invalidate(); toast.success("Transaction removed"); },
  });
  const overrideMatch = trpc.billGuardian.overrideMatch.useMutation({
    onSuccess: () => {
      utils.billGuardian.listTransactions.invalidate();
      utils.billGuardian.getDashboard.invalidate();
      toast.success("Match overridden");
      setOverrideId(null);
    },
  });

  if (isLoading) return <div className="flex items-center justify-center h-40 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{transactions?.length || 0} transactions</p>
        <Button size="sm" onClick={onImport}><Upload className="h-4 w-4 mr-1" />Import Transactions</Button>
      </div>
      {!transactions?.length ? (
        <div className="rounded-xl border-2 border-dashed border-muted p-10 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">No transactions imported yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Import your bank transactions to start matching against bills</p>
          <Button size="sm" onClick={onImport}><Upload className="h-4 w-4 mr-1" />Import CSV</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map(tx => (
            <div key={tx.id} className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate">{tx.description}</span>
                  <StatusBadge status={tx.matchStatus} />
                  {tx.isManuallyVerified && <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">Verified</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(tx.transactionDate).toLocaleDateString()} · ${Number(tx.amount).toFixed(2)}
                  {tx.matchConfidence > 0 && ` · ${tx.matchConfidence}% confidence`}
                </p>
                {tx.matchNotes && <p className="text-xs text-muted-foreground mt-0.5 italic">{tx.matchNotes}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setOverrideId(tx.id); setOverrideStatus(tx.matchStatus as MatchStatus); setOverrideBillId(tx.matchedBillId?.toString() || ""); setOverrideNotes(tx.matchNotes || ""); }}>
                  Override
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteTx.mutate({ id: tx.id })}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Override Dialog */}
      <Dialog open={overrideId !== null} onOpenChange={() => setOverrideId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Override Match</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Match Status</Label>
              <Select value={overrideStatus} onValueChange={v => setOverrideStatus(v as MatchStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="matched">✅ Matched</SelectItem>
                  <SelectItem value="duplicate">🔁 Duplicate</SelectItem>
                  <SelectItem value="increased">💸 Increased</SelectItem>
                  <SelectItem value="needs_review">🧾 Needs Review</SelectItem>
                  <SelectItem value="ignored">Ignored</SelectItem>
                  <SelectItem value="unmatched">Unmatched</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Link to Bill (optional)</Label>
              <Select value={overrideBillId} onValueChange={setOverrideBillId}>
                <SelectTrigger><SelectValue placeholder="Select bill..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {bills?.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.vendorName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <VoiceInput value={overrideNotes} onChange={e => setOverrideNotes(e.target.value)} placeholder="Optional note..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideId(null)}>Cancel</Button>
            <Button onClick={() => overrideMatch.mutate({ transactionId: overrideId!, matchStatus: overrideStatus, billId: overrideBillId ? parseInt(overrideBillId) : undefined, matchNotes: overrideNotes, isManuallyVerified: true })}>
              Save Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Accounts Tab ─────────────────────────────────────────────────────────────
function AccountsTab() {
  const { data: accounts, isLoading } = trpc.billGuardian.listAccounts.useQuery();
  const utils = trpc.useUtils();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ bankName: "", accountName: "", accountType: "checking" });

  const addAccount = trpc.billGuardian.addAccount.useMutation({
    onSuccess: () => { utils.billGuardian.listAccounts.invalidate(); toast.success("Account added"); setShowAdd(false); setForm({ bankName: "", accountName: "", accountType: "checking" }); },
  });
  const deleteAccount = trpc.billGuardian.deleteAccount.useMutation({
    onSuccess: () => { utils.billGuardian.listAccounts.invalidate(); toast.success("Account removed"); },
  });

  if (isLoading) return <div className="flex items-center justify-center h-40 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{accounts?.length || 0} bank accounts</p>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1" />Add Account</Button>
      </div>
      <div className="rounded-xl border bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 p-4 text-sm text-amber-800 dark:text-amber-300">
        <p className="font-medium mb-1">Manual Import Mode</p>
        <p className="text-xs">Bill Guardian currently uses manual CSV transaction import. Add your bank accounts here for organization, then import transactions from the Transactions tab. Direct bank sync (Plaid) is coming soon.</p>
      </div>
      {accounts?.map(acc => (
        <div key={acc.id} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
          <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1">
            <p className="font-medium">{acc.bankName}</p>
            <p className="text-xs text-muted-foreground">{acc.accountName} · {acc.accountType}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteAccount.mutate({ id: acc.id })}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      ))}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Bank Account</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Bank Name</Label><VoiceInput placeholder="e.g. Found Bank" value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} /></div>
            <div><Label>Account Name / Label</Label><VoiceInput placeholder="e.g. Business Checking" value={form.accountName} onChange={e => setForm(f => ({ ...f, accountName: e.target.value }))} /></div>
            <div>
              <Label>Account Type</Label>
              <Select value={form.accountType} onValueChange={v => setForm(f => ({ ...f, accountType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Checking</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="credit">Credit Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => addAccount.mutate(form)} disabled={!form.bankName || !form.accountName}>Add Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BillGuardian() {
  const [showAddBill, setShowAddBill] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              💸 Bill Guardian™
            </h1>
            <p className="text-sm text-muted-foreground">Did the important business bills actually get paid?</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4 mr-1" />Import Transactions
          </Button>
          <Button size="sm" onClick={() => setShowAddBill(true)}>
            <Plus className="h-4 w-4 mr-1" />Add Bill
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="rounded-xl bg-muted/60 p-1">
          <TabsTrigger value="dashboard" className="rounded-lg">Dashboard</TabsTrigger>
          <TabsTrigger value="bills" className="rounded-lg">Bills</TabsTrigger>
          <TabsTrigger value="transactions" className="rounded-lg">Transactions</TabsTrigger>
          <TabsTrigger value="accounts" className="rounded-lg">Accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <DashboardTab onAddBill={() => setShowAddBill(true)} />
        </TabsContent>
        <TabsContent value="bills" className="mt-4">
          <BillsTab onAdd={() => setShowAddBill(true)} />
        </TabsContent>
        <TabsContent value="transactions" className="mt-4">
          <TransactionsTab onImport={() => setShowImport(true)} />
        </TabsContent>
        <TabsContent value="accounts" className="mt-4">
          <AccountsTab />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddBillDialog open={showAddBill} onClose={() => setShowAddBill(false)} />
      <ImportTransactionsDialog open={showImport} onClose={() => setShowImport(false)} />
    </div>
  );
}

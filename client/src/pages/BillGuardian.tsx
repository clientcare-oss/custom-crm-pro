import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import VoiceInput from "@/components/VoiceInput";
import { Label } from "@/components/ui/label";
import VoiceTextarea from "@/components/VoiceTextarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import PageIdBadge from "@/components/PageIdBadge";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";
import { cn } from "@/lib/utils";
import {
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  TrendingUp,
  Eye,
  Upload,
  Building2,
  CreditCard,
  Zap,
  Info,
  ExternalLink,
  Search,
  DollarSign,
  Calendar,
  Landmark,
  FileSpreadsheet,
  Sparkles,
  Filter,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type MatchStatus = "unmatched" | "matched" | "duplicate" | "increased" | "needs_review" | "ignored";
type BillPriority = "critical" | "high" | "medium" | "low";
type BillFrequency = "monthly" | "quarterly" | "annual" | "weekly";
type PaymentStatus = "unpaid" | "paid" | "autopay_on" | "disputed" | "skipped";

// ─── Blue Metal Brush & Cast Brass Hardware Styling Constants ──────────────────
const BRUSHED_METAL_LINES_STYLE: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(0deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 1px, transparent 1px, transparent 3px), radial-gradient(ellipse at 50% 0%, #15396A 0%, #081A35 50%, #030C1A 100%)",
};

const BRUSHED_BLUE_PANEL =
  "relative rounded-2xl bg-gradient-to-b from-[#0E274B]/95 via-[#081A35]/95 to-[#051024]/95 border border-[#24477A]/80 shadow-[0_12px_32px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(147,197,253,0.18)]";

const BRUSHED_BRASS_PANEL =
  "relative rounded-2xl bg-gradient-to-b from-[#0D2344]/95 via-[#07162B]/95 to-[#040D1B]/95 border border-[#C5A059]/45 shadow-[0_12px_32px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,227,148,0.16)]";

const RECESSED_WELL =
  "rounded-xl bg-[#030B18]/90 border border-[#1B355E]/80 shadow-[inset_0_2px_6px_rgba(0,0,0,0.85)]";

const CAST_BRASS_BUTTON =
  "h-10 px-4 rounded-xl bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-bold text-xs sm:text-sm inline-flex items-center gap-2 border border-[#FFE394]/80 shadow-[0_4px_16px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.45)] transition-all cursor-pointer disabled:opacity-50";

const BRUSHED_BLUE_BUTTON =
  "h-10 px-3.5 rounded-xl bg-gradient-to-b from-[#173A6E] via-[#0F284E] to-[#091933] hover:from-[#1E4885] hover:to-[#0D2345] text-[#E2EEFF] hover:text-white font-semibold text-xs inline-flex items-center gap-2 border border-[#3B6CB7]/70 hover:border-[#78A9FF] shadow-[0_4px_14px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.18)] transition-all cursor-pointer disabled:opacity-50";

function BrassRivet({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "w-2 h-2 rounded-full bg-gradient-to-br from-[#FFF4D4] via-[#C5A059] to-[#5A4117] border border-[#231706] shadow-[0_1px_2px_rgba(0,0,0,0.9),inset_0_0.5px_0.5px_rgba(255,255,255,0.8)] pointer-events-none",
        className
      )}
    />
  );
}

// Click-through payment status pill
const paymentStatusCycle: PaymentStatus[] = ["unpaid", "paid", "autopay_on", "disputed", "skipped"];
const paymentStatusConfig: Record<PaymentStatus, { label: string; emoji: string; className: string }> = {
  unpaid: {
    label: "Unpaid",
    emoji: "○",
    className:
      "bg-[#040D1E] text-[#94A3B8] hover:text-white border border-[#264370] hover:border-[#4B74B2]",
  },
  paid: {
    label: "Paid ✓",
    emoji: "✓",
    className:
      "bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-900/80 shadow-[0_0_12px_rgba(16,185,129,0.2)]",
  },
  autopay_on: {
    label: "Autopay On",
    emoji: "⟳",
    className:
      "bg-[#102C57]/90 text-[#93C5FD] border border-[#3B82F6]/60 hover:bg-[#173B73] shadow-[0_0_12px_rgba(59,130,246,0.25)]",
  },
  disputed: {
    label: "Disputed",
    emoji: "!",
    className:
      "bg-amber-950/80 text-amber-300 border border-amber-500/55 hover:bg-amber-900/80 shadow-[0_0_12px_rgba(245,158,11,0.2)]",
  },
  skipped: {
    label: "Skipped",
    emoji: "–",
    className:
      "bg-slate-900/80 text-slate-400 border border-slate-700 hover:bg-slate-800",
  },
};

function PaymentStatusPill({
  billId,
  currentStatus,
  onUpdate,
}: {
  billId: number;
  currentStatus: PaymentStatus;
  onUpdate: (id: number, status: PaymentStatus) => void;
}) {
  const cfg = paymentStatusConfig[currentStatus as PaymentStatus] || paymentStatusConfig.unpaid;
  const nextStatus = (): PaymentStatus => {
    const idx = paymentStatusCycle.indexOf(currentStatus as PaymentStatus);
    return paymentStatusCycle[(idx + 1) % paymentStatusCycle.length];
  };
  return (
    <button
      type="button"
      onClick={() => onUpdate(billId, nextStatus())}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all select-none",
        cfg.className
      )}
      title={`Click to cycle status — currently: ${cfg.label}`}
    >
      <span>{cfg.emoji}</span>
      <span>{cfg.label}</span>
    </button>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  paid: {
    label: "Paid",
    color: "bg-emerald-950/85 text-emerald-300 border border-emerald-500/45",
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
  },
  due_soon: {
    label: "Due Soon",
    color: "bg-amber-950/85 text-[#FFE394] border border-[#C5A059]/60",
    icon: <AlertTriangle className="h-3.5 w-3.5 text-[#FAD77B]" />,
  },
  missing: {
    label: "Missing",
    color: "bg-rose-950/85 text-rose-300 border border-rose-500/50",
    icon: <XCircle className="h-3.5 w-3.5 text-rose-400" />,
  },
  duplicate: {
    label: "Duplicate",
    color: "bg-orange-950/85 text-orange-300 border border-orange-500/50",
    icon: <Copy className="h-3.5 w-3.5 text-orange-400" />,
  },
  increased: {
    label: "Increased",
    color: "bg-purple-950/85 text-purple-300 border border-purple-500/50",
    icon: <TrendingUp className="h-3.5 w-3.5 text-purple-400" />,
  },
  upcoming: {
    label: "Upcoming",
    color: "bg-[#0F2952]/90 text-[#93C5FD] border border-[#3B82F6]/50",
    icon: <Info className="h-3.5 w-3.5 text-[#60A5FA]" />,
  },
  needs_review: {
    label: "Needs Review",
    color: "bg-[#112240] text-[#CBD5E1] border border-[#334E7B]",
    icon: <Eye className="h-3.5 w-3.5 text-[#93C5FD]" />,
  },
  unmatched: {
    label: "Unmatched",
    color: "bg-[#0A1830] text-[#94A3B8] border border-[#233B63]",
    icon: <Eye className="h-3.5 w-3.5 text-[#64748B]" />,
  },
  matched: {
    label: "Matched",
    color: "bg-emerald-950/85 text-emerald-300 border border-emerald-500/45",
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
  },
  ignored: {
    label: "Ignored",
    color: "bg-slate-900/80 text-slate-400 border border-slate-700",
    icon: <Info className="h-3.5 w-3.5 text-slate-500" />,
  },
};

const priorityColor: Record<BillPriority, string> = {
  critical: "border-l-rose-500",
  high: "border-l-amber-400",
  medium: "border-l-[#3B82F6]",
  low: "border-l-slate-500",
};

const priorityBadge: Record<BillPriority, string> = {
  critical: "bg-rose-950/80 text-rose-300 border border-rose-500/45",
  high: "bg-amber-950/80 text-amber-300 border border-amber-500/45",
  medium: "bg-[#0F2952] text-[#93C5FD] border border-[#3B82F6]/45",
  low: "bg-[#09162B] text-[#94A3B8] border border-[#233B63]",
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || statusConfig.unmatched;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-sm",
        cfg.color
      )}
    >
      {cfg.icon}
      <span>{cfg.label}</span>
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
    onSuccess: () => {
      utils.billGuardian.listBills.invalidate();
      utils.billGuardian.getDashboard.invalidate();
      toast.success("Bill added to Bill Guardian");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });
  const updateBill = trpc.billGuardian.updateBill.useMutation({
    onSuccess: () => {
      utils.billGuardian.listBills.invalidate();
      utils.billGuardian.getDashboard.invalidate();
      toast.success("Bill updated");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    const aliases = form.aliases
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
    const { paymentLink, paymentLinkNote, ...formRest } = form;
    const payload = {
      ...formRest,
      dueDay: parseInt(formRest.dueDay) || 1,
      vendorAliases: aliases,
      paymentLink: paymentLink || undefined,
      paymentLinkNote: paymentLinkNote || undefined,
    };
    if (editBill) updateBill.mutate({ id: editBill.id, ...payload });
    else createBill.mutate(payload);
  };

  const categories = [
    "General",
    "Software & SaaS",
    "Utilities",
    "Insurance",
    "Rent & Facilities",
    "Payroll",
    "Marketing",
    "Banking & Fees",
    "Professional Services",
    "Equipment",
  ];

  const inputCls =
    "bg-[#030B18] border-[#213F6E] text-[#FFF4D4] placeholder:text-[#647E9E] focus-visible:ring-[#C5A059]";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-gradient-to-b from-[#0D2344] via-[#07162B] to-[#040C1A] border border-[#C5A059]/55 text-[#FFF4D4] shadow-[0_24px_64px_rgba(0,0,0,0.92)]">
        <DialogHeader>
          <DialogTitle
            className="text-xl font-bold text-[#FFF4D4] flex items-center gap-2"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            <ShieldCheck className="h-5 w-5 text-[#FAD77B]" />
            {editBill ? "Edit Recurring Bill" : "Add Recurring Bill"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[72vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs font-semibold text-[#C6B697]">Vendor Name *</Label>
              <VoiceInput
                className={inputCls}
                placeholder="e.g. Google Workspace"
                value={form.vendorName}
                onChange={(e) => setForm((f) => ({ ...f, vendorName: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#C6B697]">Expected Amount ($) *</Label>
              <VoiceInput
                className={inputCls}
                placeholder="0.00"
                type="number"
                step="0.01"
                value={form.expectedAmount}
                onChange={(e) => setForm((f) => ({ ...f, expectedAmount: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#C6B697]">Due Day of Month *</Label>
              <VoiceInput
                className={inputCls}
                placeholder="1-31"
                type="number"
                min={1}
                max={31}
                value={form.dueDay}
                onChange={(e) => setForm((f) => ({ ...f, dueDay: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#C6B697]">Frequency</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm((f) => ({ ...f, frequency: v as BillFrequency }))}>
                <SelectTrigger className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#07162B] border-[#24477A] text-[#FFF4D4]">
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#C6B697]">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#07162B] border-[#24477A] text-[#FFF4D4]">
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#C6B697]">Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v as BillPriority }))}>
                <SelectTrigger className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#07162B] border-[#24477A] text-[#FFF4D4]">
                  <SelectItem value="critical">🔴 Critical</SelectItem>
                  <SelectItem value="high">🟠 High</SelectItem>
                  <SelectItem value="medium">🔵 Medium</SelectItem>
                  <SelectItem value="low">⚪ Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 pt-5">
              <Switch checked={form.autopay} onCheckedChange={(v) => setForm((f) => ({ ...f, autopay: v }))} />
              <Label className="text-xs font-semibold text-[#FFF4D4]">Autopay enabled</Label>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-[#C6B697]">Known Vendor Aliases (comma-separated)</Label>
            <VoiceInput
              className={inputCls}
              placeholder="GOOGLE *WORKSPACE, Google LLC"
              value={form.aliases}
              onChange={(e) => setForm((f) => ({ ...f, aliases: e.target.value }))}
            />
            <p className="text-[11px] text-[#8DA4C4] mt-1">
              Helps AI match bank transaction descriptions to this recurring bill.
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-[#C6B697]">Notes</Label>
            <VoiceTextarea
              className={inputCls}
              placeholder="Any notes about this bill..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="border-t border-[#1E3A63] pt-3 space-y-3">
            <p className="text-[11px] font-mono font-bold text-[#FAD77B] uppercase tracking-wider">
              Payment Method & Portal Info
            </p>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#C6B697]">Payment Link / Portal URL</Label>
              <VoiceInput
                className={inputCls}
                placeholder="https://pay.vendor.com/login"
                value={form.paymentLink}
                onChange={(e) => setForm((f) => ({ ...f, paymentLink: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#C6B697]">Payment Instructions</Label>
              <VoiceTextarea
                className={inputCls}
                placeholder="e.g. Log in with billing@waypointadvocates.com, card ending in 4421..."
                value={form.paymentLinkNote}
                onChange={(e) => setForm((f) => ({ ...f, paymentLinkNote: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="border-t border-[#1E3A63] pt-3">
          <button type="button" onClick={onClose} className={BRUSHED_BLUE_BUTTON}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!form.vendorName || !form.expectedAmount}
            className={CAST_BRASS_BUTTON}
          >
            {editBill ? "Save Changes" : "Add Bill"}
          </button>
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
        transactions.push({
          description: parts[0],
          amount: parts[1],
          transactionDate: parts[2],
          category: parts[3] || undefined,
        });
      }
    }
    if (transactions.length === 0) {
      toast.error("No valid CSV rows found");
      return;
    }
    importTx.mutate({ transactions });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-gradient-to-b from-[#0D2344] via-[#07162B] to-[#040C1A] border border-[#C5A059]/55 text-[#FFF4D4] shadow-[0_24px_64px_rgba(0,0,0,0.92)]">
        <DialogHeader>
          <DialogTitle
            className="text-xl font-bold text-[#FFF4D4] flex items-center gap-2"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            <FileSpreadsheet className="h-5 w-5 text-[#78A9FF]" />
            Import Bank Transactions (CSV)
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className={cn(RECESSED_WELL, "p-3.5 text-xs text-[#B9CDE3] space-y-1.5")}>
            <p className="font-semibold text-[#FFE394]">CSV Format (one transaction per line):</p>
            <code className="block text-[11px] text-[#93C5FD] font-mono bg-[#06152D] px-2.5 py-1.5 rounded border border-[#1E3B68]">
              Description, Amount, Date (YYYY-MM-DD), Category (optional)
            </code>
            <p className="text-[11px] text-[#8DA4C4] pt-1">
              Example:
              <br />
              <code className="text-[#CBD5E1]">GOOGLE *WORKSPACE, 14.99, 2026-05-01, Software</code>
              <br />
              <code className="text-[#CBD5E1]">AMAZON WEB SERVICES, 47.23, 2026-05-03</code>
            </p>
          </div>
          <VoiceTextarea
            placeholder={"GOOGLE *WORKSPACE, 14.99, 2026-05-01\nAMAZON WEB SERVICES, 47.23, 2026-05-03"}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={9}
            className="font-mono text-xs bg-[#030B18] border-[#213F6E] text-[#FFF4D4] placeholder:text-[#526B8A]"
          />
        </div>
        <DialogFooter className="border-t border-[#1E3A63] pt-3">
          <button type="button" onClick={onClose} className={BRUSHED_BLUE_BUTTON}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!raw.trim() || importTx.isPending}
            className={CAST_BRASS_BUTTON}
          >
            <Upload className="h-4 w-4" />
            {importTx.isPending ? "Importing..." : "Import Transactions"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────
function DashboardTab({
  onAddBill,
  onOpenImport,
}: {
  onAddBill: () => void;
  onOpenImport: () => void;
}) {
  const { data, isLoading } = trpc.billGuardian.getDashboard.useQuery();
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const runMatching = trpc.billGuardian.runMatching.useMutation({
    onSuccess: (r) => {
      utils.billGuardian.getDashboard.invalidate();
      utils.billGuardian.listTransactions.invalidate();
      toast.success(`AI Matching complete — ${r.matched} bills matched out of ${r.total} transactions`);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatus = trpc.billGuardian.updateBill.useMutation({
    onSuccess: (_, vars) => {
      utils.billGuardian.listBills.invalidate();
      utils.billGuardian.getDashboard.invalidate();
      const labels: Record<string, string> = {
        paid: "Marked as Paid ✓",
        autopay_on: "Set to Autopay On",
        disputed: "Marked as Disputed",
        skipped: "Marked as Skipped",
        unpaid: "Reset to Unpaid",
      };
      toast.success(labels[vars.paymentStatus || "unpaid"] || "Status updated");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className={cn(BRUSHED_BLUE_PANEL, "p-12 text-center text-[#93C5FD]")}>
        Loading Bill Guardian telemetry...
      </div>
    );
  }
  if (!data) return null;

  const { summary, bills } = data;
  const alertBills = bills.filter(
    (b) =>
      b.status === "missing" ||
      b.status === "due_soon" ||
      b.status === "duplicate" ||
      b.status === "increased"
  );

  const totalExpectedMonthly = bills.reduce(
    (acc, item) => acc + (Number(item.bill.expectedAmount) || 0),
    0
  );

  const summaryCards = [
    {
      key: "paid",
      label: "Paid",
      value: summary.paid,
      accentBar: "#10B981",
      valueColor: "text-emerald-300",
      borderClass: "border-emerald-500/35 hover:border-emerald-400/70",
      iconBg: "bg-emerald-950/80 border-emerald-500/40 text-emerald-400",
      icon: <CheckCircle2 className="h-4.5 w-4.5" />,
    },
    {
      key: "due_soon",
      label: "Due Soon",
      value: summary.dueSoon,
      accentBar: "#F59E0B",
      valueColor: "text-[#FFE394]",
      borderClass: "border-[#C5A059]/45 hover:border-[#FFE394]/80",
      iconBg: "bg-amber-950/80 border-[#C5A059]/50 text-[#FAD77B]",
      icon: <AlertTriangle className="h-4.5 w-4.5" />,
    },
    {
      key: "missing",
      label: "Missing",
      value: summary.missing,
      accentBar: "#F43F5E",
      valueColor: "text-rose-300",
      borderClass: "border-rose-500/40 hover:border-rose-400/80",
      iconBg: "bg-rose-950/80 border-rose-500/45 text-rose-400",
      icon: <XCircle className="h-4.5 w-4.5" />,
    },
    {
      key: "duplicate",
      label: "Duplicate",
      value: summary.duplicate,
      accentBar: "#FB923C",
      valueColor: "text-orange-300",
      borderClass: "border-orange-500/35 hover:border-orange-400/75",
      iconBg: "bg-orange-950/80 border-orange-500/40 text-orange-400",
      icon: <Copy className="h-4.5 w-4.5" />,
    },
    {
      key: "increased",
      label: "Increased",
      value: summary.increased,
      accentBar: "#A855F7",
      valueColor: "text-purple-300",
      borderClass: "border-purple-500/35 hover:border-purple-400/75",
      iconBg: "bg-purple-950/80 border-purple-500/40 text-purple-400",
      icon: <TrendingUp className="h-4.5 w-4.5" />,
    },
    {
      key: "needs_review",
      label: "Needs Review",
      value: summary.needsReview,
      accentBar: "#60A5FA",
      valueColor: "text-[#93C5FD]",
      borderClass: "border-[#3B6CB7]/50 hover:border-[#78A9FF]",
      iconBg: "bg-[#0E274B] border-[#3B6CB7]/60 text-[#78A9FF]",
      icon: <Eye className="h-4.5 w-4.5" />,
    },
  ];

  const filteredBills = bills.filter(({ bill, status }) => {
    if (statusFilter !== "all" && status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const vendorMatch = (bill.vendorName || "").toLowerCase().includes(q);
      const catMatch = (bill.category || "").toLowerCase().includes(q);
      return vendorMatch || catMatch;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Action Required Alert Plaque */}
      {alertBills.length > 0 && (
        <div className="relative rounded-2xl bg-gradient-to-r from-[#2D0F1E]/95 via-[#1B1026]/95 to-[#0D1E3A]/95 border border-rose-500/50 p-4 shadow-[0_10px_28px_rgba(0,0,0,0.8)] overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-rose-500 via-[#FFE394] to-rose-500" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-950/90 border border-rose-500/50 flex items-center justify-center text-rose-300 shrink-0 shadow-md">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p
                    className="font-bold text-base text-[#FFF4D4]"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    Audit Attention Required
                  </p>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-400/40">
                    {alertBills.length} Flagged
                  </span>
                </div>
                <p className="text-xs text-[#D8C7A5] mt-0.5">
                  {alertBills.length} recurring bill{alertBills.length > 1 ? "s" : ""} require verification:{" "}
                  <span className="text-white font-semibold">
                    {alertBills.map((b) => b.bill.vendorName).join(", ")}
                  </span>
                </p>
              </div>
            </div>
            {statusFilter !== "all" && (
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={BRUSHED_BLUE_BUTTON}
              >
                Show All Bills
              </button>
            )}
          </div>
        </div>
      )}

      {/* 6-Column Brushed Blue Metal Telemetry Strip (Clickable Filters) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {summaryCards.map((card) => {
          const isSelected = statusFilter === card.key;
          return (
            <button
              key={card.label}
              type="button"
              onClick={() => setStatusFilter((prev) => (prev === card.key ? "all" : card.key))}
              className={cn(
                "relative rounded-xl p-4 text-left transition-all cursor-pointer overflow-hidden bg-gradient-to-b from-[#0F2952]/95 via-[#091A36]/95 to-[#051024]/95 border shadow-[0_8px_22px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.12)]",
                card.borderClass,
                isSelected && "ring-2 ring-[#FFE394] scale-[1.02]"
              )}
            >
              <div
                className="absolute top-0 left-0 right-0 h-[3px]"
                style={{ backgroundColor: card.accentBar }}
              />
              <div className="flex items-center justify-between mb-2.5">
                <div
                  className={cn(
                    "w-9 h-9 rounded-lg border flex items-center justify-center shadow-inner",
                    card.iconBg
                  )}
                >
                  {card.icon}
                </div>
                <span
                  className={cn("text-2xl sm:text-3xl font-bold", card.valueColor)}
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {card.value}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#C6B697] uppercase tracking-wider">
                  {card.label}
                </p>
                {isSelected && (
                  <span className="text-[9px] font-mono uppercase text-[#FFE394]">Active</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Brushed Blue Metal AI Reconciliation Command Bar */}
      <div className={cn(BRUSHED_BLUE_PANEL, "p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4")}>
        <BrassRivet className="absolute top-2.5 left-2.5" />
        <BrassRivet className="absolute top-2.5 right-2.5" />
        <BrassRivet className="absolute bottom-2.5 left-2.5" />
        <BrassRivet className="absolute bottom-2.5 right-2.5" />

        <div className="flex flex-wrap items-center gap-4 pl-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#040D1E] border border-[#2C528C] flex items-center justify-center text-[#78A9FF]">
              <DollarSign className="h-4.5 w-4.5 text-[#FAD77B]" />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-[#8DA4C4]">
                Monthly Tracked Commitment
              </p>
              <p
                className="text-lg font-bold text-[#FFF4D4]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                ${totalExpectedMonthly.toFixed(2)}
                <span className="text-xs font-sans font-normal text-[#93C5FD] ml-1.5">
                  across {summary.totalBills} recurring bills
                </span>
              </p>
            </div>
          </div>

          <div className="h-8 w-[1px] bg-[#1E3B68] hidden sm:block" />

          <div className="text-xs text-[#B9CDE3] space-x-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#040D1E] border border-[#1E3A63]">
              <FileSpreadsheet className="h-3.5 w-3.5 text-[#78A9FF]" />
              <strong>{summary.totalTransactions}</strong> bank transactions
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#040D1E] border border-[#1E3A63]">
              <Eye className="h-3.5 w-3.5 text-[#FAD77B]" />
              <strong>{summary.unmatched}</strong> unmatched
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pr-2">
          {/* Search Input */}
          <div className="relative min-w-[210px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-[#78A9FF] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter vendor or category..."
              className="w-full h-10 pl-8 pr-3 rounded-xl bg-[#030B18] border border-[#24477A] text-xs text-[#FFF4D4] placeholder:text-[#647E9E] focus:outline-none focus:border-[#C5A059]"
            />
          </div>

          <button
            type="button"
            onClick={() => runMatching.mutate()}
            disabled={runMatching.isPending || summary.totalBills === 0 || summary.totalTransactions === 0}
            className={CAST_BRASS_BUTTON}
          >
            <Zap className="h-4 w-4 fill-[#07162B]" />
            <span>{runMatching.isPending ? "Running AI Match..." : "Run AI Matching"}</span>
          </button>
        </div>
      </div>

      {/* Bill Status List */}
      {bills.length === 0 ? (
        <div className={cn(BRUSHED_BRASS_PANEL, "p-12 text-center overflow-hidden")}>
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FFE394] to-transparent" />
          <BrassRivet className="absolute top-3 left-3" />
          <BrassRivet className="absolute top-3 right-3" />
          <BrassRivet className="absolute bottom-3 left-3" />
          <BrassRivet className="absolute bottom-3 right-3" />

          <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-[#173A6E] to-[#081833] border border-[#C5A059]/60 flex items-center justify-center mx-auto mb-4 shadow-[0_8px_24px_rgba(0,0,0,0.8)]">
            <ShieldCheck className="h-8 w-8 text-[#FFE394]" />
          </div>
          <h3
            className="text-xl font-bold text-[#FFF4D4]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            No Recurring Bills Tracked Yet
          </h3>
          <p className="text-[#B9CDE3] text-sm mt-1.5 mb-6 max-w-md mx-auto">
            Add your practice&apos;s recurring software, utilities, insurance, and vendor commitments to audit monthly bank activity and catch fee increases automatically.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={onAddBill} className={CAST_BRASS_BUTTON}>
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Add First Recurring Bill</span>
            </button>
            <button type="button" onClick={onOpenImport} className={BRUSHED_BLUE_BUTTON}>
              <Upload className="h-4 w-4 text-[#78A9FF]" />
              <span>Import Bank CSV</span>
            </button>
          </div>
        </div>
      ) : (
        <div className={cn(BRUSHED_BLUE_PANEL, "p-5 space-y-3")}>
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#1E3B68]">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#FAD77B]" />
              <h3
                className="text-base font-bold text-[#FFF4D4] tracking-wide"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Bill Status This Month
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#040D1E] border border-[#24477A] text-[#93C5FD]">
                {filteredBills.length} of {bills.length} shown
              </span>
            </div>
            {statusFilter !== "all" && (
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className="text-xs text-[#FAD77B] hover:underline cursor-pointer"
              >
                Clear status filter ({statusFilter.replace("_", " ")})
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {filteredBills.map(({ bill, status }) => (
              <div
                key={bill.id}
                className={cn(
                  "flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-gradient-to-r from-[#06142B]/95 via-[#091D3C]/95 to-[#06142B]/95 border border-[#213F6E] hover:border-[#C5A059]/60 px-4 py-3.5 border-l-4 shadow-[0_4px_14px_rgba(0,0,0,0.65)] transition-all",
                  priorityColor[bill.priority as BillPriority]
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm sm:text-base text-[#FFF4D4] truncate">
                      {bill.vendorName}
                    </span>
                    {bill.autopay && (
                      <span className="text-[11px] font-semibold bg-[#102C57] text-[#93C5FD] border border-[#3B82F6]/50 px-2 py-0.5 rounded-full">
                        Autopay
                      </span>
                    )}
                    <span
                      className={cn(
                        "text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize",
                        priorityBadge[bill.priority as BillPriority]
                      )}
                    >
                      {bill.priority}
                    </span>
                  </div>
                  <p className="text-xs text-[#93B4DB] mt-1 flex items-center gap-2 flex-wrap">
                    <span>{bill.category}</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 text-[#D8C7A5]">
                      <Calendar className="h-3 w-3 text-[#FAD77B]" />
                      Due day {bill.dueDay}
                    </span>
                    <span>•</span>
                    <span className="capitalize">{bill.frequency}</span>
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <PaymentStatusPill
                    billId={bill.id}
                    currentStatus={(bill.paymentStatus as PaymentStatus) || "unpaid"}
                    onUpdate={(id, nextSt) => updateStatus.mutate({ id, paymentStatus: nextSt })}
                  />
                  {bill.paymentLink && (
                    <button
                      type="button"
                      onClick={() => window.open(bill.paymentLink!, "_blank")}
                      title="Open vendor payment portal"
                      className="h-8 w-8 rounded-lg bg-[#040D1E] border border-[#264778] hover:border-[#FAD77B] text-[#93C5FD] hover:text-[#FFE394] flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <div className="text-right min-w-[96px]">
                    <p
                      className="text-lg font-bold text-[#FFE394]"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      ${Number(bill.expectedAmount).toFixed(2)}
                    </p>
                    <StatusBadge status={status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
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
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const deleteBill = trpc.billGuardian.deleteBill.useMutation({
    onSuccess: () => {
      utils.billGuardian.listBills.invalidate();
      utils.billGuardian.getDashboard.invalidate();
      toast.success("Bill removed");
    },
  });
  const updateStatus = trpc.billGuardian.updateBill.useMutation({
    onSuccess: (_, vars) => {
      utils.billGuardian.listBills.invalidate();
      utils.billGuardian.getDashboard.invalidate();
      const labels: Record<string, string> = {
        paid: "Marked as Paid ✓",
        autopay_on: "Set to Autopay On",
        disputed: "Marked as Disputed",
        skipped: "Marked as Skipped",
        unpaid: "Reset to Unpaid",
      };
      toast.success(labels[vars.paymentStatus || "unpaid"] || "Status updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    (bills || []).forEach((b) => {
      if (b.category) set.add(b.category);
    });
    return Array.from(set);
  }, [bills]);

  const filteredBills = useMemo(() => {
    return (bills || []).filter((b) => {
      if (categoryFilter !== "all" && b.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (b.vendorName || "").toLowerCase().includes(q) ||
          (b.category || "").toLowerCase().includes(q) ||
          (b.notes || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [bills, categoryFilter, searchQuery]);

  if (isLoading) {
    return (
      <div className={cn(BRUSHED_BLUE_PANEL, "p-12 text-center text-[#93C5FD]")}>
        Loading recurring bills...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Filter & Action Bar */}
      <div className={cn(BRUSHED_BLUE_PANEL, "p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3")}>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-[#78A9FF] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recurring bills..."
              className="w-full h-9 pl-8 pr-3 rounded-xl bg-[#030B18] border border-[#24477A] text-xs text-[#FFF4D4] placeholder:text-[#647E9E] focus:outline-none focus:border-[#C5A059]"
            />
          </div>
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setCategoryFilter("all")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer",
                  categoryFilter === "all"
                    ? "bg-[#173A6E] text-white border-[#78A9FF]"
                    : "bg-[#040D1E] text-[#93B4DB] border-[#1E3B68] hover:text-white"
                )}
              >
                All ({bills?.length || 0})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer",
                    categoryFilter === cat
                      ? "bg-[#173A6E] text-white border-[#78A9FF]"
                      : "bg-[#040D1E] text-[#93B4DB] border-[#1E3B68] hover:text-white"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        <button type="button" onClick={onAdd} className={CAST_BRASS_BUTTON}>
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Add Bill</span>
        </button>
      </div>

      {!filteredBills.length ? (
        <div className={cn(BRUSHED_BRASS_PANEL, "p-12 text-center")}>
          <div className="w-14 h-14 rounded-2xl bg-[#0B2040] border border-[#C5A059]/50 flex items-center justify-center mx-auto mb-3 text-[#FFE394]">
            <CreditCard className="h-7 w-7" />
          </div>
          <p
            className="text-lg font-bold text-[#FFF4D4]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            No Recurring Bills Found
          </p>
          <p className="text-xs text-[#B9CDE3] mt-1 mb-4">
            Add your recurring business expenses to monitor payment completion and fee changes.
          </p>
          <button type="button" onClick={onAdd} className={CAST_BRASS_BUTTON}>
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Add Recurring Bill</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredBills.map((bill) => (
            <div
              key={bill.id}
              className={cn(
                "flex flex-col sm:flex-row sm:items-start justify-between gap-4 rounded-xl bg-gradient-to-r from-[#081A35]/95 via-[#0B2144]/95 to-[#081A35]/95 border border-[#24477A] hover:border-[#C5A059]/65 px-4 py-3.5 border-l-4 shadow-[0_6px_18px_rgba(0,0,0,0.75)] transition-all",
                priorityColor[bill.priority as BillPriority]
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-base text-[#FFF4D4]">{bill.vendorName}</span>
                  {bill.autopay && (
                    <span className="text-[11px] font-semibold bg-[#102C57] text-[#93C5FD] border border-[#3B82F6]/50 px-2 py-0.5 rounded-full">
                      Autopay
                    </span>
                  )}
                  <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded-md bg-[#040D1E] border border-[#24477A] text-[#B9CDE3]">
                    {bill.frequency}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize",
                      priorityBadge[bill.priority as BillPriority]
                    )}
                  >
                    {bill.priority}
                  </span>
                </div>
                <p className="text-xs text-[#93B4DB] mt-1">
                  {bill.category} · Due day <strong className="text-[#FFE394]">{bill.dueDay}</strong> of each month
                </p>
                {bill.notes && (
                  <p className="text-xs text-[#D8C7A5] mt-1 italic">{bill.notes}</p>
                )}
                {bill.vendorAliases && (
                  <p className="text-[11px] text-[#78A9FF] mt-1 font-mono">
                    Aliases: {JSON.parse(bill.vendorAliases).join(", ")}
                  </p>
                )}
              </div>

              <div className="text-right shrink-0 flex flex-col sm:items-end gap-2">
                <span
                  className="text-xl font-bold text-[#FFE394]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  ${Number(bill.expectedAmount).toFixed(2)}
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <PaymentStatusPill
                    billId={bill.id}
                    currentStatus={(bill.paymentStatus as PaymentStatus) || "unpaid"}
                    onUpdate={(id, status) => updateStatus.mutate({ id, paymentStatus: status })}
                  />
                  {bill.paymentLink && (
                    <button
                      type="button"
                      className="h-8 w-8 rounded-lg bg-[#040D1E] border border-[#24477A] hover:border-[#FAD77B] text-[#93C5FD] hover:text-[#FFE394] flex items-center justify-center transition-colors cursor-pointer"
                      title="Open payment portal"
                      onClick={() => window.open(bill.paymentLink!, "_blank")}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    className="h-8 w-8 rounded-lg bg-[#040D1E] border border-[#24477A] hover:border-[#78A9FF] text-[#B9CDE3] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    title="Edit bill"
                    onClick={() => setEditBill(bill)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-lg bg-[#040D1E] border border-rose-500/35 hover:bg-rose-950/80 hover:border-rose-400 text-rose-400 hover:text-rose-200 flex items-center justify-center transition-colors cursor-pointer"
                    title="Delete bill"
                    onClick={() => deleteBill.mutate({ id: bill.id })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {bill.paymentLinkNote && (
                  <p className="text-[11px] text-[#93B4DB] max-w-[240px] sm:text-right line-clamp-2">
                    {bill.paymentLinkNote}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editBill && (
        <AddBillDialog open={!!editBill} onClose={() => setEditBill(null)} editBill={editBill} />
      )}
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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const deleteTx = trpc.billGuardian.deleteTransaction.useMutation({
    onSuccess: () => {
      utils.billGuardian.listTransactions.invalidate();
      utils.billGuardian.getDashboard.invalidate();
      toast.success("Transaction removed");
    },
  });
  const overrideMatch = trpc.billGuardian.overrideMatch.useMutation({
    onSuccess: () => {
      utils.billGuardian.listTransactions.invalidate();
      utils.billGuardian.getDashboard.invalidate();
      toast.success("Match overridden");
      setOverrideId(null);
    },
  });

  const filteredTx = useMemo(() => {
    return (transactions || []).filter((tx) => {
      if (statusFilter !== "all" && tx.matchStatus !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (tx.description || "").toLowerCase().includes(q) ||
          (tx.matchNotes || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transactions, statusFilter, searchQuery]);

  if (isLoading) {
    return (
      <div className={cn(BRUSHED_BLUE_PANEL, "p-12 text-center text-[#93C5FD]")}>
        Loading bank transactions...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter & Import Bar */}
      <div className={cn(BRUSHED_BLUE_PANEL, "p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3")}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[210px]">
            <Search className="w-3.5 h-3.5 text-[#78A9FF] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bank transactions..."
              className="w-full h-9 pl-8 pr-3 rounded-xl bg-[#030B18] border border-[#24477A] text-xs text-[#FFF4D4] placeholder:text-[#647E9E] focus:outline-none focus:border-[#C5A059]"
            />
          </div>
          {(["all", "matched", "unmatched", "duplicate", "increased", "needs_review"] as const).map(
            (st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold capitalize border transition-colors cursor-pointer",
                  statusFilter === st
                    ? "bg-[#173A6E] text-white border-[#78A9FF]"
                    : "bg-[#040D1E] text-[#93B4DB] border-[#1E3B68] hover:text-white"
                )}
              >
                {st.replace("_", " ")}
              </button>
            )
          )}
        </div>

        <button type="button" onClick={onImport} className={CAST_BRASS_BUTTON}>
          <Upload className="h-4 w-4" />
          <span>Import Transactions</span>
        </button>
      </div>

      {!filteredTx.length ? (
        <div className={cn(BRUSHED_BRASS_PANEL, "p-12 text-center")}>
          <div className="w-14 h-14 rounded-2xl bg-[#0B2040] border border-[#C5A059]/50 flex items-center justify-center mx-auto mb-3 text-[#78A9FF]">
            <Building2 className="h-7 w-7" />
          </div>
          <p
            className="text-lg font-bold text-[#FFF4D4]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            No Transactions Found
          </p>
          <p className="text-xs text-[#B9CDE3] mt-1 mb-5">
            Import your bank or card statement CSV rows to reconcile against recurring bills.
          </p>
          <button type="button" onClick={onImport} className={CAST_BRASS_BUTTON}>
            <Upload className="h-4 w-4" />
            <span>Import CSV</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTx.map((tx) => (
            <div
              key={tx.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-[#081A35]/95 via-[#0B2144]/95 to-[#081A35]/95 border border-[#24477A] hover:border-[#78A9FF]/70 px-4 py-3.5 shadow-[0_4px_14px_rgba(0,0,0,0.65)] transition-all"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-[#FFF4D4] truncate">
                    {tx.description}
                  </span>
                  <StatusBadge status={tx.matchStatus} />
                  {tx.isManuallyVerified && (
                    <span className="text-[11px] font-semibold bg-emerald-950/90 text-emerald-300 border border-emerald-500/45 px-2 py-0.5 rounded-full">
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#93B4DB] mt-1">
                  {new Date(tx.transactionDate).toLocaleDateString()} ·{" "}
                  <strong className="text-[#FFE394]">${Number(tx.amount).toFixed(2)}</strong>
                  {tx.matchConfidence > 0 && (
                    <span className="ml-2 px-1.5 py-0.2 rounded bg-[#040D1E] border border-[#1E3B68] text-[10px] font-mono text-[#78A9FF]">
                      {tx.matchConfidence}% AI match
                    </span>
                  )}
                </p>
                {tx.matchNotes && (
                  <p className="text-xs text-[#D8C7A5] mt-1 italic">{tx.matchNotes}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  className={cn(BRUSHED_BLUE_BUTTON, "h-8 px-3 text-xs")}
                  onClick={() => {
                    setOverrideId(tx.id);
                    setOverrideStatus(tx.matchStatus as MatchStatus);
                    setOverrideBillId(tx.matchedBillId?.toString() || "");
                    setOverrideNotes(tx.matchNotes || "");
                  }}
                >
                  Override
                </button>
                <button
                  type="button"
                  className="h-8 w-8 rounded-lg bg-[#040D1E] border border-rose-500/35 hover:bg-rose-950/80 hover:border-rose-400 text-rose-400 hover:text-rose-200 flex items-center justify-center transition-colors cursor-pointer"
                  onClick={() => deleteTx.mutate({ id: tx.id })}
                  title="Remove transaction"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Override Dialog */}
      <Dialog open={overrideId !== null} onOpenChange={() => setOverrideId(null)}>
        <DialogContent className="max-w-sm bg-gradient-to-b from-[#0D2344] via-[#07162B] to-[#040C1A] border border-[#C5A059]/55 text-[#FFF4D4] shadow-[0_24px_64px_rgba(0,0,0,0.92)]">
          <DialogHeader>
            <DialogTitle
              className="text-lg font-bold text-[#FFF4D4]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Override Transaction Match
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#C6B697]">Match Status</Label>
              <Select value={overrideStatus} onValueChange={(v) => setOverrideStatus(v as MatchStatus)}>
                <SelectTrigger className="bg-[#030B18] border-[#213F6E] text-[#FFF4D4]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#07162B] border-[#24477A] text-[#FFF4D4]">
                  <SelectItem value="matched">✅ Matched</SelectItem>
                  <SelectItem value="duplicate">🔁 Duplicate</SelectItem>
                  <SelectItem value="increased">💸 Increased</SelectItem>
                  <SelectItem value="needs_review">🧾 Needs Review</SelectItem>
                  <SelectItem value="ignored">Ignored</SelectItem>
                  <SelectItem value="unmatched">Unmatched</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#C6B697]">Link to Recurring Bill (optional)</Label>
              <Select value={overrideBillId} onValueChange={setOverrideBillId}>
                <SelectTrigger className="bg-[#030B18] border-[#213F6E] text-[#FFF4D4]">
                  <SelectValue placeholder="Select bill..." />
                </SelectTrigger>
                <SelectContent className="bg-[#07162B] border-[#24477A] text-[#FFF4D4]">
                  <SelectItem value="none">None</SelectItem>
                  {bills?.map((b) => (
                    <SelectItem key={b.id} value={b.id.toString()}>
                      {b.vendorName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#C6B697]">Audit Notes</Label>
              <VoiceInput
                className="bg-[#030B18] border-[#213F6E] text-[#FFF4D4]"
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
                placeholder="Optional note..."
              />
            </div>
          </div>
          <DialogFooter className="border-t border-[#1E3A63] pt-3">
            <button type="button" onClick={() => setOverrideId(null)} className={BRUSHED_BLUE_BUTTON}>
              Cancel
            </button>
            <button
              type="button"
              className={CAST_BRASS_BUTTON}
              onClick={() =>
                overrideMatch.mutate({
                  transactionId: overrideId!,
                  matchStatus: overrideStatus,
                  billId:
                    overrideBillId && overrideBillId !== "none"
                      ? parseInt(overrideBillId)
                      : undefined,
                  matchNotes: overrideNotes,
                  isManuallyVerified: true,
                })
              }
            >
              Save Override
            </button>
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
    onSuccess: () => {
      utils.billGuardian.listAccounts.invalidate();
      toast.success("Bank account added");
      setShowAdd(false);
      setForm({ bankName: "", accountName: "", accountType: "checking" });
    },
  });
  const deleteAccount = trpc.billGuardian.deleteAccount.useMutation({
    onSuccess: () => {
      utils.billGuardian.listAccounts.invalidate();
      toast.success("Account removed");
    },
  });

  if (isLoading) {
    return (
      <div className={cn(BRUSHED_BLUE_PANEL, "p-12 text-center text-[#93C5FD]")}>
        Loading accounts...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={cn(BRUSHED_BLUE_PANEL, "p-4 flex items-center justify-between")}>
        <div className="flex items-center gap-2.5">
          <Landmark className="h-5 w-5 text-[#FAD77B]" />
          <p className="text-sm font-semibold text-[#FFF4D4]">
            {accounts?.length || 0} Tracked Bank & Card Accounts
          </p>
        </div>
        <button type="button" onClick={() => setShowAdd(true)} className={CAST_BRASS_BUTTON}>
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Add Account</span>
        </button>
      </div>

      <div className={cn(BRUSHED_BRASS_PANEL, "p-4 text-xs text-[#D8C7A5]")}>
        <p className="font-bold text-[#FFE394] mb-1 flex items-center gap-1.5">
          <Info className="h-4 w-4 text-[#FAD77B]" />
          Manual CSV Statement Import Mode
        </p>
        <p className="leading-relaxed">
          Bill Guardian currently uses deterministic & AI-assisted CSV statement import. Register your operating bank accounts and corporate cards below for organization, then import monthly CSV statements from the <strong>Transactions</strong> tab.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {accounts?.map((acc) => (
          <div
            key={acc.id}
            className="flex items-center gap-3.5 rounded-xl bg-gradient-to-r from-[#081A35]/95 via-[#0C244A]/95 to-[#081A35]/95 border border-[#24477A] hover:border-[#C5A059]/60 px-4 py-3.5 shadow-[0_6px_18px_rgba(0,0,0,0.7)]"
          >
            <div className="w-10 h-10 rounded-xl bg-[#040D1E] border border-[#2C528C] flex items-center justify-center text-[#FAD77B] shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-[#FFF4D4] truncate">{acc.bankName}</p>
              <p className="text-xs text-[#93B4DB] capitalize">
                {acc.accountName} · <span className="text-[#FFE394]">{acc.accountType}</span>
              </p>
            </div>
            <button
              type="button"
              className="h-8 w-8 rounded-lg bg-[#040D1E] border border-rose-500/35 hover:bg-rose-950/80 hover:border-rose-400 text-rose-400 hover:text-rose-200 flex items-center justify-center transition-colors cursor-pointer"
              onClick={() => deleteAccount.mutate({ id: acc.id })}
              title="Remove account"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm bg-gradient-to-b from-[#0D2344] via-[#07162B] to-[#040C1A] border border-[#C5A059]/55 text-[#FFF4D4] shadow-[0_24px_64px_rgba(0,0,0,0.92)]">
          <DialogHeader>
            <DialogTitle
              className="text-lg font-bold text-[#FFF4D4]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Add Bank or Card Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#C6B697]">Bank / Institution Name</Label>
              <VoiceInput
                className="bg-[#030B18] border-[#213F6E] text-[#FFF4D4]"
                placeholder="e.g. Found Bank / Chase"
                value={form.bankName}
                onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#C6B697]">Account Name / Label</Label>
              <VoiceInput
                className="bg-[#030B18] border-[#213F6E] text-[#FFF4D4]"
                placeholder="e.g. Operating Checking"
                value={form.accountName}
                onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#C6B697]">Account Type</Label>
              <Select value={form.accountType} onValueChange={(v) => setForm((f) => ({ ...f, accountType: v }))}>
                <SelectTrigger className="bg-[#030B18] border-[#213F6E] text-[#FFF4D4]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#07162B] border-[#24477A] text-[#FFF4D4]">
                  <SelectItem value="checking">Checking</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="credit">Credit Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="border-t border-[#1E3A63] pt-3">
            <button type="button" onClick={() => setShowAdd(false)} className={BRUSHED_BLUE_BUTTON}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => addAccount.mutate(form)}
              disabled={!form.bankName || !form.accountName}
              className={CAST_BRASS_BUTTON}
            >
              Add Account
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Page (PG-022 · Blue Metal Brush Uplift) ─────────────────────────────
export default function BillGuardian() {
  const [showAddBill, setShowAddBill] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "bills" | "transactions" | "accounts">("dashboard");

  const { data: dashData } = trpc.billGuardian.getDashboard.useQuery();
  const { data: accounts } = trpc.billGuardian.listAccounts.useQuery();

  const navTabs: {
    id: "dashboard" | "bills" | "transactions" | "accounts";
    label: string;
    count?: number;
    icon: React.ReactNode;
  }[] = [
    {
      id: "dashboard",
      label: "Audit Dashboard",
      icon: <ShieldCheck className="h-4 w-4" />,
    },
    {
      id: "bills",
      label: "Recurring Bills",
      count: dashData?.summary.totalBills,
      icon: <CreditCard className="h-4 w-4" />,
    },
    {
      id: "transactions",
      label: "Bank Transactions",
      count: dashData?.summary.totalTransactions,
      icon: <FileSpreadsheet className="h-4 w-4" />,
    },
    {
      id: "accounts",
      label: "Bank Accounts",
      count: accounts?.length,
      icon: <Landmark className="h-4 w-4" />,
    },
  ];

  return (
    <ScopedErrorBoundary moduleName="Bill Guardian (PG-022)">
      <div
        className="min-h-screen w-full bg-[#07162B] text-[#FFF4D4] px-4 sm:px-6 lg:px-8 py-6"
        style={BRUSHED_METAL_LINES_STYLE}
      >
        <div className="max-w-[1320px] mx-auto space-y-6">
          {/* ── 1. TOP COMMAND EYEBROW & PAGE ID BADGE ── */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-[#143666] to-[#0A1E3D] border border-[#3B6CB7]/70 text-[11px] font-mono font-bold uppercase tracking-widest text-[#93C5FD] shadow-sm inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#FAD77B]" />
                WAYPOINT EXPENSE SHIELD & AUDIT
              </span>
              <PageIdBadge id="PG-022" name="Bill Guardian" />
            </div>

            <div className="flex items-center gap-2 text-xs text-[#B9CDE3]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34D399]" />
              <span>AI Vendor Alias & Fee Increase Detection Active</span>
            </div>
          </div>

          {/* ── 2. BLUE METAL BRUSH HERO CONSOLE HEADER ── */}
          <div className="relative rounded-2xl p-[1px] bg-gradient-to-b from-[#78A9FF]/60 via-[#C5A059]/45 to-[#1E3B68]/70 shadow-[0_18px_48px_rgba(0,0,0,0.9)]">
            <div
              className="rounded-[15px] bg-gradient-to-b from-[#112C56]/95 via-[#091B38]/95 to-[#051024]/95 p-5 sm:p-6 relative overflow-hidden"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, rgba(255,255,255,0.022) 0px, rgba(255,255,255,0.022) 1px, transparent 1px, transparent 3px)",
              }}
            >
              {/* Top Specular Brushed Blue-Gold Bevel Line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FFE394] to-transparent shadow-[0_0_14px_rgba(255,227,148,0.85)]" />
              <BrassRivet className="absolute top-3 left-3" />
              <BrassRivet className="absolute top-3 right-3" />
              <BrassRivet className="absolute bottom-3 left-3" />
              <BrassRivet className="absolute bottom-3 right-3" />

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10 px-1">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-[#1D4886] via-[#102B54] to-[#07152C] border-2 border-[#C5A059]/75 flex items-center justify-center text-[#FFE394] shadow-[0_6px_20px_rgba(0,0,0,0.85),inset_0_1px_2px_rgba(255,255,255,0.3)] shrink-0">
                    <ShieldCheck className="w-7 h-7 drop-shadow-[0_2px_6px_rgba(255,227,148,0.5)]" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h1
                        className="text-2xl sm:text-3xl font-bold tracking-wide text-[#FFF4D4] drop-shadow-md"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                      >
                        Bill Guardian™
                      </h1>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#102C57] border border-[#60A5FA]/50 text-[#93C5FD] text-[11px] font-semibold">
                        Practice Expense Audit
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[#B9CDE3] max-w-2xl leading-relaxed">
                      Did the important business bills actually get paid? Track recurring vendor commitments, reconcile bank CSV statements, and flag duplicate charges or silent price increases.
                    </p>
                  </div>
                </div>

                {/* Hardware Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowImport(true)}
                    className={BRUSHED_BLUE_BUTTON}
                  >
                    <Upload className="h-4 w-4 text-[#78A9FF]" />
                    <span>Import Transactions</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddBill(true)}
                    className={CAST_BRASS_BUTTON}
                  >
                    <Plus className="h-4 w-4 stroke-[2.5]" />
                    <span>Add Recurring Bill</span>
                  </button>
                </div>
              </div>

              {/* ── 3. HARDWARE SWITCHBOARD TAB SELECTOR ── */}
              <div className="mt-6 pt-4 border-t border-[#1E3B68]/90 flex flex-wrap items-center gap-2">
                {navTabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-all cursor-pointer border select-none",
                        isActive
                          ? "bg-gradient-to-b from-[#1E4B8A] via-[#133363] to-[#0B2042] text-white border-[#78A9FF] shadow-[0_0_18px_rgba(74,144,226,0.4),inset_0_1px_0_rgba(255,255,255,0.28)]"
                          : "bg-[#040D1E]/85 text-[#93B4DB] border-[#1B355E] hover:text-[#FFF4D4] hover:border-[#C5A059]/55 hover:bg-[#0A1D3B]"
                      )}
                    >
                      <span className={isActive ? "text-[#FFE394]" : "text-[#78A9FF]"}>
                        {tab.icon}
                      </span>
                      <span>{tab.label}</span>
                      {typeof tab.count === "number" && (
                        <span
                          className={cn(
                            "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold",
                            isActive
                              ? "bg-[#FFE394] text-[#07162B]"
                              : "bg-[#0B2040] text-[#93C5FD] border border-[#24477A]"
                          )}
                        >
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── 4. ACTIVE TAB WORKSPACE ── */}
          <div>
            {activeTab === "dashboard" && (
              <DashboardTab
                onAddBill={() => setShowAddBill(true)}
                onOpenImport={() => setShowImport(true)}
              />
            )}
            {activeTab === "bills" && <BillsTab onAdd={() => setShowAddBill(true)} />}
            {activeTab === "transactions" && (
              <TransactionsTab onImport={() => setShowImport(true)} />
            )}
            {activeTab === "accounts" && <AccountsTab />}
          </div>
        </div>

        {/* Dialogs */}
        <AddBillDialog open={showAddBill} onClose={() => setShowAddBill(false)} />
        <ImportTransactionsDialog open={showImport} onClose={() => setShowImport(false)} />
      </div>
    </ScopedErrorBoundary>
  );
}

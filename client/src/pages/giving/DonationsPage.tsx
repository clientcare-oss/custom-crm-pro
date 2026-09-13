/**
 * Donations Page — PG-040-DON
 * Complete charitable gift and contribution ledger with designated fund allocations and receipt triggers.
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import PageIdBadge from "@/components/PageIdBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  Search,
  Plus,
  Download,
  Receipt,
  CheckCircle2,
  Clock,
  Filter,
  CreditCard,
  Building2,
  Calendar,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function DonationsPage() {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const [form, setForm] = useState({
    donorName: "",
    donorEmail: "",
    amount: "",
    fundId: "fnd-1",
    paymentMethod: "Stripe",
    notes: "",
  });

  const utils = trpc.useUtils();
  const { data: donations = [], isLoading } = trpc.giving.listDonations.useQuery();
  const { data: funds = [] } = trpc.giving.listFunds.useQuery();

  const createDonationMutation = trpc.giving.createDonation.useMutation({
    onSuccess: () => {
      toast.success("Contribution recorded in charitable ledger");
      utils.giving.listDonations.invalidate();
      utils.giving.getOverviewStats.invalidate();
      setModalOpen(false);
      setForm({
        donorName: "",
        donorEmail: "",
        amount: "",
        fundId: "fnd-1",
        paymentMethod: "Stripe",
        notes: "",
      });
    },
    onError: (err) => toast.error(err.message || "Failed to record donation"),
  });

  const handleRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const cents = Math.round(parseFloat(form.amount) * 100);
    if (isNaN(cents) || cents <= 0) {
      toast.error("Please enter a valid gift amount");
      return;
    }
    createDonationMutation.mutate({
      donorName: form.donorName,
      donorEmail: form.donorEmail || undefined,
      amountCents: cents,
      fundId: form.fundId,
      paymentMethod: form.paymentMethod,
      notes: form.notes || undefined,
    });
  };

  const filtered = donations.filter((d: any) => {
    const q = search.toLowerCase();
    return (
      d.donorName.toLowerCase().includes(q) ||
      (d.donorEmail && d.donorEmail.toLowerCase().includes(q)) ||
      d.receiptNumber.toLowerCase().includes(q) ||
      d.fundName.toLowerCase().includes(q)
    );
  });

  const handleExportCSV = () => {
    const headers = "Receipt #,Donor,Email,Amount,Fund,Payment Method,Date,Status\n";
    const rows = filtered
      .map(
        (d: any) =>
          `"${d.receiptNumber}","${d.donorName}","${d.donorEmail || ""}","${(d.amountCents / 100).toFixed(
            2
          )}","${d.fundName}","${d.paymentMethod}","${new Date(d.donatedAt).toLocaleDateString()}","${d.receiptStatus}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waypoint-donations-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Donations exported as CSV");
  };

  return (
    <div className="min-h-screen bg-[#07162B] text-white p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                  Donations & Contributions
                </h1>
                <PageIdBadge id="PG-040-DON" name="Donations Ledger" />
              </div>
              <p className="text-xs md:text-sm text-white/60">
                Charitable contribution ledger with fund designation, tax receipting, and audit tracking.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button
            type="button"
            variant="outline"
            onClick={handleExportCSV}
            className="border-white/15 text-white/80 hover:bg-white/5 text-xs h-9 px-3 gap-1.5 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>

          <Button
            type="button"
            onClick={() => setModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-400 text-[#07162B] font-bold text-xs h-9 px-4 gap-1.5 shadow-md cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Record Donation</span>
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center justify-between gap-3 bg-[#001A41]/80 border border-white/10 p-3 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by donor, receipt #, or fund..."
            className="pl-9 bg-black/30 border-white/10 text-xs text-white placeholder:text-white/40 h-8 rounded-lg focus-visible:ring-amber-400"
          />
        </div>
        <p className="text-xs text-white/50 hidden sm:block">
          Showing {filtered.length} contribution{filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      {/* Ledger Table */}
      <Card className="bg-[#001A41]/80 border-white/10 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-black/30 text-white/60 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Receipt #</th>
                <th className="py-3.5 px-4">Donor / Contributor</th>
                <th className="py-3.5 px-4">Designated Fund</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4">Method</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-white/50">
                    Loading donation ledger...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-white/50">
                    No donations found
                  </td>
                </tr>
              ) : (
                filtered.map((d: any) => (
                  <tr key={d.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="py-3 px-4 font-mono text-[11px] text-amber-300 font-semibold">
                      {d.receiptNumber}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-white truncate group-hover:text-amber-300 transition-colors">
                        {d.donorName}
                      </p>
                      {d.donorEmail && (
                        <p className="text-[11px] text-white/50 truncate">{d.donorEmail}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-white/80 font-medium">{d.fundName}</span>
                      <p className="text-[10px] text-emerald-400">100% Tax-Deductible</p>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-mono font-bold text-amber-300 text-xs">
                        {formatCurrency(d.amountCents)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white/70">
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="h-3 w-3 text-white/40" />
                        <span>{d.paymentMethod}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-white/70 text-[11px]">
                      {new Date(d.donatedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-medium border ${
                          d.receiptStatus === "Sent"
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                        }`}
                      >
                        {d.receiptStatus}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Record Donation Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md bg-[#07162B] border-amber-500/30 text-white p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-amber-400" />
              Record Charitable Contribution
            </DialogTitle>
            <DialogDescription className="text-xs text-white/60">
              Enter gift details and allocate to designated 501(c)(3) fund
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecord} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-white/80">Donor or Organization Name *</Label>
              <Input
                required
                value={form.donorName}
                onChange={(e) => setForm({ ...form, donorName: e.target.value })}
                placeholder="Peachtree Children's Foundation"
                className="bg-black/30 border-white/15 text-xs text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-white/80">Donor Email (for official tax receipt)</Label>
              <Input
                type="email"
                value={form.donorEmail}
                onChange={(e) => setForm({ ...form, donorEmail: e.target.value })}
                placeholder="grants@peachtreecf.org"
                className="bg-black/30 border-white/15 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-white/80">Amount ($ USD) *</Label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="250.00"
                  className="bg-black/30 border-white/15 text-sm font-mono text-white focus-visible:ring-amber-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-white/80">Payment Method</Label>
                <Select
                  value={form.paymentMethod}
                  onValueChange={(val) => setForm({ ...form, paymentMethod: val })}
                >
                  <SelectTrigger className="bg-black/30 border-white/15 text-xs text-white h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#001A41] border-white/15 text-white text-xs">
                    <SelectItem value="Stripe">Stripe (Card / ACH)</SelectItem>
                    <SelectItem value="Check">Physical Check</SelectItem>
                    <SelectItem value="Bank Wire">Bank Wire / ACH</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-white/80">Designated Fund</Label>
              <Select
                value={form.fundId}
                onValueChange={(val) => setForm({ ...form, fundId: val })}
              >
                <SelectTrigger className="bg-black/30 border-white/15 text-xs text-white h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#001A41] border-white/15 text-white text-xs">
                  {funds.map((f: any) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name} ({f.restrictionType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-white/80">Gift Notes / In Honor of</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional campaign or dedication notes"
                className="bg-black/30 border-white/15 text-xs text-white"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setModalOpen(false)}
                className="text-white/70 hover:text-white text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createDonationMutation.isPending}
                className="bg-amber-500 hover:bg-amber-400 text-[#07162B] font-bold text-xs cursor-pointer"
              >
                {createDonationMutation.isPending ? "Recording..." : "Record Gift"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

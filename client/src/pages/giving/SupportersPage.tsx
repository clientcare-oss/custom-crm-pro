/**
 * Supporters & Donors Page — PG-040-SUP
 * Unifies all individual donors, corporate sponsors, recurring supporters, and family gifters.
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
  Users,
  Search,
  Plus,
  Building2,
  User,
  Mail,
  Phone,
  Calendar,
  Heart,
  DollarSign,
  Filter,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function SupportersPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [donationModalOpen, setDonationModalOpen] = useState(false);
  const [selectedSupporter, setSelectedSupporter] = useState<any>(null);

  const [newSupporter, setNewSupporter] = useState({
    name: "",
    entityType: "individual" as "individual" | "organization",
    supporterType: "One-Time Donor",
    email: "",
    phone: "",
    notes: "",
    initialAmount: "",
  });

  const [quickDonationAmount, setQuickDonationAmount] = useState("");
  const [quickDonationFund, setQuickDonationFund] = useState("fnd-1");

  const utils = trpc.useUtils();
  const { data: supporters = [], isLoading } = trpc.giving.listSupporters.useQuery({
    search,
    type: typeFilter,
  });

  const createSupporterMutation = trpc.giving.createSupporter.useMutation({
    onSuccess: () => {
      toast.success("Supporter added to registry");
      utils.giving.listSupporters.invalidate();
      utils.giving.getOverviewStats.invalidate();
      setAddDialogOpen(false);
      setNewSupporter({
        name: "",
        entityType: "individual",
        supporterType: "One-Time Donor",
        email: "",
        phone: "",
        notes: "",
        initialAmount: "",
      });
    },
    onError: (err) => toast.error(err.message || "Failed to add supporter"),
  });

  const createDonationMutation = trpc.giving.createDonation.useMutation({
    onSuccess: () => {
      toast.success("Donation recorded successfully");
      utils.giving.listDonations.invalidate();
      utils.giving.listSupporters.invalidate();
      utils.giving.getOverviewStats.invalidate();
      setDonationModalOpen(false);
      setQuickDonationAmount("");
    },
    onError: (err) => toast.error(err.message || "Failed to record donation"),
  });

  const handleAddSupporter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupporter.name) {
      toast.error("Please provide a supporter name");
      return;
    }
    const cents = newSupporter.initialAmount ? Math.round(parseFloat(newSupporter.initialAmount) * 100) : undefined;
    createSupporterMutation.mutate({
      name: newSupporter.name,
      entityType: newSupporter.entityType,
      supporterType: newSupporter.supporterType,
      email: newSupporter.email || undefined,
      phone: newSupporter.phone || undefined,
      notes: newSupporter.notes || undefined,
      initialAmount: cents,
    });
  };

  const handleQuickDonation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupporter) return;
    const cents = Math.round(parseFloat(quickDonationAmount) * 100);
    if (isNaN(cents) || cents <= 0) {
      toast.error("Please enter a valid gift amount");
      return;
    }
    createDonationMutation.mutate({
      donorName: selectedSupporter.name,
      donorEmail: selectedSupporter.email || undefined,
      donorPhone: selectedSupporter.phone || undefined,
      amountCents: cents,
      fundId: quickDonationFund,
      paymentMethod: "Stripe",
    });
  };

  return (
    <div className="min-h-screen bg-[#07162B] text-white p-6 md:p-8 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                  Supporters & Donors
                </h1>
                <PageIdBadge id="PG-040-SUP" name="Supporters & Donors" />
              </div>
              <p className="text-xs md:text-sm text-white/60">
                Manage individuals, corporate sponsors, family gifters, and sustaining donors.
              </p>
            </div>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => setAddDialogOpen(true)}
          className="bg-amber-500 hover:bg-amber-400 text-[#07162B] font-bold text-xs h-9 px-4 gap-1.5 shadow-md cursor-pointer self-start md:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Supporter</span>
        </Button>
      </div>

      {/* ── Filters & Search Bar ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#001A41]/80 border border-white/10 p-3 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone..."
            className="pl-9 bg-black/30 border-white/10 text-xs text-white placeholder:text-white/40 h-8 rounded-lg focus-visible:ring-amber-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-3.5 w-3.5 text-white/40 shrink-0" />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-44 bg-black/30 border-white/10 text-xs text-white h-8 rounded-lg focus:ring-amber-400">
              <SelectValue placeholder="Supporter Type" />
            </SelectTrigger>
            <SelectContent className="bg-[#001A41] border-white/15 text-white text-xs">
              <SelectItem value="all">All Supporter Types</SelectItem>
              <SelectItem value="One-Time">One-Time Donors</SelectItem>
              <SelectItem value="Recurring">Recurring Donors</SelectItem>
              <SelectItem value="Individual Sponsor">Individual Sponsors</SelectItem>
              <SelectItem value="Corporate Sponsor">Corporate Sponsors</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Supporters Data Table ── */}
      <Card className="bg-[#001A41]/80 border-white/10 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-black/30 text-white/60 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Supporter / Entity</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4 text-right">Lifetime Giving</th>
                <th className="py-3.5 px-4">Last Gift Date</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-white/50">
                    Loading supporters...
                  </td>
                </tr>
              ) : supporters.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-white/50">
                    No supporters found matching your query
                  </td>
                </tr>
              ) : (
                supporters.map((sup: any) => (
                  <tr key={sup.id} className="hover:bg-white/[0.03] transition-colors group">
                    {/* Supporter Name & Entity Type */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-400/20 flex items-center justify-center text-amber-300 shrink-0">
                          {sup.entityType === "organization" ? (
                            <Building2 className="h-4 w-4" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate group-hover:text-amber-300 transition-colors">
                            {sup.name}
                          </p>
                          <p className="text-[10px] text-white/40 uppercase tracking-wide">
                            {sup.entityType === "organization" ? "Organization / Foundation" : "Individual"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Supporter Type Badge */}
                    <td className="py-3 px-4">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-medium border ${
                          sup.supporterType.includes("Corporate")
                            ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                            : sup.supporterType.includes("Recurring")
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            : "bg-blue-500/15 text-blue-300 border-blue-500/30"
                        }`}
                      >
                        {sup.supporterType}
                      </Badge>
                    </td>

                    {/* Contact Info */}
                    <td className="py-3 px-4 space-y-0.5">
                      {sup.email && (
                        <div className="flex items-center gap-1.5 text-[11px] text-white/70 truncate">
                          <Mail className="h-3 w-3 text-white/40 shrink-0" />
                          <span>{sup.email}</span>
                        </div>
                      )}
                      {sup.phone && (
                        <div className="flex items-center gap-1.5 text-[11px] text-white/50">
                          <Phone className="h-3 w-3 text-white/40 shrink-0" />
                          <span>{sup.phone}</span>
                        </div>
                      )}
                    </td>

                    {/* Lifetime Giving */}
                    <td className="py-3 px-4 text-right">
                      <p className="font-bold text-amber-300 font-mono text-xs">
                        {formatCurrency(sup.lifetimeGivingCents)}
                      </p>
                      <p className="text-[10px] text-white/40">
                        {sup.donationCount} gift{sup.donationCount === 1 ? "" : "s"}
                      </p>
                    </td>

                    {/* Last Gift Date */}
                    <td className="py-3 px-4 text-white/70 text-[11px]">
                      {sup.lastGiftDate ? new Date(sup.lastGiftDate).toLocaleDateString() : "-"}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                        Active
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedSupporter(sup);
                          setDonationModalOpen(true);
                        }}
                        className="border-amber-500/40 text-amber-300 hover:bg-amber-500/15 text-[11px] h-7 px-2.5 gap-1 cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Gift</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Add Supporter Dialog ── */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md bg-[#07162B] border-amber-500/30 text-white p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-400" />
              Add New Supporter
            </DialogTitle>
            <DialogDescription className="text-xs text-white/60">
              Record a new individual donor, corporate partner, or recurring contributor
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSupporter} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-white/80">Full Name or Organization Name *</Label>
              <Input
                required
                value={newSupporter.name}
                onChange={(e) => setNewSupporter({ ...newSupporter, name: e.target.value })}
                placeholder="e.g. Acme Community Foundation or Jane Doe"
                className="bg-black/30 border-white/15 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-white/80">Entity Structure</Label>
                <Select
                  value={newSupporter.entityType}
                  onValueChange={(val: any) => setNewSupporter({ ...newSupporter, entityType: val })}
                >
                  <SelectTrigger className="bg-black/30 border-white/15 text-xs text-white h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#001A41] border-white/15 text-white text-xs">
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="organization">Organization / Sponsor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-white/80">Supporter Role</Label>
                <Select
                  value={newSupporter.supporterType}
                  onValueChange={(val) => setNewSupporter({ ...newSupporter, supporterType: val })}
                >
                  <SelectTrigger className="bg-black/30 border-white/15 text-xs text-white h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#001A41] border-white/15 text-white text-xs">
                    <SelectItem value="One-Time Donor">One-Time Donor</SelectItem>
                    <SelectItem value="Recurring Donor">Recurring Donor</SelectItem>
                    <SelectItem value="Individual Sponsor">Individual Sponsor</SelectItem>
                    <SelectItem value="Corporate Sponsor">Corporate Sponsor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-white/80">Email Address</Label>
                <Input
                  type="email"
                  value={newSupporter.email}
                  onChange={(e) => setNewSupporter({ ...newSupporter, email: e.target.value })}
                  placeholder="donor@example.com"
                  className="bg-black/30 border-white/15 text-xs text-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-white/80">Phone Number</Label>
                <Input
                  value={newSupporter.phone}
                  onChange={(e) => setNewSupporter({ ...newSupporter, phone: e.target.value })}
                  placeholder="(404) 555-0100"
                  className="bg-black/30 border-white/15 text-xs text-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-white/80">Initial Gift Amount ($ USD) — Optional</Label>
              <Input
                type="number"
                step="0.01"
                value={newSupporter.initialAmount}
                onChange={(e) => setNewSupporter({ ...newSupporter, initialAmount: e.target.value })}
                placeholder="250.00"
                className="bg-black/30 border-white/15 text-xs text-white"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAddDialogOpen(false)}
                className="text-white/70 hover:text-white text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createSupporterMutation.isPending}
                className="bg-amber-500 hover:bg-amber-400 text-[#07162B] font-bold text-xs cursor-pointer"
              >
                {createSupporterMutation.isPending ? "Adding..." : "Save Supporter"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Record Donation for Supporter Modal ── */}
      <Dialog open={donationModalOpen} onOpenChange={setDonationModalOpen}>
        <DialogContent className="max-w-md bg-[#07162B] border-amber-500/30 text-white p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-amber-400" />
              Record Gift for {selectedSupporter?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-white/60">
              Add a charitable contribution to this supporter's giving ledger
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleQuickDonation} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-white/80">Contribution Amount ($ USD) *</Label>
              <Input
                required
                type="number"
                step="0.01"
                value={quickDonationAmount}
                onChange={(e) => setQuickDonationAmount(e.target.value)}
                placeholder="500.00"
                className="bg-black/30 border-white/15 text-sm font-mono text-white focus-visible:ring-amber-400"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-white/80">Designated Fund</Label>
              <Select value={quickDonationFund} onValueChange={setQuickDonationFund}>
                <SelectTrigger className="bg-black/30 border-white/15 text-xs text-white h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#001A41] border-white/15 text-white text-xs">
                  <SelectItem value="fnd-1">Advocacy Scholarship Fund (Restricted)</SelectItem>
                  <SelectItem value="fnd-2">General Impact & Operations Fund (Unrestricted)</SelectItem>
                  <SelectItem value="fnd-3">Emergency Due Process Legal Fund (Restricted)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDonationModalOpen(false)}
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
                {createDonationMutation.isPending ? "Recording..." : "Record Donation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

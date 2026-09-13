/**
 * Funds & Endowments Page — PG-040-FND
 * Restricted, unrestricted, and endowment fund management for designated philanthropic allocations.
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Landmark,
  Plus,
  Search,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Target,
} from "lucide-react";
import { toast } from "sonner";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function FundsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    targetGoal: "50000.00",
    restrictionType: "restricted" as "restricted" | "unrestricted" | "endowment",
  });

  const utils = trpc.useUtils();
  const { data: funds = [], isLoading } = trpc.giving.listFunds.useQuery();

  const createFundMutation = trpc.giving.createFund.useMutation({
    onSuccess: () => {
      toast.success("Designated fund created");
      utils.giving.listFunds.invalidate();
      utils.giving.getOverviewStats.invalidate();
      setModalOpen(false);
      setForm({
        name: "",
        code: "",
        description: "",
        targetGoal: "50000.00",
        restrictionType: "restricted",
      });
    },
    onError: (err) => toast.error(err.message || "Failed to create fund"),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const cents = Math.round(parseFloat(form.targetGoal) * 100);
    if (isNaN(cents) || cents <= 0) {
      toast.error("Please enter a valid target goal");
      return;
    }
    createFundMutation.mutate({
      name: form.name,
      code: form.code,
      description: form.description,
      targetGoal: cents,
      restrictionType: form.restrictionType,
    });
  };

  return (
    <div className="min-h-screen bg-[#07162B] text-white p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-400 shadow-inner">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                  Designated Charitable Funds
                </h1>
                <PageIdBadge id="PG-040-FND" name="Funds & Endowments" />
              </div>
              <p className="text-xs md:text-sm text-white/60">
                Restricted and unrestricted philanthropic pools for IEP scholarships, legal aid, and operations.
              </p>
            </div>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => setModalOpen(true)}
          className="bg-amber-500 hover:bg-amber-400 text-[#07162B] font-bold text-xs h-9 px-4 gap-1.5 shadow-md cursor-pointer self-start md:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Create Fund</span>
        </Button>
      </div>

      {/* Funds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-white/50 text-xs">
            Loading designated funds...
          </div>
        ) : funds.length === 0 ? (
          <div className="col-span-full text-center py-12 text-white/50 text-xs">
            No funds established yet
          </div>
        ) : (
          funds.map((f: any) => {
            const percent = Math.min(100, Math.round((f.currentBalance / (f.targetGoal || 1)) * 100));
            return (
              <Card
                key={f.id}
                className="bg-[#001A41]/80 border-white/10 p-5 space-y-4 hover:border-amber-400/30 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                        {f.code}
                      </span>
                      <h2 className="text-base font-bold text-white mt-0.5">{f.name}</h2>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase font-semibold border ${
                        f.restrictionType === "restricted"
                          ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                          : f.restrictionType === "endowment"
                          ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                          : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                      }`}
                    >
                      {f.restrictionType}
                    </Badge>
                  </div>

                  <p className="text-xs text-white/60 leading-relaxed">{f.description}</p>
                </div>

                <div className="space-y-2 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60">Current Balance</span>
                    <span className="font-mono font-bold text-amber-300">
                      {formatCurrency(f.currentBalance)}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500 rounded-full"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-white/40">
                    <span>Goal: {formatCurrency(f.targetGoal)}</span>
                    <span className="font-semibold text-white/70">{percent}% funded</span>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Create Fund Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md bg-[#07162B] border-amber-500/30 text-white p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Landmark className="h-5 w-5 text-amber-400" />
              Establish Designated Charitable Fund
            </DialogTitle>
            <DialogDescription className="text-xs text-white/60">
              Define a restricted or unrestricted funding pool for tax-deductible gifts
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-white/80">Fund Name *</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Advocacy Scholarship Fund"
                className="bg-black/30 border-white/15 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-white/80">Fund Code *</Label>
                <Input
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="SCHOLARSHIP"
                  className="bg-black/30 border-white/15 text-xs font-mono text-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-white/80">Restriction Type</Label>
                <Select
                  value={form.restrictionType}
                  onValueChange={(val: any) => setForm({ ...form, restrictionType: val })}
                >
                  <SelectTrigger className="bg-black/30 border-white/15 text-xs text-white h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#001A41] border-white/15 text-white text-xs">
                    <SelectItem value="restricted">Restricted (Designated Purpose)</SelectItem>
                    <SelectItem value="unrestricted">Unrestricted (General Purpose)</SelectItem>
                    <SelectItem value="endowment">Endowment (Principal Preserved)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-white/80">Campaign Target Goal ($ USD) *</Label>
              <Input
                required
                type="number"
                step="1.00"
                value={form.targetGoal}
                onChange={(e) => setForm({ ...form, targetGoal: e.target.value })}
                placeholder="50000.00"
                className="bg-black/30 border-white/15 text-sm font-mono text-white focus-visible:ring-amber-400"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-white/80">Fund Mission & Description *</Label>
              <Textarea
                required
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Explain the specific charitable purpose of this fund..."
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
                disabled={createFundMutation.isPending}
                className="bg-amber-500 hover:bg-amber-400 text-[#07162B] font-bold text-xs cursor-pointer"
              >
                {createFundMutation.isPending ? "Establishing..." : "Establish Fund"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

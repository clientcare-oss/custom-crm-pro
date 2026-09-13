/**
 * Scholarships Page — PG-040-SCH
 * IEP Advocacy family scholarship awards, needs-based fee co-sponsorships, and grant management.
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
  GraduationCap,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  Heart,
  Landmark,
  User,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function ScholarshipsPage() {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const [awardForm, setAwardForm] = useState({
    studentName: "",
    familyContactName: "",
    familyEmail: "",
    programTier: "Core Advocacy Co-Sponsorship ($55/mo)",
    monthlyGrantAmount: "55.00",
    fundId: "fnd-1",
    sponsorName: "",
    notes: "",
  });

  const utils = trpc.useUtils();
  const { data: scholarships = [], isLoading } = trpc.giving.listScholarships.useQuery();
  const { data: funds = [] } = trpc.giving.listFunds.useQuery();

  const awardMutation = trpc.giving.awardScholarship.useMutation({
    onSuccess: () => {
      toast.success("Scholarship grant awarded successfully");
      utils.giving.listScholarships.invalidate();
      utils.giving.getOverviewStats.invalidate();
      setModalOpen(false);
      setAwardForm({
        studentName: "",
        familyContactName: "",
        familyEmail: "",
        programTier: "Core Advocacy Co-Sponsorship ($55/mo)",
        monthlyGrantAmount: "55.00",
        fundId: "fnd-1",
        sponsorName: "",
        notes: "",
      });
    },
    onError: (err) => toast.error(err.message || "Failed to award scholarship"),
  });

  const handleAward = (e: React.FormEvent) => {
    e.preventDefault();
    const cents = Math.round(parseFloat(awardForm.monthlyGrantAmount) * 100);
    if (isNaN(cents) || cents <= 0) {
      toast.error("Please enter a valid grant amount");
      return;
    }
    awardMutation.mutate({
      studentName: awardForm.studentName,
      familyContactName: awardForm.familyContactName,
      familyEmail: awardForm.familyEmail || undefined,
      programTier: awardForm.programTier,
      monthlyGrantAmount: cents,
      fundId: awardForm.fundId,
      sponsorName: awardForm.sponsorName || undefined,
      notes: awardForm.notes || undefined,
    });
  };

  const filtered = scholarships.filter((s: any) => {
    const q = search.toLowerCase();
    return (
      s.studentName.toLowerCase().includes(q) ||
      s.familyContactName.toLowerCase().includes(q) ||
      s.programTier.toLowerCase().includes(q) ||
      s.fundName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#07162B] text-white p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                  Scholarships & Advocacy Grants
                </h1>
                <PageIdBadge id="PG-040-SCH" name="Scholarship Grants" />
              </div>
              <p className="text-xs md:text-sm text-white/60">
                Manage awarded IEP subsidies, evaluation stipends, and recipient families.
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
          <span>Award Scholarship</span>
        </Button>
      </div>

      {/* Filter & Search */}
      <div className="flex items-center justify-between gap-3 bg-[#001A41]/80 border border-white/10 p-3 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student, family, program..."
            className="pl-9 bg-black/30 border-white/10 text-xs text-white placeholder:text-white/40 h-8 rounded-lg focus-visible:ring-amber-400"
          />
        </div>
        <span className="text-xs text-white/50 hidden sm:block">
          {filtered.length} active grant{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Table */}
      <Card className="bg-[#001A41]/80 border-white/10 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-black/30 text-white/60 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Student & Family</th>
                <th className="py-3.5 px-4">Scholarship Program Tier</th>
                <th className="py-3.5 px-4">Funding Source</th>
                <th className="py-3.5 px-4 text-right">Grant Subsidy</th>
                <th className="py-3.5 px-4">Award Date</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-white/50">
                    Loading scholarships...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-white/50">
                    No scholarships found
                  </td>
                </tr>
              ) : (
                filtered.map((s: any) => (
                  <tr key={s.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-white group-hover:text-amber-300 transition-colors">
                        {s.studentName}
                      </p>
                      <p className="text-[11px] text-white/50">
                        Parent: {s.familyContactName}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-[11px]">
                        {s.programTier}
                      </Badge>
                      {s.notes && (
                        <p className="text-[10px] text-white/40 mt-1 truncate max-w-xs">{s.notes}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-white/80 font-medium">{s.fundName}</p>
                      {s.sponsorName && (
                        <p className="text-[10px] text-purple-300 flex items-center gap-1">
                          <Heart className="h-2.5 w-2.5" /> Sponsoring Partner: {s.sponsorName}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-mono font-bold text-amber-300 text-xs">
                        {formatCurrency(s.monthlyGrantAmount)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white/70 text-[11px]">
                      {s.awardedAt}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                        Active Grant
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Award Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md bg-[#07162B] border-amber-500/30 text-white p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-amber-400" />
              Award Family Advocacy Scholarship
            </DialogTitle>
            <DialogDescription className="text-xs text-white/60">
              Grant advocacy fee assistance from designated restricted scholarship funds
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAward} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-white/80">Student Full Name *</Label>
              <Input
                required
                value={awardForm.studentName}
                onChange={(e) => setAwardForm({ ...awardForm, studentName: e.target.value })}
                placeholder="Lucas Vance"
                className="bg-black/30 border-white/15 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-white/80">Parent / Guardian Name *</Label>
                <Input
                  required
                  value={awardForm.familyContactName}
                  onChange={(e) => setAwardForm({ ...awardForm, familyContactName: e.target.value })}
                  placeholder="Amanda Vance"
                  className="bg-black/30 border-white/15 text-xs text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-white/80">Parent Email</Label>
                <Input
                  type="email"
                  value={awardForm.familyEmail}
                  onChange={(e) => setAwardForm({ ...awardForm, familyEmail: e.target.value })}
                  placeholder="amanda@example.com"
                  className="bg-black/30 border-white/15 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-white/80">Program Tier</Label>
                <Select
                  value={awardForm.programTier}
                  onValueChange={(val) => {
                    const defaultAmount = val.includes("105") ? "105.00" : val.includes("55") ? "55.00" : "250.00";
                    setAwardForm({ ...awardForm, programTier: val, monthlyGrantAmount: defaultAmount });
                  }}
                >
                  <SelectTrigger className="bg-black/30 border-white/15 text-xs text-white h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#001A41] border-white/15 text-white text-xs">
                    <SelectItem value="Core Advocacy Co-Sponsorship ($55/mo)">$55/mo Co-Sponsorship</SelectItem>
                    <SelectItem value="Full Advocacy Retainer ($105/mo)">$105/mo Full Retainer</SelectItem>
                    <SelectItem value="Evaluation Review Stipend">Evaluation Review Stipend</SelectItem>
                    <SelectItem value="Due Process Legal Aid Grant">Due Process Legal Aid Grant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-white/80">Grant Amount ($ USD) *</Label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  value={awardForm.monthlyGrantAmount}
                  onChange={(e) => setAwardForm({ ...awardForm, monthlyGrantAmount: e.target.value })}
                  className="bg-black/30 border-white/15 text-sm font-mono text-white focus-visible:ring-amber-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-white/80">Disbursing Fund</Label>
              <Select
                value={awardForm.fundId}
                onValueChange={(val) => setAwardForm({ ...awardForm, fundId: val })}
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
              <Label className="text-xs text-white/80">Sponsoring Partner (Optional)</Label>
              <Input
                value={awardForm.sponsorName}
                onChange={(e) => setAwardForm({ ...awardForm, sponsorName: e.target.value })}
                placeholder="e.g. Peachtree Children's Foundation"
                className="bg-black/30 border-white/15 text-xs text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-white/80">Advocacy Scope / Notes</Label>
              <Input
                value={awardForm.notes}
                onChange={(e) => setAwardForm({ ...awardForm, notes: e.target.value })}
                placeholder="e.g. Transition goal & speech services dispute assistance"
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
                disabled={awardMutation.isPending}
                className="bg-amber-500 hover:bg-amber-400 text-[#07162B] font-bold text-xs cursor-pointer"
              >
                {awardMutation.isPending ? "Awarding..." : "Confirm Grant Award"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

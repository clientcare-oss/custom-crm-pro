/**
 * Award & Initiate Scholarship Modal — PG-040
 * Initiates family advocacy fee subsidies, IEP stipends, and restricted scholarship awards.
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GraduationCap, Sparkles, HeartHandshake, ShieldCheck, Landmark } from "lucide-react";
import { toast } from "sonner";

interface AwardScholarshipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStudentName?: string;
  defaultFamilyName?: string;
  defaultFamilyEmail?: string;
}

export function AwardScholarshipModal({
  open,
  onOpenChange,
  defaultStudentName = "",
  defaultFamilyName = "",
  defaultFamilyEmail = "",
}: AwardScholarshipModalProps) {
  const [awardForm, setAwardForm] = useState({
    studentName: defaultStudentName,
    familyContactName: defaultFamilyName,
    familyEmail: defaultFamilyEmail,
    programTier: "Core Advocacy Co-Sponsorship ($55/mo)",
    monthlyGrantAmount: "55.00",
    fundId: "fnd-1",
    sponsorName: "",
    notes: "",
  });

  const utils = trpc.useUtils();
  const { data: funds = [] } = trpc.giving.listFunds.useQuery(undefined, { enabled: open });

  const awardMutation = trpc.giving.awardScholarship.useMutation({
    onSuccess: () => {
      toast.success("Scholarship grant initiated & awarded successfully!");
      utils.giving.listScholarships.invalidate();
      utils.giving.getOverviewStats.invalidate();
      onOpenChange(false);
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
    onError: (err) => {
      toast.error(err.message || "Failed to initiate scholarship grant");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cents = Math.round(parseFloat(awardForm.monthlyGrantAmount) * 100);
    if (isNaN(cents) || cents <= 0) {
      toast.error("Please enter a valid grant amount");
      return;
    }
    if (!awardForm.studentName.trim() || !awardForm.familyContactName.trim()) {
      toast.error("Student name and parent/guardian contact are required");
      return;
    }

    awardMutation.mutate({
      studentName: awardForm.studentName.trim(),
      familyContactName: awardForm.familyContactName.trim(),
      familyEmail: awardForm.familyEmail.trim() || undefined,
      programTier: awardForm.programTier,
      monthlyGrantAmount: cents,
      fundId: awardForm.fundId,
      sponsorName: awardForm.sponsorName.trim() || undefined,
      notes: awardForm.notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#07162B] border-amber-500/30 text-white p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-inner">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                <span>Initiate Family Scholarship</span>
                <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-semibold">
                  501(c)(3) Grant
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-white/60">
                Subsidize IEP advocacy retainer fees from designated charitable scholarship funds.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-white/80 font-medium">Student Full Name *</Label>
            <Input
              required
              value={awardForm.studentName}
              onChange={(e) => setAwardForm({ ...awardForm, studentName: e.target.value })}
              placeholder="e.g. Lucas Vance"
              className="bg-black/30 border-white/15 text-xs text-white placeholder:text-white/40 focus-visible:ring-amber-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-white/80 font-medium">Parent / Guardian Name *</Label>
              <Input
                required
                value={awardForm.familyContactName}
                onChange={(e) => setAwardForm({ ...awardForm, familyContactName: e.target.value })}
                placeholder="e.g. Amanda Vance"
                className="bg-black/30 border-white/15 text-xs text-white placeholder:text-white/40 focus-visible:ring-amber-400"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-white/80 font-medium">Parent Email</Label>
              <Input
                type="email"
                value={awardForm.familyEmail}
                onChange={(e) => setAwardForm({ ...awardForm, familyEmail: e.target.value })}
                placeholder="amanda@example.com"
                className="bg-black/30 border-white/15 text-xs text-white placeholder:text-white/40 focus-visible:ring-amber-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-white/80 font-medium">Program Tier / Level</Label>
              <Select
                value={awardForm.programTier}
                onValueChange={(val) => {
                  let defaultAmount = "55.00";
                  if (val.includes("105")) defaultAmount = "105.00";
                  else if (val.includes("Evaluation")) defaultAmount = "250.00";
                  else if (val.includes("Due Process")) defaultAmount = "500.00";
                  setAwardForm({ ...awardForm, programTier: val, monthlyGrantAmount: defaultAmount });
                }}
              >
                <SelectTrigger className="bg-black/30 border-white/15 text-xs text-white h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#001A41] border-white/15 text-white text-xs">
                  <SelectItem value="Core Advocacy Co-Sponsorship ($55/mo)">$55/mo Co-Sponsorship</SelectItem>
                  <SelectItem value="Full Advocacy Retainer ($105/mo)">$105/mo Full Retainer</SelectItem>
                  <SelectItem value="Evaluation Review Stipend ($250)">Evaluation Review Stipend ($250)</SelectItem>
                  <SelectItem value="Due Process Legal Aid Grant ($500)">Due Process Legal Aid ($500)</SelectItem>
                  <SelectItem value="Custom Family Needs-Based Subsidy">Custom Needs-Based Subsidy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-white/80 font-medium">Grant Amount ($ USD) *</Label>
              <Input
                required
                type="number"
                step="0.01"
                min="1"
                value={awardForm.monthlyGrantAmount}
                onChange={(e) => setAwardForm({ ...awardForm, monthlyGrantAmount: e.target.value })}
                className="bg-black/30 border-white/15 text-sm font-mono text-white focus-visible:ring-amber-400 h-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-white/80 font-medium">Disbursing Scholarship Fund</Label>
            <Select
              value={awardForm.fundId}
              onValueChange={(val) => setAwardForm({ ...awardForm, fundId: val })}
            >
              <SelectTrigger className="bg-black/30 border-white/15 text-xs text-white h-9">
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
            <Label className="text-xs text-white/80 font-medium">Sponsoring Foundation / Donor (Optional)</Label>
            <Input
              value={awardForm.sponsorName}
              onChange={(e) => setAwardForm({ ...awardForm, sponsorName: e.target.value })}
              placeholder="e.g. Peachtree Children's Foundation or Anonymous"
              className="bg-black/30 border-white/15 text-xs text-white placeholder:text-white/40 focus-visible:ring-amber-400"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-white/80 font-medium">Advocacy Notes / Subsidy Scope</Label>
            <Input
              value={awardForm.notes}
              onChange={(e) => setAwardForm({ ...awardForm, notes: e.target.value })}
              placeholder="e.g. Approved for 6 months speech & transition support co-sponsorship"
              className="bg-black/30 border-white/15 text-xs text-white placeholder:text-white/40 focus-visible:ring-amber-400"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-amber-300/80">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
              <span>Tax-exempt charitable grant</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-white/70 hover:text-white text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={awardMutation.isPending}
                className="bg-amber-500 hover:bg-amber-400 text-[#07162B] font-bold text-xs gap-1.5 shadow-md cursor-pointer"
              >
                <GraduationCap className="h-4 w-4" />
                <span>{awardMutation.isPending ? "Initiating..." : "Confirm & Initiate Scholarship"}</span>
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

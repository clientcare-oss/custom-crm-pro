import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SlidersHorizontal, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { SavedViewItem, PipelineFilters } from "./types";

interface NewViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveView: (newView: { name: string; filters: PipelineFilters; isPinned: boolean }) => void;
}

export function NewViewModal({ open, onOpenChange, onSaveView }: NewViewModalProps) {
  const [viewName, setViewName] = useState("");
  const [planTier, setPlanTier] = useState("");
  const [advocate, setAdvocate] = useState("");
  const [caseType, setCaseType] = useState("");
  const [accountStatus, setAccountStatus] = useState("");
  const [billingStatus, setBillingStatus] = useState("");
  const [needsAttentionOnly, setNeedsAttentionOnly] = useState(false);
  const [isPinned, setIsPinned] = useState(true);

  const handleSave = () => {
    if (!viewName.trim()) {
      toast.error("Please enter a name for this view");
      return;
    }

    const filters: PipelineFilters = {
      planTier: planTier || undefined,
      advocate: advocate || undefined,
      caseType: caseType || undefined,
      accountStatus: accountStatus || undefined,
      billingStatus: billingStatus || undefined,
      needsAttentionOnly: needsAttentionOnly || undefined,
    };

    onSaveView({
      name: viewName.trim(),
      filters,
      isPinned,
    });

    toast.success(`View "${viewName.trim()}" created successfully!`);
    setViewName("");
    setPlanTier("");
    setAdvocate("");
    setCaseType("");
    setAccountStatus("");
    setBillingStatus("");
    setNeedsAttentionOnly(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#07162B] border-[#0E274D] text-slate-100 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-[#F5B544]" />
            Create Custom Pipeline View
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">View Name *</Label>
            <Input
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              placeholder="e.g. Cobb County Renewals, Wyatt's Active Cases..."
              className="bg-[#0A1A33] border-[#0E274D] text-white text-xs"
            />
          </div>

          <div className="space-y-3 pt-2 border-t border-[#0D366B]/60">
            <p className="text-xs font-bold uppercase tracking-wider text-[#F5B544]">
              Filter Rules
            </p>

            {/* Plan Tier Filter */}
            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Plan Tier</Label>
              <select
                value={planTier}
                onChange={(e) => setPlanTier(e.target.value)}
                className="w-full h-8 rounded-md bg-[#0A1A33] border border-[#0E274D] text-white text-xs px-2.5 focus:ring-1 focus:ring-[#F5B544]"
              >
                <option value="">Any Plan</option>
                <option value="$55">$55 Monthly</option>
                <option value="$105">$105 Monthly</option>
                <option value="Scholarship">Scholarship</option>
                <option value="Pay Per Use">Pay Per Use</option>
                <option value="Tools Only">Tools Only</option>
              </select>
            </div>

            {/* Case Type Filter */}
            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Case Type</Label>
              <select
                value={caseType}
                onChange={(e) => setCaseType(e.target.value)}
                className="w-full h-8 rounded-md bg-[#0A1A33] border border-[#0E274D] text-white text-xs px-2.5 focus:ring-1 focus:ring-[#F5B544]"
              >
                <option value="">Any Case Type</option>
                <option value="IEP">IEP</option>
                <option value="504">504</option>
                <option value="Evaluation">Evaluation</option>
                <option value="State Complaint">State Complaint</option>
              </select>
            </div>

            {/* Billing Status Filter */}
            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Billing Status</Label>
              <select
                value={billingStatus}
                onChange={(e) => setBillingStatus(e.target.value)}
                className="w-full h-8 rounded-md bg-[#0A1A33] border border-[#0E274D] text-white text-xs px-2.5 focus:ring-1 focus:ring-[#F5B544]"
              >
                <option value="">Any Billing Status</option>
                <option value="Current">Current / Paid</option>
                <option value="Payment Failed">Payment Failed</option>
                <option value="Past Due">Past Due</option>
                <option value="Complimentary">Complimentary</option>
              </select>
            </div>

            {/* Needs Attention Checkbox */}
            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="needs-attn"
                checked={needsAttentionOnly}
                onCheckedChange={(checked) => setNeedsAttentionOnly(checked === true)}
              />
              <Label htmlFor="needs-attn" className="text-xs text-slate-300 cursor-pointer">
                Only show cases needing urgent attention
              </Label>
            </div>
          </div>

          {/* Pin to View Bar */}
          <div className="flex items-center space-x-2 pt-2 border-t border-[#0D366B]/60">
            <Checkbox
              id="is-pinned"
              checked={isPinned}
              onCheckedChange={(checked) => setIsPinned(checked === true)}
            />
            <Label htmlFor="is-pinned" className="text-xs text-slate-300 cursor-pointer">
              Pin this view to the top view bar
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[#0E274D] text-slate-300 hover:bg-white/[0.06] text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!viewName.trim()}
            className="bg-[#F5B544] text-[#07162B] hover:bg-[#F5B544]/90 font-bold text-xs"
          >
            Save View
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

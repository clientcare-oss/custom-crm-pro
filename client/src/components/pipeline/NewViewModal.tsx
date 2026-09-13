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
import { SlidersHorizontal, Lock, Users, Pin } from "lucide-react";
import { toast } from "sonner";
import type { PipelineFilters } from "./types";

interface NewViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveView: (newView: {
    name: string;
    filters: PipelineFilters;
    isPinned: boolean;
    isPrivate: boolean;
  }) => void;
}

export function NewViewModal({ open, onOpenChange, onSaveView }: NewViewModalProps) {
  const [viewName, setViewName] = useState("");
  const [planTier, setPlanTier] = useState("");
  const [advocate, setAdvocate] = useState("");
  const [district, setDistrict] = useState("");
  const [caseType, setCaseType] = useState("");
  const [accountStatus, setAccountStatus] = useState("");
  const [billingStatus, setBillingStatus] = useState("");
  const [needsAttentionOnly, setNeedsAttentionOnly] = useState(false);
  const [isPrivate, setIsPrivate] = useState(true);
  const [isPinned, setIsPinned] = useState(true);

  const handleSave = () => {
    if (!viewName.trim()) {
      toast.error("Please enter a name for this view");
      return;
    }

    const filters: PipelineFilters = {
      planTier: planTier || undefined,
      advocate: advocate || undefined,
      district: district || undefined,
      caseType: caseType || undefined,
      accountStatus: accountStatus || undefined,
      billingStatus: billingStatus || undefined,
      needsAttentionOnly: needsAttentionOnly || undefined,
    };

    onSaveView({
      name: viewName.trim(),
      filters,
      isPinned,
      isPrivate,
    });

    setViewName("");
    setPlanTier("");
    setAdvocate("");
    setDistrict("");
    setCaseType("");
    setAccountStatus("");
    setBillingStatus("");
    setNeedsAttentionOnly(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#07162B] border-[#0E274D] text-slate-100 shadow-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[#F5B544]" />
            <span>Create Custom Pipeline View</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* View Name */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300 font-semibold">View Name *</Label>
            <Input
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              placeholder="e.g. My Follow-Ups, Cobb County, State Complaints..."
              className="bg-[#0A1A33] border-[#0E274D] text-white text-xs h-9"
            />
          </div>

          {/* Visibility / Privacy Scope */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300 font-semibold">Visibility Scope</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsPrivate(true)}
                className={`p-2.5 rounded-xl border flex items-center gap-2 text-left transition-all cursor-pointer ${
                  isPrivate
                    ? "bg-[#0A2349] border-[#F5B544] text-white"
                    : "bg-[#061833] border-[#0E3A73] text-slate-400 hover:text-slate-200"
                }`}
              >
                <Lock className={`h-4 w-4 ${isPrivate ? "text-[#F5B544]" : "text-slate-400"}`} />
                <div>
                  <p className="font-bold text-xs">Private to Me</p>
                  <p className="text-[10px] text-slate-400">Only you will see this view</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                className={`p-2.5 rounded-xl border flex items-center gap-2 text-left transition-all cursor-pointer ${
                  !isPrivate
                    ? "bg-[#0A2349] border-[#F5B544] text-white"
                    : "bg-[#061833] border-[#0E3A73] text-slate-400 hover:text-slate-200"
                }`}
              >
                <Users className={`h-4 w-4 ${!isPrivate ? "text-[#F5B544]" : "text-slate-400"}`} />
                <div>
                  <p className="font-bold text-xs">Shared With Team</p>
                  <p className="text-[10px] text-slate-400">Visible to all advocates</p>
                </div>
              </button>
            </div>
          </div>

          {/* Filter Rules */}
          <div className="space-y-3 pt-2 border-t border-[#0D366B]/60">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#F5B544]">
              Stored Filter Rules
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-300">Plan</Label>
                <select
                  value={planTier}
                  onChange={(e) => setPlanTier(e.target.value)}
                  className="w-full h-8 rounded-lg bg-[#0A1A33] border border-[#0E274D] text-white text-xs px-2"
                >
                  <option value="">Any Plan</option>
                  <option value="$55">$55 Monthly</option>
                  <option value="$105">$105 Monthly</option>
                  <option value="Scholarship">Scholarship</option>
                  <option value="Pay Per Use">Pay Per Use</option>
                  <option value="Tools Only">Tools Only</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-slate-300">Advocate</Label>
                <select
                  value={advocate}
                  onChange={(e) => setAdvocate(e.target.value)}
                  className="w-full h-8 rounded-lg bg-[#0A1A33] border border-[#0E274D] text-white text-xs px-2"
                >
                  <option value="">Any Advocate</option>
                  <option value="Byron Honea">Byron Honea</option>
                  <option value="Erin Smith">Erin Smith</option>
                  <option value="Maya Singh">Maya Singh</option>
                  <option value="Kevin Liu">Kevin Liu</option>
                  <option value="Daniel Torres">Daniel Torres</option>
                  <option value="Jordan Lee">Jordan Lee</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-300">District</Label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full h-8 rounded-lg bg-[#0A1A33] border border-[#0E274D] text-white text-xs px-2"
                >
                  <option value="">Any District</option>
                  <option value="Fulton County">Fulton County</option>
                  <option value="Cobb County">Cobb County</option>
                  <option value="Gwinnett County">Gwinnett County</option>
                  <option value="DeKalb County">DeKalb County</option>
                  <option value="Atlanta Public Schools">Atlanta Public</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-slate-300">Case Type</Label>
                <select
                  value={caseType}
                  onChange={(e) => setCaseType(e.target.value)}
                  className="w-full h-8 rounded-lg bg-[#0A1A33] border border-[#0E274D] text-white text-xs px-2"
                >
                  <option value="">Any Type</option>
                  <option value="IEP">IEP</option>
                  <option value="504">504</option>
                  <option value="Evaluation">Evaluation</option>
                  <option value="State Complaint">State Complaint</option>
                </select>
              </div>
            </div>

            {/* Needs Attention Toggle */}
            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs text-slate-300">Needs Attention Only</span>
              <input
                type="checkbox"
                checked={needsAttentionOnly}
                onChange={(e) => setNeedsAttentionOnly(e.target.checked)}
                className="rounded-sm border-slate-700 text-[#F5B544] focus:ring-[#F5B544] h-4 w-4 bg-[#0A1A33] cursor-pointer"
              />
            </div>

            {/* Pin to View Bar */}
            <div className="pt-2 border-t border-[#0D366B]/40 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <Pin className="h-3.5 w-3.5 text-[#F5B544]" />
                <span>Pin to Main View Bar</span>
              </div>
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded-sm border-slate-700 text-[#F5B544] focus:ring-[#F5B544] h-4 w-4 bg-[#0A1A33] cursor-pointer"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-[#0D366B]/60 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="border-[#0E274D] bg-[#0A1A33] text-slate-300 hover:text-white cursor-pointer text-xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            className="bg-[#F5B544] text-[#07162B] hover:bg-[#F5B544]/90 font-bold text-xs cursor-pointer"
          >
            Save View
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

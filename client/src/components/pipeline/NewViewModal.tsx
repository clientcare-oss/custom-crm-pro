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
      <DialogContent className="max-w-md bg-[#05142B]/95 border-[#3A2C18] text-[#FFF4D4] shadow-[0_16px_48px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.06)] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-serif font-bold text-[#FFF4D4] flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[#C5A059]" />
            <span>Create Custom Pipeline View</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* View Name */}
          <div className="space-y-1.5">
            <Label className="text-xs text-[#C6B697] font-semibold">View Name *</Label>
            <Input
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              placeholder="e.g. My Follow-Ups, Cobb County, State Complaints..."
              className="bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs h-9 focus:border-[#C5A059] rounded-lg"
            />
          </div>

          {/* Visibility / Privacy Scope */}
          <div className="space-y-1.5">
            <Label className="text-xs text-[#C6B697] font-semibold">Visibility Scope</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsPrivate(true)}
                className={`p-2.5 rounded-xl border flex items-center gap-2 text-left transition-all cursor-pointer ${
                  isPrivate
                    ? "bg-[#07162B] border-[#C5A059] text-[#FFF4D4] shadow-xs"
                    : "bg-[#020A17] border-[#3A2C18] text-[#A69371] hover:text-[#FFF4D4]"
                }`}
              >
                <Lock className={`h-4 w-4 ${isPrivate ? "text-[#C5A059]" : "text-[#A69371]"}`} />
                <div>
                  <p className="font-bold text-xs">Private to Me</p>
                  <p className="text-[10px] text-[#A69371]">Only you will see this view</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                className={`p-2.5 rounded-xl border flex items-center gap-2 text-left transition-all cursor-pointer ${
                  !isPrivate
                    ? "bg-[#07162B] border-[#C5A059] text-[#FFF4D4] shadow-xs"
                    : "bg-[#020A17] border-[#3A2C18] text-[#A69371] hover:text-[#FFF4D4]"
                }`}
              >
                <Users className={`h-4 w-4 ${!isPrivate ? "text-[#C5A059]" : "text-[#A69371]"}`} />
                <div>
                  <p className="font-bold text-xs">Shared With Team</p>
                  <p className="text-[10px] text-[#A69371]">Visible to all advocates</p>
                </div>
              </button>
            </div>
          </div>

          {/* Filter Rules */}
          <div className="space-y-3 pt-2 border-t border-[#3A2C18]">
            <p className="text-[11px] font-serif font-bold uppercase tracking-wider text-[#FFE394]">
              Stored Filter Rules
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-[#C6B697]">Plan</Label>
                <select
                  value={planTier}
                  onChange={(e) => setPlanTier(e.target.value)}
                  className="w-full h-8 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] text-xs px-2 focus:outline-hidden focus:border-[#C5A059]"
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
                <Label className="text-[11px] text-[#C6B697]">Advocate</Label>
                <select
                  value={advocate}
                  onChange={(e) => setAdvocate(e.target.value)}
                  className="w-full h-8 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] text-xs px-2 focus:outline-hidden focus:border-[#C5A059]"
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
                <Label className="text-[11px] text-[#C6B697]">District</Label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full h-8 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] text-xs px-2 focus:outline-hidden focus:border-[#C5A059]"
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
                <Label className="text-[11px] text-[#C6B697]">Case Type</Label>
                <select
                  value={caseType}
                  onChange={(e) => setCaseType(e.target.value)}
                  className="w-full h-8 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] text-xs px-2 focus:outline-hidden focus:border-[#C5A059]"
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
              <span className="text-xs text-[#C6B697]">Needs Attention Only</span>
              <input
                type="checkbox"
                checked={needsAttentionOnly}
                onChange={(e) => setNeedsAttentionOnly(e.target.checked)}
                className="rounded-sm border-[#3A2C18] text-[#C5A059] focus:ring-[#C5A059] h-4 w-4 bg-[#020A17] cursor-pointer accent-[#C5A059]"
              />
            </div>

            {/* Pin to View Bar */}
            <div className="pt-2 border-t border-[#3A2C18]/60 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-[#C6B697]">
                <Pin className="h-3.5 w-3.5 text-[#C5A059]" />
                <span>Pin to Main View Bar</span>
              </div>
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded-sm border-[#3A2C18] text-[#C5A059] focus:ring-[#C5A059] h-4 w-4 bg-[#020A17] cursor-pointer accent-[#C5A059]"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-[#3A2C18] flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] cursor-pointer text-xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-110 text-xs cursor-pointer"
          >
            Save View
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
